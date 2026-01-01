/**
 * MCP Tool Handlers - Shared between MCP Server and HTTP API
 */
import { SpawningChromeDevToolsClient } from "./spawning-chrome-client.js";
import { classifyNetworkRequests } from "../analyzer/network-classifier.js";
import { queryAdTechAPIs } from "../analyzer/api-query-orchestrator.js";

export interface AnalyzeSiteArgs {
  url: string;
  device?: "mobile" | "desktop";
  timeout?: number;
  snapshot?: boolean;
}

// Consent/CMP data for the result
export interface ConsentResult {
  tcf: {
    detected: boolean;
    version: number | null;
    tcString: string | null;
    gdprApplies: boolean | null;
  };
  usp: {
    detected: boolean;
    uspString: string | null;
  };
  gpp: {
    detected: boolean;
    gppString: string | null;
    applicableSections: number[] | null;
  };
}

// Prebid instance info
export interface PrebidInstanceResult {
  globalName: string;
  version: string | null;
  bidders: string[];
  adUnitsCount: number;
}

// P1: Individual bid detail for the table
export interface BidDetailResult {
  bidder: string;
  adUnit: string;
  cpm: number;
  currency: string;
  status: 'won' | 'bid' | 'no-bid' | 'timeout' | 'rejected';
  responseTime: number | null;
  size: string | null;
  source?: string;  // Which Prebid instance this bid came from
}

export interface AnalysisResult {
  url: string;
  timestamp: string;
  device: string;
  vendors: string[];
  vendor_count: number;
  ssp_count: number;
  managed_service: string | null;
  categories: Record<string, string[]>;
  prebid: {
    detected: boolean;
    config?: any;
    bid_responses?: any;
    bidders?: string[];  // List of configured bidders (from client-side)
    network_bidders?: string[];  // Bidders inferred from network requests (fallback)
    ad_formats?: string[];  // Ad formats (banner, video, native)
    version?: string | null;  // Prebid.js version
    ad_units_count?: number;  // Number of ad units
    instances?: PrebidInstanceResult[];  // P3: All detected Prebid instances
    bid_details?: BidDetailResult[];  // P1: Detailed bid data with CPM, status, timing
  };
  gam: {
    detected: boolean;
    slots?: any[];
    targeting?: Record<string, string[]> | null;
  };
  consent?: ConsentResult;  // P2: CMP/Consent detection
  managed_services_detected: Record<string, boolean>;
  custom_wrappers: any[];
  network: {
    total_requests: number;
    classified_requests: number;
  };
}

/**
 * Prebid bid capture injection script
 * This script is injected early to capture bids as they arrive via event listeners
 */
const PREBID_CAPTURE_SCRIPT = `
(function() {
  // Initialize capture storage
  window.__adTechCapturedBids = window.__adTechCapturedBids || {
    bidResponses: [],
    winningBids: [],
    noBids: [],
    auctionEnded: false,
    instances: {}
  };

  const captured = window.__adTechCapturedBids;

  // Function to hook into a Prebid instance
  function hookPrebidInstance(pbjsObj, instanceName) {
    if (!pbjsObj || captured.instances[instanceName]) return;
    captured.instances[instanceName] = { hooked: true, events: [] };

    // Check if onEvent is available
    if (typeof pbjsObj.onEvent !== 'function') {
      // Use que to wait for Prebid to be ready
      pbjsObj.que = pbjsObj.que || [];
      pbjsObj.que.push(function() {
        setupListeners(pbjsObj, instanceName);
      });
    } else {
      setupListeners(pbjsObj, instanceName);
    }
  }

  function setupListeners(pbjsObj, instanceName) {
    if (!pbjsObj.onEvent) return;

    // Capture bid responses as they arrive
    try {
      pbjsObj.onEvent('bidResponse', function(bid) {
        captured.bidResponses.push({
          ...bid,
          _source: instanceName,
          _capturedAt: Date.now()
        });
      });
      captured.instances[instanceName].events.push('bidResponse');
    } catch(e) {}

    // Capture winning bids
    try {
      pbjsObj.onEvent('bidWon', function(bid) {
        captured.winningBids.push({
          ...bid,
          _source: instanceName,
          _capturedAt: Date.now()
        });
      });
      captured.instances[instanceName].events.push('bidWon');
    } catch(e) {}

    // Capture no-bid responses
    try {
      pbjsObj.onEvent('noBid', function(bid) {
        captured.noBids.push({
          ...bid,
          _source: instanceName,
          _capturedAt: Date.now()
        });
      });
      captured.instances[instanceName].events.push('noBid');
    } catch(e) {}

    // Mark auction end
    try {
      pbjsObj.onEvent('auctionEnd', function(auctionData) {
        captured.auctionEnded = true;
        captured.lastAuction = {
          ...auctionData,
          _source: instanceName,
          _capturedAt: Date.now()
        };
      });
      captured.instances[instanceName].events.push('auctionEnd');
    } catch(e) {}
  }

  // Known Prebid global names
  const knownPrebidNames = ['pbjs', 'fsprebid', 'pubwise', 'rampBid', 'pbConfig', 'hbObj', 'adpBidder', 'pwpbjs'];

  // Hook existing instances
  knownPrebidNames.forEach(function(name) {
    if (window[name]) {
      hookPrebidInstance(window[name], name);
    }
  });

  // Also check for custom wrappers
  if (window.googletag && window.googletag.cmd) {
    // GAM may have Prebid integrated
  }

  // Poll for late-loaded Prebid instances (some sites load them async)
  let pollCount = 0;
  const pollInterval = setInterval(function() {
    knownPrebidNames.forEach(function(name) {
      if (window[name] && !captured.instances[name]) {
        hookPrebidInstance(window[name], name);
      }
    });
    pollCount++;
    if (pollCount > 30) { // Stop after 15 seconds
      clearInterval(pollInterval);
    }
  }, 500);

  console.log('[AdTech Analyzer] Bid capture listeners injected');
})();
`;

/**
 * Analyze a website's ad-tech stack
 * This is the core analysis function used by both MCP server and HTTP API
 */
export async function handleAnalyzeSite(args: AnalyzeSiteArgs): Promise<AnalysisResult> {
  const { url, device = "desktop", timeout = 30000 } = args;

  const client = new SpawningChromeDevToolsClient();
  await client.init();

  try {
    console.log(`[MCP Handler] Navigating to ${url}...`);
    await client.navigateToPage(url);

    // CRITICAL: Inject bid capture script IMMEDIATELY after navigation
    // This sets up event listeners to capture bids as they arrive
    console.log('[MCP Handler] Injecting Prebid bid capture listeners...');
    try {
      await client.evaluateScript(`() => { ${PREBID_CAPTURE_SCRIPT} }`);
    } catch (err) {
      console.log('[MCP Handler] Bid capture injection failed (non-critical):', err);
    }

    // Wait for initial page load
    console.log('[MCP Handler] Waiting for initial page load...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Trigger lazy-loaded ads (scroll + click patterns for CWV optimization)
    console.log('[MCP Handler] Triggering user interaction to load lazy ads...');
    try {
      await client.evaluateScript(`() => {
        // 1. Simulate click to trigger click-based ad initialization
        document.body.click();
        document.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        // 2. Scroll down to 75% of page to trigger intersection observers
        const totalHeight = document.documentElement.scrollHeight;
        const viewportHeight = window.innerHeight;
        const scrollPositions = [0.25, 0.5, 0.75, 0.5, 0.25, 0]; // Scroll pattern

        let delay = 0;
        scrollPositions.forEach((percent, i) => {
          setTimeout(() => {
            window.scrollTo(0, totalHeight * percent);
            // Also trigger scroll event manually (some libs listen to this)
            window.dispatchEvent(new Event('scroll'));
          }, delay);
          delay += 400;
        });

        return { totalHeight, viewportHeight, scrollPositions };
      }`);
    } catch (err) {
      console.log('[MCP Handler] Interaction trigger failed (non-critical):', err);
    }

    // Wait for lazy-loaded ad requests to complete
    console.log('[MCP Handler] Waiting for ad requests after interaction...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('[MCP Handler] Collecting network requests...');
    let networkRequests = await client.getNetworkRequests();
    console.log(`[MCP Handler] Raw response type: ${typeof networkRequests}, isArray: ${Array.isArray(networkRequests)}`);
    console.log(`[MCP Handler] First 100 chars of raw response:`, JSON.stringify(networkRequests).slice(0, 100));

    // FALLBACK: If response is a string, try parsing it as JSON
    if (typeof networkRequests === 'string') {
      console.log('[MCP Handler] Response is string, attempting JSON parse...');
      try {
        networkRequests = JSON.parse(networkRequests);
        console.log(`[MCP Handler] Successfully parsed! Now isArray: ${Array.isArray(networkRequests)}`);
      } catch (err) {
        console.error('[MCP Handler] JSON parse failed:', err);
        networkRequests = [];
      }
    }

    console.log(`[MCP Handler] Captured ${networkRequests?.length || 0} requests`);
    if (networkRequests && Array.isArray(networkRequests) && networkRequests.length > 0) {
      console.log('[MCP Handler] First request structure:', JSON.stringify(networkRequests[0], null, 2));
      console.log('[MCP Handler] First 10 URLs:');
      networkRequests.slice(0, 10).forEach((req, idx) => {
        console.log(`  ${idx + 1}. ${req.url?.slice(0, 100) || req.name?.slice(0, 100) || JSON.stringify(req).slice(0, 100)}`);
      });
    }

    console.log('[MCP Handler] Querying ad-tech APIs...');
    const apiData = await queryAdTechAPIs(client, networkRequests || []);

    console.log('[MCP Handler] Classifying vendors...');
    const classification = classifyNetworkRequests(networkRequests || []);

    // Merge managed services detected via window object into vendors list
    const additionalVendors: string[] = [];
    let detectedManagedService = classification.managed_service;

    // Check each managed service and add to vendors if detected but not already present
    if (apiData.managedServices.adpushup && !classification.vendors.includes('AdPushup')) {
      additionalVendors.push('AdPushup');
      if (!detectedManagedService) detectedManagedService = 'AdPushup';
    }
    if (apiData.managedServices.adthrive && !classification.vendors.includes('Adthrive')) {
      additionalVendors.push('Adthrive');
      if (!detectedManagedService) detectedManagedService = 'Adthrive';
    }
    if (apiData.managedServices.freestar && !classification.vendors.includes('Freestar')) {
      additionalVendors.push('Freestar');
      if (!detectedManagedService) detectedManagedService = 'Freestar';
    }
    if (apiData.managedServices.raptive && !classification.vendors.includes('Raptive')) {
      additionalVendors.push('Raptive');
      if (!detectedManagedService) detectedManagedService = 'Raptive';
    }
    if (apiData.managedServices.mediavine && !classification.vendors.includes('Mediavine')) {
      additionalVendors.push('Mediavine');
      if (!detectedManagedService) detectedManagedService = 'Mediavine';
    }
    if (apiData.managedServices.ezoic && !classification.vendors.includes('Ezoic')) {
      additionalVendors.push('Ezoic');
      if (!detectedManagedService) detectedManagedService = 'Ezoic';
    }
    if (apiData.managedServices.pubgalaxy && !classification.vendors.includes('PubGalaxy')) {
      additionalVendors.push('PubGalaxy');
      if (!detectedManagedService) detectedManagedService = 'PubGalaxy';
    }

    const allVendors = [...classification.vendors, ...additionalVendors];

    const result: AnalysisResult = {
      url,
      timestamp: new Date().toISOString(),
      device,
      vendors: allVendors,
      vendor_count: allVendors.length,
      ssp_count: classification.ssp_count,
      managed_service: detectedManagedService,
      categories: classification.categories,
      prebid: {
        detected: apiData.pbjs.present,
        config: apiData.pbjs.config,
        bid_responses: apiData.pbjs.bidResponses,
        bidders: apiData.pbjs.bidders,  // Client-side extracted
        network_bidders: apiData.networkBidders,  // Network-inferred fallback
        ad_formats: apiData.pbjs.adFormats,
        version: apiData.pbjs.version,
        ad_units_count: apiData.pbjs.adUnitsCount,
        instances: apiData.pbjs.instances.length > 0 ? apiData.pbjs.instances : undefined,  // P3: All instances
        bid_details: apiData.pbjs.bidDetails.length > 0 ? apiData.pbjs.bidDetails : undefined,  // P1: Bid details
      },
      gam: {
        detected: apiData.gam.present,
        slots: apiData.gam.slots || undefined,
        targeting: apiData.gam.targeting || undefined,
      },
      // P2: Include consent data if any CMP detected
      consent: (apiData.consent.tcf.detected || apiData.consent.usp.detected || apiData.consent.gpp.detected)
        ? apiData.consent
        : undefined,
      managed_services_detected: apiData.managedServices,
      custom_wrappers: apiData.customWrappers,
      network: {
        total_requests: networkRequests?.length || 0,
        classified_requests: classification.classified_count,
      },
    };

    console.log(`[MCP Handler] Analysis complete: ${result.vendor_count} vendors detected`);
    return result;

  } finally {
    client.close();
  }
}

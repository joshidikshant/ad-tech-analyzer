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
  };
  gam: {
    detected: boolean;
    slots?: any[];
    targeting?: Record<string, string[]> | null;
  };
  managed_services_detected: Record<string, boolean>;
  custom_wrappers: any[];
  network: {
    total_requests: number;
    classified_requests: number;
  };
}

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
      },
      gam: {
        detected: apiData.gam.present,
        slots: apiData.gam.slots || undefined,
        targeting: apiData.gam.targeting || undefined,
      },
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

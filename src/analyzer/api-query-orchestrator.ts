import { VENDOR_PATTERNS } from './vendor-patterns.js';

export type CustomWrapperCandidate = { key: string; methods: string[] };
export interface ChromeClient {
  evaluateScript(fn: string): Promise<any>;
}
// Consent/CMP data structure
export type ConsentData = {
  tcf: {
    detected: boolean;
    version: number | null;
    tcString: string | null;
    gdprApplies: boolean | null;
  };
  usp: {
    detected: boolean;
    uspString: string | null;  // e.g., "1YNN"
  };
  gpp: {
    detected: boolean;
    gppString: string | null;
    applicableSections: number[] | null;
  };
};

// Prebid instance info (for multiple wrappers)
export type PrebidInstance = {
  globalName: string;  // e.g., "pbjs", "mmPrebid", "voltaxPlayerPrebid"
  version: string | null;
  bidders: string[];
  adUnitsCount: number;
};

export type AdTechData = {
  pbjs: {
    present: boolean;
    config: unknown | null;
    bidResponses: unknown | null;
    bidders: string[];  // List of configured bidders from client-side extraction
    adFormats: string[];  // Ad formats used (e.g., ["banner", "video"])
    version: string | null;  // Prebid.js version
    adUnitsCount: number;  // Number of ad units configured
    instances: PrebidInstance[];  // All detected Prebid instances (via _pbjsGlobals)
  };
  gam: { present: boolean; slots: unknown[] | null; targeting: Record<string, string[]> | null };
  consent: ConsentData;  // CMP/Consent detection
  managedServices: {
    adthrive: boolean;
    freestar: boolean;
    raptive: boolean;
    mediavine: boolean;
    ezoic: boolean;
    adpushup: boolean;
    adapex: boolean;
    pubguru: boolean;
    vuukle: boolean;
    pubgalaxy: boolean;
  };
  networkBidders: string[];  // Bidders inferred from network requests (when client-side fails)
  customWrappers: CustomWrapperCandidate[];
  windowKeysSample: string[];
  attempts: number;
  lastSeenAt: string | null;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Valid resource types for ad-related network requests (per Gemini council review)
const VALID_AD_RESOURCE_TYPES = new Set(['script', 'xhr', 'fetch', 'image', 'ping']);

// Normalize vendor names to Prebid bidder codes
function normalizeBidderCode(name: string): string {
  const specialCases: Record<string, string> = {
    'Index Exchange': 'ix',
    'Google Ad Manager': 'gam',
    'Google AdX': 'adx',
    'Amazon APS': 'amazon',
    'Amazon': 'amazon',
    'AppNexus': 'appnexus',
    'Xandr': 'appnexus',
    '33Across': '33across',
    'TripleLift': 'triplelift',
  };
  return specialCases[name] || name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export interface NetworkRequest {
  url?: string;
  method?: string;
  type?: string;
  status?: number;
  resourceType?: string;
}

export async function queryAdTechAPIs(
  client: ChromeClient,
  networkRequests: NetworkRequest[] = []
): Promise<AdTechData> {
  const started = Date.now();
  const out: AdTechData = {
    pbjs: {
      present: false,
      config: null,
      bidResponses: null,
      bidders: [],
      adFormats: [],
      version: null,
      adUnitsCount: 0,
      instances: []  // All detected Prebid instances
    },
    gam: { present: false, slots: null, targeting: null },
    consent: {
      tcf: { detected: false, version: null, tcString: null, gdprApplies: null },
      usp: { detected: false, uspString: null },
      gpp: { detected: false, gppString: null, applicableSections: null }
    },
    managedServices: {
      adthrive: false,
      freestar: false,
      raptive: false,
      mediavine: false,
      ezoic: false,
      adpushup: false,
      adapex: false,
      pubguru: false,
      vuukle: false,
      pubgalaxy: false
    },
    networkBidders: [],
    customWrappers: [],
    windowKeysSample: [],
    attempts: 0,
    lastSeenAt: null
  };

  while (Date.now() - started < 20_000) {
    out.attempts++;
    const snap = await client.evaluateScript(`() => {
      // Debug: Log what wrapper objects exist
      const debugInfo = {
        hasWindowPbjs: !!window.pbjs,
        hasAdpushup: !!window.adpushup,
        adpushupKeys: window.adpushup ? Object.keys(window.adpushup).slice(0, 20) : [],
        hasPubfig: !!window.pubfig,
        pubfigKeys: window.pubfig ? Object.keys(window.pubfig).slice(0, 20) : [],
        hasFreestar: !!window.freestar,
        freestarKeys: window.freestar ? Object.keys(window.freestar).slice(0, 20) : []
      };
      console.log('[Debug Wrappers]', JSON.stringify(debugInfo));
      const w = window;
      const safe = (fn) => { try { return fn(); } catch { return null; } };
      const pbjs = w.pbjs;
      const gt = w.googletag;
      const pubads = safe(() => gt?.pubads?.());
      const slots = safe(() => pubads?.getSlots?.()?.map((s) => ({
        adUnitPath: safe(() => s.getAdUnitPath?.()),
        elementId: safe(() => s.getSlotElementId?.()),
        sizes: safe(() => s.getSizes?.())
      })));
      const targeting = safe(() => pubads?.getTargeting?.());
      const keys = safe(() => Object.keys(w)) || [];
      const likely = ["getConfig","getBidResponses","requestBids","setConfig","que"];
      const wrappers = keys.slice(0, 500).flatMap((k) => {
        try {
          const v = w[k];
          if (!v || (typeof v !== "object" && typeof v !== "function")) return [];
          const methods = likely.filter((m) => {
            try {
              return typeof v?.[m] === "function" || (m === "que" && Array.isArray(v?.que));
            } catch (e) {
              return false; // Ignore cross-origin access errors
            }
          });
          return methods.length ? [{ key: k, methods }] : [];
        } catch (e) {
          return []; // Ignore keys that throw on access
        }
      });
      // Extract detailed Prebid configuration
      // Check multiple sources: direct pbjs, or wrapped in managed services
      let pbjsConfig = safe(() => pbjs?.getConfig?.());
      let pbjsAdUnits = safe(() => pbjs?.adUnits);
      let pbjsVersion = safe(() => pbjs?.version);

      // Fallback: Try extracting from managed service wrappers
      // AdPushup wrapper
      if (!pbjsAdUnits && w.adpushup) {
        pbjsAdUnits = safe(() => w.adpushup?.pbjs?.adUnits) ||
                      safe(() => w.adpushup?.que?.pbjs?.adUnits);
        pbjsConfig ??= safe(() => w.adpushup?.pbjs?.getConfig?.());
        pbjsVersion ??= safe(() => w.adpushup?.pbjs?.version);
      }

      // Freestar/Pubfig wrapper
      if (!pbjsAdUnits && (w.freestar || w.pubfig)) {
        pbjsAdUnits = safe(() => w.pubfig?.pbjs?.adUnits) ||
                      safe(() => w.freestar?.pbjs?.adUnits) ||
                      safe(() => w._fsprebid?.adUnits);
        pbjsConfig ??= safe(() => w.pubfig?.pbjs?.getConfig?.()) ||
                       safe(() => w.freestar?.pbjs?.getConfig?.());
        pbjsVersion ??= safe(() => w.pubfig?.pbjs?.version) ||
                        safe(() => w.freestar?.pbjs?.version);
      }

      // Raptive wrapper
      if (!pbjsAdUnits && w.raptive) {
        pbjsAdUnits = safe(() => w.raptive?.pbjs?.adUnits);
        pbjsConfig ??= safe(() => w.raptive?.pbjs?.getConfig?.());
        pbjsVersion ??= safe(() => w.raptive?.pbjs?.version);
      }

      // Mediavine wrapper
      if (!pbjsAdUnits && w.mediavine) {
        pbjsAdUnits = safe(() => w.mediavine?.pbjs?.adUnits);
        pbjsConfig ??= safe(() => w.mediavine?.pbjs?.getConfig?.());
        pbjsVersion ??= safe(() => w.mediavine?.pbjs?.version);
      }

      // Extract all configured bidders from adUnits
      const bidders = new Set();
      const adFormats = new Set();
      if (Array.isArray(pbjsAdUnits)) {
        pbjsAdUnits.forEach(unit => {
          if (Array.isArray(unit?.bids)) {
            unit.bids.forEach(bid => {
              if (bid?.bidder) bidders.add(bid.bidder);
            });
          }
          // Extract ad formats (banner, video, native)
          if (unit?.mediaTypes) {
            Object.keys(unit.mediaTypes).forEach(type => adFormats.add(type));
          }
        });
      }

      // FALLBACK: If adUnits is empty/hidden, try getBidderRequests() for active auctions
      if (bidders.size === 0 && pbjs) {
        const bidderRequests = safe(() => pbjs.getBidderRequests?.()) || [];
        if (Array.isArray(bidderRequests)) {
          bidderRequests.forEach(req => {
            if (req?.bidderCode) bidders.add(req.bidderCode);
            // Extract from individual bids
            if (Array.isArray(req?.bids)) {
              req.bids.forEach(bid => {
                if (bid?.bidder) bidders.add(bid.bidder);
                if (bid?.mediaTypes) {
                  Object.keys(bid.mediaTypes).forEach(type => adFormats.add(type));
                }
              });
            }
          });
        }
      }

      // FALLBACK 2: Extract from config.bidderTimeout which lists all bidders
      if (bidders.size === 0 && pbjsConfig) {
        // Some configs have bidderSettings with all bidder names as keys
        const bidderSettings = safe(() => pbjsConfig.bidderSettings);
        if (bidderSettings && typeof bidderSettings === 'object') {
          Object.keys(bidderSettings).forEach(key => {
            if (key !== 'standard' && key !== 'default') bidders.add(key);
          });
        }
      }

      // Debug: Track extraction method
      let extractionMethod = 'none';
      if (Array.isArray(pbjsAdUnits) && pbjsAdUnits.length > 0) {
        extractionMethod = 'adUnits';
      } else if (bidders.size > 0) {
        extractionMethod = bidderRequests && bidderRequests.length > 0 ? 'getBidderRequests' : 'bidderSettings';
      }

      // Debug wrapper object structures
      const wrapperKeys = {
        adpushup: w.adpushup ? Object.keys(w.adpushup).slice(0, 30) : null,
        pubfig: w.pubfig ? Object.keys(w.pubfig).slice(0, 30) : null,
        freestar: w.freestar ? Object.keys(w.freestar).slice(0, 30) : null,
        raptive: w.raptive ? Object.keys(w.raptive).slice(0, 30) : null,
        mediavine: w.mediavine ? Object.keys(w.mediavine).slice(0, 30) : null
      };

      // ========== P3: _pbjsGlobals - Detect ALL Prebid instances ==========
      // Many sites use custom wrappers like mmPrebid, voltaxPlayerPrebid, etc.
      const pbjsInstances = [];
      const pbjsGlobals = w._pbjsGlobals || [];

      // Always include default 'pbjs' if it exists and not in globals
      const allGlobals = [...new Set([...pbjsGlobals, 'pbjs'])];

      for (const globalName of allGlobals) {
        try {
          const instance = w[globalName];
          if (instance && typeof instance === 'object') {
            const hasGetConfig = typeof instance.getConfig === 'function';
            const hasAdUnits = Array.isArray(instance.adUnits);
            const hasVersion = typeof instance.version === 'string';

            if (hasGetConfig || hasAdUnits || hasVersion) {
              const instanceBidders = new Set();
              const instanceAdUnits = safe(() => instance.adUnits) || [];

              if (Array.isArray(instanceAdUnits)) {
                instanceAdUnits.forEach(unit => {
                  if (Array.isArray(unit?.bids)) {
                    unit.bids.forEach(bid => {
                      if (bid?.bidder) instanceBidders.add(bid.bidder);
                    });
                  }
                });
              }

              // Fallback to getBidderRequests
              if (instanceBidders.size === 0) {
                const bidderRequests = safe(() => instance.getBidderRequests?.()) || [];
                if (Array.isArray(bidderRequests)) {
                  bidderRequests.forEach(req => {
                    if (req?.bidderCode) instanceBidders.add(req.bidderCode);
                  });
                }
              }

              pbjsInstances.push({
                globalName,
                version: safe(() => instance.version) || null,
                bidders: Array.from(instanceBidders),
                adUnitsCount: instanceAdUnits.length
              });

              // Merge bidders into main set
              instanceBidders.forEach(b => bidders.add(b));
            }
          }
        } catch (e) {
          // Ignore inaccessible globals
        }
      }

      // ========== P2: CMP/Consent Detection ==========
      const consentData = {
        tcf: { detected: false, version: null, tcString: null, gdprApplies: null },
        usp: { detected: false, uspString: null },
        gpp: { detected: false, gppString: null, applicableSections: null }
      };

      // TCF v2 (__tcfapi)
      if (typeof w.__tcfapi === 'function') {
        consentData.tcf.detected = true;
        try {
          w.__tcfapi('getTCData', 2, (tcData, success) => {
            if (success && tcData) {
              consentData.tcf.version = tcData.cmpVersion || 2;
              consentData.tcf.tcString = tcData.tcString || null;
              consentData.tcf.gdprApplies = tcData.gdprApplies ?? null;
            }
          });
        } catch (e) {}
      }

      // USP/CCPA (__uspapi)
      if (typeof w.__uspapi === 'function') {
        consentData.usp.detected = true;
        try {
          w.__uspapi('getUSPData', 1, (uspData, success) => {
            if (success && uspData) {
              consentData.usp.uspString = uspData.uspString || null;
            }
          });
        } catch (e) {}
      }

      // GPP (__gpp)
      if (typeof w.__gpp === 'function') {
        consentData.gpp.detected = true;
        try {
          w.__gpp('ping', (data, success) => {
            if (success && data) {
              consentData.gpp.gppString = data.gppString || null;
              consentData.gpp.applicableSections = data.applicableSections || null;
            }
          });
        } catch (e) {}
      }

      return {
        pbjsPresent: !!pbjs || pbjsInstances.length > 0,
        pbjsConfig: pbjsConfig,
        pbjsBidResponses: safe(() => pbjs?.getBidResponses?.()),
        pbjsBidders: Array.from(bidders),
        pbjsAdFormats: Array.from(adFormats),
        pbjsVersion: pbjsVersion,  // Use wrapper-aware version
        pbjsAdUnitsCount: Array.isArray(pbjsAdUnits) ? pbjsAdUnits.length : 0,
        pbjsInstances: pbjsInstances,  // P3: All detected Prebid instances
        pbjsGlobalsFound: pbjsGlobals.length > 0 ? pbjsGlobals : null,  // Debug info
        // Only mark GAM as present if pubads() is available (GPT library loaded)
        gamPresent: !!pubads,
        gamSlots: slots || null,
        gamTargeting: (targeting && typeof targeting === "object") ? targeting : null,
        // P2: Consent/CMP data
        consent: consentData,
        adthrive: !!w.adthrive,
        freestar: !!(w.freestar || w._fsprebid || w.pubfig),
        raptive: !!w.raptive,
        mediavine: !!w.mediavine,
        ezoic: !!(w.ezoic || w.ezstandalone),
        adpushup: !!w.adpushup,
        adapex: !!w.aaw,
        pubguru: !!w.pubguru,
        vuukle: !!w._vuuklehb,
        pubgalaxy: !!(w.pubgalaxy || w.titantag || w.titanWrapper),
        wrappers,
        keysSample: keys.slice(0, 200),
        wrapperKeys,  // Add wrapper object keys for debugging
        extractionMethod  // Track which method extracted bidders
      };
    }`);

    console.log(`[API Query] Attempt ${out.attempts}: snap =`, JSON.stringify(snap)?.slice(0, 300));
    if (snap?.extractionMethod && snap.extractionMethod !== 'none') {
      console.log(`[EXTRACTION] Method: ${snap.extractionMethod}, Bidders: ${snap.pbjsBidders?.length || 0}`);
    }
    if (snap?.wrapperKeys) {
      console.log('[DEBUG] Wrapper object keys:', JSON.stringify(snap.wrapperKeys, null, 2));
    }
    if (snap) {
      out.pbjs.present ||= !!snap.pbjsPresent;
      out.pbjs.config ??= snap.pbjsConfig ?? null;
      out.pbjs.bidResponses ??= snap.pbjsBidResponses ?? null;
      out.pbjs.bidders = Array.isArray(snap.pbjsBidders) && snap.pbjsBidders.length > 0 ? snap.pbjsBidders : out.pbjs.bidders;
      out.pbjs.adFormats = Array.isArray(snap.pbjsAdFormats) && snap.pbjsAdFormats.length > 0 ? snap.pbjsAdFormats : out.pbjs.adFormats;
      out.pbjs.version ??= snap.pbjsVersion ?? null;
      out.pbjs.adUnitsCount = snap.pbjsAdUnitsCount || out.pbjs.adUnitsCount;

      // P3: Prebid instances from _pbjsGlobals
      if (Array.isArray(snap.pbjsInstances) && snap.pbjsInstances.length > 0) {
        out.pbjs.instances = snap.pbjsInstances as PrebidInstance[];
        if (snap.pbjsGlobalsFound) {
          console.log(`[P3 _pbjsGlobals] Found ${snap.pbjsGlobalsFound.length} globals: ${snap.pbjsGlobalsFound.join(', ')}`);
        }
      }

      // P2: CMP/Consent data
      if (snap.consent) {
        if (snap.consent.tcf?.detected) {
          out.consent.tcf = snap.consent.tcf;
          console.log(`[P2 Consent] TCF detected, gdprApplies: ${snap.consent.tcf.gdprApplies}`);
        }
        if (snap.consent.usp?.detected) {
          out.consent.usp = snap.consent.usp;
          console.log(`[P2 Consent] USP detected, string: ${snap.consent.usp.uspString}`);
        }
        if (snap.consent.gpp?.detected) {
          out.consent.gpp = snap.consent.gpp;
          console.log(`[P2 Consent] GPP detected`);
        }
      }

      out.gam.present ||= !!snap.gamPresent;
      out.gam.slots ??= snap.gamSlots ?? null;
      out.gam.targeting ??= snap.gamTargeting ?? null;
      out.managedServices.adthrive ||= !!snap.adthrive;
      out.managedServices.freestar ||= !!snap.freestar;
      out.managedServices.raptive ||= !!snap.raptive;
      out.managedServices.mediavine ||= !!snap.mediavine;
      out.managedServices.ezoic ||= !!snap.ezoic;
      out.managedServices.adpushup ||= !!snap.adpushup;
      out.managedServices.adapex ||= !!snap.adapex;
      out.managedServices.pubguru ||= !!snap.pubguru;
      out.managedServices.vuukle ||= !!snap.vuukle;
      out.managedServices.pubgalaxy ||= !!snap.pubgalaxy;
      out.customWrappers = Array.isArray(snap.wrappers) ? (snap.wrappers as CustomWrapperCandidate[]) : out.customWrappers;
      out.windowKeysSample = Array.isArray(snap.keysSample) ? (snap.keysSample as string[]) : out.windowKeysSample;

      // Only break if we have meaningful data
      const anyManagedService = Object.values(out.managedServices).some(v => v);
      const hasBidders = out.pbjs.bidders.length > 0;
      const hasGamSlots = Array.isArray(out.gam.slots) && out.gam.slots.length > 0;

      // If managed service detected, keep polling until we get bidders or timeout
      if (anyManagedService) {
        if (hasBidders) break; // Got bidders, we're done
        // Otherwise continue polling (managed services lazy-load config)
      } else {
        // No managed service - break if we have BOTH prebid bidders AND GAM slots (or timeout)
        // This ensures we capture GAM slots which may load after pbjs
        if (hasBidders && hasGamSlots) break;
        // Also break if we've tried 3+ times and have at least some data
        if (out.attempts >= 3 && (out.pbjs.present || out.gam.present)) break;
      }
    }

    // Increase delay for managed services (lazy loading can take 5-10 seconds)
    const anyManagedService = Object.values(out.managedServices).some(v => v);
    await sleep(anyManagedService ? 3000 : 2000);
  }

  // FALLBACK: Extract bidders from network requests if client-side extraction failed
  // Uses VENDOR_PATTERNS for robust detection with resourceType filtering (per Gemini council review)
  if (out.pbjs.bidders.length === 0 && networkRequests.length > 0) {
    console.log('[Network Fallback] Client-side extraction failed, analyzing network requests...');

    const networkBidders = new Set<string>();

    // Check both SSP and header_bidding categories for bidders
    const bidderCategories = VENDOR_PATTERNS.filter(c =>
      c.category === 'ssp' || c.category === 'header_bidding'
    );

    for (const category of bidderCategories) {
      for (const req of networkRequests) {
        if (!req.url) continue;

        // Filter by resource type to avoid false positives (per Gemini council review)
        const resourceType = req.resourceType || req.type || '';
        if (!VALID_AD_RESOURCE_TYPES.has(resourceType)) continue;

        // Check each vendor's patterns
        for (const vendor of category.vendors) {
          // Skip Prebid.js itself (it's a wrapper, not a bidder)
          if (vendor.name === 'Prebid.js' || vendor.name === 'Index Wrapper') continue;

          const matches = vendor.patterns.some(pattern => {
            try {
              const regex = new RegExp(pattern.url, 'i');
              return regex.test(req.url!);
            } catch {
              return false;
            }
          });

          if (matches) {
            const bidderCode = normalizeBidderCode(vendor.name);
            networkBidders.add(bidderCode);
            console.log(`[Network Fallback] Detected ${vendor.name} → ${bidderCode} from: ${req.url.slice(0, 80)}`);
          }
        }
      }
    }

    if (networkBidders.size > 0) {
      out.networkBidders = Array.from(networkBidders);
      console.log(`[Network Fallback] Extracted ${out.networkBidders.length} bidders from network: ${out.networkBidders.join(', ')}`);
    }
  }

  out.lastSeenAt = new Date().toISOString();
  return out;
}


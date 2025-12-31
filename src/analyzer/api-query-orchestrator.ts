export type CustomWrapperCandidate = { key: string; methods: string[] };
export interface ChromeClient {
  evaluateScript(fn: string): Promise<any>;
}
export type AdTechData = {
  pbjs: {
    present: boolean;
    config: unknown | null;
    bidResponses: unknown | null;
    bidders: string[];  // List of configured bidders (e.g., ["appnexus", "rubicon", "pubmatic"])
    adFormats: string[];  // Ad formats used (e.g., ["banner", "video"])
    version: string | null;  // Prebid.js version
    adUnitsCount: number;  // Number of ad units configured
  };
  gam: { present: boolean; slots: unknown[] | null; targeting: Record<string, string[]> | null };
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
  customWrappers: CustomWrapperCandidate[];
  windowKeysSample: string[];
  attempts: number;
  lastSeenAt: string | null;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function queryAdTechAPIs(client: ChromeClient): Promise<AdTechData> {
  const started = Date.now();
  const out: AdTechData = {
    pbjs: {
      present: false,
      config: null,
      bidResponses: null,
      bidders: [],
      adFormats: [],
      version: null,
      adUnitsCount: 0
    },
    gam: { present: false, slots: null, targeting: null },
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
    customWrappers: [],
    windowKeysSample: [],
    attempts: 0,
    lastSeenAt: null
  };

  while (Date.now() - started < 30_000) {
    out.attempts++;
    const snap = await client.evaluateScript(`() => {
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

      return {
        pbjsPresent: !!pbjs,
        pbjsConfig: pbjsConfig,
        pbjsBidResponses: safe(() => pbjs?.getBidResponses?.()),
        pbjsBidders: Array.from(bidders),
        pbjsAdFormats: Array.from(adFormats),
        pbjsVersion: pbjsVersion,  // Use wrapper-aware version
        pbjsAdUnitsCount: Array.isArray(pbjsAdUnits) ? pbjsAdUnits.length : 0,
        gamPresent: !!gt,
        gamSlots: slots || null,
        gamTargeting: (targeting && typeof targeting === "object") ? targeting : null,
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
        keysSample: keys.slice(0, 200)
      };
    }`);

    console.log(`[API Query] Attempt ${out.attempts}: snap =`, JSON.stringify(snap)?.slice(0, 300));
    if (snap) {
      out.pbjs.present ||= !!snap.pbjsPresent;
      out.pbjs.config ??= snap.pbjsConfig ?? null;
      out.pbjs.bidResponses ??= snap.pbjsBidResponses ?? null;
      out.pbjs.bidders = Array.isArray(snap.pbjsBidders) && snap.pbjsBidders.length > 0 ? snap.pbjsBidders : out.pbjs.bidders;
      out.pbjs.adFormats = Array.isArray(snap.pbjsAdFormats) && snap.pbjsAdFormats.length > 0 ? snap.pbjsAdFormats : out.pbjs.adFormats;
      out.pbjs.version ??= snap.pbjsVersion ?? null;
      out.pbjs.adUnitsCount = snap.pbjsAdUnitsCount || out.pbjs.adUnitsCount;
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

      const anyManagedService = Object.values(out.managedServices).some(v => v);
      if (out.pbjs.present || out.gam.present || anyManagedService)
        break;
    }
    await sleep(2000);
  }

  out.lastSeenAt = new Date().toISOString();
  return out;
}


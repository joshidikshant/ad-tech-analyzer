// Type definitions for Amazon Publisher Services (APS) data collection
// Generated for ad-tech-analyzer

/**
 * Represents a single ad slot configuration in APS.
 */
export interface ApsSlot {
  slotID: string;
  slotName: string;
  sizes: number[][];
}

/**
 * Represents the configuration object for APS.
 */
export interface ApsConfig {
  pubID?: string;
  adServer?: string;
  bidTimeout?: number;
  params?: Record<string, any>;
  [key: string]: any;
}

/**
 * Represents a bid response from APS.
 */
export interface ApsBid {
  slotID: string;
  amznbid: string;
  amzniid: string;
  amznp: string;
  amznsz: string;
  size?: number[];
  host?: string;
  [key: string]: any;
}

/**
 * The main interface for collected APS data.
 */
export interface ApsData {
  config: ApsConfig;
  slots: ApsSlot[];
  bids: ApsBid[];
  targeting: Record<string, any>;
  version: string;
  enabledFeatures: string[];
}

/**
 * Extracts relevant Amazon APS data from the window.apstag object.
 *
 * @returns {ApsData | null} The collected APS data, or null if apstag is not available.
 */
export function extractAmazonData(): ApsData | null {
  if (typeof window === 'undefined' || !window.apstag) {
    // APS is not present on the page
    return null;
  }

  const apstag = window.apstag;
  const apsData: Partial<ApsData> = {
    config: {},
    slots: [],
    bids: [],
    targeting: {},
    version: 'unknown',
    enabledFeatures: []
  };

  try {
    // --- Config ---
    // Attempt to access internal configuration if available
    try {
      if (typeof apstag._getConfig === 'function') {
        const config = apstag._getConfig();
        if (config) {
          apsData.config = config as ApsConfig;
        }
      }
    } catch (e) {
      console.warn('[APS Collector] Error extracting config:', e);
    }

    // --- Slots ---
    // Attempt to retrieve slot mapping using internal method
    try {
      if (typeof apstag._getSlotIdToNameMapping === 'function') {
        const mapping = apstag._getSlotIdToNameMapping();
        if (mapping && typeof mapping === 'object') {
           // The mapping is typically SlotID -> SlotName or similar. 
           // We might need to reconstruct Slot objects if the full config isn't available.
           // If we captured slots from a fetchBids call (via shim), we would have more data.
           // Here we just list what we find.
           apsData.slots = Object.entries(mapping).map(([id, name]) => ({
             slotID: id,
             slotName: name as string,
             sizes: [] // Sizes might not be available in this mapping
           }));
        }
      }
    } catch (e) {
      console.warn('[APS Collector] Error extracting slots:', e);
    }

    // --- Bids & Targeting ---
    // Access current targeting set by APS
    try {
        // There isn't a public "getAllBids" in APS like Prebid.
        // However, we can look at the targeting currently set on the window or
        // internal state if exposed.
        // A common pattern is to check what's been prepared for GPT.
        // For this static collector, we might check if there's a command queue
        // or history if the user has implemented a shim (not part of this scope).
        
        // We can try to guess targeting if it's attached to the googletag slots, 
        // but that falls under GAM collector responsibilities.
        
        // If apstag exposes targeting keys:
        if (typeof apstag._Q === 'object') {
            // Sometimes the queue or internal state reveals info.
            // For now, we leave bids empty unless we find a specific public method.
        }
    } catch (e) {
        console.warn('[APS Collector] Error extracting bids/targeting:', e);
    }
    
    // --- Version & Features ---
    try {
        // Checking for standard version properties or inferring from methods
        if (typeof apstag.version === 'string') {
            apsData.version = apstag.version;
        } else if ((apstag as any)._v) {
             apsData.version = (apstag as any)._v;
        }

        const features = [];
        if (typeof apstag.fetchBids === 'function') features.push('fetchBids');
        if (typeof apstag.renderImp === 'function') features.push('renderImp');
        if (typeof apstag.init === 'function') features.push('init');
        if (typeof apstag.setDisplayBids === 'function') features.push('setDisplayBids');
        apsData.enabledFeatures = features;
    } catch (e) {
         console.warn('[APS Collector] Error extracting version/features:', e);
    }

  } catch (error) {
    console.error('[APS Collector] General error extracting APS data:', error);
    return null;
  }

  return apsData as ApsData;
}

// Augment the Window interface to include apstag
declare global {
  interface Window {
    apstag?: {
      init: (config: any) => void;
      fetchBids: (options: any, callback: Function) => void;
      setDisplayBids: () => void;
      renderImp: (doc: Document, impId: string) => void;
      _getSlotIdToNameMapping?: () => Record<string, string>;
      _getConfig?: () => ApsConfig;
      version?: string;
      [key: string]: any;
    };
  }
}

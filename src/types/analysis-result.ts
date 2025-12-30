/**
 * Unified schema for Ad-Tech Analysis Results
 * Shared between CLI, API Server, and Dashboard
 *
 * @packageDocumentation
 */

/**
 * Network request captured during analysis
 */
export interface NetworkRequest {
  url: string;
  method: string;
  type: string;
  status?: number;
}

/**
 * Prebid.js configuration and state
 */
export interface PrebidData {
  detected: boolean;
  version?: string | null;
  config?: any;
  bid_responses?: any;
  bidders?: string[];
  adUnits?: number;
}

/**
 * Google Ad Manager configuration and state
 */
export interface GAMData {
  detected: boolean;
  slots?: Array<{
    adUnitPath?: string;
    elementId?: string;
    sizes?: string[];
  }> | null;
  targeting?: Record<string, string[]> | null;
}

/**
 * Managed service detection flags
 */
export interface ManagedServices {
  adthrive: boolean;
  freestar: boolean;
  raptive: boolean;
  mediavine: boolean;
  ezoic: boolean;
  adpushup: boolean;
  adapex: boolean;
  pubguru: boolean;
  vuukle: boolean;
}

/**
 * Custom wrapper candidate (detected via window object inspection)
 */
export interface CustomWrapper {
  key: string;
  methods: string[];
}

/**
 * Vendor categorization by ad-tech type
 */
export interface VendorCategories {
  ssp?: string[];
  ad_server?: string[];
  header_bidding?: string[];
  identity?: string[];
  dmp?: string[];
  consent?: string[];
  analytics?: string[];
  [category: string]: string[] | undefined;
}

/**
 * Complete analysis result
 */
export interface AnalysisResult {
  /** URL that was analyzed */
  url: string;

  /** ISO 8601 timestamp of analysis */
  timestamp: string;

  /** Device type used for analysis */
  device: 'desktop' | 'mobile';

  /** List of all detected vendor names */
  vendors: string[];

  /** Total number of unique vendors */
  vendor_count: number;

  /** Number of SSP (Supply-Side Platform) vendors */
  ssp_count: number;

  /** Detected managed service provider, if any */
  managed_service: string | null;

  /** Vendors organized by category */
  categories: VendorCategories;

  /** Prebid.js detection and configuration */
  prebid: PrebidData;

  /** Google Ad Manager detection and configuration */
  gam: GAMData;

  /** Managed service detection flags */
  managed_services_detected: ManagedServices;

  /** Custom wrapper candidates detected via window inspection */
  custom_wrappers: CustomWrapper[];

  /** Network request statistics */
  network: {
    total_requests: number;
    classified_requests: number;
  };

  /** Number of detection polling attempts (optional) */
  detection_attempts?: number;
}

/**
 * API response wrapper for analysis results
 */
export interface AnalysisAPIResponse {
  success: boolean;
  data?: AnalysisResult;
  error?: string;
}

/**
 * Vendor classification report (from network classifier)
 */
export interface VendorReport {
  vendors: string[];
  ssp_count: number;
  managed_service: string | null;
  prebid_detected: boolean;
  gam_detected: boolean;
  categories: VendorCategories;
}

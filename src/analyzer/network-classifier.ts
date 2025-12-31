import { VENDOR_PATTERNS } from './vendor-patterns';

export interface NetworkRequest {
  url: string;
  method: string;
  type: string;
  status?: number;
}

export interface VendorReport {
  vendors: string[];
  ssp_count: number;
  managed_service: string | null;
  prebid_detected: boolean;
  gam_detected: boolean;
  categories: Record<string, string[]>;
}

export function classifyNetworkRequests(requests: NetworkRequest[]): VendorReport {
  const detectedVendors = new Set<string>();
  const categorizedVendors: Record<string, string[]> = {};

  // Guard against non-array input
  if (!Array.isArray(requests)) {
    console.warn('[Classifier] requests is not an array:', typeof requests);
    requests = [];
  }

  for (const request of requests) {
    for (const category of VENDOR_PATTERNS) {
      for (const vendor of category.vendors) {
        for (const pattern of vendor.patterns) {
          const regex = new RegExp(pattern.url, 'i');
          const urlMatches = regex.test(request.url);

          // Check if resource type matches (if pattern specifies types)
          // If pattern.type is empty array, match any type
          // If pattern.type has values, request.type must be in that list
          const typeMatches = !pattern.type ||
                              pattern.type.length === 0 ||
                              (request.type && pattern.type.includes(request.type));

          if (urlMatches && typeMatches) {
            detectedVendors.add(vendor.name);

            if (!categorizedVendors[category.category]) {
              categorizedVendors[category.category] = [];
            }
            if (!categorizedVendors[category.category].includes(vendor.name)) {
              categorizedVendors[category.category].push(vendor.name);
            }
          }
        }
      }
    }
  }

  // Detect Prebid
  const prebid_detected = requests.some(r =>
    /prebid.*\.js/i.test(r.url) || /\/hb\//i.test(r.url)
  );

  // Detect GAM
  const gam_detected = requests.some(r =>
    /gpt\.js/i.test(r.url) || /doubleclick\.net/i.test(r.url)
  );

  // Detect managed service
  const managedServices = categorizedVendors['managed_service'] || [];
  const managed_service = managedServices.length > 0 ? managedServices[0] : null;

  // Count SSPs
  const ssp_count = (categorizedVendors['ssp'] || []).length;

  return {
    vendors: Array.from(detectedVendors),
    ssp_count,
    managed_service,
    prebid_detected,
    gam_detected,
    categories: categorizedVendors
  };
}

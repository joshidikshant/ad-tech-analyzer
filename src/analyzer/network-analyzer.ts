import type { NetworkRequest } from './network-stack-analyzer';

export type { NetworkRequest, AnalysisResult, VendorMatch, InitiatorChain, AnalyzerOptions } from './network-stack-analyzer';
export { analyzeNetworkStack } from './network-stack-analyzer';

export interface VendorReport {
  vendors: string[];
  ssp_count: number;
  managed_service: string | null;
  prebid_detected: boolean;
  gam_detected: boolean;
}

export function analyzeNetworkRequests(requests: NetworkRequest[]): VendorReport {
  const vendorMatchers = new Map<RegExp, string>([
    [/(\.|^)doubleclick\.net\b|(\.|^)googlesyndication\.com\b|\/gpt\.js(\?|$)/i, 'Google Ad Manager'],
    [/\/prebid(\.min)?\.js(\?|$)|prebid\.org|pbjs/i, 'Prebid.js'],
    [/(\.|^)pubguru\.io\b|(\.|^)monetizemore\.com\b/i, 'MonetizeMore'],
    [/(\.|^)cdn\.freestar\.com\b|(\.|^)freestar-static\.com\b/i, 'Freestar'],
    [/(\.|^)ezoic\.net\b|(\.|^)ezodn\.com\b|(\.|^)ezoic\.com\b/i, 'Ezoic'],
    [/(\.|^)raptive\.com\b|(\.|^)cafemedia\.com\b/i, 'Raptive'],
    [/(\.|^)mediavine\.com\b|(\.|^)mv-ad\.net\b/i, 'Mediavine'],
    [/(\.|^)rubiconproject\.com\b|fastlane\.rubiconproject/i, 'Rubicon'],
    [/(\.|^)openx\.net\b|servedbyopenx\.com/i, 'OpenX'],
    [/(\.|^)pubmatic\.com\b|ads\.pubmatic\.com/i, 'PubMatic'],
    [/(\.|^)indexww\.com\b|(\.|^)casalemedia\.com\b/i, 'Index Exchange'],
    [/(\.|^)adnxs\.com\b|(\.|^)xandr\.com\b/i, 'Xandr'],
    [/(\.|^)criteo\.com\b|(\.|^)criteo\.net\b/i, 'Criteo'],
    [/(\.|^)sovrn\.com\b|(\.|^)lijit\.com\b/i, 'Sovrn'],
  ]);

  const vendors = new Set<string>();
  const sspVendors = new Set<string>();
  let managed_service: string | null = null;
  let prebid_detected = false;
  let gam_detected = false;
  const bidUrlRe = /\/(openrtb|openrtb2|auction|bid)(\/|$)|[?&](openrtb|auction|bid)=/i;
  const cookieSyncRe = /\/(sync|usersync|setuid|cookie|match)(\/|$)|[?&](uid|gdpr|us_privacy|gpp)=/i;
  const managedServices = new Set(['MonetizeMore', 'Freestar', 'Ezoic', 'Raptive', 'Mediavine']);
  const ssps = new Set(['Rubicon', 'OpenX', 'PubMatic', 'Index Exchange', 'Xandr', 'Criteo', 'Sovrn']);

  for (const r of requests) {
    const url = r.url || '';
    const matched: string[] = [];
    for (const [re, name] of vendorMatchers) if (re.test(url)) matched.push(name);
    for (const name of matched) vendors.add(name);
    if (matched.includes('Google Ad Manager')) gam_detected = true;
    if (matched.includes('Prebid.js')) prebid_detected = true;
    const isScript = r.type === 'script' || /\.js(\?|$)/i.test(url);
    if (isScript && !managed_service) for (const n of matched) if (managedServices.has(n)) { managed_service = n; break; }
    if (bidUrlRe.test(url) || cookieSyncRe.test(url)) for (const n of matched) if (ssps.has(n)) sspVendors.add(n);
  }

  if (!managed_service) for (const ms of managedServices) if (vendors.has(ms)) { managed_service = ms; break; }
  for (const ssp of ssps) if (vendors.has(ssp)) sspVendors.add(ssp);

  return { vendors: [...vendors].sort(), ssp_count: sspVendors.size, managed_service, prebid_detected, gam_detected };
}

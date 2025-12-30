import { chromium, Browser, BrowserContext, Page, Request } from 'playwright';

export interface NetworkRequest {
  url: string;
  method: string;
  type: string;
  status?: number;
  size?: number;
  startTime: number;
  endTime?: number;
  duration?: number;
  initiator?: {
    type: string;
    url?: string;
    lineNumber?: number;
  };
}

export interface VendorMatch {
  name: string;
  category: 'managed_service' | 'header_bidding' | 'ad_server' | 'ssp' | 'analytics' | 'identity' | 'other';
  pattern: string;
  matchedUrl: string;
}

export interface InitiatorChain {
  targetUrl: string;
  initiatorUrl: string;
  depth: number;
}

export interface AnalysisResult {
  url: string;
  timestamp: string;
  pageType: 'article' | 'home' | 'unknown';
  device: 'mobile' | 'desktop';
  loadTime: number;
  vendors: VendorMatch[];
  requests: NetworkRequest[];
  initiatorChains: InitiatorChain[];
}

export interface AnalyzerOptions {
  debug?: boolean;
  device?: 'mobile' | 'desktop';
  timeout?: number;
}

const VENDOR_PATTERNS = [
  // Managed Services (Codex-improved)
  { name: 'Freestar', pattern: 'a\\.pub\\.network\\/[^/]+\\/pubfig|cdn\\.freestar\\.com|freestar-static\\.com', category: 'managed_service' },
  { name: 'Ezoic', pattern: 'ezoic\\.net|ezoic\\.com|ezodn\\.com', category: 'managed_service' },
  { name: 'AdPushup', pattern: 'adpushup\\.js|adpushup\\.com', category: 'managed_service' },
  { name: 'Mediavine', pattern: 'mediavine\\.com|mv-ad\\.net', category: 'managed_service' },
  { name: 'Raptive', pattern: 'cafemedia\\.com|raptive\\.com', category: 'managed_service' },
  { name: 'Marfeel', pattern: 'marfeel\\.com|sdk\\.marfeel', category: 'managed_service' },
  { name: 'Sortable', pattern: 'sortable\\.com|servedbysortable', category: 'managed_service' },
  { name: 'MonetizeMore', pattern: 'monetizemore\\.com|pubguru\\.io', category: 'managed_service' },
  // Header Bidding
  { name: 'Prebid.js', pattern: 'prebid\\.js|/prebid/|/hb/', category: 'header_bidding' },
  { name: 'Prebid Server', pattern: 'prebid-server|/openrtb2/auction', category: 'header_bidding' },
  { name: 'Amazon APS', pattern: 'apstag\\.js|c\\.amazon-adsystem\\.com', category: 'header_bidding' },
  // Ad Servers
  { name: 'Google Ad Manager', pattern: 'googlesyndication\\.com|doubleclick\\.net|gpt\\.js', category: 'ad_server' },
  // SSPs (expanded)
  { name: 'AppNexus', pattern: 'adnxs\\.com|prebid\\.adnxs\\.com', category: 'ssp' },
  { name: 'Rubicon', pattern: 'rubiconproject\\.com|fastlane\\.rubiconproject', category: 'ssp' },
  { name: 'OpenX', pattern: 'openx\\.net|servedbyopenx\\.com', category: 'ssp' },
  { name: 'PubMatic', pattern: 'pubmatic\\.com|ads\\.pubmatic\\.com', category: 'ssp' },
  { name: 'Index Exchange', pattern: 'indexww\\.com|casalemedia\\.com', category: 'ssp' },
  { name: 'Sovrn', pattern: 'sovrn\\.com|lijit\\.com', category: 'ssp' },
  { name: 'TripleLift', pattern: 'triplelift\\.com|tlx\\.3lift\\.com', category: 'ssp' },
  { name: 'Criteo', pattern: 'criteo\\.com|criteo\\.net', category: 'ssp' },
  { name: 'Sharethrough', pattern: 'sharethrough\\.com|btloader\\.com', category: 'ssp' },
  { name: 'GumGum', pattern: 'gumgum\\.com|g2\\.gumgum\\.com', category: 'ssp' },
  { name: 'Xandr', pattern: 'xandr\\.com|adnxs-simple\\.com', category: 'ssp' },
  { name: '33Across', pattern: '33across\\.com|tynt\\.com', category: 'ssp' },
  // Identity
  { name: 'ID5', pattern: 'id5-sync\\.com|id5\\.io', category: 'identity' },
  { name: 'UID2', pattern: 'unified-id\\.org|uidapi\\.com', category: 'identity' },
  { name: 'LiveRamp', pattern: 'ats\\.rlcdn\\.com|liveramp\\.com', category: 'identity' },
  // Analytics & Verification
  { name: 'Moat', pattern: 'moatads\\.com|z\\.moatads\\.com', category: 'analytics' },
  { name: 'IAS', pattern: 'integralads\\.com|adsafeprotected\\.com', category: 'analytics' },
  { name: 'DoubleVerify', pattern: 'doubleverify\\.com|dvtps\\.com', category: 'analytics' },
  { name: 'Comscore', pattern: 'comscore\\.com|scorecardresearch\\.com', category: 'analytics' }
] as const;

export async function analyzeNetworkStack(
  targetUrl: string,
  options: AnalyzerOptions = {}
): Promise<AnalysisResult> {
  const isMobile = options.device === 'mobile';
  const userAgent = isMobile
    ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  const browser: Browser = await chromium.launch({ headless: true });
  const context: BrowserContext = await browser.newContext({
    userAgent,
    viewport: isMobile ? { width: 375, height: 812 } : { width: 1280, height: 720 },
    deviceScaleFactor: isMobile ? 2 : 1,
    isMobile: isMobile,
    hasTouch: isMobile,
  });

  const page: Page = await context.newPage();
  const client = await context.newCDPSession(page);

  const requests: Map<string, NetworkRequest> = new Map();
  const requestInitiators: Map<string, string> = new Map(); // requestId -> initiatorUrl

  // Enable Network domain in CDP for detailed initiator info
  await client.send('Network.enable');

  client.on('Network.requestWillBeSent', (event: any) => {
    const { requestId, request, initiator, timestamp } = event;
    const initiatorUrl = initiator?.url || (initiator?.stack?.callFrames?.[0]?.url);
    
    // Store initiator for this request ID
    if (initiatorUrl) {
      requestInitiators.set(requestId, initiatorUrl);
    }

    requests.set(requestId, {
      url: request.url,
      method: request.method,
      type: request.resourceType || 'unknown',
      startTime: timestamp,
      initiator: {
        type: initiator.type,
        url: initiatorUrl,
        lineNumber: initiator?.stack?.callFrames?.[0]?.lineNumber
      }
    });
  });

  client.on('Network.responseReceived', (event: any) => {
    const { requestId, response, timestamp } = event;
    const req = requests.get(requestId);
    if (req) {
      req.status = response.status;
    }
  });

  client.on('Network.loadingFinished', (event: any) => {
    const { requestId, timestamp, encodedDataLength } = event;
    const req = requests.get(requestId);
    if (req) {
      req.endTime = timestamp;
      req.duration = (req.endTime - req.startTime) * 1000; // Convert to ms
      req.size = encodedDataLength;
    }
  });

  try {
    let finalUrl = targetUrl;
    if (options.debug) {
      const urlObj = new URL(targetUrl);
      urlObj.searchParams.set('pbjs_debug', 'true');
      finalUrl = urlObj.toString();
    }

    const startTime = Date.now();
    // Use domcontentloaded instead of networkidle - ad-heavy pages never reach networkidle
    await page.goto(finalUrl, { waitUntil: 'domcontentloaded', timeout: options.timeout || 30000 });

    // Wait for ad tech to initialize (15s for safety)
    await page.waitForTimeout(15000);

    if (options.debug) {
      await page.evaluate(() => {
        try {
          // @ts-ignore
          if (window.googletag && window.googletag.openConsole) {
            // @ts-ignore
            window.googletag.openConsole();
          }
        } catch (e) { console.error('Failed to open GAM console', e); }
      });
    }

    // Improved Page Type Detection (Codex-reviewed)
    const { isArticle, isHome } = await page.evaluate(() => {
      const path = window.location.pathname.toLowerCase();
      const pathHasArticleHints =
        /\b(news|article|story|post|blog)\b/i.test(path.replace(/[-_\/]/g, ' ')) ||
        /\d{4}\/\d{2}\//.test(path);

      const hasArticleTag = !!document.querySelector(
        'article,[itemtype*="schema.org/Article"],[itemtype*="schema.org/NewsArticle"]'
      );

      const hasArticleMeta = !!document.querySelector(
        'meta[property="og:type"][content~="article" i],meta[name="article:published_time"],meta[property="article:published_time"]'
      );

      const jsonLdArticle = Array.from(document.querySelectorAll('script[type="application/ld+json"]')).some(s => {
        try {
          const j = JSON.parse(s.textContent || 'null');
          const nodes = Array.isArray(j) ? j : (j['@graph'] || [j]);
          return nodes.some((n: any) => n && n['@type'] && /article/i.test(String(n['@type'])));
        } catch { return false; }
      });

      const ogType = document.querySelector('meta[property="og:type"]')?.getAttribute('content')?.toLowerCase();
      const isHome = path === '/' || ogType === 'website';

      return { isArticle: hasArticleTag || hasArticleMeta || jsonLdArticle || pathHasArticleHints, isHome };
    });

    const pageType = isArticle ? 'article' : (isHome ? 'home' : 'unknown');

    // Process gathered data
    const finalRequests = Array.from(requests.values());
    const vendors: VendorMatch[] = [];
    const chains: InitiatorChain[] = [];

    finalRequests.forEach(req => {
      // 1. Detect Vendors
      for (const v of VENDOR_PATTERNS) {
        if (new RegExp(v.pattern, 'i').test(req.url)) {
          vendors.push({
            name: v.name,
            category: v.category as any,
            pattern: v.pattern,
            matchedUrl: req.url
          });
          break; // Assign only first matching vendor
        }
      }

      // 2. Build Chains
      if (req.initiator?.url && req.initiator.url !== req.url) {
        chains.push({
          targetUrl: req.url,
          initiatorUrl: req.initiator.url,
          depth: 1 // Simplified depth
        });
      }
    });

    // Deduplicate vendors
    const uniqueVendors = Array.from(new Map(vendors.map(v => [v.name, v])).values());

    return {
      url: targetUrl,
      timestamp: new Date().toISOString(),
      pageType,
      device: isMobile ? 'mobile' : 'desktop',
      loadTime: Date.now() - startTime,
      vendors: uniqueVendors,
      requests: finalRequests,
      initiatorChains: chains
    };

  } catch (error) {
    console.error('Error analyzing network:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

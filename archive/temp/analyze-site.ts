import { chromium } from 'playwright';

async function analyzeSite() {
  // 1. Setup
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  const networkEvidence: any[] = [];
  const bidRequests: any[] = [];
  const platforms = new Set<string>();

  // 2. Capture network requests
  page.on('request', request => {
    const url = request.url();
    
    // Check for ad tech patterns
    if (url.includes('prebid')) {
      platforms.add('Prebid');
      networkEvidence.push({ type: 'request', url, pattern: 'prebid' });
    }
    if (url.includes('googlesyndication')) {
      platforms.add('Google Syndication');
      networkEvidence.push({ type: 'request', url, pattern: 'googlesyndication' });
    }
    if (url.includes('doubleclick')) {
      platforms.add('DoubleClick');
      networkEvidence.push({ type: 'request', url, pattern: 'doubleclick' });
    }
    if (url.includes('amazon-adsystem')) {
      platforms.add('Amazon Ad System');
      networkEvidence.push({ type: 'request', url, pattern: 'amazon-adsystem' });
    }

    // Capture Bid Requests (simplified heuristic)
    // Often Prebid requests go to specific endpoints or have specific query params
    // This is a basic capture for the purpose of the task
    if (url.includes('rubiconproject.com') || url.includes('adnxs.com') || url.includes('openx.net') || url.includes('pubmatic.com')) {
        // These are common SSPs often involved in bidding
        bidRequests.push({ url, method: request.method() });
        platforms.add('SSP/Exchange');
    }
  });

  try {
    // 1. Navigate
    console.log('Navigating to https://www.essentiallysports.com...');
    await page.goto('https://www.essentiallysports.com', { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Scroll to trigger lazy loading
    console.log('Scrolling page...');
    await page.evaluate(async () => {
        await new Promise<void>((resolve) => {
            let totalHeight = 0;
            const distance = 100;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if (totalHeight >= scrollHeight || totalHeight > 5000) { // Scroll at least some amount
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });

    // 2. Capture for 15 seconds
    console.log('Capturing network activity for 15 seconds...');
    await page.waitForTimeout(15000);

    // 4. Check globals
    const globals = await page.evaluate(() => {
      const g: any = {};
      if (typeof window !== 'undefined') {
        g.hasGoogletag = !!(window as any).googletag;
        g.hasPbjs = !!(window as any).pbjs;
        g.pbjsVersion = (window as any).pbjs?.version;
      }
      return g;
    });

    if (globals.hasGoogletag) platforms.add('Google Ad Manager');
    if (globals.hasPbjs) platforms.add('Prebid.js');

    // 5. Return JSON
    const result = {
      platforms: Array.from(platforms),
      networkEvidence: networkEvidence.slice(0, 50), // Limit to avoid huge output
      bidRequests: bidRequests.slice(0, 20),
      globals
    };

    console.log(JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('Error analyzing site:', error);
  } finally {
    await browser.close();
  }
}

analyzeSite();

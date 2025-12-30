// Test collectors directly in browser context
import { chromium } from 'playwright';

async function testCollectorLogic() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    await page.goto('https://www.essentiallysports.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log('[Test] Page loaded, waiting 15s...');
    await page.waitForTimeout(15000);

    // Test inline collector logic
    const result = await page.evaluate(() => {
      const w = window as any;

      // Debug checks
      const debug = {
        typeofWindow: typeof window,
        windowUndefined: typeof window === 'undefined',
        googletagExists: typeof w.googletag !== 'undefined',
        apstagExists: typeof w.apstag !== 'undefined',
        googletagType: typeof w.googletag,
        googletagPubads: typeof w.googletag?.pubads,
        googletagPubadsIsFunction: typeof w.googletag?.pubads === 'function'
      };

      // Try to extract GAM data manually
      let gamData = null;
      if (typeof w.googletag !== 'undefined' && typeof w.googletag.pubads === 'function') {
        try {
          const pubads = w.googletag.pubads();
          const slots = pubads.getSlots ? pubads.getSlots() : [];
          gamData = {
            version: typeof w.googletag.getVersion === 'function' ? w.googletag.getVersion() : 'unknown',
            slotsCount: slots.length,
            hasSlots: slots.length > 0
          };
        } catch (e) {
          gamData = { error: String(e) };
        }
      }

      return { debug, gamData };
    });

    console.log('\n=== DEBUG RESULT ===');
    console.log(JSON.stringify(result, null, 2));

  } finally {
    await browser.close();
  }
}

testCollectorLogic();

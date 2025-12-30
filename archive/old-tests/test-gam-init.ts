// Test GAM initialization
import { chromium } from 'playwright';

async function testGAMInit() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    await page.goto('https://www.essentiallysports.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log('[Test] Page loaded, waiting 15s...');
    await page.waitForTimeout(15000);

    const result = await page.evaluate(() => {
      const w = window as any;
      const gt = w.googletag;

      if (!gt) return { error: 'No googletag' };

      const debug = {
        hasGoogletag: typeof gt !== 'undefined',
        googletagKeys: Object.keys(gt).slice(0, 20),
        pubadsType: typeof gt.pubads,
        pubadsValue: gt.pubads,
        hasApiReady: gt.apiReady,
        hasPubadsService: typeof gt.pubads === 'function'
      };

      // Try calling pubads() directly
      let gamData = null;
      try {
        if (typeof gt.pubads === 'function') {
          const pubads = gt.pubads();
          const slots = pubads.getSlots ? pubads.getSlots() : [];
          gamData = {
            success: true,
            version: typeof gt.getVersion === 'function' ? gt.getVersion() : 'unknown',
            slotsCount: slots.length,
            slotSample: slots.length > 0 ? {
              id: slots[0].getSlotElementId(),
              adUnitPath: slots[0].getAdUnitPath()
            } : null
          };
        } else {
          gamData = { error: 'pubads is not a function', pubadsType: typeof gt.pubads };
        }
      } catch (e) {
        gamData = { error: String(e) };
      }

      return { debug, gamData };
    });

    console.log('\n=== GAM INIT RESULT ===');
    console.log(JSON.stringify(result, null, 2));

  } finally {
    await browser.close();
  }
}

testGAMInit();

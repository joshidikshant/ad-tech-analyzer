import { chromium } from 'playwright';

/**
 * Test bridge injection AFTER page load instead of via addInitScript
 */
async function testAfterLoadBridge() {
  console.log('='.repeat(80));
  console.log('AFTER-LOAD BRIDGE TEST');
  console.log('='.repeat(80));
  console.log();

  const browser = await chromium.launch({
    headless: false,
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
  });

  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });

  const page = await context.newPage();

  try {
    console.log('Navigating to chromeunboxed.com...');
    await page.goto('https://www.chromeunboxed.com/chromebook-plus-ai-features-march-2024', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });

    console.log('Waiting 10s for ad tech to load...');
    await page.waitForTimeout(10000);

    // NOW inject bridge script AFTER page load
    console.log('Injecting bridge snapshot script NOW...');
    const snapshot = await page.evaluate(() => {
      const result: any = {
        prebid: null,
        gam: null,
        timestamp: Date.now(),
        error: null,
        debug: {
          pbjsExists: false,
          pbjsHasGetConfig: false,
          googletagExists: false,
          googletagHasPubads: false,
        },
      };

      const w = window as any;

      // Check Prebid
      try {
        result.debug.pbjsExists = !!w.pbjs;

        if (w.pbjs) {
          result.debug.pbjsHasGetConfig = typeof w.pbjs.getConfig === 'function';

          if (typeof w.pbjs.getConfig === 'function') {
            const config = w.pbjs.getConfig();
            result.prebid = config;
          } else {
            result.error = 'pbjs exists but getConfig is not a function';
          }
        }
      } catch (err) {
        result.error = `prebid error: ${(err as Error).message}`;
      }

      // Check GAM
      try {
        result.debug.googletagExists = !!w.googletag;

        if (w.googletag) {
          result.debug.googletagHasPubads = typeof w.googletag.pubads === 'function';

          if (typeof w.googletag.pubads === 'function') {
            const pubads = w.googletag.pubads();

            if (pubads) {
              const targeting: Record<string, any> = {};
              const keys = pubads.getTargetingKeys?.() || [];

              keys.forEach((key: string) => {
                targeting[key] = pubads.getTargeting?.(key);
              });

              const slots = pubads.getSlots?.() || [];
              result.gam = { targeting, slots };
            } else {
              result.error = (result.error || '') + ' | googletag.pubads() returned null';
            }
          } else {
            result.error = (result.error || '') + ' | googletag exists but pubads is not a function';
          }
        }
      } catch (err) {
        result.error = (result.error || '') + ` | gam error: ${(err as Error).message}`;
      }

      return result;
    });

    console.log();
    console.log('━'.repeat(80));
    console.log('SNAPSHOT RESULT (After-Load Injection)');
    console.log('━'.repeat(80));
    console.log();

    console.log('DEBUG INFO:');
    console.log(`  pbjs exists: ${snapshot.debug.pbjsExists}`);
    console.log(`  pbjs.getConfig is function: ${snapshot.debug.pbjsHasGetConfig}`);
    console.log(`  googletag exists: ${snapshot.debug.googletagExists}`);
    console.log(`  googletag.pubads is function: ${snapshot.debug.googletagHasPubads}`);
    console.log();

    console.log('CAPTURED DATA:');
    console.log(`  Prebid config: ${snapshot.prebid ? '✅ CAPTURED' : '❌ NOT CAPTURED'}`);
    console.log(`  GAM config: ${snapshot.gam ? '✅ CAPTURED' : '❌ NOT CAPTURED'}`);
    console.log();

    if (snapshot.error) {
      console.log(`ERROR: ${snapshot.error}`);
      console.log();
    }

    // Show Prebid config if captured
    if (snapshot.prebid) {
      console.log('PREBID CONFIG:');
      const keys = Object.keys(snapshot.prebid);
      console.log(`  Keys (${keys.length}): ${keys.slice(0, 15).join(', ')}${keys.length > 15 ? ', ...' : ''}`);

      if (snapshot.prebid.timeout) {
        console.log(`  Timeout: ${snapshot.prebid.timeout}ms`);
      }
      if (snapshot.prebid.priceGranularity) {
        console.log(`  Price Granularity: ${JSON.stringify(snapshot.prebid.priceGranularity)}`);
      }
      if (snapshot.prebid.bidderTimeout) {
        console.log(`  Bidder Timeout: ${snapshot.prebid.bidderTimeout}ms`);
      }
      console.log();
    }

    // Show GAM config if captured
    if (snapshot.gam) {
      console.log('GAM CONFIG:');
      const targetingKeys = Object.keys(snapshot.gam.targeting);
      console.log(`  Targeting Keys (${targetingKeys.length}): ${targetingKeys.slice(0, 10).join(', ')}${targetingKeys.length > 10 ? ', ...' : ''}`);
      console.log(`  Slots: ${snapshot.gam.slots.length}`);

      if (targetingKeys.length > 0) {
        console.log('  Sample Targeting:');
        Object.entries(snapshot.gam.targeting)
          .slice(0, 5)
          .forEach(([key, value]) => {
            console.log(`    ${key}: ${JSON.stringify(value)}`);
          });
      }
      console.log();
    }

    console.log('━'.repeat(80));

    if (snapshot.prebid || snapshot.gam) {
      console.log('✅ SUCCESS: After-load injection works!');
    } else {
      console.log('❌ FAILURE: Still no config captured');
    }

    console.log('━'.repeat(80));

    console.log('\nBrowser will stay open for 20s for inspection...');
    await page.waitForTimeout(20000);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

testAfterLoadBridge().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

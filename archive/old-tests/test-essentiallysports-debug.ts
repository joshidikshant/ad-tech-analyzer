import { chromium } from 'playwright';

/**
 * Debug test: Check what ad tech is actually on essentiallysports.com
 */
async function debugEssentiallySports() {
  console.log('DEBUG: Checking ad tech presence on essentiallysports.com\n');

  const browser = await chromium.launch({
    headless: false,
    args: ['--disable-blink-features=AutomationControlled']
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  try {
    console.log('Navigating...');
    await page.goto('https://www.essentiallysports.com/nba-basketball-news/', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    console.log('Waiting 10s for ad tech...\n');
    await page.waitForTimeout(10000);

    // Check for ad tech globals
    const adTechPresence = await page.evaluate(() => {
      const w = window as any;
      return {
        prebid: {
          exists: !!w.pbjs,
          hasQueue: !!w.pbjs?.que,
          hasGetConfig: !!w.pbjs?.getConfig,
          globals: w._pbjsGlobals || null,
        },
        gam: {
          exists: !!w.googletag,
          hasPubads: !!w.googletag?.pubads,
          hasCmd: !!w.googletag?.cmd,
          slots: w.googletag?.pubads?.()?.getSlots?.()?.length || 0,
        },
        other: {
          jquery: !!w.jQuery,
          dataLayer: !!w.dataLayer,
          gtag: !!w.gtag,
        },
        allGlobals: Object.keys(w).filter(k =>
          /prebid|pbjs|googletag|gpt|amazon|aps|cmp|consent|ezoic|freestar/i.test(k)
        ),
      };
    });

    console.log('━'.repeat(80));
    console.log('AD TECH DETECTION');
    console.log('━'.repeat(80));
    console.log();

    console.log('PREBID.JS:');
    console.log(`  window.pbjs exists: ${adTechPresence.prebid.exists}`);
    console.log(`  pbjs.que exists: ${adTechPresence.prebid.hasQueue}`);
    console.log(`  pbjs.getConfig exists: ${adTechPresence.prebid.hasGetConfig}`);
    console.log(`  _pbjsGlobals: ${JSON.stringify(adTechPresence.prebid.globals)}`);
    console.log();

    console.log('GOOGLE AD MANAGER:');
    console.log(`  window.googletag exists: ${adTechPresence.gam.exists}`);
    console.log(`  googletag.pubads exists: ${adTechPresence.gam.hasPubads}`);
    console.log(`  googletag.cmd exists: ${adTechPresence.gam.hasCmd}`);
    console.log(`  Ad slots: ${adTechPresence.gam.slots}`);
    console.log();

    console.log('OTHER:');
    console.log(`  jQuery: ${adTechPresence.other.jquery}`);
    console.log(`  dataLayer: ${adTechPresence.other.dataLayer}`);
    console.log(`  gtag: ${adTechPresence.other.gtag}`);
    console.log();

    console.log('MATCHING GLOBALS:');
    if (adTechPresence.allGlobals.length === 0) {
      console.log('  None found (no ad tech keywords in window object)');
    } else {
      adTechPresence.allGlobals.forEach(g => console.log(`  - ${g}`));
    }

    console.log();
    console.log('━'.repeat(80));

    // If Prebid exists, try to get config
    if (adTechPresence.prebid.exists) {
      console.log('\nAttempting to capture Prebid config...');
      const prebidConfig = await page.evaluate(() => {
        const w = window as any;
        try {
          if (w.pbjs?.getConfig) {
            return w.pbjs.getConfig();
          }
        } catch (e) {
          return { error: (e as Error).message };
        }
        return null;
      });

      if (prebidConfig) {
        console.log('✅ Prebid config captured:');
        console.log(JSON.stringify(prebidConfig, null, 2).substring(0, 500) + '...');
      } else {
        console.log('❌ Failed to capture Prebid config');
      }
    }

    // If GAM exists, try to get targeting
    if (adTechPresence.gam.exists) {
      console.log('\nAttempting to capture GAM targeting...');
      const gamTargeting = await page.evaluate(() => {
        const w = window as any;
        try {
          const pubads = w.googletag?.pubads?.();
          if (pubads) {
            const keys = pubads.getTargetingKeys?.() || [];
            const targeting: Record<string, any> = {};
            keys.forEach((key: string) => {
              targeting[key] = pubads.getTargeting?.(key);
            });
            return { targeting, slots: pubads.getSlots?.()?.length || 0 };
          }
        } catch (e) {
          return { error: (e as Error).message };
        }
        return null;
      });

      if (gamTargeting) {
        console.log('✅ GAM data captured:');
        console.log(JSON.stringify(gamTargeting, null, 2).substring(0, 500) + '...');
      } else {
        console.log('❌ Failed to capture GAM data');
      }
    }

    console.log('\n\nBrowser will stay open for 20s for manual inspection...');
    await page.waitForTimeout(20000);

  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

debugEssentiallySports().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

import { chromium } from 'playwright';

/**
 * Debug bridge timing to understand why config isn't being captured
 */
async function debugBridgeTiming() {
  console.log('='.repeat(80));
  console.log('BRIDGE TIMING DEBUG');
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

  // Override webdriver
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });

  const page = await context.newPage();

  // Inject VERBOSE bridge with logging
  await page.addInitScript(() => {
    const snapshot: any = {
      prebid: null,
      gam: null,
      timestamp: null,
      error: null,
      logs: [] as string[],
    };

    (window as any).__adTechSnapshot = snapshot;

    const log = (msg: string) => {
      const time = new Date().toISOString().substring(11, 23);
      const logMsg = `[${time}] ${msg}`;
      snapshot.logs.push(logMsg);
      console.log(`[Bridge] ${logMsg}`);
    };

    log('Bridge injected, waiting 3s before polling...');

    setTimeout(() => {
      log('Starting polling (100ms interval, 10s duration)');

      const startedAt = Date.now();
      let pollCount = 0;

      const interval = setInterval(() => {
        pollCount++;
        const elapsed = Date.now() - startedAt;

        // Check Prebid
        try {
          const pbjs = (window as any).pbjs;
          if (pbjs) {
            log(`Poll ${pollCount}: pbjs exists`);

            if (pbjs.getConfig) {
              const config = pbjs.getConfig();
              log(`Poll ${pollCount}: pbjs.getConfig() returned ${config ? 'DATA' : 'NULL/UNDEFINED'}`);

              if (config && !snapshot.prebid) {
                snapshot.prebid = config;
                log(`Poll ${pollCount}: ✅ Prebid config CAPTURED`);
              }
            } else {
              log(`Poll ${pollCount}: pbjs.getConfig is undefined`);
            }
          } else {
            if (pollCount === 1 || pollCount % 20 === 0) {
              log(`Poll ${pollCount}: pbjs does not exist yet`);
            }
          }
        } catch (err) {
          log(`Poll ${pollCount}: Prebid error - ${(err as Error).message}`);
          snapshot.error = `prebid:${(err as Error).message}`;
        }

        // Check GAM
        try {
          const gtag = (window as any).googletag;
          if (gtag) {
            log(`Poll ${pollCount}: googletag exists`);

            const pubads = gtag.pubads?.();
            if (pubads) {
              log(`Poll ${pollCount}: pubads() exists`);

              const targeting: Record<string, any> = {};
              try {
                const keys = pubads.getTargetingKeys?.() || [];
                log(`Poll ${pollCount}: ${keys.length} targeting keys found`);

                keys.forEach((key: string) => {
                  targeting[key] = pubads.getTargeting?.(key);
                });
              } catch (err) {
                log(`Poll ${pollCount}: GAM targeting error - ${(err as Error).message}`);
              }

              const slots = pubads.getSlots?.() || [];
              log(`Poll ${pollCount}: ${slots.length} slots found`);

              if (!snapshot.gam && (keys.length > 0 || slots.length > 0)) {
                snapshot.gam = { targeting, slots };
                log(`Poll ${pollCount}: ✅ GAM config CAPTURED`);
              }
            } else {
              if (pollCount === 1 || pollCount % 20 === 0) {
                log(`Poll ${pollCount}: googletag.pubads() not initialized yet`);
              }
            }
          } else {
            if (pollCount === 1 || pollCount % 20 === 0) {
              log(`Poll ${pollCount}: googletag does not exist yet`);
            }
          }
        } catch (err) {
          log(`Poll ${pollCount}: GAM error - ${(err as Error).message}`);
          snapshot.error = snapshot.error ?? `gam:${(err as Error).message}`;
        }

        snapshot.timestamp = Date.now();

        if (elapsed >= 10000) {
          log(`Polling complete after ${pollCount} polls (${elapsed}ms)`);
          log(`Final state: Prebid=${!!snapshot.prebid}, GAM=${!!snapshot.gam}`);
          clearInterval(interval);
        }
      }, 100);
    }, 3000);
  });

  try {
    console.log('Navigating to chromeunboxed.com...');
    await page.goto('https://www.chromeunboxed.com/chromebook-plus-ai-features-march-2024', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });

    console.log('Waiting 20s for bridge to poll...\n');
    await page.waitForTimeout(20000);

    // Extract snapshot
    const snapshot = await page.evaluate(() => (window as any).__adTechSnapshot);

    console.log('━'.repeat(80));
    console.log('BRIDGE SNAPSHOT');
    console.log('━'.repeat(80));
    console.log(`Prebid captured: ${!!snapshot.prebid}`);
    console.log(`GAM captured: ${!!snapshot.gam}`);
    console.log(`Timestamp: ${snapshot.timestamp ? new Date(snapshot.timestamp).toISOString() : 'N/A'}`);
    console.log(`Error: ${snapshot.error || 'None'}`);
    console.log();

    console.log('━'.repeat(80));
    console.log('BRIDGE LOGS (Verbose Timeline)');
    console.log('━'.repeat(80));
    snapshot.logs.forEach((log: string) => console.log(log));
    console.log('━'.repeat(80));

    // Also check if ad tech actually exists
    const adTechCheck = await page.evaluate(() => {
      const w = window as any;
      return {
        pbjs: {
          exists: !!w.pbjs,
          hasGetConfig: !!w.pbjs?.getConfig,
          configResult: w.pbjs?.getConfig?.() || null,
        },
        gam: {
          exists: !!w.googletag,
          hasPubads: !!w.googletag?.pubads,
          pubadsResult: w.googletag?.pubads?.() || null,
        },
      };
    });

    console.log();
    console.log('━'.repeat(80));
    console.log('CURRENT STATE (After 20s)');
    console.log('━'.repeat(80));
    console.log(`pbjs exists: ${adTechCheck.pbjs.exists}`);
    console.log(`pbjs.getConfig exists: ${adTechCheck.pbjs.hasGetConfig}`);
    console.log(`pbjs.getConfig() result: ${adTechCheck.pbjs.configResult ? 'HAS DATA' : 'NULL/UNDEFINED'}`);
    console.log();
    console.log(`googletag exists: ${adTechCheck.gam.exists}`);
    console.log(`googletag.pubads exists: ${adTechCheck.gam.hasPubads}`);
    console.log(`googletag.pubads() result: ${adTechCheck.gam.pubadsResult ? 'HAS DATA' : 'NULL/UNDEFINED'}`);
    console.log('━'.repeat(80));

    console.log('\nBrowser will stay open for 20s for inspection...');
    await page.waitForTimeout(20000);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

debugBridgeTiming().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

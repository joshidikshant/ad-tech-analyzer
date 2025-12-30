import { chromium } from 'playwright';
import { captureConsoleMessages } from './src/collector/console-capture.js';
import { injectBridge, extractBridgeData } from './src/collector/bridge.js';
import { captureGamEvents, detectRaceConditions } from './src/collector/gam-events.js';

/**
 * Phase 1 Test with Stealth Mode
 *
 * Tests on:
 * 1. chromeunboxed.com (confirmed Prebid + GAM)
 * 2. metric-conversions.org (Ezoic)
 *
 * Uses Playwright stealth techniques to avoid bot detection
 */
async function testWithStealth() {
  console.log('='.repeat(80));
  console.log('PHASE 1 TEST: STEALTH MODE');
  console.log('='.repeat(80));
  console.log();

  const sites = [
    {
      name: 'ChromeUnboxed',
      url: 'https://www.chromeunboxed.com/chromebook-plus-ai-features-march-2024',
      expectedVendors: ['Prebid', 'GAM'],
    },
    {
      name: 'Metric Conversions',
      url: 'https://www.metric-conversions.org/length/meters-to-feet.htm',
      expectedVendors: ['Ezoic'],
    },
  ];

  for (const site of sites) {
    console.log('━'.repeat(80));
    console.log(`TESTING: ${site.name}`);
    console.log('━'.repeat(80));
    console.log(`URL: ${site.url}`);
    console.log(`Expected: ${site.expectedVendors.join(', ')}`);
    console.log();

    const browser = await chromium.launch({
      headless: false,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
      ],
    });

    try {
      // Stealth context configuration
      const context = await browser.newContext({
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
        locale: 'en-US',
        timezoneId: 'America/New_York',
        permissions: ['geolocation'],
        geolocation: { latitude: 40.7128, longitude: -74.006 },
        colorScheme: 'light',
        extraHTTPHeaders: {
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });

      // Stealth: Remove automation indicators
      await context.addInitScript(() => {
        // Override navigator.webdriver
        Object.defineProperty(navigator, 'webdriver', {
          get: () => false,
        });

        // Override chrome object
        (window as any).chrome = {
          runtime: {},
        };

        // Override permissions
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters: any) =>
          parameters.name === 'notifications'
            ? Promise.resolve({ state: Notification.permission } as PermissionStatus)
            : originalQuery(parameters);

        // Override plugins
        Object.defineProperty(navigator, 'plugins', {
          get: () => [1, 2, 3, 4, 5],
        });
      });

      const page = await context.newPage();

      // Step 1: Setup Phase 1 collectors
      console.log('[1/6] Setting up console capture...');
      const consoleMessages = await captureConsoleMessages(page);

      console.log('[2/6] Injecting runtime config bridge...');
      await injectBridge(page);

      // Step 2: Navigate
      console.log('[3/6] Navigating with stealth mode...');
      await page.goto(site.url, {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });

      // Step 3: Wait for ad tech (increased to 30s for bridge polling)
      console.log('[4/6] Waiting 30s for ad tech initialization and bridge polling...');
      await page.waitForTimeout(30000);

      // Step 4: Extract data
      console.log('[5/6] Extracting captured data...');

      // Runtime config
      const runtimeConfig = await extractBridgeData(page);

      // GAM events
      const gamEvents = await captureGamEvents(page);

      // Check ad tech presence
      const adTechCheck = await page.evaluate(() => {
        const w = window as any;
        return {
          prebid: !!w.pbjs,
          gam: !!w.googletag,
          ezoic: !!w.ezstandalone || !!w.ez || !!w.ezoicTestActive,
        };
      });

      console.log('[6/6] Analysis complete');
      console.log();

      // Results
      console.log('─'.repeat(80));
      console.log('RESULTS');
      console.log('─'.repeat(80));

      console.log('\n🌐 AD TECH PRESENCE (Runtime Globals):');
      console.log(`   window.pbjs (Prebid): ${adTechCheck.prebid ? '✅ YES' : '❌ NO'}`);
      console.log(`   window.googletag (GAM): ${adTechCheck.gam ? '✅ YES' : '❌ NO'}`);
      console.log(`   window.ez* (Ezoic): ${adTechCheck.ezoic ? '✅ YES' : '❌ NO'}`);

      console.log('\n📊 CAPTURED DATA:');
      console.log(`   Console Messages: ${consoleMessages.length}`);
      console.log(`   Runtime Config: ${runtimeConfig ? '✅ CAPTURED' : '❌ NOT CAPTURED'}`);
      if (runtimeConfig) {
        console.log(`     - Prebid: ${runtimeConfig.prebid ? '✅ YES' : '❌ NO'}`);
        console.log(`     - GAM: ${runtimeConfig.gam ? '✅ YES' : '❌ NO'}`);
        if (runtimeConfig.error) {
          console.log(`     - Errors: ${runtimeConfig.error}`);
        }
      }
      console.log(`   GAM Events: ${gamEvents.length}`);

      // Console messages detail
      if (consoleMessages.length > 0) {
        console.log('\n📝 CONSOLE MESSAGES (Sample):');
        consoleMessages.slice(0, 3).forEach((msg, idx) => {
          console.log(`   [${idx + 1}] ${msg.level}: ${msg.text.substring(0, 80)}${msg.text.length > 80 ? '...' : ''}`);
        });
        if (consoleMessages.length > 3) {
          console.log(`   ... and ${consoleMessages.length - 3} more`);
        }
      }

      // Prebid config detail
      if (runtimeConfig?.prebid) {
        console.log('\n🎯 PREBID CONFIG (Keys):');
        const keys = Object.keys(runtimeConfig.prebid);
        console.log(`   ${keys.slice(0, 10).join(', ')}${keys.length > 10 ? ', ...' : ''}`);

        if (runtimeConfig.prebid.timeout) {
          console.log(`   Timeout: ${runtimeConfig.prebid.timeout}ms`);
        }
        if (runtimeConfig.prebid.priceGranularity) {
          console.log(`   Price Granularity: ${JSON.stringify(runtimeConfig.prebid.priceGranularity).substring(0, 60)}`);
        }
      }

      // GAM targeting detail
      if (runtimeConfig?.gam?.targeting) {
        console.log('\n🎯 GAM TARGETING:');
        const targeting = runtimeConfig.gam.targeting;
        const keys = Object.keys(targeting);
        console.log(`   Keys (${keys.length}): ${keys.slice(0, 5).join(', ')}${keys.length > 5 ? ', ...' : ''}`);

        // Show sample values
        Object.entries(targeting).slice(0, 3).forEach(([key, value]) => {
          console.log(`   ${key}: ${JSON.stringify(value)}`);
        });
      }

      // GAM events detail
      if (gamEvents.length > 0) {
        console.log('\n📋 GAM EVENTS (Timeline):');
        gamEvents.slice(0, 5).forEach((event, idx) => {
          const time = new Date(event.timestamp).toISOString().substring(11, 23);
          console.log(`   [${idx + 1}] ${time} - ${event.type} ${event.slot ? `(${event.slot.substring(0, 30)})` : ''}`);
        });
        if (gamEvents.length > 5) {
          console.log(`   ... and ${gamEvents.length - 5} more events`);
        }

        const warnings = detectRaceConditions(gamEvents);
        if (warnings.length > 0) {
          console.log('\n   ⚠️  RACE CONDITIONS DETECTED:');
          warnings.forEach((w, idx) => console.log(`   ${idx + 1}. ${w}`));
        } else {
          console.log('\n   ✅ No race conditions detected');
        }
      }

      // Success evaluation
      console.log();
      console.log('─'.repeat(80));
      const successMetrics = {
        runtimePresent: adTechCheck.prebid || adTechCheck.gam || adTechCheck.ezoic,
        configCaptured: !!runtimeConfig && (!!runtimeConfig.prebid || !!runtimeConfig.gam),
        consoleCaptured: consoleMessages.length > 0,
        gamEventsCaptured: gamEvents.length > 0,
      };

      const successCount = Object.values(successMetrics).filter(Boolean).length;
      const totalChecks = Object.keys(successMetrics).length;

      console.log(`✅ SUCCESS RATE: ${successCount}/${totalChecks} checks passed`);
      console.log(`   Runtime Present: ${successMetrics.runtimePresent ? '✅' : '❌'}`);
      console.log(`   Config Captured: ${successMetrics.configCaptured ? '✅' : '❌'}`);
      console.log(`   Console Captured: ${successMetrics.consoleCaptured ? '✅' : '❌'}`);
      console.log(`   GAM Events Captured: ${successMetrics.gamEventsCaptured ? '✅' : '❌'}`);

      console.log();
      console.log('Browser will stay open for 20s for manual inspection...');
      await page.waitForTimeout(20000);

    } catch (error) {
      console.error(`\n❌ Test failed for ${site.name}:`, error);
    } finally {
      await browser.close();
    }

    console.log();
  }

  console.log('='.repeat(80));
  console.log('STEALTH MODE TEST COMPLETE');
  console.log('='.repeat(80));
  console.log('Phase 1 components validated on real sites with stealth mode.');
  console.log('='.repeat(80));
}

testWithStealth().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

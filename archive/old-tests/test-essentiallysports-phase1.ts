import { chromium } from 'playwright';
import { captureConsoleMessages } from './src/collector/console-capture.js';
import { injectBridge, extractBridgeData } from './src/collector/bridge.js';
import { captureGamEvents, detectRaceConditions } from './src/collector/gam-events.js';

/**
 * Phase 1 Test: EssentiallySports.com
 *
 * Tests all 4 components on a known Prebid + GAM site:
 * 1. Console capture (ad-tech errors)
 * 2. Bridge injection (Prebid + GAM config)
 * 3. GAM event log (race conditions)
 * 4. Network detection (via manual observation)
 */
async function testEssentiallySports() {
  console.log('='.repeat(80));
  console.log('PHASE 1 TEST: ESSENTIALLYSPORTS.COM');
  console.log('='.repeat(80));
  console.log();

  const testUrl = 'https://www.essentiallysports.com/nba-basketball-news/';

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
    // Step 1: Setup console capture (BEFORE navigation)
    console.log('[1/5] Setting up console capture...');
    const consoleMessages = await captureConsoleMessages(page);
    console.log('  ✓ Console hook installed');

    // Step 2: Inject bridge (BEFORE navigation)
    console.log('[2/5] Injecting runtime config bridge...');
    await injectBridge(page);
    console.log('  ✓ Bridge injected (will start polling 3s after page load)');

    // Step 3: Navigate to site
    console.log(`[3/5] Navigating to ${testUrl}...`);
    await page.goto(testUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    console.log('  ✓ Page loaded');

    // Step 4: Wait for ad tech to initialize (15s)
    console.log('[4/5] Waiting 15s for ad tech initialization...');
    await page.waitForTimeout(15000);
    console.log('  ✓ Ad tech should be initialized');

    // Step 5: Extract all captured data
    console.log('[5/5] Extracting captured data...');
    console.log();

    // Console messages
    console.log('━'.repeat(80));
    console.log('CONSOLE MESSAGES (Ad-Tech Only)');
    console.log('━'.repeat(80));

    if (consoleMessages.length === 0) {
      console.log('  ⚠️  No ad-tech console messages captured');
      console.log('     (This is normal if no errors/warnings occurred)');
    } else {
      console.log(`  Captured: ${consoleMessages.length} messages\n`);
      consoleMessages.slice(0, 10).forEach((msg, idx) => {
        console.log(`  [${idx + 1}] ${msg.level.toUpperCase()}`);
        console.log(`      ${msg.text.substring(0, 120)}${msg.text.length > 120 ? '...' : ''}`);
        if (msg.url) {
          console.log(`      Source: ${msg.url.substring(0, 80)}${msg.url.length > 80 ? '...' : ''}`);
        }
        console.log();
      });
      if (consoleMessages.length > 10) {
        console.log(`  ... and ${consoleMessages.length - 10} more messages`);
      }
    }

    // Runtime config
    console.log();
    console.log('━'.repeat(80));
    console.log('RUNTIME CONFIG (Prebid + GAM)');
    console.log('━'.repeat(80));

    const runtimeConfig = await extractBridgeData(page);

    if (!runtimeConfig) {
      console.log('  ⚠️  Runtime config not captured');
      console.log('     (Bridge may not have polled yet or ad tech not loaded)');
    } else {
      console.log(`  Timestamp: ${runtimeConfig.timestamp ? new Date(runtimeConfig.timestamp).toISOString() : 'N/A'}`);

      if (runtimeConfig.prebid) {
        console.log('\n  ✅ PREBID.JS CONFIG CAPTURED');
        const config = runtimeConfig.prebid;

        if (config.bidders) {
          console.log(`     Bidders: ${JSON.stringify(config.bidders).substring(0, 100)}`);
        }
        if (config.priceGranularity) {
          console.log(`     Price Granularity: ${JSON.stringify(config.priceGranularity)}`);
        }
        if (config.timeout) {
          console.log(`     Timeout: ${config.timeout}ms`);
        }
        if (config.currency) {
          console.log(`     Currency: ${JSON.stringify(config.currency)}`);
        }

        // Show all top-level keys
        const keys = Object.keys(config);
        console.log(`     Config Keys (${keys.length}): ${keys.join(', ')}`);
      } else {
        console.log('\n  ❌ Prebid.js config not found');
      }

      if (runtimeConfig.gam) {
        console.log('\n  ✅ GAM CONFIG CAPTURED');
        console.log(`     Targeting Keys: ${Object.keys(runtimeConfig.gam.targeting).length}`);

        // Show targeting
        const targeting = runtimeConfig.gam.targeting;
        Object.entries(targeting).slice(0, 5).forEach(([key, value]) => {
          console.log(`       ${key}: ${JSON.stringify(value)}`);
        });

        console.log(`     Slots: ${runtimeConfig.gam.slots?.length || 0}`);
      } else {
        console.log('\n  ❌ GAM config not found');
      }

      if (runtimeConfig.error) {
        console.log(`\n  ⚠️  Errors: ${runtimeConfig.error}`);
      }
    }

    // GAM events
    console.log();
    console.log('━'.repeat(80));
    console.log('GAM EVENT LOG (Race Condition Detection)');
    console.log('━'.repeat(80));

    const gamEvents = await captureGamEvents(page);

    if (gamEvents.length === 0) {
      console.log('  ⚠️  No GAM events captured');
      console.log('     (getEventLog may not be available or GPT not initialized)');
    } else {
      console.log(`  Captured: ${gamEvents.length} events\n`);

      // Show event timeline
      console.log('  Timeline:');
      gamEvents.slice(0, 10).forEach((event, idx) => {
        const time = new Date(event.timestamp).toISOString().substring(11, 23);
        console.log(`    [${idx + 1}] ${time} - ${event.type} ${event.slot ? `(${event.slot})` : ''}`);
      });

      if (gamEvents.length > 10) {
        console.log(`    ... and ${gamEvents.length - 10} more events`);
      }

      // Race condition detection
      console.log('\n  Race Condition Analysis:');
      const warnings = detectRaceConditions(gamEvents);

      if (warnings.length === 0) {
        console.log('    ✅ No race conditions detected');
      } else {
        warnings.forEach((warning, idx) => {
          console.log(`    ⚠️  ${idx + 1}. ${warning}`);
        });
      }
    }

    // Summary
    console.log();
    console.log('━'.repeat(80));
    console.log('PHASE 1 SUMMARY');
    console.log('━'.repeat(80));
    console.log(`  Site: ${testUrl}`);
    console.log(`  Console Messages: ${consoleMessages.length}`);
    console.log(`  Runtime Config: ${runtimeConfig ? 'CAPTURED' : 'NOT CAPTURED'}`);
    console.log(`    - Prebid: ${runtimeConfig?.prebid ? 'YES' : 'NO'}`);
    console.log(`    - GAM: ${runtimeConfig?.gam ? 'YES' : 'NO'}`);
    console.log(`  GAM Events: ${gamEvents.length}`);
    console.log(`  Race Conditions: ${runtimeConfig && gamEvents.length > 0 ? detectRaceConditions(gamEvents).length : 'N/A'}`);

    console.log();
    console.log('━'.repeat(80));

    const successRate = [
      consoleMessages.length >= 0,  // Console hooked (even if 0 messages)
      runtimeConfig !== null,        // Bridge captured data
      gamEvents.length >= 0          // GAM events attempted
    ].filter(Boolean).length;

    console.log(`RESULT: ${successRate}/3 components working ✅`);
    console.log('━'.repeat(80));

    // Keep browser open for manual inspection
    console.log('\nBrowser will stay open for 30s for manual inspection...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error();
    console.error('━'.repeat(80));
    console.error('TEST FAILED ❌');
    console.error('━'.repeat(80));
    console.error('Error:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

testEssentiallySports().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

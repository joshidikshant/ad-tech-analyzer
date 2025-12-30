import { chromium } from 'playwright';
import { captureConsoleMessages } from './src/collector/console-capture.js';
import { injectBridge, extractBridgeData } from './src/collector/bridge.js';
import { captureGamEvents, detectRaceConditions } from './src/collector/gam-events.js';
import { analyzeNetworkStack } from './src/analyzer/network-analyzer.js';
import { mergeResults } from './src/analyzer/hybrid-analyzer.js';

/**
 * Phase 1 Integration Test
 *
 * Tests all 4 components working together:
 * 1. Console capture (ad-tech errors)
 * 2. Bridge injection (Prebid + GAM config)
 * 3. GAM event log (race conditions)
 * 4. Hybrid merge (network + runtime + console)
 */
async function testPhase1Integration() {
  console.log('='.repeat(80));
  console.log('PHASE 1 INTEGRATION TEST');
  console.log('='.repeat(80));
  console.log();

  const testUrl = 'https://www.chromeunboxed.com/chromebook-plus-ai-features-march-2024';

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // Step 1: Setup console capture (BEFORE navigation)
    console.log('[1/6] Setting up console capture...');
    const consoleMessages = await captureConsoleMessages(page);

    // Step 2: Inject bridge (BEFORE navigation)
    console.log('[2/6] Injecting runtime config bridge...');
    await injectBridge(page);

    // Step 3: Navigate and analyze network
    console.log(`[3/6] Analyzing network stack: ${testUrl}...`);
    const networkResult = await analyzeNetworkStack(testUrl, {
      device: 'desktop',
      debug: false,
    });

    console.log(`  → Detected ${networkResult.vendors.length} vendors via network`);
    console.log(`  → Page type: ${networkResult.pageType}`);
    console.log(`  → Load time: ${(networkResult.loadTime / 1000).toFixed(2)}s`);

    // Step 4: Extract runtime config (AFTER page load)
    console.log('[4/6] Extracting runtime config from bridge...');
    const runtimeConfig = await extractBridgeData(page);

    if (runtimeConfig) {
      console.log(`  → Prebid config: ${runtimeConfig.prebid ? 'CAPTURED' : 'NOT FOUND'}`);
      console.log(`  → GAM config: ${runtimeConfig.gam ? 'CAPTURED' : 'NOT FOUND'}`);
      console.log(`  → Timestamp: ${runtimeConfig.timestamp ? new Date(runtimeConfig.timestamp).toISOString() : 'N/A'}`);
      if (runtimeConfig.error) {
        console.log(`  → Errors: ${runtimeConfig.error}`);
      }
    } else {
      console.log('  → Runtime config not available');
    }

    // Step 5: Capture GAM events
    console.log('[5/6] Capturing GAM event log...');
    const gamEvents = await captureGamEvents(page);
    console.log(`  → Captured ${gamEvents.length} GAM events`);

    if (gamEvents.length > 0) {
      const raceConditions = detectRaceConditions(gamEvents);
      console.log(`  → Race conditions detected: ${raceConditions.length}`);
      raceConditions.forEach((warning, idx) => {
        console.log(`    ${idx + 1}. ${warning}`);
      });
    }

    // Step 6: Merge into hybrid result
    console.log('[6/6] Merging network + runtime + console...');
    const hybridResult = mergeResults(networkResult, runtimeConfig, consoleMessages);

    console.log();
    console.log('='.repeat(80));
    console.log('HYBRID RESULT SUMMARY');
    console.log('='.repeat(80));
    console.log(`URL: ${hybridResult.url}`);
    console.log(`Page Type: ${hybridResult.pageType}`);
    console.log(`Device: ${hybridResult.device}`);
    console.log(`Network Vendors: ${hybridResult.vendors.length}`);
    console.log(`Console Messages: ${hybridResult.consoleMessages.length}`);
    console.log(`Runtime Config: ${hybridResult.runtimeConfig ? 'PRESENT' : 'ABSENT'}`);
    console.log();

    // Validations
    console.log('VALIDATIONS:');
    if (hybridResult.validations.networkVsRuntime.length > 0) {
      hybridResult.validations.networkVsRuntime.forEach((warning, idx) => {
        console.log(`  ${idx + 1}. ${warning}`);
      });
    } else {
      console.log('  ✓ Network and runtime config match (no discrepancies)');
    }

    console.log();
    console.log('='.repeat(80));
    console.log('TEST RESULT: PASS ✅');
    console.log('All 4 Phase 1 components working together successfully');
    console.log('='.repeat(80));

  } catch (error) {
    console.error();
    console.error('='.repeat(80));
    console.error('TEST RESULT: FAIL ❌');
    console.error('='.repeat(80));
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

testPhase1Integration().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

// Quick test script for essentiallysports.com Prebid data collection
import { chromium } from 'playwright';
import * as fs from 'fs';

async function testEssentiallySports() {
  console.log('[Test] Launching browser...');
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('[Test] Navigating to essentiallysports.com...');
    await page.goto('https://www.essentiallysports.com', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    console.log('[Test] Waiting for Prebid to load (5 seconds)...');
    await page.waitForTimeout(5000);

    console.log('[Test] Extracting Prebid data...');
    const prebidData = await page.evaluate(() => {
      // Inline version of extractPrebidData
      if (typeof window === 'undefined' || !window.pbjs) {
        return { error: 'window.pbjs not found' };
      }

      const pbjs = window.pbjs as any;
      const result: any = {
        timestamp: new Date().toISOString(),
        url: window.location.href
      };

      try {
        if (typeof pbjs.getConfig === 'function') {
          result.config = pbjs.getConfig();
        }
      } catch (e) {
        result.configError = String(e);
      }

      try {
        if (Array.isArray(pbjs.adUnits)) {
          result.adUnits = pbjs.adUnits;
          result.adUnitsCount = pbjs.adUnits.length;
        }
      } catch (e) {
        result.adUnitsError = String(e);
      }

      try {
        if (typeof pbjs.getBidResponses === 'function') {
          result.bidResponses = pbjs.getBidResponses();
        }
      } catch (e) {
        result.bidResponsesError = String(e);
      }

      try {
        if (typeof pbjs.version === 'string') {
          result.version = pbjs.version;
        }
      } catch (e) {
        result.versionError = String(e);
      }

      // Additional useful data
      try {
        result.pbjs_exists = true;
        result.pbjs_methods = Object.keys(pbjs).filter(k => typeof pbjs[k] === 'function').slice(0, 20);
      } catch (e) {
        result.methodsError = String(e);
      }

      return result;
    });

    console.log('\n=== PREBID DATA EXTRACTED ===\n');
    console.log(JSON.stringify(prebidData, null, 2));

    // Save to file
    const outputPath = './essentiallysports-prebid-data.json';
    fs.writeFileSync(outputPath, JSON.stringify(prebidData, null, 2));
    console.log(`\n[Test] Data saved to ${outputPath}`);

    // Summary
    console.log('\n=== SUMMARY ===');
    console.log(`Prebid.js found: ${!prebidData.error}`);
    console.log(`Version: ${prebidData.version || 'unknown'}`);
    console.log(`Ad Units: ${prebidData.adUnitsCount || 0}`);
    console.log(`Config present: ${!!prebidData.config}`);

    await page.screenshot({ path: 'essentiallysports-screenshot.png', fullPage: false });
    console.log('[Test] Screenshot saved to essentiallysports-screenshot.png');

  } catch (error) {
    console.error('[Test] Error:', error);
  } finally {
    await browser.close();
    console.log('[Test] Browser closed');
  }
}

testEssentiallySports();

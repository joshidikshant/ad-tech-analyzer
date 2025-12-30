// Universal ad tech detector - checks for ALL common ad tech platforms
import { chromium } from 'playwright';
import * as fs from 'fs';

async function detectUniversalAdTech() {
  console.log('[Test] Launching browser...');
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('[Test] Navigating to essentiallysports.com...');
    await page.goto('https://www.essentiallysports.com', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    console.log('[Test] Waiting 10 seconds for all ad tech to load...');
    await page.waitForTimeout(10000);

    console.log('[Test] Detecting all ad tech platforms...');
    const adTechData = await page.evaluate(() => {
      const w = window as any;
      const result: any = {
        timestamp: new Date().toISOString(),
        url: window.location.href,
        detected: []
      };

      // Check for common ad tech globals
      const checkAndAdd = (name: string, condition: boolean) => {
        if (condition) result.detected.push(name);
      };

      try {
        // Header Bidding
        checkAndAdd('Prebid.js', typeof w.pbjs !== 'undefined');
        checkAndAdd('Amazon APS/TAM', typeof w.apstag !== 'undefined');

        // Ad Servers
        checkAndAdd('Google Ad Manager (GAM)', typeof w.googletag !== 'undefined');
        checkAndAdd('Google Publisher Tag (GPT)', typeof w.googletag?.pubads !== 'undefined');

        // Wrappers & SDKs
        checkAndAdd('Freestar', typeof w.freestar !== 'undefined' || typeof w.pubfig !== 'undefined');
        checkAndAdd('Marfeel', typeof w.marfeel !== 'undefined');
        checkAndAdd('Croupier', typeof w.croupier !== 'undefined');

        // Identity
        checkAndAdd('UID2', typeof w.__uid2 !== 'undefined' || localStorage.getItem('__uid2_advertising_token') !== null);
        checkAndAdd('ID5', typeof w.__id5 !== 'undefined' || localStorage.getItem('id5id') !== null);
        checkAndAdd('LiveRamp', Object.keys(localStorage).some(k => k.startsWith('_lr_env')));

        // CMP / Consent
        checkAndAdd('TCF CMP', typeof w.__tcfapi !== 'undefined');
        checkAndAdd('USP API', typeof w.__uspapi !== 'undefined');
        checkAndAdd('GPP API', typeof w.__gppapi !== 'undefined');

        // Analytics
        checkAndAdd('Google Analytics', typeof w.gtag !== 'undefined' || typeof w.ga !== 'undefined');
        checkAndAdd('Google Tag Manager', typeof w.dataLayer !== 'undefined');
      } catch (e) {
        result.detectionError = String(e);
      }

      // Detailed inspection of detected platforms
      if (typeof w.googletag !== 'undefined') {
        try {
          const gt = w.googletag;
          result.googletag = {
            exists: true,
            slots: gt.pubads?.()?.getSlots?.()?.length || 0,
            version: gt.getVersion?.() || 'unknown'
          };
        } catch (e) {
          result.googletagError = String(e);
        }
      }

      if (typeof w.pbjs !== 'undefined') {
        try {
          result.prebid = {
            version: w.pbjs.version,
            adUnits: w.pbjs.adUnits?.length || 0
          };
        } catch (e) {
          result.prebidError = String(e);
        }
      }

      if (typeof w.apstag !== 'undefined') {
        try {
          result.amazon = {
            exists: true
          };
        } catch (e) {
          result.amazonError = String(e);
        }
      }

      // Check for any globals that look like ad tech
      result.suspiciousGlobals = [];
      const adTechKeywords = ['ad', 'bid', 'pub', 'tag', 'gtag', 'analytics', 'tracking'];
      for (const key of Object.keys(w)) {
        if (adTechKeywords.some(keyword => key.toLowerCase().includes(keyword))) {
          if (typeof w[key] === 'object' || typeof w[key] === 'function') {
            result.suspiciousGlobals.push(key);
          }
        }
      }

      return result;
    });

    console.log('\n=== AD TECH DETECTION RESULTS ===\n');
    console.log(JSON.stringify(adTechData, null, 2));

    // Save to file
    const outputPath = './essentiallysports-adtech-full.json';
    fs.writeFileSync(outputPath, JSON.stringify(adTechData, null, 2));
    console.log(`\n[Test] Data saved to ${outputPath}`);

    // Summary
    console.log('\n=== SUMMARY ===');
    console.log(`Total platforms detected: ${adTechData.detected.length}`);
    if (adTechData.detected.length > 0) {
      console.log('Detected platforms:');
      adTechData.detected.forEach((platform: string) => {
        console.log(`  - ${platform}`);
      });
    } else {
      console.log('No known ad tech platforms detected');
    }

    if (adTechData.suspiciousGlobals.length > 0) {
      console.log(`\nSuspicious globals found: ${adTechData.suspiciousGlobals.slice(0, 10).join(', ')}`);
    }

    await page.screenshot({ path: 'essentiallysports-screenshot-full.png', fullPage: false });
    console.log('[Test] Screenshot saved');

  } catch (error) {
    console.error('[Test] Error:', error);
  } finally {
    await browser.close();
    console.log('[Test] Browser closed');
  }
}

detectUniversalAdTech();

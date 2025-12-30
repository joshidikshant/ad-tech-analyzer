// Simplified universal ad tech detector
import { chromium } from 'playwright';
import * as fs from 'fs';

async function detectAdTech() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    await page.goto('https://www.essentiallysports.com', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(10000);

    const data = await page.evaluate(() => {
      const w = window as any;
      return {
        hasPrebid: typeof w.pbjs !== 'undefined',
        hasGAM: typeof w.googletag !== 'undefined',
        hasAmazon: typeof w.apstag !== 'undefined',
        hasFreestar: typeof w.freestar !== 'undefined' || typeof w.pubfig !== 'undefined',
        hasDataLayer: typeof w.dataLayer !== 'undefined',
        hasGtag: typeof w.gtag !== 'undefined',
        hasTCF: typeof w.__tcfapi !== 'undefined',
        allGlobals: Object.keys(w).filter(k => k.includes('ad') || k.includes('tag') || k.includes('bid')).slice(0, 20)
      };
    });

    console.log('\n=== ESSENTIALLYSPORTS.COM AD TECH ===\n');
    console.log(JSON.stringify(data, null, 2));
    fs.writeFileSync('./essentiallysports-result.json', JSON.stringify(data, null, 2));

    await browser.close();
  } catch (e) {
    console.error('Error:', e);
    await browser.close();
  }
}

detectAdTech();

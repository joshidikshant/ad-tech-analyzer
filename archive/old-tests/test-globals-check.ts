// Simple test to check if window globals are accessible
import { chromium } from 'playwright';

async function checkGlobals() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    try {
      await page.goto('https://www.essentiallysports.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
    } catch (e) {
      console.warn('Page load warning:', e);
    }

    console.log('Waiting 15 seconds for ad tech to load...');
    await page.waitForTimeout(15000);

    const globals = await page.evaluate(() => {
      const w = window as any;
      return {
        hasGoogletag: typeof w.googletag !== 'undefined',
        hasPbjs: typeof w.pbjs !== 'undefined',
        hasApstag: typeof w.apstag !== 'undefined',
        googletagVersion: typeof w.googletag !== 'undefined' && typeof w.googletag.getVersion === 'function' ? w.googletag.getVersion() : 'N/A',
        allGlobals: Object.keys(w).filter(k => k.includes('ad') || k.includes('tag') || k.includes('google')).slice(0, 20)
      };
    });

    console.log('=== GLOBALS CHECK ===');
    console.log(JSON.stringify(globals, null, 2));

  } finally {
    await browser.close();
  }
}

checkGlobals();

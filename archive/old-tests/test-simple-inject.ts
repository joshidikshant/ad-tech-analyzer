import { chromium } from 'playwright';

async function test() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.addInitScript(() => {
    (window as any).testMarker = 'INITIALIZED';
  });
  
  await page.goto('https://www.google.com');
  await page.waitForTimeout(1000);
  
  const marker = await page.evaluate(() => (window as any).testMarker);
  console.log('Simple inject worked:', marker === 'INITIALIZED');
  console.log('Marker value:', marker);
  
  await browser.close();
}

test().catch(console.error);

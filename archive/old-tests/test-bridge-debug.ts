import { chromium } from 'playwright';
import { injectBridge, extractBridgeData } from './src/collector/bridge-enhanced';

async function test() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('[PAGE]', msg.text()));
  page.on('pageerror', err => console.error('[PAGE ERROR]', err));
  
  await injectBridge(page);
  await page.goto('https://www.google.com', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  
  const snapshot = await extractBridgeData(page);
  const error = await page.evaluate(() => (window as any).__bridgeError);
  
  console.log('Bridge initialized:', !!snapshot);
  console.log('Error:', error);
  if (snapshot) {
    console.log('Version:', snapshot.version);
    console.log('Hooks:', snapshot.hooks);
  }
  
  await browser.close();
}

test().catch(console.error);

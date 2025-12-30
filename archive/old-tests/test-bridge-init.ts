import { chromium } from 'playwright';
import { injectBridge, extractBridgeData } from './src/collector/bridge-enhanced';

async function test() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await injectBridge(page);
  await page.goto('https://www.google.com', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  
  const snapshot = await extractBridgeData(page);
  
  console.log('Bridge initialized:', !!snapshot);
  console.log('Version:', snapshot?.version);
  console.log('Hooks:', snapshot?.hooks);
  
  await browser.close();
}

test().catch(console.error);

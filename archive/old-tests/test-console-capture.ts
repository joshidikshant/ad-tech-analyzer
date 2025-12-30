import { chromium } from 'playwright';
import { captureConsoleMessages } from './src/collector/console-capture.js';

/**
 * Test console capture on a real ad-tech heavy site
 */
async function testConsoleCapture() {
  console.log('[Test] Starting console capture test...\n');

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Setup console capture BEFORE navigation
  console.log('[Test] Setting up console capture...');
  const messages = await captureConsoleMessages(page);

  // Navigate to ad-heavy article page (known to have Prebid)
  const testUrl = 'https://www.chromeunboxed.com/chromebook-plus-ai-features-march-2024';
  console.log(`[Test] Navigating to ${testUrl}...`);

  try {
    await page.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log('[Test] Page loaded, waiting 15s for ad tech...\n');
    await page.waitForTimeout(15000);
  } catch (err) {
    console.warn('[Test] Page load warning:', err);
  }

  // Display captured console messages
  console.log(`\n[Test] Captured ${messages.length} ad-tech console messages:\n`);
  console.log('='.repeat(80));

  if (messages.length === 0) {
    console.log('⚠️  No ad-tech console messages captured.');
    console.log('This could mean:');
    console.log('  1. Site uses different ad tech keywords');
    console.log('  2. Console messages are not logged');
    console.log('  3. CDP hook needs adjustment\n');
  } else {
    messages.forEach((msg, idx) => {
      console.log(`\n[${idx + 1}] ${msg.level.toUpperCase()}`);
      console.log(`    Time: ${new Date(msg.timestamp).toISOString()}`);
      console.log(`    Text: ${msg.text.substring(0, 200)}${msg.text.length > 200 ? '...' : ''}`);
      if (msg.url) {
        console.log(`    URL:  ${msg.url.substring(0, 100)}${msg.url.length > 100 ? '...' : ''}`);
      }
    });
  }

  console.log('\n' + '='.repeat(80));
  console.log(`\n[Test] Summary: ${messages.length} messages captured\n`);

  await browser.close();
}

// Run test
testConsoleCapture().catch((err) => {
  console.error('[Test] Fatal error:', err);
  process.exit(1);
});

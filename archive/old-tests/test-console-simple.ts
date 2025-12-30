import { chromium } from 'playwright';
import { captureConsoleMessages } from './src/collector/console-capture.js';

/**
 * Test console capture with synthetic console messages
 */
async function testConsoleCaptureSimple() {
  console.log('[Test] Starting simple console capture test...\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Setup console capture BEFORE any page activity
  console.log('[Test] Setting up console capture...');
  const messages = await captureConsoleMessages(page);

  // Navigate to blank page
  console.log('[Test] Navigating to blank page...');
  await page.goto('about:blank');

  // Inject synthetic console messages with ad-tech keywords
  console.log('[Test] Injecting synthetic ad-tech console messages...\n');
  await page.evaluate(() => {
    console.log('Test message without keywords - should be filtered out');
    console.log('Prebid configuration loaded successfully');
    console.warn('googletag slot rendering delayed');
    console.error('GPT: No ad available for slot');
    console.log('User consent status: accepted via CMP');
    console.warn('Ezoic ad placeholder found');
    console.error('Freestar bidder timeout');
    console.log('Prebid user email: user@example.com detected');
    console.log('googletag user ID: 550e8400-e29b-41d4-a716-446655440000 found');
  });

  // Wait a bit for CDP events to propagate
  await page.waitForTimeout(2000);

  // Display results
  console.log(`[Test] Captured ${messages.length} messages:\n`);
  console.log('='.repeat(80));

  messages.forEach((msg, idx) => {
    console.log(`\n[${idx + 1}] ${msg.level.toUpperCase()}`);
    console.log(`    Text: ${msg.text}`);
    if (msg.url) {
      console.log(`    URL:  ${msg.url}`);
    }
  });

  console.log('\n' + '='.repeat(80));

  // Validate PII redaction
  const hasRedactedEmail = messages.some(m => m.text.includes('[REDACTED_EMAIL]'));
  const hasRedactedUUID = messages.some(m => m.text.includes('[REDACTED_UUID]'));
  const hasOriginalEmail = messages.some(m => m.text.includes('user@example.com'));
  const hasOriginalUUID = messages.some(m => m.text.includes('550e8400-e29b-41d4-a716-446655440000'));

  console.log('\n[Test] Validation:');
  console.log(`  ✓ Messages captured: ${messages.length >= 8 ? 'PASS' : 'FAIL'} (expected 8, got ${messages.length})`);
  console.log(`  ✓ Email redacted: ${hasRedactedEmail ? 'PASS' : 'FAIL'}`);
  console.log(`  ✓ UUID redacted: ${hasRedactedUUID ? 'PASS' : 'FAIL'}`);
  console.log(`  ✓ No original email: ${!hasOriginalEmail ? 'PASS' : 'FAIL'}`);
  console.log(`  ✓ No original UUID: ${!hasOriginalUUID ? 'PASS' : 'FAIL'}`);
  console.log(`  ✓ Filtered non-ad-tech: ${messages.every(m => !m.text.includes('without keywords')) ? 'PASS' : 'FAIL'}\n`);

  await browser.close();

  // Exit code based on test results
  const passed = messages.length >= 8 && hasRedactedEmail && hasRedactedUUID && !hasOriginalEmail && !hasOriginalUUID;
  process.exit(passed ? 0 : 1);
}

testConsoleCaptureSimple().catch((err) => {
  console.error('[Test] Fatal error:', err);
  process.exit(1);
});

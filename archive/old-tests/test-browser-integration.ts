// Direct test of browser service integration
import { analyzeUrl } from './src/services/browser';

async function testBrowserService() {
  console.log('[Test] Starting browser service test...');

  try {
    const result = await analyzeUrl('https://www.essentiallysports.com', { headless: false });

    console.log('\n=== ANALYSIS RESULT ===\n');
    console.log(JSON.stringify(result, null, 2));

    console.log('\n=== SUMMARY ===');
    console.log(`Detected platforms: ${result.detectedPlatforms.join(', ') || 'none'}`);
    console.log(`Errors: ${result.errors.length}`);

    if (result.errors.length > 0) {
      console.log('Error details:', result.errors);
    }
  } catch (error) {
    console.error('[Test] Error:', error);
  }
}

testBrowserService();

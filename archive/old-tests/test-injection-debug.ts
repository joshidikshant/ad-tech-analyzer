// Debug test to check collector injection
import { chromium } from 'playwright';
import * as esbuild from 'esbuild';
import * as path from 'path';

async function testInjection() {
  console.log('[Test] Bundling collector...');

  const collectorPath = path.resolve(__dirname, 'src/collector/orchestrator.ts');
  const result = await esbuild.build({
    entryPoints: [collectorPath],
    bundle: true,
    write: false,
    format: 'iife',
    globalName: 'Collector',
    platform: 'browser',
    target: ['es2015']
  });

  const collectorScript = result.outputFiles[0].text;
  console.log(`[Test] Bundled ${collectorScript.length} bytes`);
  console.log(`[Test] First 200 chars: ${collectorScript.substring(0, 200)}`);

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    await page.goto('https://www.essentiallysports.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log('[Test] Page loaded, waiting 15s...');
    await page.waitForTimeout(15000);

    // Inject script
    await page.addScriptTag({ content: collectorScript });
    console.log('[Test] Script injected');

    // Check what's available
    const debug = await page.evaluate(() => {
      const w = window as any;
      return {
        hasCollectorGlobal: typeof w.Collector !== 'undefined',
        collectorKeys: typeof w.Collector === 'object' ? Object.keys(w.Collector) : [],
        hasGoogletag: typeof w.googletag !== 'undefined',
        hasCollectAllData: typeof w.Collector?.collectAllData === 'function',
        collectorType: typeof w.Collector
      };
    });

    console.log('\n=== DEBUG INFO ===');
    console.log(JSON.stringify(debug, null, 2));

    if (debug.hasCollectorGlobal && debug.hasCollectAllData) {
      console.log('\n[Test] Running collectAllData...');
      const result = await page.evaluate(() => {
        const w = window as any;
        return w.Collector.collectAllData();
      });
      console.log('\n=== RESULT ===');
      console.log(JSON.stringify(result, null, 2));
    }

  } finally {
    await browser.close();
  }
}

testInjection();

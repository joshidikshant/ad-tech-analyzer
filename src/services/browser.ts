import { chromium, Browser, Page } from 'playwright';
import * as esbuild from 'esbuild';
import * as path from 'path';
import { AdTechAnalysis } from '../collector/orchestrator';

/**
 * Service to handle browser automation for ad tech analysis
 */

interface BrowserOptions {
  headless?: boolean;
}

let cachedCollectorScript: string | null = null;

/**
 * Compiles the collector orchestrator and its dependencies into a single script
 * suitable for browser injection.
 */
async function getCollectorScript(): Promise<string> {
  if (cachedCollectorScript) return cachedCollectorScript;

  try {
    const collectorPath = path.resolve(__dirname, '../collector/orchestrator.ts');
    
    const result = await esbuild.build({
      entryPoints: [collectorPath],
      bundle: true,
      write: false,
      format: 'iife',
      globalName: 'Collector',
      platform: 'browser',
      target: ['es2015']
    });

    if (result.outputFiles && result.outputFiles[0]) {
      cachedCollectorScript = result.outputFiles[0].text;
      return cachedCollectorScript;
    }
    throw new Error('No output generated from esbuild');
  } catch (error) {
    console.error('Failed to bundle collector script:', error);
    throw error;
  }
}

/**
 * Analyzes a URL by launching a browser, injecting collectors, and retrieving data.
 * 
 * @param url The URL to analyze
 * @param options Configuration options (headless, etc.)
 * @returns The collected AdTechAnalysis data
 */
export async function analyzeUrl(url: string, options: BrowserOptions = {}): Promise<AdTechAnalysis> {
  const headless = options.headless !== undefined ? options.headless : true;
  let browser: Browser | null = null;

  try {
    // 1. Build/Get the collector script
    const collectorScript = await getCollectorScript();

    // 2. Launch Browser
    browser = await chromium.launch({ headless });
    const page: Page = await browser.newPage();

    // 3. Navigate to URL
    // Use domcontentloaded as networkidle often times out on ad-heavy pages
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    } catch (e) {
      console.warn(`Page load timeout or error for ${url}, proceeding anyway:`, e);
      // We proceed because some ad tech might have loaded even if DOM is ready
    }

    // 4. Wait for ad tech to load
    // 15s wait to allow async ad tech scripts to initialize
    console.log(`[Browser] Waiting 15s for ad tech to load on ${url}...`);
    await page.waitForTimeout(15000);

    // 5. Inject the collector script
    await page.addScriptTag({ content: collectorScript });

    // 6. Run the collector
    const analysis = await page.evaluate(() => {
      // The bundled script exposes 'Collector' global
      const w = window as any;
      if (w.Collector && typeof w.Collector.collectAllData === 'function') {
        return w.Collector.collectAllData();
      }
      throw new Error('Collector script failed to initialize or collectAllData is missing');
    });

    return analysis;

  } catch (error) {
    console.error(`Error analyzing ${url}:`, error);
    // Return a partial error result structure
    return {
      timestamp: new Date().toISOString(),
      url: url,
      prebid: null,
      gam: null,
      amazon: null,
      detectedPlatforms: [],
      errors: [`Analysis failed: ${error instanceof Error ? error.message : String(error)}`]
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

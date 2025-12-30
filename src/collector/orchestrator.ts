// Collector orchestrator - runs all data collectors and aggregates results
import { extractPrebidData, PrebidData } from './prebid.js';
import { extractGAMData, GamData } from './gam.js';
import { extractAmazonData, ApsData } from './amazon.js';

/**
 * Complete ad tech analysis result combining all collectors
 */
export interface AdTechAnalysis {
  timestamp: string;
  url: string;
  prebid: PrebidData | null;
  gam: GamData | null;
  amazon: ApsData | null;
  detectedPlatforms: string[];
  errors: string[];
}

/**
 * Runs all collectors and returns aggregated analysis
 *
 * @param url - The URL being analyzed (for metadata)
 * @returns Complete ad tech analysis
 */
export function collectAllData(url?: string): AdTechAnalysis {
  const analysis: AdTechAnalysis = {
    timestamp: new Date().toISOString(),
    url: url || (typeof window !== 'undefined' ? window.location.href : 'unknown'),
    prebid: null,
    gam: null,
    amazon: null,
    detectedPlatforms: [],
    errors: []
  };

  // Prebid collector
  try {
    analysis.prebid = extractPrebidData();
    if (analysis.prebid) {
      analysis.detectedPlatforms.push('Prebid.js');
    }
  } catch (error) {
    const errorMsg = `Prebid collector error: ${error}`;
    console.error('[Orchestrator]', errorMsg);
    analysis.errors.push(errorMsg);
  }

  // GAM collector
  try {
    analysis.gam = extractGAMData();
    if (analysis.gam) {
      analysis.detectedPlatforms.push('Google Ad Manager');
    }
  } catch (error) {
    const errorMsg = `GAM collector error: ${error}`;
    console.error('[Orchestrator]', errorMsg);
    analysis.errors.push(errorMsg);
  }

  // Amazon APS collector
  try {
    analysis.amazon = extractAmazonData();
    if (analysis.amazon) {
      analysis.detectedPlatforms.push('Amazon APS');
    }
  } catch (error) {
    const errorMsg = `Amazon collector error: ${error}`;
    console.error('[Orchestrator]', errorMsg);
    analysis.errors.push(errorMsg);
  }

  console.log(`[Orchestrator] Analysis complete. Detected: ${analysis.detectedPlatforms.join(', ') || 'none'}`);

  return analysis;
}

/**
 * Quick detection check - returns which platforms are present without full data extraction
 * Useful for lightweight checks
 */
export function detectPlatforms(): {
  hasPrebid: boolean;
  hasGAM: boolean;
  hasAmazon: boolean;
  hasFreestar: boolean;
  detectedPlatforms: string[];
} {
  const w = typeof window !== 'undefined' ? (window as any) : {};

  const hasPrebid = typeof w.pbjs !== 'undefined';
  const hasGAM = typeof w.googletag !== 'undefined';
  const hasAmazon = typeof w.apstag !== 'undefined';
  const hasFreestar = typeof w.freestar !== 'undefined' || typeof w.pubfig !== 'undefined';

  const platforms: string[] = [];
  if (hasPrebid) platforms.push('Prebid.js');
  if (hasGAM) platforms.push('Google Ad Manager');
  if (hasAmazon) platforms.push('Amazon APS');
  if (hasFreestar) platforms.push('Freestar');

  return {
    hasPrebid,
    hasGAM,
    hasAmazon,
    hasFreestar,
    detectedPlatforms: platforms
  };
}

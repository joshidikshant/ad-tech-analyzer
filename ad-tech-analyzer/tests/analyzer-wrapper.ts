/**
 * Analyzer Wrapper for Test Runner
 *
 * Wraps the Chrome DevTools MCP-based analyzer for use in batch testing
 */

import { classifyNetworkRequests } from '../src/analyzer/network-classifier';

export interface AnalysisResult {
  success: boolean;
  url: string;
  timestamp: string;
  duration: number;
  vendors_detected: number;
  ssp_count: number;
  managed_service: string | null;
  prebid_detected: boolean;
  gam_detected: boolean;
  vendors: string[];
  categories: Record<string, string[]>;
  runtime_config?: {
    prebid_version?: string;
    ad_units_count?: number;
    user_id_modules_count?: number;
  };
  error?: string;
}

/**
 * Analyze a single site using Chrome DevTools MCP
 *
 * This is a placeholder - in actual use, this would be called from
 * Claude Code environment where MCP tools are available
 */
export async function analyzeSiteWithMCP(url: string): Promise<AnalysisResult> {
  const startTime = Date.now();

  try {
    // This function is meant to be called from within Claude Code
    // where Chrome DevTools MCP tools (mcp__chrome-devtools__*) are available

    // For standalone execution, return error
    throw new Error(
      'This analyzer requires Chrome DevTools MCP tools which are only available in Claude Code environment. ' +
      'Run this from Claude Code CLI or use the /analyze-site slash command.'
    );

  } catch (error) {
    return {
      success: false,
      url,
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
      vendors_detected: 0,
      ssp_count: 0,
      managed_service: null,
      prebid_detected: false,
      gam_detected: false,
      vendors: [],
      categories: {},
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Helper to compile analysis from raw MCP data
 * This would be used when calling from Claude Code with MCP tools
 */
export function compileAnalysis(
  url: string,
  networkRequests: any[],
  apiData: any,
  duration: number
): AnalysisResult {
  // Classify vendors from network
  const classification = classifyNetworkRequests(networkRequests);

  return {
    success: true,
    url,
    timestamp: new Date().toISOString(),
    duration,
    vendors_detected: classification.vendors.length,
    ssp_count: classification.ssp_count,
    managed_service: classification.managed_service,
    prebid_detected: classification.prebid_detected,
    gam_detected: classification.gam_detected,
    vendors: classification.vendors,
    categories: classification.categories,
    runtime_config: {
      prebid_version: apiData?.pbjs?.version,
      ad_units_count: apiData?.pbjs?.adUnits?.length || 0,
      user_id_modules_count: apiData?.pbjs?.config?.userSync?.userIds?.length || 0,
    },
  };
}

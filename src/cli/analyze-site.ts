#!/usr/bin/env node
import { Command } from 'commander';
import { BrowserClient } from './browser-client';
import { ChromeDevToolsClient } from '../mcp/chrome-devtools-client';
import { classifyNetworkRequests } from '../analyzer/network-classifier';
import { AnalysisProgress, AnalysisPhase } from './progress';
import { OutputFormatter, AnalysisOutput } from './output';
import chalk from 'chalk';

interface CliOptions {
  output?: string;
  device?: 'mobile' | 'desktop';
  timeout?: number;
  format?: 'json' | 'summary';
}

const program = new Command();

program
  .name('analyze-site')
  .description('Analyze ad-tech implementation on any website')
  .version('1.0.0')
  .argument('<url>', 'URL to analyze')
  .option('-o, --output <path>', 'Output file path (default: stdout)')
  .option('-d, --device <type>', 'Device type: mobile or desktop', 'desktop')
  .option('-t, --timeout <ms>', 'Timeout in milliseconds', '60000')
  .option('-f, --format <type>', 'Output format: json or summary', 'json')
  .action(async (url: string, options: CliOptions) => {
    const exitCode = await analyzeWebsite(url, options);
    process.exit(exitCode);
  });

async function analyzeWebsite(url: string, options: CliOptions): Promise<number> {
  const progress = new AnalysisProgress();

  // Validate URL
  try {
    new URL(url);
  } catch (error) {
    console.error(chalk.red('✗ Invalid URL:'), url);
    return 2;
  }

  const client = new BrowserClient();

  try {
    // Phase 1: Connect and Navigate
    progress.start(AnalysisPhase.CONNECTING);
    await client.launch();

    progress.update(AnalysisPhase.NAVIGATING);
    const timeout = parseInt(options.timeout || '60000', 10);
    await client.navigateTo(url, timeout);

    // Phase 2: Wait for page load
    progress.update(AnalysisPhase.LOADING);
    await client.waitForPageLoad(5000); // 5s wait for ads

    // Phase 3: Capture network requests
    progress.update(AnalysisPhase.CAPTURING);
    const networkRequests = client.getNetworkRequests();

    if (!networkRequests || networkRequests.length === 0) {
      progress.warn('No network requests captured');
    } else {
      progress.info(`Captured ${networkRequests.length} network requests`);
    }

    // Phase 4: Classify vendors
    progress.update(AnalysisPhase.CLASSIFYING);
    // Cast requests to any because type definition might differ slightly
    const networkAnalysis = classifyNetworkRequests(networkRequests as any[] || []);

    progress.info(
      `Detected ${networkAnalysis.vendors.length} vendors (${networkAnalysis.ssp_count} SSPs)`
    );

    // Phase 5: Query ad-tech APIs
    progress.update(AnalysisPhase.QUERYING);
    const apiData = await client.queryAdTechAPIs();

    // Phase 6: Compile results
    progress.update(AnalysisPhase.FINALIZING);
    const analysis: AnalysisOutput = compileAnalysis(
      url,
      networkRequests || [],
      networkAnalysis,
      apiData
    );

    // Success
    progress.succeed('Analysis complete');

    // Output results
    if (options.output) {
      await OutputFormatter.writeToFile(analysis, options.output);
      console.log(chalk.green(`\n✓ Results saved to: ${options.output}`));
    }

    if (options.format === 'summary' || !options.output) {
      OutputFormatter.printSummary(analysis);
    }

    if (!options.output && options.format === 'json') {
      OutputFormatter.writeToStdout(analysis);
    }

    // Cleanup
    await client.close();
    return 0;

  } catch (error) {
    progress.fail('Analysis failed');

    if (error instanceof Error) {
      console.error(chalk.red('\nError:'), error.message);

      if (error.message.includes('Timeout')) {
        console.error(chalk.yellow('\nTip: Try increasing the timeout with --timeout <ms>'));
      } else if (error.message.includes('navigation')) {
        console.error(chalk.yellow('\nTip: Check if the URL is accessible and valid'));
      }
    } else {
      console.error(chalk.red('\nUnexpected error:'), error);
    }

    await client.close();
    return 1;
  }
}

function compileAnalysis(
  url: string,
  networkRequests: any[],
  networkAnalysis: any,
  apiData: any
): AnalysisOutput {
  const timestamp = new Date().toISOString();

  // Extract unique URLs
  const uniqueUrls = new Set(networkRequests.map(r => r.url).filter(Boolean));

  // Build executive summary
  const executive_summary = {
    total_vendors_detected: networkAnalysis.vendors.length,
    managed_service: networkAnalysis.managed_service,
    header_bidding_wrapper: apiData.pbjs.present
      ? `Prebid.js ${apiData.pbjs.version || ''}`
      : null,
    ad_server: networkAnalysis.gam_detected ? 'Google Ad Manager' : null,
    ssp_count: networkAnalysis.ssp_count,
    server_to_server_bidding:
      apiData.pbjs.config?.s2sConfig && apiData.pbjs.config.s2sConfig.length > 0,
    user_id_modules: apiData.pbjs.config?.userSync?.userIds?.length || 0,
    ad_units_active: apiData.pbjs.adUnits?.length || 0,
  };

  // Build runtime configuration
  const runtime_configuration: any = {};

  if (apiData.pbjs.present) {
    runtime_configuration.prebid = {
      version: apiData.pbjs.version,
      present: true,
      bidder_timeout: apiData.pbjs.config?.bidderTimeout,
      enable_send_all_bids: apiData.pbjs.config?.enableSendAllBids,
      server_to_server_config: apiData.pbjs.config?.s2sConfig,
      user_id_modules: apiData.pbjs.config?.userSync?.userIds,
      ad_units: apiData.pbjs.adUnits,
      price_granularity: apiData.pbjs.config?.priceGranularity,
      floor_prices: apiData.pbjs.config?.floors?.data,
    };
  }

  if (apiData.gam.present) {
    runtime_configuration.google_ad_manager = {
      present: true,
      gpt_version: apiData.gam.version,
      slots: apiData.gam.slots,
      page_targeting: apiData.gam.targeting,
    };
  }

  // Build key insights
  const key_insights: any = {};

  if (apiData.pbjs.config?.s2sConfig) {
    key_insights.bidding_strategy = {
      type: 'Hybrid Client + Server-to-Server',
      s2s_providers: apiData.pbjs.config.s2sConfig.length,
      bidder_timeout: apiData.pbjs.config.bidderTimeout,
    };
  }

  if (apiData.pbjs.config?.userSync?.userIds) {
    key_insights.identity_resolution = {
      strategy: 'Multi-provider identity graph',
      id_providers: apiData.pbjs.config.userSync.userIds.length,
    };
  }

  if (apiData.pbjs.config?.floors) {
    key_insights.floor_pricing = {
      enabled: true,
      dynamic_floors: true,
    };
  }

  if (networkAnalysis.managed_service) {
    key_insights.managed_wrapper = {
      provider: networkAnalysis.managed_service,
    };
  }

  // Build complete analysis
  const analysis: AnalysisOutput = {
    analysis_metadata: {
      url,
      timestamp,
      analysis_method: 'Network Classification + Runtime API Query',
      total_network_requests: networkRequests.length,
      unique_urls_analyzed: uniqueUrls.size,
    },
    executive_summary,
    network_analysis: {
      vendors_detected: networkAnalysis.vendors,
      categorized_vendors: networkAnalysis.categories,
    },
    runtime_configuration,
    key_insights,
    technical_architecture: {
      stack: buildTechStack(networkAnalysis, apiData),
    },
    monetization_analysis: {
      revenue_optimization_score: calculateOptimizationScore(networkAnalysis, apiData),
      factors: {
        bidder_density: networkAnalysis.ssp_count >= 5 ? 'High' : 'Medium',
        s2s_bidding: runtime_configuration.prebid?.server_to_server_config ? 'Active' : 'None',
        identity_resolution:
          executive_summary.user_id_modules > 10 ? 'Comprehensive' : 'Basic',
        managed_service: networkAnalysis.managed_service ? 'Yes' : 'No',
      },
    },
  };

  return analysis;
}

function buildTechStack(networkAnalysis: any, apiData: any): string {
  const parts: string[] = [];

  if (networkAnalysis.managed_service) {
    parts.push(networkAnalysis.managed_service);
  }

  if (apiData.pbjs.present) {
    parts.push('Prebid.js');
  }

  if (networkAnalysis.gam_detected) {
    parts.push('Google Ad Manager');
  }

  return parts.join(' → ');
}

function calculateOptimizationScore(networkAnalysis: any, apiData: any): string {
  let score = 0;

  // Bidder count
  if (networkAnalysis.ssp_count >= 7) score += 2;
  else if (networkAnalysis.ssp_count >= 4) score += 1;

  // S2S bidding
  if (apiData.pbjs.config?.s2sConfig?.length > 0) score += 2;

  // Identity resolution
  if (apiData.pbjs.config?.userSync?.userIds?.length > 10) score += 2;
  else if (apiData.pbjs.config?.userSync?.userIds?.length > 5) score += 1;

  // Floor pricing
  if (apiData.pbjs.config?.floors) score += 1;

  // Managed service
  if (networkAnalysis.managed_service) score += 2;

  if (score >= 8) return 'Advanced';
  if (score >= 5) return 'Moderate';
  return 'Basic';
}

// Run CLI
program.parse();

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

export interface AnalysisOutput {
  analysis_metadata: {
    url: string;
    timestamp: string;
    analysis_method: string;
    total_network_requests?: number;
    unique_urls_analyzed?: number;
  };
  executive_summary: {
    total_vendors_detected: number;
    managed_service: string | null;
    header_bidding_wrapper: string | null;
    ad_server: string | null;
    ssp_count: number;
    server_to_server_bidding?: boolean;
    user_id_modules?: number;
    ad_units_active?: number;
  };
  network_analysis: any;
  runtime_configuration?: any;
  key_insights?: any;
  technical_architecture?: any;
  monetization_analysis?: any;
}

export class OutputFormatter {
  /**
   * Write analysis to file with atomic write operation
   */
  static async writeToFile(data: AnalysisOutput, filePath: string): Promise<void> {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const tempPath = `${filePath}.tmp`;

    try {
      // Write to temporary file
      await fs.promises.writeFile(
        tempPath,
        JSON.stringify(data, null, 2),
        'utf-8'
      );

      // Atomic rename
      await fs.promises.rename(tempPath, filePath);
    } catch (error) {
      // Clean up temp file on error
      if (fs.existsSync(tempPath)) {
        await fs.promises.unlink(tempPath);
      }
      throw error;
    }
  }

  /**
   * Output JSON to stdout
   */
  static writeToStdout(data: AnalysisOutput, pretty: boolean = true): void {
    if (pretty) {
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log(JSON.stringify(data));
    }
  }

  /**
   * Generate human-readable summary
   */
  static generateSummary(data: AnalysisOutput): string {
    const { analysis_metadata, executive_summary, network_analysis } = data;

    const lines: string[] = [];

    // Header
    lines.push('');
    lines.push(chalk.bold.cyan('═'.repeat(70)));
    lines.push(chalk.bold.cyan('  Ad-Tech Analysis Report'));
    lines.push(chalk.bold.cyan('═'.repeat(70)));
    lines.push('');

    // URL
    lines.push(chalk.bold('URL: ') + chalk.white(analysis_metadata.url));
    lines.push(chalk.gray(`Analyzed: ${analysis_metadata.timestamp}`));
    lines.push('');

    // Executive Summary
    lines.push(chalk.bold.yellow('EXECUTIVE SUMMARY'));
    lines.push(chalk.gray('─'.repeat(70)));
    lines.push(
      `${chalk.bold('Total Vendors Detected:')} ${chalk.green(executive_summary.total_vendors_detected.toString())}`
    );

    if (executive_summary.managed_service) {
      lines.push(
        `${chalk.bold('Managed Service:')} ${chalk.cyan(executive_summary.managed_service)}`
      );
    }

    if (executive_summary.header_bidding_wrapper) {
      lines.push(
        `${chalk.bold('Header Bidding:')} ${chalk.cyan(executive_summary.header_bidding_wrapper)}`
      );
    }

    if (executive_summary.ad_server) {
      lines.push(
        `${chalk.bold('Ad Server:')} ${chalk.cyan(executive_summary.ad_server)}`
      );
    }

    lines.push(
      `${chalk.bold('SSP Count:')} ${chalk.green(executive_summary.ssp_count.toString())}`
    );

    if (executive_summary.server_to_server_bidding !== undefined) {
      lines.push(
        `${chalk.bold('S2S Bidding:')} ${executive_summary.server_to_server_bidding ? chalk.green('✓ Yes') : chalk.gray('✗ No')}`
      );
    }

    if (executive_summary.user_id_modules) {
      lines.push(
        `${chalk.bold('User ID Modules:')} ${chalk.green(executive_summary.user_id_modules.toString())}`
      );
    }

    if (executive_summary.ad_units_active) {
      lines.push(
        `${chalk.bold('Active Ad Units:')} ${chalk.green(executive_summary.ad_units_active.toString())}`
      );
    }

    lines.push('');

    // Vendors by Category
    if (network_analysis?.categorized_vendors) {
      lines.push(chalk.bold.yellow('VENDORS BY CATEGORY'));
      lines.push(chalk.gray('─'.repeat(70)));

      const categories = network_analysis.categorized_vendors;

      for (const [category, vendors] of Object.entries(categories) as [string, string[]][]) {
        if (vendors && vendors.length > 0) {
          const categoryLabel = category
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');

          lines.push(
            `${chalk.bold(categoryLabel + ':')} ${chalk.white(vendors.join(', '))}`
          );
        }
      }

      lines.push('');
    }

    // Key Insights
    if (data.key_insights) {
      lines.push(chalk.bold.yellow('KEY INSIGHTS'));
      lines.push(chalk.gray('─'.repeat(70)));

      const insights = data.key_insights;

      if (insights.bidding_strategy) {
        lines.push(
          `${chalk.bold('Bidding Strategy:')} ${chalk.white(insights.bidding_strategy.type)}`
        );
      }

      if (insights.identity_resolution) {
        lines.push(
          `${chalk.bold('Identity Providers:')} ${chalk.white(insights.identity_resolution.id_providers)} providers`
        );
      }

      if (insights.ad_refresh?.enabled) {
        lines.push(
          `${chalk.bold('Ad Refresh:')} ${chalk.green('✓ Enabled')} (${insights.ad_refresh.slots_with_refresh?.length || 0} slots)`
        );
      }

      if (insights.floor_pricing?.enabled) {
        lines.push(
          `${chalk.bold('Floor Pricing:')} ${chalk.green('✓ Enabled')} (Dynamic: ${insights.floor_pricing.dynamic_floors ? 'Yes' : 'No'})`
        );
      }

      lines.push('');
    }

    // Footer
    lines.push(chalk.gray('─'.repeat(70)));
    lines.push(
      chalk.gray(`Full analysis saved to output file`)
    );
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Print summary to console
   */
  static printSummary(data: AnalysisOutput): void {
    console.log(this.generateSummary(data));
  }
}

#!/usr/bin/env tsx
/**
 * Batch Test Runner for Multi-Site Validation
 *
 * Runs ad-tech analysis on all sites in tests/sites.json
 * Saves results to tests/results/<domain>.json
 * Generates validation report
 */

import * as fs from 'fs';
import * as path from 'path';

interface TestSite {
  url: string;
  category: string;
  expected_wrapper?: string;
  expected_ssps?: string[];
  region?: string;
  complexity?: string;
  notes?: string;
}

interface ValidationResult {
  site: TestSite;
  success: boolean;
  duration: number;
  vendors_detected: number;
  managed_service?: string | null;
  ssp_count: number;
  errors?: string[];
  analysis_file?: string;
}

async function loadTestSites(): Promise<TestSite[]> {
  const sitesPath = path.join(__dirname, 'sites.json');

  if (!fs.existsSync(sitesPath)) {
    console.error('❌ tests/sites.json not found!');
    console.error('Run Gemini task to generate test sites first.');
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(sitesPath, 'utf-8'));
  return data.sites;
}

async function analyzeSite(site: TestSite): Promise<ValidationResult> {
  const startTime = Date.now();
  const domain = new URL(site.url).hostname.replace('www.', '');
  const outputFile = path.join(__dirname, 'results', `${domain}.json`);

  console.log(`\n🔍 Analyzing: ${site.url}`);
  console.log(`   Category: ${site.category}`);
  if (site.expected_wrapper) {
    console.log(`   Expected: ${site.expected_wrapper}`);
  }

  try {
    // TODO: Call the analyzer
    // For now, return placeholder
    const duration = Date.now() - startTime;

    return {
      site,
      success: false,
      duration,
      vendors_detected: 0,
      ssp_count: 0,
      errors: ['Analyzer not yet integrated - placeholder result'],
    };

  } catch (error) {
    const duration = Date.now() - startTime;

    return {
      site,
      success: false,
      duration,
      vendors_detected: 0,
      ssp_count: 0,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
}

async function generateReport(results: ValidationResult[]): Promise<void> {
  const reportPath = path.join(__dirname, 'validation-report.md');

  const totalSites = results.length;
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / totalSites;
  const avgVendors = results
    .filter(r => r.success)
    .reduce((sum, r) => sum + r.vendors_detected, 0) / (successful || 1);

  const report = [
    '# Ad-Tech Analyzer Validation Report',
    '',
    `**Generated:** ${new Date().toISOString()}`,
    '',
    '## Summary',
    '',
    `- **Total Sites:** ${totalSites}`,
    `- **Successful:** ${successful} (${((successful / totalSites) * 100).toFixed(1)}%)`,
    `- **Failed:** ${failed} (${((failed / totalSites) * 100).toFixed(1)}%)`,
    `- **Avg Duration:** ${(avgDuration / 1000).toFixed(1)}s`,
    `- **Avg Vendors Detected:** ${avgVendors.toFixed(1)}`,
    '',
    '## Results by Category',
    '',
  ];

  // Group by category
  const byCategory: Record<string, ValidationResult[]> = {};
  results.forEach(r => {
    if (!byCategory[r.site.category]) {
      byCategory[r.site.category] = [];
    }
    byCategory[r.site.category].push(r);
  });

  for (const [category, categoryResults] of Object.entries(byCategory)) {
    const catSuccess = categoryResults.filter(r => r.success).length;
    const catTotal = categoryResults.length;

    report.push(`### ${category.replace('_', ' ').toUpperCase()}`);
    report.push('');
    report.push(`**Success Rate:** ${catSuccess}/${catTotal} (${((catSuccess / catTotal) * 100).toFixed(1)}%)`);
    report.push('');
    report.push('| Site | Status | Vendors | SSPs | Managed Service | Duration |');
    report.push('|------|--------|---------|------|-----------------|----------|');

    categoryResults.forEach(r => {
      const domain = new URL(r.site.url).hostname;
      const status = r.success ? '✅' : '❌';
      const vendors = r.success ? r.vendors_detected : '-';
      const ssps = r.success ? r.ssp_count : '-';
      const managed = r.managed_service || '-';
      const duration = `${(r.duration / 1000).toFixed(1)}s`;

      report.push(`| ${domain} | ${status} | ${vendors} | ${ssps} | ${managed} | ${duration} |`);
    });

    report.push('');
  }

  // Errors section
  const withErrors = results.filter(r => r.errors && r.errors.length > 0);
  if (withErrors.length > 0) {
    report.push('## Errors');
    report.push('');

    withErrors.forEach(r => {
      const domain = new URL(r.site.url).hostname;
      report.push(`### ${domain}`);
      report.push('');
      r.errors?.forEach(err => report.push(`- ${err}`));
      report.push('');
    });
  }

  // Vendor detection analysis
  report.push('## Vendor Detection Analysis');
  report.push('');
  report.push('### Expected vs Detected');
  report.push('');
  report.push('| Site | Expected Wrapper | Detected | Match |');
  report.push('|------|------------------|----------|-------|');

  results
    .filter(r => r.site.expected_wrapper)
    .forEach(r => {
      const domain = new URL(r.site.url).hostname;
      const expected = r.site.expected_wrapper;
      const detected = r.managed_service || 'None';
      const match = expected === detected ? '✅' : '❌';

      report.push(`| ${domain} | ${expected} | ${detected} | ${match} |`);
    });

  report.push('');
  report.push('## Recommendations');
  report.push('');
  report.push('Based on validation results:');
  report.push('');
  report.push('1. **Missing Vendor Patterns:**');
  report.push('   - Review failed detections');
  report.push('   - Add patterns for undetected vendors');
  report.push('   - Update confidence scores');
  report.push('');
  report.push('2. **Performance Optimization:**');
  report.push('   - Sites taking >60s need timeout handling');
  report.push('   - Consider parallel analysis for batch runs');
  report.push('');
  report.push('3. **Edge Case Handling:**');
  report.push('   - Paywall sites may need special detection');
  report.push('   - International sites may use different vendors');
  report.push('');

  fs.writeFileSync(reportPath, report.join('\n'));
  console.log(`\n📊 Report saved to: ${reportPath}`);
}

async function main() {
  console.log('🚀 Ad-Tech Analyzer - Multi-Site Validation\n');

  // Load test sites
  const sites = await loadTestSites();
  console.log(`📋 Loaded ${sites.length} test sites\n`);

  // Run analysis on each site
  const results: ValidationResult[] = [];

  for (const site of sites) {
    const result = await analyzeSite(site);
    results.push(result);

    if (result.success) {
      console.log(`   ✅ Success: ${result.vendors_detected} vendors, ${result.ssp_count} SSPs`);
    } else {
      console.log(`   ❌ Failed: ${result.errors?.[0] || 'Unknown error'}`);
    }
  }

  // Generate report
  console.log('\n📊 Generating validation report...');
  await generateReport(results);

  // Summary
  const successful = results.filter(r => r.success).length;
  const successRate = ((successful / results.length) * 100).toFixed(1);

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Validation Complete: ${successful}/${results.length} sites (${successRate}%)`);
  console.log('='.repeat(60) + '\n');
}

main().catch(console.error);

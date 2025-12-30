#!/usr/bin/env tsx
import { ChromeDevToolsClient } from './src/mcp/chrome-devtools-client';
import { classifyNetworkRequests } from './src/analyzer/network-classifier';
import { queryAdTechAPIs } from './src/analyzer/api-query-orchestrator';
import * as fs from 'fs';

interface AnalysisResult {
  url: string;
  timestamp: string;
  network: {
    totalRequests: number;
    vendors: string[];
    ssp_count: number;
    managed_service: string | null;
    prebid_detected: boolean;
    gam_detected: boolean;
    categories: Record<string, string[]>;
  };
  apis: {
    prebid?: any;
    gam?: any;
    managedServices?: any;
    customWrappers?: string[];
    attempts: number;
  };
}

async function main() {
  const url = process.argv[2] || 'https://osxdaily.com/2025/12/16/first-beta-of-ios-26-3-macos-tahoe-26-3-released-for-testing/';

  console.log(`\n🔍 Analyzing: ${url}\n`);

  const client = new ChromeDevToolsClient();

  try {
    // Step 1: Navigate to page
    console.log('📄 Navigating to page...');
    await client.navigateToPage(url);

    // Wait for page to load and ads to initialize
    console.log('⏳ Waiting 10 seconds for ads to load...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Step 2: Get network requests
    console.log('🌐 Capturing network requests...');
    const networkRequests = await client.getNetworkRequests();
    console.log(`   Found ${networkRequests?.length || 0} network requests`);

    // Step 3: Classify vendors from network
    console.log('🏷️  Classifying vendors...');
    const networkAnalysis = classifyNetworkRequests(networkRequests || []);
    console.log(`   Detected ${networkAnalysis.vendors.length} vendors`);
    console.log(`   Prebid: ${networkAnalysis.prebid_detected ? '✅' : '❌'}`);
    console.log(`   GAM: ${networkAnalysis.gam_detected ? '✅' : '❌'}`);
    if (networkAnalysis.managed_service) {
      console.log(`   Managed Service: ${networkAnalysis.managed_service}`);
    }

    // Step 4: Query ad-tech APIs
    console.log('🔎 Querying ad-tech APIs...');
    const apiData = await queryAdTechAPIs(client);
    console.log(`   API query completed (${apiData.attempts} attempts)`);
    console.log(`   Prebid present: ${apiData.pbjs.present ? '✅' : '❌'}`);
    console.log(`   GAM present: ${apiData.gam.present ? '✅' : '❌'}`);
    if (apiData.customWrappers && apiData.customWrappers.length > 0) {
      console.log(`   Custom wrappers found: ${apiData.customWrappers.map(w => w.key).join(', ')}`);
    }

    // Step 5: Compile results
    const result: AnalysisResult = {
      url,
      timestamp: new Date().toISOString(),
      network: {
        totalRequests: networkRequests?.length || 0,
        ...networkAnalysis
      },
      apis: apiData
    };

    // Step 6: Save results
    const outputFile = `/tmp/cdp-analysis-${Date.now()}.json`;
    fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
    console.log(`\n✅ Analysis complete! Results saved to: ${outputFile}`);

    // Print summary
    console.log('\n📊 Summary:');
    console.log(`   Vendors detected: ${networkAnalysis.vendors.join(', ')}`);
    console.log(`   SSP count: ${networkAnalysis.ssp_count}`);
    if (networkAnalysis.categories.managed_service) {
      console.log(`   Managed services: ${networkAnalysis.categories.managed_service.join(', ')}`);
    }
    if (apiData.pbjs.present) {
      console.log(`   Prebid config: ${apiData.pbjs.config ? 'captured' : 'not available'}`);
      console.log(`   Prebid bid responses: ${apiData.pbjs.bidResponses ? 'captured' : 'not available'}`);
    }
    if (apiData.gam.present) {
      console.log(`   GAM slots: ${apiData.gam.slots ? apiData.gam.slots.length : 0}`);
    }

    await client.close();

  } catch (error) {
    console.error('❌ Error during analysis:', error);
    await client.close();
    process.exit(1);
  }
}

main();

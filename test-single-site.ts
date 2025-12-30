#!/usr/bin/env tsx
import { ChromeDevToolsClient } from './src/mcp/chrome-devtools-client.js';
import { classifyNetworkRequests } from './src/analyzer/network-classifier.js';
import { queryAdTechAPIs } from './src/analyzer/api-query-orchestrator.js';

async function testSite(url: string) {
  console.log(`\n🔍 Testing: ${url}\n`);

  const client = new ChromeDevToolsClient();
  client.init();

  try {
    console.log('→ Navigating to page...');
    await client.navigateToPage(url);

    console.log('→ Waiting for page load...');
    await new Promise(resolve => setTimeout(resolve, 8000));

    console.log('→ Capturing network requests...');
    const networkRequests = await client.getNetworkRequests();
    console.log(`   Found ${networkRequests?.length || 0} network requests`);

    console.log('→ Querying runtime APIs...');
    const apiData = await queryAdTechAPIs(client);

    console.log('→ Classifying vendors...');
    const classification = classifyNetworkRequests(networkRequests || []);

    const result = {
      url,
      timestamp: new Date().toISOString(),
      vendors: classification.vendors,
      vendor_count: classification.vendors.length,
      ssp_count: classification.ssp_count,
      managed_service: classification.managed_service,
      categories: classification.categories,
      prebid: {
        detected: apiData.pbjs.present,
      },
      gam: {
        detected: apiData.gam.present,
        slots: apiData.gam.slots?.length || 0,
      },
      managed_services_detected: apiData.managedServices,
      network: {
        total_requests: networkRequests?.length || 0,
      },
    };

    console.log('\n✅ Analysis Complete:\n');
    console.log(JSON.stringify(result, null, 2));

    return result;
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    throw error;
  } finally {
    client.close();
  }
}

// Test with GeeksforGeeks
testSite('https://www.geeksforgeeks.org/')
  .then(() => {
    console.log('\n✅ Test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });

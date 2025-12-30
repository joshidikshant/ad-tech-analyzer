// Test network analyzer on managed service publishers
import { analyzeNetworkStack } from './src/analyzer/network-analyzer';
import * as fs from 'fs';

const publishers = {
  adpushup: [
    "https://teachmeanatomy.info",
    "https://www.imei.info",
    "https://www.ndtv.com"
  ],
  freestar: [
    "https://www.salary.com",
    "https://www.ultimate-guitar.com",
    "https://www.gametop.com"
  ],
  ezoic: [
    "https://chromeunboxed.com",
    "https://smallbiztrends.com",
    "https://www.metric-conversions.org"
  ]
};

async function testManagedServices() {
  console.log('=== MANAGED SERVICES DETECTION TEST ===\n');

  const results: any[] = [];

  for (const [service, urls] of Object.entries(publishers)) {
    console.log(`\n[${service.toUpperCase()}] Testing ${urls.length} publishers...\n`);

    for (const url of urls) {
      try {
        console.log(`  Analyzing: ${url}...`);
        const result = await analyzeNetworkStack(url, { device: 'desktop' });

        const detected = result.vendors.find(v =>
          v.name.toLowerCase().includes(service) ||
          (service === 'freestar' && v.name.toLowerCase().includes('freestar'))
        );

        results.push({
          service,
          url,
          detected: !!detected,
          pageType: result.pageType,
          totalVendors: result.vendors.length,
          vendors: result.vendors.map(v => v.name),
          requests: result.requests.length
        });

        console.log(`    ✓ Page Type: ${result.pageType}`);
        console.log(`    ✓ Vendors: ${result.vendors.length}`);
        console.log(`    ✓ ${service} detected: ${detected ? 'YES ✓' : 'NO ✗'}`);

        if (result.vendors.length > 0) {
          console.log(`    ✓ Found: ${result.vendors.map(v => v.name).slice(0, 5).join(', ')}${result.vendors.length > 5 ? '...' : ''}`);
        }

      } catch (error) {
        console.error(`    ✗ Error: ${error instanceof Error ? error.message : String(error)}`);
        results.push({
          service,
          url,
          detected: false,
          error: String(error)
        });
      }
    }
  }

  // Summary
  console.log('\n\n=== SUMMARY ===\n');

  for (const service of Object.keys(publishers)) {
    const serviceResults = results.filter(r => r.service === service);
    const detected = serviceResults.filter(r => r.detected).length;
    const total = serviceResults.length;

    console.log(`${service.toUpperCase()}: ${detected}/${total} detected`);

    serviceResults.forEach(r => {
      if (!r.error) {
        console.log(`  ${r.detected ? '✓' : '✗'} ${r.url} (${r.totalVendors} vendors, ${r.pageType})`);
      }
    });
    console.log('');
  }

  // Save results
  fs.writeFileSync('managed-services-test.json', JSON.stringify(results, null, 2));
  console.log('✅ Full results saved to managed-services-test.json\n');
}

testManagedServices().catch(console.error);

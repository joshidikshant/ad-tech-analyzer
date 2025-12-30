import { analyzeNetworkStack } from './src/analyzer/network-analyzer.js';

async function testGeeksForGeeks() {
  console.log('=== Testing GeeksForGeeks with Network Detection ===\n');

  const url = 'https://www.geeksforgeeks.org/dsa/dsa-tutorial-learn-data-structures-and-algorithms/';

  try {
    const result = await analyzeNetworkStack(url, {
      device: 'desktop',
      debug: false,
    });

    console.log('NETWORK DETECTION RESULTS:');
    console.log('━'.repeat(80));
    console.log(`Load Time: ${(result.loadTime / 1000).toFixed(2)}s`);
    console.log(`Total Requests: ${result.requests.length}`);
    console.log(`Vendors Detected: ${result.vendors.length}\n`);

    if (result.vendors.length > 0) {
      console.log('DETECTED VENDORS BY CATEGORY:');
      const byCategory = result.vendors.reduce((acc, v) => {
        if (!acc[v.category]) acc[v.category] = [];
        acc[v.category].push(v.name);
        return acc;
      }, {} as Record<string, string[]>);

      Object.entries(byCategory).forEach(([category, vendors]) => {
        console.log(`  ${category}: ${vendors.join(', ')}`);
      });

      console.log('\nALL DETECTED VENDORS:');
      result.vendors.forEach((v, idx) => {
        console.log(`  ${idx + 1}. ${v.name} (${v.category})`);
      });

      console.log('\nSAMPLE MATCHED URLs (First 15):');
      result.vendors.slice(0, 15).forEach((v, idx) => {
        const url = v.matchedUrl.substring(0, 120);
        console.log(`  ${idx + 1}. ${v.name}:`);
        console.log(`     ${url}${v.matchedUrl.length > 120 ? '...' : ''}`);
      });
    } else {
      console.log('⚠️  No ad tech vendors detected');
    }

    console.log('\n' + '━'.repeat(80));
    console.log('VERDICT:');
    console.log(`Network-first detection found ${result.vendors.length} vendors on GeeksForGeeks`);
    console.log('This will be compared against HTL Debug Extension capabilities.');
    console.log('━'.repeat(80));

    // Save results for comparison
    const fs = await import('fs/promises');
    await fs.writeFile(
      'geeksforgeeks-network-result.json',
      JSON.stringify(result, null, 2)
    );
    console.log('\n✅ Results saved to geeksforgeeks-network-result.json');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testGeeksForGeeks();

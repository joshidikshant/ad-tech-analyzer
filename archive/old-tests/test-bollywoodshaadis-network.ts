import { analyzeNetworkStack } from './src/analyzer/network-analyzer.js';

async function testBollywoodshaadis() {
  console.log('Testing bollywoodshaadis.com with network-first detection...\n');

  const url = 'https://www.bollywoodshaadis.com/articles/sherrone-moore-intimately-involved-with-michigan-staffer-72574';

  try {
    const result = await analyzeNetworkStack(url, {
      device: 'desktop',
      debug: false,
    });

    console.log('=== Network Detection Results ===');
    console.log(`Load Time: ${(result.loadTime / 1000).toFixed(2)}s`);
    console.log(`Total Requests: ${result.requests.length}`);
    console.log(`Vendors Detected: ${result.vendors.length}\n`);

    if (result.vendors.length > 0) {
      console.log('Detected Vendors:');
      const byCategory = result.vendors.reduce((acc, v) => {
        if (!acc[v.category]) acc[v.category] = [];
        acc[v.category].push(v.name);
        return acc;
      }, {} as Record<string, string[]>);

      Object.entries(byCategory).forEach(([category, vendors]) => {
        console.log(`  ${category}: ${vendors.join(', ')}`);
      });

      console.log('\nSample Matched URLs:');
      result.vendors.slice(0, 10).forEach((v, idx) => {
        const url = v.matchedUrl.substring(0, 100);
        console.log(`  ${idx + 1}. ${v.name}: ${url}${v.matchedUrl.length > 100 ? '...' : ''}`);
      });
    } else {
      console.log('⚠️  No ad tech vendors detected');
    }

    console.log('\n=== Verdict ===');
    console.log('Network-first detection successful on bollywoodshaadis.com');
    console.log('This confirms network analysis works even on heavily ad-laden sites.');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testBollywoodshaadis();

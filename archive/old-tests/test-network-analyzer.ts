import { analyzeNetworkStack } from './src/analyzer/network-analyzer';
import * as fs from 'fs';

async function testAnalyzer() {
  console.log('Starting network analysis for essentiallysports.com...');
  
  try {
    const result = await analyzeNetworkStack('https://www.essentiallysports.com', {
      debug: true,
      device: 'desktop',
      timeout: 60000
    });

    console.log('\n=== ANALYSIS RESULT ===');
    console.log(`URL: ${result.url}`);
    console.log(`Page Type: ${result.pageType}`);
    console.log(`Device: ${result.device}`);
    console.log(`Load Time: ${result.loadTime}ms`);
    
    console.log('\n=== DETECTED VENDORS ===');
    result.vendors.forEach(v => {
      console.log(`- ${v.name} (${v.category})`);
    });

    console.log('\n=== REQUEST STATS ===');
    console.log(`Total Requests: ${result.requests.length}`);
    const adRequests = result.requests.filter(r => 
      result.vendors.some(v => new RegExp(v.pattern, 'i').test(r.url))
    );
    console.log(`Ad-related Requests: ${adRequests.length}`);

    // Save full result
    fs.writeFileSync('network-analysis-result.json', JSON.stringify(result, null, 2));
    console.log('\nFull result saved to network-analysis-result.json');

  } catch (error) {
    console.error('Analysis failed:', error);
  }
}

testAnalyzer();

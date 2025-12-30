// Test network analyzer on article page vs homepage, mobile vs desktop
import { analyzeNetworkStack } from './src/analyzer/network-analyzer';
import * as fs from 'fs';

async function compareAnalysis() {
  console.log('=== NETWORK ANALYSIS COMPARISON ===\n');

  // Test homepage desktop
  console.log('[1/4] Analyzing homepage (desktop)...');
  const homepageDesktop = await analyzeNetworkStack('https://www.essentiallysports.com', { device: 'desktop' });

  console.log('[2/4] Analyzing homepage (mobile)...');
  const homepageMobile = await analyzeNetworkStack('https://www.essentiallysports.com', { device: 'mobile' });

  // Test article page (user will provide URL)
  const articleUrl = process.argv[2] || 'https://www.essentiallysports.com/nfl/news-las-vegas-raiders-tom-brady-ownership-antonio-pierce/';

  console.log(`[3/4] Analyzing article (desktop): ${articleUrl.substring(0, 60)}...`);
  const articleDesktop = await analyzeNetworkStack(articleUrl, { device: 'desktop' });

  console.log(`[4/4] Analyzing article (mobile): ${articleUrl.substring(0, 60)}...`);
  const articleMobile = await analyzeNetworkStack(articleUrl, { device: 'mobile' });

  // Compare results
  console.log('\n=== COMPARISON RESULTS ===\n');

  const results = [
    { label: 'Homepage (Desktop)', data: homepageDesktop },
    { label: 'Homepage (Mobile)', data: homepageMobile },
    { label: 'Article (Desktop)', data: articleDesktop },
    { label: 'Article (Mobile)', data: articleMobile }
  ];

  results.forEach(({ label, data }) => {
    console.log(`${label}:`);
    console.log(`  Page Type: ${data.pageType}`);
    console.log(`  Load Time: ${data.loadTime}ms`);
    console.log(`  Requests: ${data.requests.length}`);
    console.log(`  Vendors Detected: ${data.vendors.length}`);
    console.log(`  Vendors: ${data.vendors.map(v => v.name).join(', ') || 'none'}`);
    console.log(`  Categories: ${[...new Set(data.vendors.map(v => v.category))].join(', ') || 'none'}`);
    console.log('');
  });

  // Key insights
  console.log('=== KEY INSIGHTS ===\n');

  const homepageVendors = new Set(homepageDesktop.vendors.map(v => v.name));
  const articleVendors = new Set(articleDesktop.vendors.map(v => v.name));

  console.log('Vendors only on article page:',
    [...articleVendors].filter(v => !homepageVendors.has(v)).join(', ') || 'none');

  console.log('Vendors only on homepage:',
    [...homepageVendors].filter(v => !articleVendors.has(v)).join(', ') || 'none');

  console.log('\nMobile vs Desktop (Article page):');
  console.log(`  Desktop vendors: ${articleDesktop.vendors.length}`);
  console.log(`  Mobile vendors: ${articleMobile.vendors.length}`);
  console.log(`  Desktop requests: ${articleDesktop.requests.length}`);
  console.log(`  Mobile requests: ${articleMobile.requests.length}`);

  // Save detailed results
  fs.writeFileSync('comparison-results.json', JSON.stringify({
    homepageDesktop,
    homepageMobile,
    articleDesktop,
    articleMobile
  }, null, 2));

  console.log('\n✅ Full results saved to comparison-results.json');
}

compareAnalysis().catch(console.error);

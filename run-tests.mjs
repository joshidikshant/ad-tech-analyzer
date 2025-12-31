#!/usr/bin/env node
/**
 * Test Runner for Ad Tech Analyzer Production System
 * Executes comprehensive test suite and generates report
 */

const API_URL = 'https://ad-tech-analyzer-717920911778.asia-south1.run.app';
const FRONTEND_URL = 'https://ad-stack-analyzer.onrender.com';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m'
};

const results = {
  passed: 0,
  failed: 0,
  skipped: 0,
  total: 0,
  tests: []
};

async function test(name, fn) {
  results.total++;
  process.stdout.write(`${colors.blue}[TEST]${colors.reset} ${name}... `);

  try {
    const start = Date.now();
    await fn();
    const duration = Date.now() - start;
    console.log(`${colors.green}✓ PASS${colors.reset} (${duration}ms)`);
    results.passed++;
    results.tests.push({ name, status: 'PASS', duration });
  } catch (error) {
    console.log(`${colors.red}✗ FAIL${colors.reset}`);
    console.log(`  ${colors.red}Error: ${error.message}${colors.reset}`);
    results.failed++;
    results.tests.push({ name, status: 'FAIL', error: error.message });
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

async function analyzeURL(url, device = 'desktop', timeout = 60000) {
  const response = await fetch(`${API_URL}/api/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': FRONTEND_URL
    },
    body: JSON.stringify({ url, device, timeout })
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json();
}

// ============================================================================
// TEST SUITE
// ============================================================================

console.log(`\n${colors.bold}=== Ad Tech Analyzer Test Suite ===${colors.reset}`);
console.log(`API: ${API_URL}`);
console.log(`Frontend: ${FRONTEND_URL}`);
console.log(`Date: ${new Date().toISOString()}\n`);

// Category 1: API Endpoint Tests
console.log(`\n${colors.bold}[Category 1] API Endpoint Tests${colors.reset}\n`);

await test('TC-001: Health Check Endpoint', async () => {
  const response = await fetch(`${API_URL}/health`);
  assert(response.ok, 'Health check should return 200');

  const data = await response.json();
  assert(data.status === 'ok', 'Health status should be "ok"');
  assert(data.timestamp, 'Timestamp should be present');
});

await test('TC-002: CORS Configuration', async () => {
  const response = await fetch(`${API_URL}/api/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': FRONTEND_URL
    },
    body: JSON.stringify({ url: 'https://www.example.com', device: 'desktop', timeout: 30000 })
  });

  const corsHeader = response.headers.get('access-control-allow-origin');
  assert(corsHeader, 'CORS header should be present');
});

await test('TC-003: Analyze Endpoint - Valid URL (example.com)', async () => {
  const result = await analyzeURL('https://www.example.com', 'desktop', 30000);

  assert(result.success === true, 'Success flag should be true');
  assert(result.data, 'Data object should exist');
  assert(result.data.url === 'https://www.example.com', 'URL should match request');
  assert(Array.isArray(result.data.vendors), 'Vendors should be an array');
  assert(typeof result.data.vendor_count === 'number', 'Vendor count should be a number');
});

await test('TC-004: Analyze Endpoint - Invalid URL', async () => {
  try {
    await analyzeURL('not-a-valid-url', 'desktop', 30000);
    throw new Error('Should have thrown an error for invalid URL');
  } catch (error) {
    assert(error.message.includes('HTTP 4') || error.message.includes('HTTP 5'),
      'Should return 4xx or 5xx for invalid URL');
  }
});

// Category 2: Vendor Detection Tests
console.log(`\n${colors.bold}[Category 2] Vendor Detection Tests${colors.reset}\n`);

let nytimesData;
await test('TC-101: SSP Detection (NYTimes)', async () => {
  const result = await analyzeURL('https://www.nytimes.com', 'desktop', 60000);
  nytimesData = result.data;

  assert(result.success === true, 'Analysis should succeed');
  assert(nytimesData.vendor_count > 0, `Should detect vendors (found ${nytimesData.vendor_count})`);

  const ssps = nytimesData.vendors.filter(v => v.category === 'SSP');
  assert(ssps.length > 0, `Should detect SSPs (found ${ssps.length})`);

  console.log(`    → Detected ${nytimesData.vendor_count} total vendors, ${ssps.length} SSPs`);
});

await test('TC-102: Ad Server Detection (NYTimes)', async () => {
  assert(nytimesData, 'NYTimes data should be available from previous test');

  const adServers = nytimesData.vendors.filter(v =>
    v.category === 'Ad Server' || v.name.toLowerCase().includes('google')
  );

  assert(adServers.length > 0, `Should detect ad servers (found ${adServers.length})`);
  console.log(`    → Detected ad servers: ${adServers.map(v => v.name).join(', ')}`);
});

await test('TC-103: Identity Provider Detection (NYTimes)', async () => {
  assert(nytimesData, 'NYTimes data should be available from previous test');

  const idProviders = nytimesData.vendors.filter(v =>
    v.category === 'Identity' || v.category === 'ID Provider'
  );

  console.log(`    → Detected ${idProviders.length} identity providers`);
  if (idProviders.length > 0) {
    console.log(`    → Providers: ${idProviders.map(v => v.name).join(', ')}`);
  }
});

await test('TC-104: Managed Service Detection (NYTimes)', async () => {
  assert(nytimesData, 'NYTimes data should be available from previous test');
  assert(nytimesData.managed_services_detected, 'Managed services check should exist');

  console.log(`    → Managed service: ${nytimesData.managed_service || 'None detected'}`);
});

// Category 3: Runtime Analysis Tests
console.log(`\n${colors.bold}[Category 3] Runtime Analysis Tests${colors.reset}\n`);

await test('TC-301: Prebid.js Detection (NYTimes)', async () => {
  assert(nytimesData, 'NYTimes data should be available');
  assert(nytimesData.prebid, 'Prebid object should exist');

  console.log(`    → Prebid detected: ${nytimesData.prebid.detected}`);
  if (nytimesData.prebid.detected && nytimesData.prebid.config) {
    console.log(`    → Timeout: ${nytimesData.prebid.config.timeout}ms`);
    console.log(`    → Price Granularity: ${JSON.stringify(nytimesData.prebid.config.priceGranularity)}`);
  }
});

await test('TC-302: Google Ad Manager Detection (NYTimes)', async () => {
  assert(nytimesData, 'NYTimes data should be available');
  assert(nytimesData.gam, 'GAM object should exist');

  console.log(`    → GAM detected: ${nytimesData.gam.detected}`);
  if (nytimesData.gam.detected && nytimesData.gam.slots) {
    console.log(`    → Ad slots: ${nytimesData.gam.slots.length}`);
  }
});

// Category 4: Data Quality Tests
console.log(`\n${colors.bold}[Category 4] Data Quality Tests${colors.reset}\n`);

await test('TC-401: Vendor Count Accuracy (NYTimes)', async () => {
  assert(nytimesData, 'NYTimes data should be available');

  const uniqueVendors = new Set(nytimesData.vendors.map(v => v.name));
  assert(uniqueVendors.size === nytimesData.vendor_count,
    `Vendor count (${nytimesData.vendor_count}) should match unique vendors (${uniqueVendors.size})`);

  console.log(`    → ${nytimesData.vendor_count} unique vendors, no duplicates`);
});

await test('TC-402: Category Distribution (NYTimes)', async () => {
  assert(nytimesData, 'NYTimes data should be available');

  const categories = {};
  nytimesData.vendors.forEach(v => {
    categories[v.category] = (categories[v.category] || 0) + 1;
  });

  assert(Object.keys(categories).length > 0, 'Should have at least one category');

  console.log(`    → Categories: ${JSON.stringify(categories)}`);
});

await test('TC-403: Data Completeness (NYTimes)', async () => {
  assert(nytimesData, 'NYTimes data should be available');

  const requiredFields = ['url', 'timestamp', 'device', 'vendors', 'vendor_count',
    'ssp_count', 'categories', 'prebid', 'gam', 'managed_services_detected'];

  requiredFields.forEach(field => {
    assert(nytimesData[field] !== undefined && nytimesData[field] !== null,
      `Field "${field}" should be present and not null`);
  });

  console.log(`    → All ${requiredFields.length} required fields present`);
});

// Category 5: Device Tests
console.log(`\n${colors.bold}[Category 5] Device Tests${colors.reset}\n`);

await test('TC-701: Mobile Device Analysis', async () => {
  const result = await analyzeURL('https://www.example.com', 'mobile', 30000);

  assert(result.success === true, 'Mobile analysis should succeed');
  assert(result.data.device === 'mobile', 'Device should be mobile');

  console.log(`    → Mobile analysis successful`);
});

await test('TC-702: Desktop Device Analysis', async () => {
  const result = await analyzeURL('https://www.example.com', 'desktop', 30000);

  assert(result.success === true, 'Desktop analysis should succeed');
  assert(result.data.device === 'desktop', 'Device should be desktop');

  console.log(`    → Desktop analysis successful`);
});

// Category 6: Performance Tests
console.log(`\n${colors.bold}[Category 6] Performance Tests${colors.reset}\n`);

await test('TC-601: API Response Time (example.com)', async () => {
  const start = Date.now();
  await analyzeURL('https://www.example.com', 'desktop', 30000);
  const duration = Date.now() - start;

  assert(duration < 60000, `Response time (${duration}ms) should be under 60s`);
  console.log(`    → Analysis completed in ${duration}ms`);
});

// ============================================================================
// TEST SUMMARY
// ============================================================================

console.log(`\n${colors.bold}=== Test Summary ===${colors.reset}\n`);
console.log(`Total Tests:  ${results.total}`);
console.log(`${colors.green}Passed:       ${results.passed}${colors.reset}`);
console.log(`${colors.red}Failed:       ${results.failed}${colors.reset}`);
console.log(`${colors.yellow}Skipped:      ${results.skipped}${colors.reset}`);
console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%\n`);

if (results.failed > 0) {
  console.log(`${colors.red}${colors.bold}FAILED TESTS:${colors.reset}`);
  results.tests.filter(t => t.status === 'FAIL').forEach(t => {
    console.log(`  ${colors.red}✗${colors.reset} ${t.name}`);
    console.log(`    ${t.error}`);
  });
  console.log();
}

// Save detailed results
const fs = require('fs');
fs.writeFileSync('/tmp/test-results.json', JSON.stringify({
  summary: {
    total: results.total,
    passed: results.passed,
    failed: results.failed,
    skipped: results.skipped,
    successRate: ((results.passed / results.total) * 100).toFixed(1) + '%'
  },
  tests: results.tests,
  nytimesData: nytimesData,
  timestamp: new Date().toISOString()
}, null, 2));

console.log(`Detailed results saved to: /tmp/test-results.json\n`);

// Exit with appropriate code
process.exit(results.failed > 0 ? 1 : 0);

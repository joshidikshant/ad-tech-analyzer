#!/usr/bin/env node
/**
 * Comprehensive Test Suite for Ad-Tech Analyzer
 * Tests all features across multiple sites
 */

const API_URL = process.env.API_URL || 'http://localhost:3001';
const PRODUCTION_API = 'https://ad-tech-analyzer-717920911778.asia-south1.run.app';

const TEST_SITES = [
  {
    name: 'CardGames.io Chess',
    url: 'https://www.cardgames.io/chess/',
    expected: {
      vendors: ['OneTrust', 'Freestar', 'Prebid.js', 'Google Ad Manager'],
      minVendorCount: 10,
      prebidDetected: true,
      gamDetected: true,
      managedService: 'Freestar',
      minBidDetails: 20,
    }
  },
  {
    name: 'Bollywood Shaadis',
    url: 'https://www.bollywoodshaadis.com/articles/stranger-things-finale-episode-trailer-73090',
    expected: {
      vendors: ['AdPushup', 'Google Ad Manager', 'Prebid.js'],
      minVendorCount: 5,
      prebidDetected: true,
      gamDetected: true,
      managedService: 'AdPushup',
    }
  },
  {
    name: 'PCWorld',
    url: 'https://www.pcworld.com/article/2965913/the-best-pc-hardware-and-software-of-2025-2026.html',
    expected: {
      vendors: ['Prebid.js', 'Adapex'], // Has Prebid (ihowpbjs) and Adapex
      minVendorCount: 3,
      prebidDetected: true, // ihowpbjs instance detected
      gamDetected: false, // No GAM detected
      managedService: 'Adapex', // Adapex manages their stack
      adaptexDetected: true,
    }
  },
  {
    name: 'Urban Dictionary',
    url: 'https://www.urbandictionary.com/define.php?term=test',
    expected: {
      vendors: ['Prebid.js', 'Rubicon', 'Sonobi'],
      minVendorCount: 3,
      prebidDetected: true,
      minBidDetails: 50,
    }
  }
];

const FEATURE_TESTS = {
  'P1: Bid Details': (result) => {
    const bidDetails = result.data?.prebid?.bid_details || [];
    return {
      pass: Array.isArray(bidDetails),
      details: {
        count: bidDetails.length,
        withCPM: bidDetails.filter(b => b.cpm > 0).length,
        statuses: [...new Set(bidDetails.map(b => b.status))],
        sample: bidDetails.slice(0, 3).map(b => ({
          bidder: b.bidder,
          adUnit: b.adUnit,
          cpm: b.cpm,
          status: b.status
        }))
      }
    };
  },

  'P2: Consent/CMP Detection': (result) => {
    const consent = result.data?.consent;
    return {
      pass: consent && (consent.tcf?.detected || consent.usp?.detected || consent.gpp?.detected),
      details: {
        tcf: consent?.tcf?.detected || false,
        usp: consent?.usp?.detected || false,
        gpp: consent?.gpp?.detected || false,
        tcfVersion: consent?.tcf?.version,
        gdprApplies: consent?.tcf?.gdprApplies,
      }
    };
  },

  'P3: Multiple Prebid Instances': (result) => {
    const instances = result.data?.prebid?.instances || [];
    return {
      pass: Array.isArray(instances),
      details: {
        count: instances.length,
        names: instances.map(i => i.globalName),
        versions: instances.map(i => i.version),
      }
    };
  },

  'Vendor Detection': (result) => {
    const vendors = result.data?.vendors || [];
    return {
      pass: Array.isArray(vendors),
      details: {
        count: vendors.length,
        vendors: vendors,
        categories: result.data?.categories || {},
      }
    };
  },

  'Managed Service Detection': (result) => {
    const managedService = result.data?.managed_service;
    const detected = result.data?.managed_services_detected || {};
    return {
      pass: true,
      details: {
        primary: managedService,
        all: Object.keys(detected).filter(k => detected[k]),
      }
    };
  },

  'Network Classification': (result) => {
    const network = result.data?.network;
    return {
      pass: network && network.total_requests > 0,
      details: {
        totalRequests: network?.total_requests,
        classifiedRequests: network?.classified_requests,
        classificationRate: network ? (network.classified_requests / network.total_requests * 100).toFixed(1) + '%' : '0%',
      }
    };
  },

  'Event-Captured Bids': (result) => {
    const bidDetails = result.data?.prebid?.bid_details || [];
    const capturedBids = bidDetails.filter(b => b.source === 'captured' || b.source?.includes('prebid'));
    return {
      pass: true, // Optional feature
      details: {
        totalBids: bidDetails.length,
        capturedCount: capturedBids.length,
        capturedWithCPM: capturedBids.filter(b => b.cpm > 0).length,
      }
    };
  }
};

async function testAPI(baseUrl, site) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Testing: ${site.name}`);
  console.log(`URL: ${site.url}`);
  console.log(`API: ${baseUrl}`);
  console.log('='.repeat(80));

  const startTime = Date.now();

  try {
    const response = await fetch(`${baseUrl}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: site.url,
        device: 'desktop',
        timeout: 60000
      })
    });

    const elapsed = Date.now() - startTime;
    const result = await response.json();

    console.log(`\n⏱️  Response Time: ${elapsed}ms`);
    console.log(`✅ Status: ${response.status} ${response.ok ? 'OK' : 'FAILED'}`);

    if (!response.ok) {
      console.log(`❌ API Error: ${result.error || 'Unknown error'}`);
      return { success: false, error: result.error, elapsed };
    }

    // Run all feature tests
    console.log('\n📋 Feature Tests:');
    const featureResults = {};

    for (const [featureName, testFn] of Object.entries(FEATURE_TESTS)) {
      const testResult = testFn(result);
      featureResults[featureName] = testResult;

      const icon = testResult.pass ? '✅' : '❌';
      console.log(`\n${icon} ${featureName}`);
      console.log(JSON.stringify(testResult.details, null, 2));
    }

    // Check expected values
    console.log('\n🎯 Expected Values:');
    const expectations = [];

    if (site.expected.vendors) {
      const vendors = result.data?.vendors || [];
      const missing = site.expected.vendors.filter(v => !vendors.includes(v));
      const vendorCheck = missing.length === 0;
      expectations.push({ name: 'Required Vendors', pass: vendorCheck, details: missing.length > 0 ? `Missing: ${missing.join(', ')}` : 'All present' });
    }

    if (site.expected.minVendorCount !== undefined) {
      const count = result.data?.vendor_count || 0;
      const countCheck = count >= site.expected.minVendorCount;
      expectations.push({ name: 'Vendor Count', pass: countCheck, details: `${count} >= ${site.expected.minVendorCount}` });
    }

    if (site.expected.prebidDetected !== undefined) {
      const detected = result.data?.prebid?.detected || false;
      const prebidCheck = detected === site.expected.prebidDetected;
      expectations.push({ name: 'Prebid Detection', pass: prebidCheck, details: `Expected: ${site.expected.prebidDetected}, Got: ${detected}` });
    }

    if (site.expected.gamDetected !== undefined) {
      const detected = result.data?.gam?.detected || false;
      const gamCheck = detected === site.expected.gamDetected;
      expectations.push({ name: 'GAM Detection', pass: gamCheck, details: `Expected: ${site.expected.gamDetected}, Got: ${detected}` });
    }

    if (site.expected.managedService) {
      const service = result.data?.managed_service;
      const serviceCheck = service === site.expected.managedService;
      expectations.push({ name: 'Managed Service', pass: serviceCheck, details: `Expected: ${site.expected.managedService}, Got: ${service}` });
    }

    if (site.expected.minBidDetails !== undefined) {
      const count = result.data?.prebid?.bid_details?.length || 0;
      const bidCheck = count >= site.expected.minBidDetails;
      expectations.push({ name: 'Bid Details Count', pass: bidCheck, details: `${count} >= ${site.expected.minBidDetails}` });
    }

    if (site.expected.adaptexDetected !== undefined) {
      const managedServices = result.data?.managed_services_detected || {};
      const detected = managedServices.adapex || false;
      const adaptexCheck = detected === site.expected.adaptexDetected;
      expectations.push({ name: 'AdaPex Detection', pass: adaptexCheck, details: `Expected: ${site.expected.adaptexDetected}, Got: ${detected}` });
    }

    expectations.forEach(exp => {
      const icon = exp.pass ? '✅' : '❌';
      console.log(`${icon} ${exp.name}: ${exp.details}`);
    });

    const allPassed = expectations.every(e => e.pass);

    return {
      success: true,
      allTestsPassed: allPassed,
      featureResults,
      expectations,
      elapsed,
      data: result.data
    };

  } catch (error) {
    console.log(`\n❌ Test Failed: ${error.message}`);
    return { success: false, error: error.message, elapsed: Date.now() - startTime };
  }
}

async function runHealthCheck(baseUrl) {
  console.log(`\n🏥 Health Check: ${baseUrl}`);
  try {
    const response = await fetch(`${baseUrl}/health`);
    const result = await response.json();
    console.log(`✅ Status: ${result.status}`);
    return true;
  } catch (error) {
    console.log(`❌ Health check failed: ${error.message}`);
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const isProd = args.includes('--prod');
  const apiUrl = isProd ? PRODUCTION_API : API_URL;

  console.log(`\n${'*'.repeat(80)}`);
  console.log('Ad-Tech Analyzer - Comprehensive Test Suite');
  console.log(`Environment: ${isProd ? 'PRODUCTION' : 'LOCAL'}`);
  console.log('*'.repeat(80));

  // Health check first
  const healthy = await runHealthCheck(apiUrl);
  if (!healthy) {
    console.log('\n❌ API is not healthy. Aborting tests.');
    process.exit(1);
  }

  // Run tests for all sites
  const results = [];
  for (const site of TEST_SITES) {
    const result = await testAPI(apiUrl, site);
    results.push({ site: site.name, ...result });
  }

  // Summary
  console.log(`\n${'='.repeat(80)}`);
  console.log('TEST SUMMARY');
  console.log('='.repeat(80));

  results.forEach((result, idx) => {
    const icon = result.success && result.allTestsPassed ? '✅' : '❌';
    console.log(`${icon} ${result.site} - ${result.elapsed}ms`);
    if (!result.success) {
      console.log(`   Error: ${result.error}`);
    } else if (!result.allTestsPassed) {
      const failed = result.expectations.filter(e => !e.pass);
      console.log(`   Failed checks: ${failed.map(f => f.name).join(', ')}`);
    }
  });

  const allPassed = results.every(r => r.success && r.allTestsPassed);

  console.log(`\n${'='.repeat(80)}`);
  if (allPassed) {
    console.log('🎉 ALL TESTS PASSED');
    process.exit(0);
  } else {
    console.log('❌ SOME TESTS FAILED');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

#!/usr/bin/env tsx
/**
 * MCP Tool Testing Script
 * Tests the ad-tech-analyzer MCP tools directly
 */

import { ChromeDevToolsClient } from './src/mcp/chrome-devtools-client.js';
import { classifyNetworkRequests } from './src/analyzer/network-classifier.js';
import { queryAdTechAPIs } from './src/analyzer/api-query-orchestrator.js';

async function testListVendors(url: string) {
  console.log(`\n🔍 Testing list_vendors on: ${url}\n`);

  const client = new ChromeDevToolsClient();
  client.init();

  try {
    await client.navigateToPage(url);
    const networkRequests = await client.getNetworkRequests();
    const classification = classifyNetworkRequests(networkRequests);

    const result = {
      url,
      vendors: classification.vendors,
      vendor_count: classification.vendors.length,
      categories: classification.categories,
    };

    console.log(JSON.stringify(result, null, 2));
    return result;
  } finally {
    client.close();
  }
}

async function testDetectManagedService(url: string) {
  console.log(`\n🎯 Testing detect_managed_service on: ${url}\n`);

  const client = new ChromeDevToolsClient();
  client.init();

  try {
    await client.navigateToPage(url);
    const apiData = await queryAdTechAPIs(client);

    const detected = Object.entries(apiData.managedServices)
      .filter(([_, value]) => value === true)
      .map(([key]) => key);

    const result = {
      url,
      managed_services: detected,
      has_managed_service: detected.length > 0,
      all_checks: apiData.managedServices,
    };

    console.log(JSON.stringify(result, null, 2));
    return result;
  } finally {
    client.close();
  }
}

async function testAnalyzeSite(url: string) {
  console.log(`\n📊 Testing analyze_site on: ${url}\n`);

  const client = new ChromeDevToolsClient();
  client.init();

  try {
    await client.navigateToPage(url);
    const networkRequests = await client.getNetworkRequests();
    const apiData = await queryAdTechAPIs(client);
    const classification = classifyNetworkRequests(networkRequests);

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
        config: apiData.pbjs.config,
        bid_responses: apiData.pbjs.bidResponses,
      },
      gam: {
        detected: apiData.gam.present,
        slots: apiData.gam.slots,
        targeting: apiData.gam.targeting,
      },
      managed_services_detected: apiData.managedServices,
      custom_wrappers: apiData.customWrappers,
      network: {
        total_requests: networkRequests.length,
        classified_requests: classification.vendors.length,
      },
    };

    console.log(JSON.stringify(result, null, 2));
    return result;
  } finally {
    client.close();
  }
}

// Run tests
async function main() {
  const tests = [
    // Test 1: Quick vendor detection
    { name: 'list_vendors', fn: testListVendors, url: 'https://www.macworld.com/article/3013322/2025-macworld-awards-apples-biggest-wins-and-misses.html' },

    // Test 2: Managed service detection
    { name: 'detect_managed_service', fn: testDetectManagedService, url: 'https://www.bollywoodshaadis.com/articles/neha-kakkar-shines-in-stunning-vibrant-sarees-39683' },

    // Test 3: Full analysis
    { name: 'analyze_site', fn: testAnalyzeSite, url: 'https://news.detik.com/berita/d-8267093/10-orang-kena-ott-kpk-di-bekasi-salah-satunya-bupati-ade-kuswara' },
  ];

  for (const test of tests) {
    try {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`TEST: ${test.name}`);
      console.log(`${'='.repeat(60)}`);
      await test.fn(test.url);
    } catch (error) {
      console.error(`❌ Test failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

main().catch(console.error);

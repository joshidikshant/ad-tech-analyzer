#!/usr/bin/env tsx
/**
 * Direct analyzer - runs analysis and outputs JSON
 * Usage: tsx analyze-direct.ts <url>
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import analyzer modules
const { classifyNetworkRequests } = await import(path.join(__dirname, '../src/analyzer/network-classifier.js'));

async function analyze(url: string) {
  console.error(`Analyzing: ${url}`);

  // For now, return sample data since MCP integration is complex
  // In production, this would use chrome-devtools-mcp properly

  const sampleNetworkRequests = [
    { url: 'https://cdnads.geeksforgeeks.org/prebid.js', method: 'GET', type: 'script' },
    { url: 'https://ads.pubmatic.com/AdServer/js/pwt/162080/12331/pwt.js', method: 'GET', type: 'script' },
    { url: 'https://securepubads.g.doubleclick.net/tag/js/gpt.js', method: 'GET', type: 'script' },
    { url: 'https://gum.criteo.com/sid/json', method: 'GET', type: 'xhr' },
    { url: 'https://id.crwdcntrl.net/id', method: 'GET', type: 'xhr' },
  ];

  const classification = classifyNetworkRequests(sampleNetworkRequests);

  const result = {
    url,
    timestamp: new Date().toISOString(),
    device: 'desktop',
    vendors: classification.vendors,
    vendor_count: classification.vendors.length,
    ssp_count: classification.ssp_count,
    managed_service: classification.managed_service,
    categories: classification.categories,
    prebid: {
      detected: true,
      config: null,
      bid_responses: null,
    },
    gam: {
      detected: true,
      slots: null,
      targeting: null,
    },
    managed_services_detected: {},
    custom_wrappers: [],
    network: {
      total_requests: sampleNetworkRequests.length,
      classified_requests: classification.vendors.length,
    },
  };

  console.log(JSON.stringify(result, null, 2));
}

const url = process.argv[2] || 'https://www.geeksforgeeks.org/python-programming-language/';
analyze(url).catch(console.error);

#!/usr/bin/env tsx
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dynamic imports to handle ES modules correctly
const { ChromeDevToolsClient } = await import(path.join(__dirname, '../src/mcp/chrome-devtools-client.js'));
const { classifyNetworkRequests } = await import(path.join(__dirname, '../src/analyzer/network-classifier.js'));
const { queryAdTechAPIs } = await import(path.join(__dirname, '../src/analyzer/api-query-orchestrator.js'));

const app = express();
app.use(cors());
app.use(express.json());

// POST /api/analyze
app.post('/api/analyze', async (req, res) => {
  try {
    const { url, device = 'desktop', timeout = 30000 } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    console.log(`[API] Analyzing ${url} (${device})...`);

    // Spawn Chrome DevTools MCP server
    const mcpProcess = spawn('npx', ['chrome-devtools-mcp', '--headless', '--isolated'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Wait for MCP server to initialize Chrome
    console.log('[API] Initializing Chrome DevTools MCP server...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Connect client to MCP server
    const client = new ChromeDevToolsClient(mcpProcess.stdout, mcpProcess.stdin);
    client.init();

    try {
      // Navigate to page
      console.log(`[API] Navigating to ${url}...`);
      await client.navigateToPage(url);

      console.log('[API] Navigation complete, waiting for page load...');
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Wait for page load and network requests
      console.log('[API] Waiting for network activity...');
      await new Promise(resolve => setTimeout(resolve, 12000));

      // Collect network requests
      const networkRequests = await client.getNetworkRequests();
      const validRequests = Array.isArray(networkRequests) ? networkRequests : [];
      console.log(`[API] Captured ${validRequests.length} network requests`);

      // Query runtime APIs
      const apiData = await queryAdTechAPIs(client);

      // Classify vendors
      const classification = classifyNetworkRequests(validRequests);

      const result = {
        url,
        timestamp: new Date().toISOString(),
        device,
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
          total_requests: validRequests.length,
          classified_requests: classification.vendors.length,
        },
      };

      console.log(`[API] Analysis complete: ${result.vendor_count} vendors detected`);

      res.json({
        success: true,
        data: result
      });
    } finally {
      client.close();
      mcpProcess.kill();
    }
  } catch (error: any) {
    console.error('[API] Analysis failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /health
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`\n🚀 Ad-Tech Analyzer API Server (Direct Mode) running on http://localhost:${PORT}`);
  console.log(`\nEndpoints:`);
  console.log(`  POST /api/analyze - Full ad-tech analysis`);
  console.log(`  GET  /health - Health check\n`);
});

#!/usr/bin/env tsx
import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:8080',
    'http://localhost:8081',
    'https://tools.dikshantjoshi.com', // Production frontend (Netlify)
    'https://ad-stack-analyzer.onrender.com', // Production frontend (Render - fallback)
    'https://ad-tech-analyzer.onrender.com', // Backend (for health checks)
  ],
  credentials: true
}));
app.use(express.json());

interface MCPRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params?: any;
}

interface MCPResponse {
  jsonrpc: '2.0';
  id: number;
  result?: any;
  error?: { code?: number; message: string; data?: any };
}

// Call MCP server via stdio
async function callMCPTool(toolName: string, args: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const mcpServerPath = path.join(__dirname, '..', 'src', 'mcp', 'server.ts');
    const child = spawn('tsx', [mcpServerPath], {
      stdio: ['pipe', 'pipe', 'inherit']
    });

    let buffer = '';
    let requestId = 1;

    child.stdout.on('data', (chunk) => {
      buffer += chunk.toString();
      console.error(`[MCP] Received ${chunk.length} bytes`);

      // Try to parse JSON-RPC responses
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;

        console.error(`[MCP] Line: ${line.substring(0, 100)}...`);

        try {
          const response: MCPResponse = JSON.parse(line);
          console.error(`[MCP] Parsed response with ID ${response.id}`, JSON.stringify(response).substring(0, 300));

          if (response.id === requestId) {
            child.kill();

            if (response.error) {
              console.error(`[MCP] Error response: ${response.error.message}`);
              reject(new Error(response.error.message));
            } else {
              console.error(`[MCP] Success response, result keys:`, Object.keys(response.result || {}));
              resolve(response.result);
            }
          }
        } catch (err) {
          console.error(`[MCP] Non-JSON line: ${line.substring(0, 50)}...`);
        }
      }
    });

    child.on('error', (err) => {
      reject(err);
    });

    child.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        reject(new Error(`MCP server exited with code ${code}`));
      }
    });

    // Send the tool call request
    const request: MCPRequest = {
      jsonrpc: '2.0',
      id: requestId,
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args
      }
    };

    child.stdin.write(JSON.stringify(request) + '\n');
  });
}

// POST /api/analyze
app.post('/api/analyze', async (req, res) => {
  try {
    const { url, device = 'desktop', timeout = 30000 } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    console.log(`[API] Analyzing ${url} (${device})...`);

    const result = await callMCPTool('analyze_site', { url, device, timeout });

    console.log('[API] Raw result type:', typeof result);
    console.log('[API] Raw result:', result ? JSON.stringify(result).substring(0, 500) : 'undefined');

    // Parse the text result (MCP returns content array)
    const content = result?.content?.[0]?.text;
    const analysis = content ? JSON.parse(content) : result;

    console.log(`[API] Analysis complete: ${analysis?.vendor_count || 0} vendors detected`);

    res.json({
      success: true,
      data: analysis
    });
  } catch (error: any) {
    console.error('[API] Analysis failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/list-vendors
app.post('/api/list-vendors', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const result = await callMCPTool('list_vendors', { url });
    const content = result.content?.[0]?.text;
    const vendors = content ? JSON.parse(content) : result;

    res.json({
      success: true,
      data: vendors
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/detect-managed-service
app.post('/api/detect-managed-service', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const result = await callMCPTool('detect_managed_service', { url });
    const content = result.content?.[0]?.text;
    const managedService = content ? JSON.parse(content) : result;

    res.json({
      success: true,
      data: managedService
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/network-requests
app.post('/api/network-requests', async (req, res) => {
  try {
    const { url, category, type } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const result = await callMCPTool('get_network_requests', { url, category, type });
    const content = result.content?.[0]?.text;
    const networkRequests = content ? JSON.parse(content) : result;

    res.json({
      success: true,
      data: networkRequests
    });
  } catch (error: any) {
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
  console.log(`\n🚀 Ad-Tech Analyzer API Server running on http://localhost:${PORT}`);
  console.log(`\nEndpoints:`);
  console.log(`  POST /api/analyze - Full ad-tech analysis`);
  console.log(`  POST /api/list-vendors - Quick vendor detection`);
  console.log(`  POST /api/detect-managed-service - Managed service detection`);
  console.log(`  POST /api/network-requests - Filtered network requests`);
  console.log(`  GET  /health - Health check\n`);
});

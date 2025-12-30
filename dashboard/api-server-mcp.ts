#!/usr/bin/env tsx
import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const app = express();
app.use(cors());
app.use(express.json());

// Helper to call Claude MCP tools
async function callMCPTool(tool: string, args: any): Promise<any> {
  const argsJson = JSON.stringify(args).replace(/"/g, '\\"');
  const cmd = `claude api call-tool ${tool} "${argsJson}"`;

  try {
    const { stdout } = await execAsync(cmd, { maxBuffer: 10 * 1024 * 1024 });
    return JSON.parse(stdout);
  } catch (error: any) {
    console.error(`MCP tool ${tool} failed:`, error.message);
    throw error;
  }
}

// POST /api/analyze
app.post('/api/analyze', async (req, res) => {
  try {
    const { url, device = 'desktop', timeout = 30000 } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    console.log(`[API] Analyzing ${url} (${device})...`);

    // Use the ad-tech-analyzer MCP tool directly
    const result = await callMCPTool('analyze_site', {
      url,
      device,
      timeout
    });

    console.log(`[API] Analysis complete`);

    res.json({
      success: true,
      data: result
    });
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
  console.log(`\n🚀 Ad-Tech Analyzer API Server (MCP Mode) running on http://localhost:${PORT}`);
  console.log(`\nEndpoints:`);
  console.log(`  POST /api/analyze - Full ad-tech analysis via MCP`);
  console.log(`  GET  /health - Health check\n`);
});

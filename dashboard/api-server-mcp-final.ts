#!/usr/bin/env tsx
/**
 * HTTP API Server wrapping Ad-Tech MCP Server
 * Long-term solution using existing MCP infrastructure
 */
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import MCP handler using dynamic import to handle module type mismatch
const handlersModule = await import('../src/mcp/handlers.js');
const { handleAnalyzeSite } = handlersModule;

const app = express();
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:8080',
    'http://localhost:8081',
    'https://ad-stack-analyzer.onrender.com', // Production frontend (old)
    'https://tools.dikshantjoshi.com', // Production frontend (custom domain)
    'https://ad-tech-analyzer.onrender.com', // Backend (for health checks)
  ],
  credentials: true
}));
app.use(express.json());

// POST /api/analyze - Calls MCP analyze_site handler
app.post('/api/analyze', async (req, res) => {
  try {
    const { url, device = 'desktop', timeout = 30000 } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    console.log(`\n[API] Analyzing ${url} via MCP handler...`);

    // Call the MCP handler directly (returns AnalysisResult)
    const analysisData = await handleAnalyzeSite({ url, device, timeout });

    console.log(`[API] Analysis complete: ${analysisData.vendor_count} vendors detected\n`);

    res.json({
      success: true,
      data: analysisData
    });

  } catch (error: any) {
    console.error('[API] Analysis failed:', error.message);
    // Ensure CORS headers are always set on error responses
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
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
  console.log(`  GET  /health - Health check`);
  console.log(`\nUsing: Ad-Tech MCP Server → Chrome DevTools MCP\n`);
});

#!/usr/bin/env tsx
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync, readFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dynamic imports
const { classifyNetworkRequests } = await import(path.join(__dirname, '../src/analyzer/network-classifier.js'));

const app = express();
app.use(cors());
app.use(express.json());

const PENDING_FILE = '/tmp/ad-tech-pending-request.json';
const RESULT_FILE = '/tmp/ad-tech-result.json';

// POST /api/analyze
app.post('/api/analyze', async (req, res) => {
  try {
    const { url, device = 'desktop' } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    console.log(`\n[API] Analysis request received for: ${url}`);
    console.log(`[API] Saving request to ${PENDING_FILE}`);
    console.log(`[API] Waiting for Claude Code assistant to process...`);

    // Write pending request
    writeFileSync(PENDING_FILE, JSON.stringify({ url, device, timestamp: Date.now() }));

    // Delete old result if exists
    if (existsSync(RESULT_FILE)) {
      writeFileSync(RESULT_FILE, '');
    }

    // Wait for result (poll every second for up to 2 minutes)
    const startTime = Date.now();
    const timeout = 120000; // 2 minutes

    while (Date.now() - startTime < timeout) {
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (existsSync(RESULT_FILE)) {
        const content = readFileSync(RESULT_FILE, 'utf-8');
        if (content && content.length > 10) {
          const result = JSON.parse(content);
          console.log(`[API] Analysis complete: ${result.vendor_count} vendors detected`);

          return res.json({
            success: true,
            data: result
          });
        }
      }
    }

    res.status(408).json({
      success: false,
      error: 'Analysis timeout - no response from analyzer'
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
  console.log(`\n🚀 Ad-Tech Analyzer API Server (Simple Mode) running on http://localhost:${PORT}`);
  console.log(`\nEndpoints:`);
  console.log(`  POST /api/analyze - Full ad-tech analysis`);
  console.log(`  GET  /health - Health check`);
  console.log(`\nWaiting for analysis requests...`);
  console.log(`Requests will be written to: ${PENDING_FILE}`);
  console.log(`Results should be written to: ${RESULT_FILE}\n`);
});

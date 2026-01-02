import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import type { AnalysisResult } from '../analyzer/network-analyzer.js';
import { analyzeNetworkStack } from '../analyzer/network-analyzer.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
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

// Types
interface AnalyzeRequest {
  url: string;
  device?: 'mobile' | 'desktop';
  debug?: boolean;
}

interface Session {
  id: string;
  url: string;
  timestamp: string;
  status: 'pending' | 'completed' | 'failed';
  result?: AnalysisResult;
  error?: string;
}

// In-memory storage (TODO: Replace with SQLite)
const sessions: Session[] = [];

// Routes
app.post('/api/analyze', async (req: Request<{}, {}, AnalyzeRequest>, res: Response) => {
  const { url, device = 'desktop', debug = false } = req.body;

  if (!url) {
    res.status(400).json({ error: 'URL is required' });
    return;
  }

  const session: Session = {
    id: Date.now().toString(),
    url,
    timestamp: new Date().toISOString(),
    status: 'pending'
  };

  sessions.push(session);

  // Return immediately with pending status
  res.status(202).json(session);

  // Run analysis in background
  console.log(`[API] Starting network analysis for: ${url} (${device})`);

  try {
    const result = await analyzeNetworkStack(url, { device, debug });

    // Update session with results
    session.status = 'completed';
    session.result = result;

    console.log(`[API] Analysis completed for ${url}. Detected ${result.vendors.length} vendors on ${result.pageType} page`);
  } catch (error) {
    session.status = 'failed';
    session.error = error instanceof Error ? error.message : String(error);

    console.error(`[API] Analysis failed for ${url}:`, error);
  }
});

app.get('/api/sessions', (_req: Request, res: Response) => {
  res.json(sessions);
});

app.get('/api/sessions/:id', (req: Request, res: Response) => {
  const session = sessions.find(s => s.id === req.params.id);

  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  res.json(session);
});

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error Handling Middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[API Error]', err.stack);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// 404 Handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start Server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[API] Server running on http://localhost:${PORT}`);
    console.log(`[API] Endpoints:`);
    console.log(`  POST /api/analyze - Analyze a URL`);
    console.log(`  GET  /api/sessions - List all sessions`);
    console.log(`  GET  /api/sessions/:id - Get session by ID`);
    console.log(`  GET  /health - Health check`);
  });
}

export default app;

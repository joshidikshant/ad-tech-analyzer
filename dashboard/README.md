# Ad-Tech Analyzer Dashboard

Interactive web dashboard for visualizing ad-tech analysis results from the MCP server.

## Features

✅ **Real-time Analysis** - Enter any URL and analyze its ad-tech stack
✅ **Visual Dashboards** - Pie charts, bar charts, and detailed breakdowns
✅ **Prebid.js Detection** - Configuration details, timeout, currency settings
✅ **Google Ad Manager** - Slot detection, targeting keys, ad unit paths
✅ **Vendor Classification** - Categorized by SSP, managed service, identity, etc.
✅ **Managed Service Detection** - Adapex, Freestar, AdPushup, Ezoic, and more

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│ React Dashboard (Vite + Tailwind CSS)                   │
│  • URL input form                                       │
│  • Device selector (desktop/mobile)                     │
│  • Visualization components (Recharts)                  │
│                ↓ HTTP POST                              │
├─────────────────────────────────────────────────────────┤
│ API Server (Express.js on :3001)                        │
│  • POST /api/analyze                                    │
│  • POST /api/list-vendors                               │
│  • POST /api/detect-managed-service                     │
│  • POST /api/network-requests                           │
│                ↓ JSON-RPC via stdio                     │
├─────────────────────────────────────────────────────────┤
│ MCP Server (src/mcp/server.ts)                          │
│  • analyze_site tool                                    │
│  • list_vendors tool                                    │
│  • detect_managed_service tool                          │
│  • get_network_requests tool                            │
│                ↓ Calls                                  │
├─────────────────────────────────────────────────────────┤
│ Chrome DevTools MCP (@modelcontextprotocol/server-*)    │
│  • Page navigation                                      │
│  • Network capture                                      │
│  • JavaScript evaluation                                │
└─────────────────────────────────────────────────────────┘
```

## Prerequisites

1. **Node.js 22+** (required for Chrome DevTools MCP)
2. **Chrome DevTools MCP** installed and running
3. **Project dependencies** installed

## Installation

### 1. Install Dashboard Dependencies

```bash
cd dashboard
npm install
```

### 2. Verify Chrome DevTools MCP

```bash
# From project root
claude mcp list | grep chrome-devtools
# Should show: chrome-devtools: npx -y @modelcontextprotocol/server-puppeteer - ✓ Connected
```

## Running the Dashboard

You need to run **two processes** simultaneously:

### Terminal 1: API Server

```bash
cd dashboard
npm run api
```

Expected output:
```
🚀 Ad-Tech Analyzer API Server running on http://localhost:3001

Endpoints:
  POST /api/analyze - Full ad-tech analysis
  POST /api/list-vendors - Quick vendor detection
  POST /api/detect-managed-service - Managed service detection
  POST /api/network-requests - Filtered network requests
  GET  /health - Health check
```

### Terminal 2: Vite Dev Server

```bash
cd dashboard
npm run dev
```

Expected output:
```
  VITE v5.0.8  ready in 234 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### Access the Dashboard

Open http://localhost:5173/ in your browser.

## Usage

### Analyze a Site

1. **Enter URL** - Paste article URL (e.g., `https://www.geeksforgeeks.org/python-programming-language/`)
2. **Select Device** - Choose Desktop or Mobile
3. **Click Analyze** - Wait 10-30 seconds for analysis
4. **View Results** - Scroll through vendor charts, Prebid config, GAM slots

### Understanding the Results

#### Overview Card
- **Total Vendors** - Number of unique ad-tech vendors detected
- **SSPs Detected** - Supply-side platforms participating in header bidding
- **Network Requests** - Total HTTP requests captured during page load
- **Managed Service** - Check mark if using a wrapper (Adapex, Freestar, etc.)

#### Vendor Distribution Charts
- **Pie Chart** - Proportional breakdown by category
- **Bar Chart** - Absolute counts per category

#### Prebid.js Configuration
- **Price Granularity** - Bidding precision (dense, medium, high)
- **Currency** - Ad server currency (USD, EUR, INR, etc.)
- **Timeout** - Maximum wait time for bids in milliseconds

#### Google Ad Manager
- **Ad Slots** - Number of ad units on the page
- **Slot Details** - Ad unit paths, element IDs, and sizes
- **Targeting Keys** - Custom targeting parameters

#### Detected Vendors
Grouped by category:
- **Managed Service** - Adapex, Freestar, AdPushup, Ezoic, etc.
- **Header Bidding** - Prebid.js, Amazon APS, Index Wrapper
- **SSP** - OpenX, PubMatic, Rubicon, Criteo, AppNexus, etc.
- **Ad Server** - Google Ad Manager, Smart AdServer
- **Identity** - ID5, LiveRamp, Unified ID 2.0
- **Consent** - OneTrust, Quantcast, Didomi

## Example Analysis Flow

```bash
# 1. User enters: https://www.geeksforgeeks.org/python-programming-language/

# 2. Dashboard sends POST to API server:
POST http://localhost:3001/api/analyze
{
  "url": "https://www.geeksforgeeks.org/python-programming-language/",
  "device": "desktop",
  "timeout": 30000
}

# 3. API server calls MCP server via JSON-RPC:
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "analyze_site",
    "arguments": { "url": "...", "device": "desktop" }
  }
}

# 4. MCP server returns analysis:
{
  "vendors": ["PubMatic", "Amazon APS", "OpenX", "Prebid.js", ...],
  "vendor_count": 12,
  "prebid": { "detected": true, "version": "v9.38.0" },
  "gam": { "detected": true, "slots": 9 },
  ...
}

# 5. Dashboard displays results with charts
```

## API Endpoints

### POST /api/analyze

**Request:**
```json
{
  "url": "https://example.com/article",
  "device": "desktop",
  "timeout": 30000
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "https://example.com/article",
    "timestamp": "2025-12-19T12:00:00.000Z",
    "vendors": ["Prebid.js", "OpenX", "Google Ad Manager"],
    "vendor_count": 3,
    "ssp_count": 1,
    "managed_service": null,
    "categories": {
      "header_bidding": ["Prebid.js"],
      "ssp": ["OpenX"],
      "ad_server": ["Google Ad Manager"]
    },
    "prebid": { "detected": true, "config": {...} },
    "gam": { "detected": true, "slots": [...] },
    "managed_services_detected": {},
    "network": { "total_requests": 342 }
  }
}
```

### POST /api/list-vendors

Quick vendor detection without full analysis.

**Request:**
```json
{
  "url": "https://example.com"
}
```

### POST /api/detect-managed-service

Check if site uses managed ad wrapper.

**Request:**
```json
{
  "url": "https://example.com"
}
```

### POST /api/network-requests

Get filtered network requests.

**Request:**
```json
{
  "url": "https://example.com",
  "category": "ssp",
  "type": "xhr"
}
```

## Troubleshooting

### "Failed to analyze site"

**Possible causes:**
1. Chrome DevTools MCP not running
2. Invalid URL format
3. Site blocks automation
4. Network timeout

**Solution:**
```bash
# Check MCP status
claude mcp list

# Check API server logs (Terminal 1)
# Check for error messages

# Try with different URL (article page, not homepage)
```

### Charts not showing

**Possible causes:**
1. No vendors detected (homepage instead of article)
2. Recharts not installed

**Solution:**
```bash
# Verify dependencies
npm list recharts

# Re-install if missing
npm install recharts
```

### API server connection refused

**Possible causes:**
1. API server not running
2. Port 3001 already in use

**Solution:**
```bash
# Check if port is in use
lsof -i :3001

# Kill existing process
kill -9 <PID>

# Or change port in api-server.ts
const PORT = process.env.PORT || 3002;
```

## Development

### Tech Stack

- **Frontend:** React 18, TypeScript, Vite
- **Styling:** Tailwind CSS
- **Charts:** Recharts
- **Backend:** Express.js, Node.js
- **Communication:** JSON-RPC over stdio

### File Structure

```
dashboard/
├── api-server.ts          # Express API wrapping MCP server
├── package.json           # Dependencies and scripts
├── vite.config.ts         # Vite configuration
├── tailwind.config.js     # Tailwind CSS config
├── index.html             # Entry HTML
└── src/
    ├── App.tsx            # Main app component
    ├── main.tsx           # React entry point
    ├── index.css          # Global styles
    └── components/
        └── AnalysisView.tsx   # Analysis results component
```

### Adding New Features

1. **New API Endpoint** - Edit `api-server.ts`, add route
2. **New Visualization** - Edit `AnalysisView.tsx`, add component
3. **New MCP Tool** - Already handled in `api-server.ts` endpoints

## Performance Tips

1. **Analyze article pages** - More ad-tech than homepages
2. **Use desktop viewport** - More comprehensive ad stacks
3. **Wait for full load** - 30s timeout captures lazy-loaded scripts
4. **Test during business hours** - Ad exchanges more active

## Known Limitations

1. **No mobile viewport emulation** - Desktop analysis only (for now)
2. **No caching** - Each analysis is fresh (no result history)
3. **No waterfall visualization** - Coming in next phase
4. **No identity graph** - Coming in next phase

## Next Steps

- [ ] Add network waterfall timeline visualization
- [ ] Add identity graph showing vendor relationships
- [ ] Add batch analysis for multiple URLs
- [ ] Add analysis history and comparison
- [ ] Add export to PDF/JSON

## Support

For issues or questions, see:
- **Testing Guide:** `/TESTING_GUIDE.md`
- **MCP Interface:** `/MCP_INTERFACE.md`
- **Phase 4 Documentation:** `/PHASE4_COMPLETE.md`

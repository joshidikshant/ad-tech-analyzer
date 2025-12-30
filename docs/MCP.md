# Ad-Tech Analyzer MCP Server

> Model Context Protocol (MCP) server for automated ad-tech stack analysis

## Overview

The Ad-Tech Analyzer MCP Server enables AI agents (Claude, Cursor, Windsurf) to analyze advertising technology implementations on any website through a standardized MCP interface.

### Key Capabilities

- **Vendor Detection** - Identifies 30+ ad-tech vendors (SSPs, ad servers, header bidding)
- **Managed Service Detection** - Detects AdPushup, Freestar, Mediavine, Raptive, Ezoic, PubGalaxy, etc.
- **Prebid.js Analysis** - Extracts config, bidders, and bid responses
- **Google Ad Manager** - Detects GAM, enumerates ad slots and targeting
- **Network Classification** - Categorizes requests by vendor and type
- **Performance Integration** - Chrome DevTools-based headless analysis

---

## Installation

### As NPM Package (Recommended)

```bash
# Install globally
npm install -g ad-tech-analyzer

# Or install locally in project
npm install ad-tech-analyzer
```

### From Source

```bash
git clone https://github.com/joshidikshant/ad-tech-analyzer.git
cd ad-tech-analyzer
npm install
npm run build
```

---

## MCP Server Setup

### Configure in Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "ad-tech-analyzer": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "ad-tech-analyzer"]
    }
  }
}
```

**Config locations:**
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux:** `~/.config/Claude/claude_desktop_config.json`

### Configure in Cursor / Windsurf

Add to `.cursor/mcp.json` or `.windsurf/mcp.json`:

```json
{
  "mcpServers": {
    "ad-tech-analyzer": {
      "command": "npx",
      "args": ["-y", "ad-tech-analyzer"]
    }
  }
}
```

### Run Locally (Development)

```bash
# From project directory
npm run mcp

# Or with tsx
npx tsx src/mcp/server.ts
```

---

## Available Tools

### 1. `analyze_site`

Comprehensive ad-tech stack analysis.

**Parameters:**
```typescript
{
  url: string;           // Required: Full URL to analyze
  device?: "mobile" | "desktop";  // Optional: Device emulation (default: desktop)
  timeout?: number;      // Optional: Analysis timeout in ms (default: 30000)
  snapshot?: boolean;    // Optional: Capture DOM snapshot (default: false)
}
```

**Example:**
```typescript
{
  "url": "https://www.geeksforgeeks.org/",
  "device": "desktop",
  "timeout": 30000
}
```

**Response:**
```json
{
  "url": "https://www.geeksforgeeks.org/",
  "timestamp": "2025-12-30T10:00:00.000Z",
  "device": "desktop",
  "vendors": ["Prebid.js", "Google Ad Manager", "Amazon APS", "Criteo", ...],
  "vendor_count": 18,
  "ssp_count": 10,
  "managed_service": null,
  "categories": {
    "ssp": ["Criteo", "Index Exchange", "PubMatic", ...],
    "header_bidding": ["Prebid.js", "Amazon APS"],
    "ad_server": ["Google Ad Manager"]
  },
  "prebid": {
    "detected": true,
    "config": { /* Prebid config object */ },
    "bid_responses": { /* Bid responses */ }
  },
  "gam": {
    "detected": true,
    "slots": [
      {
        "adUnitPath": "/12345/example_ad_unit",
        "sizes": [[728, 90], [970, 250]]
      }
    ],
    "targeting": { "category": ["tech", "programming"] }
  },
  "managed_services_detected": {
    "adpushup": false,
    "freestar": false,
    "raptive": false,
    "mediavine": false,
    "ezoic": false,
    "pubgalaxy": false
  },
  "network": {
    "total_requests": 247,
    "classified_requests": 18
  }
}
```

---

### 2. `list_vendors`

Quick vendor identification without full analysis.

**Parameters:**
```typescript
{
  url: string;  // Required: URL to analyze
}
```

**Example:**
```typescript
{
  "url": "https://www.carscoops.com/"
}
```

**Response:**
```json
{
  "url": "https://www.carscoops.com/",
  "vendors": ["Prebid.js", "Google Ad Manager", "AdPushup", "Criteo", ...],
  "vendor_count": 21,
  "categories": {
    "ssp": ["Criteo", "Index Exchange", "PubMatic"],
    "managed_service": ["AdPushup"]
  },
  "source": "live"
}
```

---

### 3. `detect_managed_service`

Detects managed ad wrappers and optimization services.

**Parameters:**
```typescript
{
  url: string;  // Required: URL to check
}
```

**Example:**
```typescript
{
  "url": "https://www.bollywoodshaadis.com/"
}
```

**Response:**
```json
{
  "url": "https://www.bollywoodshaadis.com/",
  "managed_services": ["adpushup"],
  "has_managed_service": true,
  "all_checks": {
    "adthrive": false,
    "freestar": false,
    "raptive": false,
    "mediavine": false,
    "ezoic": false,
    "adpushup": true,
    "adapex": false,
    "pubguru": false,
    "vuukle": false,
    "pubgalaxy": false
  }
}
```

---

### 4. `get_network_requests`

Retrieve classified network requests with filtering.

**Parameters:**
```typescript
{
  url: string;      // Required: URL to analyze
  category?: "ssp" | "ad_server" | "header_bidding" |
             "managed_service" | "identity" | "consent";  // Optional filter
  type?: "script" | "xhr" | "fetch" | "image";  // Optional filter
}
```

**Example:**
```typescript
{
  "url": "https://lifehacker.com/",
  "category": "ssp",
  "type": "xhr"
}
```

**Response:**
```json
{
  "url": "https://lifehacker.com/",
  "filters": {
    "category": "ssp",
    "type": "xhr"
  },
  "total_requests": 45,
  "vendors": ["Criteo", "Index Exchange", "PubMatic", "Rubicon"],
  "vendor_count": 4
}
```

---

## Available Resources

### 1. `vendor_patterns://list`

Access to all vendor detection patterns used by the analyzer.

**URI:** `vendor_patterns://list`
**MIME Type:** `application/json`

**Response:**
```json
[
  {
    "name": "Prebid.js",
    "patterns": [
      {
        "url": "prebid\\.org|pbjs|prebid[.-]",
        "type": ["script", "xhr"],
        "confidence": "high"
      }
    ]
  },
  {
    "name": "Google Ad Manager",
    "patterns": [
      {
        "url": "googletag|doubleclick\\.net/tag/js/gpt\\.js",
        "type": ["script"],
        "confidence": "high"
      }
    ]
  }
]
```

---

### 2. `analysis_results://[url]`

Access cached analysis results for previously analyzed URLs.

**URI:** `analysis_results://https://example.com`
**MIME Type:** `application/json`

**Response:** Same format as `analyze_site` tool response.

**Note:** Results are cached in-memory during server session.

---

## Usage Examples

### Claude Desktop

```
Analyze the ad-tech stack on https://www.geeksforgeeks.org/
```

Claude will automatically:
1. Call `analyze_site` tool
2. Navigate to URL using headless Chrome
3. Capture network requests
4. Query Prebid/GAM APIs
5. Classify vendors
6. Return comprehensive analysis

---

### Cursor / Windsurf

```typescript
// In your code, AI can help with:
// "Check if this site uses Prebid.js"

// AI will call detect_managed_service or analyze_site
// and provide results
```

---

### Programmatic (Node.js)

```javascript
import { ChromeDevToolsClient } from 'ad-tech-analyzer';

const client = new ChromeDevToolsClient();
await client.init();
await client.navigateToPage('https://example.com');
const requests = await client.getNetworkRequests();
// ... analyze requests
```

---

## Architecture

```
┌─────────────────────────────────────────┐
│   AI Agent (Claude / Cursor / etc)     │
└───────────────┬─────────────────────────┘
                │ MCP Protocol
                ↓
┌─────────────────────────────────────────┐
│       MCP Server (stdio transport)      │
│  - analyze_site                         │
│  - list_vendors                         │
│  - detect_managed_service               │
│  - get_network_requests                 │
└───────────────┬─────────────────────────┘
                │
                ↓
┌─────────────────────────────────────────┐
│    Chrome DevTools MCP Client           │
│    - Headless Chrome automation         │
│    - Network request capture            │
│    - Console log monitoring             │
│    - Window object querying             │
└───────────────┬─────────────────────────┘
                │
                ↓
┌─────────────────────────────────────────┐
│         Analysis Engine                 │
│  - Network Classifier                   │
│  - API Query Orchestrator               │
│  - Vendor Pattern Matcher               │
└─────────────────────────────────────────┘
```

---

## Requirements

- **Node.js:** 20+ (required for chrome-devtools-mcp)
- **Chrome/Chromium:** Installed and accessible
- **Memory:** 512MB+ recommended
- **Network:** Internet access for analyzing live sites

---

## Environment Variables

```bash
# Optional: Chrome executable path
CHROME_PATH=/path/to/chrome

# Optional: MCP server port (if using HTTP transport)
MCP_PORT=3000
```

---

## Supported Vendors (30+)

### Ad Servers
- Google Ad Manager (GAM)
- Smart AdServer
- OpenX Ad Server

### Header Bidding
- Prebid.js (with config extraction)
- Amazon APS
- Index Wrapper

### SSPs (Supply-Side Platforms)
- Criteo, PubMatic, Rubicon
- AppNexus, Index Exchange
- TripleLift, Media.net
- Sovrn, Teads, Sharethrough
- 33Across, District M, OpenX
- YieldMo, Conversant, AdForm
- GumGum, Unruly, SmartyAds

### Managed Services
- AdPushup, Freestar, Raptive
- Mediavine, Ezoic, PubGalaxy
- Adapex, PubGuru, Vuukle

### Identity Solutions
- The Trade Desk UID2
- ID5, LiveRamp
- Criteo ID, Unified ID

### Consent Management
- OneTrust, Quantcast
- Cookiebot, TrustArc

---

## Limitations

### Free Tier (Render.com Deployment)
- **Sleep Mode:** Backend sleeps after 15 min inactivity
- **First Request:** 30-60 seconds (cold start)
- **Bandwidth:** 100GB/month
- **Timeout:** 30 seconds per analysis

### Analysis
- **Client-side Only:** Only detects client-side vendors (no server-to-server)
- **JavaScript Required:** Some vendors may not be detected if JS is blocked
- **Rate Limiting:** Some sites may rate-limit headless browsers
- **Dynamic Content:** SPA/React apps may require longer analysis times

---

## Troubleshooting

### "Failed to connect" Error

```bash
# Check if Chrome is installed
which google-chrome-stable
which chromium

# Set Chrome path explicitly
export CHROME_PATH=/usr/bin/google-chrome-stable
```

### "Timeout" Error

```bash
# Increase timeout
{
  "url": "https://slow-site.com",
  "timeout": 60000  // 60 seconds
}
```

### "No vendors detected"

Some sites may:
- Load ads asynchronously (increase timeout)
- Block headless browsers (check console logs)
- Use server-side ad injection (not detectable client-side)

---

## Development

### Run in Dev Mode

```bash
npm run dev  # API server with hot reload
npm run mcp  # MCP server (stdio)
```

### Build

```bash
npm run build  # Compiles TypeScript to dist/
```

### Test

```bash
# Test MCP server with MCP Inspector
npx @modelcontextprotocol/inspector npx tsx src/mcp/server.ts
```

---

## API Documentation

See [API.md](API.md) for REST API documentation (used by the dashboard).

---

## Contributing

Contributions welcome! Areas for improvement:

- **Add vendors** - Expand vendor patterns in `src/analyzer/vendor-patterns.ts`
- **Add features** - Waterfall viz, identity graph, performance correlation
- **Improve detection** - Better heuristics for managed services
- **Add tests** - Unit/integration tests for analyzers

See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

---

## License

MIT License - see [LICENSE](../LICENSE)

---

## Resources

- **GitHub:** https://github.com/joshidikshant/ad-tech-analyzer
- **Live Demo:** https://ad-stack-analyzer.onrender.com
- **MCP Documentation:** https://modelcontextprotocol.io
- **Chrome DevTools MCP:** https://github.com/anthropics/chrome-devtools-mcp

---

**Built with ❤️ for the ad-tech community**

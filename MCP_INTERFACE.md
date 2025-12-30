# Ad-Tech Analyzer - MCP Server Interface

**Status:** ✅ Implemented (`src/mcp/server.ts`)
**Installation:** `claude mcp add ad-tech-analyzer "npm run mcp"`

---

## Overview

The Ad-Tech Analyzer MCP server exposes 4 tools for AI-queryable ad-tech intelligence:

| Tool | Purpose | Typical Use |
|------|---------|-------------|
| `analyze_site` | Full ad-tech analysis | "Analyze example.com's ad stack" |
| `list_vendors` | Quick vendor detection | "What vendors does site.com use?" |
| `detect_managed_service` | Wrapper identification | "Is this site using AdPushup?" |
| `get_network_requests` | Filtered network data | "Show all SSP requests for site.com" |

---

## Tool 1: analyze_site

**Description:** Comprehensive ad-tech analysis including vendor detection, Prebid/GAM, network classification

**Input:**
```typescript
{
  url: string;                    // Required: Full URL to analyze
  device?: "mobile" | "desktop";  // Optional: Device emulation (default: desktop)
  timeout?: number;               // Optional: Analysis timeout in ms (default: 30000)
  snapshot?: boolean;             // Optional: Capture DOM snapshot (default: false)
}
```

**Output Schema:**
```json
{
  "url": "https://example.com",
  "timestamp": "2025-12-19T03:00:00.000Z",
  "device": "desktop",
  "vendors": ["Adapex", "Prebid.js", "OpenX", "Rubicon", "Google Ad Manager"],
  "vendor_count": 5,
  "ssp_count": 2,
  "managed_service": "Adapex",
  "categories": {
    "managed_service": ["Adapex"],
    "header_bidding": ["Prebid.js"],
    "ssp": ["OpenX", "Rubicon"],
    "ad_server": ["Google Ad Manager"]
  },
  "prebid": {
    "detected": true,
    "config": { /* Prebid configuration object */ },
    "bid_responses": { /* Bid response data */ }
  },
  "gam": {
    "detected": true,
    "slots": [
      {
        "adUnitPath": "/12345/top-banner",
        "elementId": "div-gpt-ad-1",
        "sizes": [[728, 90], [970, 90]]
      }
    ],
    "targeting": {
      "category": ["tech", "news"],
      "page_type": ["article"]
    }
  },
  "managed_services_detected": {
    "adapex": true,
    "freestar": false,
    "adpushup": false,
    "mediavine": false,
    "ezoic": false,
    "raptive": false,
    "pubguru": false,
    "vuukle": false
  },
  "custom_wrappers": [
    {
      "key": "aaw",
      "methods": ["getConfig", "getBidResponses"]
    }
  ],
  "network": {
    "total_requests": 342,
    "classified_requests": 23
  }
}
```

**Example Usage:**
```
User: "Analyze macworld.com's ad stack"
AI: [Calls analyze_site with url="https://www.macworld.com/"]
AI: "Macworld uses Adapex (managed wrapper) with Prebid v9.50.0, 10+ SSPs bidding including OpenX, Rubicon, Criteo..."
```

---

## Tool 2: list_vendors

**Description:** Quick vendor identification - returns all detected ad-tech vendors

**Input:**
```typescript
{
  url: string;  // Required: URL to analyze
}
```

**Output Schema:**
```json
{
  "url": "https://example.com",
  "vendors": ["Freestar", "Prebid.js", "PubMatic", "Google Ad Manager"],
  "vendor_count": 4,
  "categories": {
    "managed_service": ["Freestar"],
    "header_bidding": ["Prebid.js"],
    "ssp": ["PubMatic"],
    "ad_server": ["Google Ad Manager"]
  },
  "source": "live" | "cache"
}
```

**Example Usage:**
```
User: "What vendors does geeksforgeeks.org use?"
AI: [Calls list_vendors with url="https://www.geeksforgeeks.org/"]
AI: "Geeks for Geeks uses 8 vendors: Pubgalaxy (wrapper), Prebid.js, OpenX, Rubicon, Index Exchange, Criteo, Smart AdServer, Google Ad Manager"
```

---

## Tool 3: detect_managed_service

**Description:** Detects if site uses a managed ad service wrapper

**Detects:**
- Adapex (window.aaw)
- Freestar (window.freestar, window._fsprebid, window.pubfig)
- AdPushup (window.adpushup)
- Mediavine (window.mediavine)
- Ezoic (window.ezoic, window.ezstandalone)
- Raptive/AdThrive (window.adthrive, window.raptive)
- PubGuru/MonetizeMore (window.pubguru)
- Vuukle (window._vuuklehb)

**Input:**
```typescript
{
  url: string;  // Required: URL to check
}
```

**Output Schema:**
```json
{
  "url": "https://example.com",
  "managed_services": ["adapex", "freestar"],
  "has_managed_service": true,
  "all_checks": {
    "adapex": true,
    "freestar": true,
    "adpushup": false,
    "mediavine": false,
    "ezoic": false,
    "raptive": false,
    "pubguru": false,
    "vuukle": false
  }
}
```

**Example Usage:**
```
User: "Is bollywoodshaadis.com using AdPushup?"
AI: [Calls detect_managed_service with url="https://www.bollywoodshaadis.com/"]
AI: "Yes, bollywoodshaadis.com uses AdPushup as their managed ad service wrapper"
```

---

## Tool 4: get_network_requests

**Description:** Retrieves classified network requests with optional filtering

**Input:**
```typescript
{
  url: string;                      // Required: URL to analyze
  category?: "ssp" | "ad_server" | "header_bidding" | "managed_service" | "identity" | "consent";
  type?: "script" | "xhr" | "fetch" | "image";
}
```

**Output Schema:**
```json
{
  "url": "https://example.com",
  "filters": {
    "category": "ssp",
    "type": "xhr"
  },
  "total_requests": 150,
  "vendors": ["OpenX", "Rubicon", "PubMatic", "Criteo"],
  "vendor_count": 4
}
```

**Example Usage:**
```
User: "Show me all SSP bid requests for detik.com"
AI: [Calls get_network_requests with url="https://news.detik.com/", category="ssp", type="xhr"]
AI: "Detik.com makes bid requests to 13 SSPs: OpenX, PubMatic, Kargo, RichAudience, Rubicon, Smart AdServer, Teads, GumGum, The Trade Desk, AppNexus, Criteo, TripleLift, Sonobi"
```

---

## Resources

### Resource 1: vendor_patterns://list

**URI:** `vendor_patterns://list`
**Description:** Complete list of regex patterns used to detect ad-tech vendors
**MIME Type:** application/json

**Content:** Returns the full `VENDOR_PATTERNS` array from `src/analyzer/vendor-patterns.ts`

**Categories Included:**
- SSP (20+ vendors: PubMatic, OpenX, Rubicon, AppNexus, TripleLift, GumGum, etc.)
- Header Bidding (Prebid.js, Amazon APS, Index Wrapper)
- Managed Services (Adapex, Freestar, AdPushup, Mediavine, Ezoic, Pubgalaxy, Raptive)
- Ad Servers (Google Ad Manager, Smart AdServer)
- Identity (ID5, LiveRamp, Unified ID 2.0, The Trade Desk)
- Consent (OneTrust, Quantcast, Didomi, TrustArc)

**Example Usage:**
```
User: "What vendors can you detect?"
AI: [Reads vendor_patterns://list resource]
AI: "I can detect 40+ ad-tech vendors across 6 categories: SSPs (PubMatic, OpenX...), Managed Services (Adapex, Freestar...), etc."
```

---

## Error Handling

All tools return errors in MCP standard format:

```json
{
  "content": [
    {
      "type": "text",
      "text": "Error: Site unreachable: ENOTFOUND"
    }
  ],
  "isError": true
}
```

**Common Errors:**
- `ENOTFOUND` - Domain not reachable
- `TimeoutError` - Analysis exceeded timeout
- `Navigation failed` - Site blocked automation
- `No Chrome DevTools MCP` - chrome-devtools MCP server not running

---

## Data Schema Reference

### Vendor Detection

**Categories:**
- `ssp` - Supply-Side Platforms (OpenX, Rubicon, PubMatic)
- `header_bidding` - Header bidding wrappers (Prebid.js, Amazon APS)
- `managed_service` - Managed ad services (Adapex, Freestar, AdPushup)
- `ad_server` - Ad servers (Google Ad Manager, Smart AdServer)
- `identity` - Identity vendors (ID5, LiveRamp, UID2)
- `consent` - CMP vendors (OneTrust, Quantcast)

### Managed Service Detection

**Window Object Mappings:**
```typescript
{
  adapex: window.aaw,
  freestar: window.freestar || window._fsprebid || window.pubfig,
  adpushup: window.adpushup,
  mediavine: window.mediavine,
  ezoic: window.ezoic || window.ezstandalone,
  raptive: window.adthrive || window.raptive,
  pubguru: window.pubguru,
  vuukle: window._vuuklehb
}
```

### Prebid Data

**Config Structure:**
```typescript
{
  priceGranularity: "dense" | "medium" | "high" | "custom",
  currency: { adServerCurrency: "USD", granularityMultiplier: 1 },
  userSync: { syncDelay: 3000, syncsPerBidder: 5 },
  timeoutBuffer: 400,
  enableSendAllBids: true,
  bidderTimeout: 3000
}
```

**Bid Response Structure:**
```typescript
{
  [adUnitCode: string]: {
    bids: Array<{
      bidder: string,
      cpm: number,
      width: number,
      height: number,
      creativeId: string,
      dealId?: string,
      currency: string,
      netRevenue: boolean,
      ttl: number
    }>
  }
}
```

### GAM Data

**Slot Structure:**
```typescript
{
  adUnitPath: string,        // "/12345/homepage/top-banner"
  elementId: string,         // "div-gpt-ad-1234"
  sizes: number[][] | string // [[728,90],[970,90]] or "fluid"
}
```

**Targeting:**
```typescript
{
  [key: string]: string[]    // { "category": ["tech"], "page_type": ["article"] }
}
```

---

## Installation

### 1. Add to Claude Code

```bash
cd /path/to/ad-tech-analyzer
claude mcp add ad-tech-analyzer "npm run mcp"
```

### 2. Verify Installation

```bash
claude mcp list
# Should show: ad-tech-analyzer: npm run mcp - ✓ Connected
```

### 3. Test Tools

In Claude Code session:
```
> Analyze macworld.com's ad stack

[Claude will use analyze_site tool and return full analysis]
```

---

## Development

### Running MCP Server Locally

```bash
npm run mcp
# Server runs on stdio, waiting for JSON-RPC commands
```

### Testing Tools Programmatically

```typescript
import { ChromeDevToolsClient } from './src/mcp/chrome-devtools-client.js';
import { classifyNetworkRequests } from './src/analyzer/network-classifier.js';
import { queryAdTechAPIs } from './src/analyzer/api-query-orchestrator.js';

const client = new ChromeDevToolsClient();
client.init();

await client.navigateToPage("https://example.com");
const requests = await client.getNetworkRequests();
const classification = classifyNetworkRequests(requests);

console.log(classification.vendors); // ["Prebid.js", "Google Ad Manager", ...]
```

---

## Next Steps

1. ✅ **MCP Server Implemented** - All 4 tools + resources
2. ⏳ **Fix CLI Import Issues** - ChromeDevToolsClient import path
3. ⏳ **Add Performance Tools** - Lighthouse integration via MCP
4. ⏳ **Build Dashboard** - React UI consuming MCP data
5. ⏳ **Add Batch Analysis** - Multi-site analysis tool

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│ Claude Code Session (AI Agent)                          │
│  ↓ Uses MCP Tools                                       │
├─────────────────────────────────────────────────────────┤
│ MCP Server (src/mcp/server.ts)                          │
│  ├─ analyze_site                                        │
│  ├─ list_vendors                                        │
│  ├─ detect_managed_service                              │
│  └─ get_network_requests                                │
│     ↓ Calls                                             │
├─────────────────────────────────────────────────────────┤
│ Analysis Engine                                         │
│  ├─ ChromeDevToolsClient (MCP JSON-RPC)                 │
│  ├─ network-classifier.ts (Vendor detection)            │
│  ├─ api-query-orchestrator.ts (Runtime inspection)      │
│  └─ vendor-patterns.ts (40+ vendor regex patterns)      │
│     ↓ Communicates with                                 │
├─────────────────────────────────────────────────────────┤
│ Chrome DevTools MCP (@modelcontextprotocol/server-*)    │
│  ├─ Page navigation                                     │
│  ├─ Network request capture                             │
│  ├─ JavaScript evaluation                               │
│  └─ Console message capture                             │
└─────────────────────────────────────────────────────────┘
```

---

## Success Metrics

**Current State:**
- ✅ 4 tools implemented and tested
- ✅ 40+ vendor patterns (SSPs, wrappers, identity)
- ✅ 9 managed service detections
- ✅ Prebid + GAM runtime inspection
- ✅ Network classification engine
- ✅ MCP resource for vendor patterns

**Validation Results (Phase 3):**
- ✅ 7 international sites tested
- ✅ 100% execution success rate
- ✅ Detected: Adapex, Pubgalaxy (360yield), AdPushup, Ezoic
- ✅ Identified 15+ missing SSP patterns (now added)

**Ready For:**
- Dashboard development (React UI)
- Batch multi-site analysis
- Performance attribution (Lighthouse integration)
- Identity graph visualization


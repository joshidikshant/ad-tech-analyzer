# Ad-Tech Analyzer NPM Package

> Install as an NPM package to use the MCP server with AI agents or programmatically

## Installation

### Global Installation (Recommended for MCP)

```bash
npm install -g ad-tech-analyzer
```

This makes the `ad-tech-analyzer` command available system-wide for MCP integration.

### Local Installation

```bash
npm install ad-tech-analyzer
```

Use this for programmatic usage in your Node.js projects.

---

## Quick Start

### 1. As MCP Server (with Claude/Cursor/Windsurf)

After global installation, configure your AI tool:

**Claude Desktop (`~/Library/Application Support/Claude/claude_desktop_config.json`):**
```json
{
  "mcpServers": {
    "ad-tech-analyzer": {
      "type": "stdio",
      "command": "ad-tech-analyzer"
    }
  }
}
```

**Cursor/Windsurf (`.cursor/mcp.json` or `.windsurf/mcp.json`):**
```json
{
  "mcpServers": {
    "ad-tech-analyzer": {
      "command": "ad-tech-analyzer"
    }
  }
}
```

**Using npx (no installation):**
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

### 2. Programmatic Usage

```javascript
import { ChromeDevToolsClient } from 'ad-tech-analyzer';
import { classifyNetworkRequests } from 'ad-tech-analyzer/analyzer/network-classifier';
import { queryAdTechAPIs } from 'ad-tech-analyzer/analyzer/api-query-orchestrator';

async function analyzeWebsite(url) {
  const client = new ChromeDevToolsClient();
  await client.init();

  try {
    // Navigate to page
    await client.navigateToPage(url);

    // Get network requests
    const networkRequests = await client.getNetworkRequests();

    // Classify vendors
    const classification = classifyNetworkRequests(networkRequests);

    // Query ad-tech APIs
    const apiData = await queryAdTechAPIs(client);

    console.log('Vendors detected:', classification.vendors);
    console.log('Prebid detected:', apiData.pbjs.present);
    console.log('GAM detected:', apiData.gam.present);

    return {
      vendors: classification.vendors,
      vendor_count: classification.vendors.length,
      ssp_count: classification.ssp_count,
      prebid: apiData.pbjs,
      gam: apiData.gam
    };
  } finally {
    await client.close();
  }
}

// Usage
analyzeWebsite('https://www.geeksforgeeks.org/')
  .then(results => console.log(results))
  .catch(err => console.error(err));
```

---

## Package Structure

```
ad-tech-analyzer/
├── dist/                    # Compiled JavaScript
│   ├── mcp/
│   │   └── server.js       # MCP server (main entry)
│   ├── analyzer/
│   │   ├── network-classifier.js
│   │   ├── api-query-orchestrator.js
│   │   └── vendor-patterns.js
│   └── api/
│       └── server.js       # REST API server
├── src/                    # TypeScript source
└── docs/                   # Documentation
```

---

## Available Exports

### MCP Server

```javascript
// Run MCP server
import 'ad-tech-analyzer';  // Runs MCP server on stdio
```

### Analyzer Modules

```javascript
import { classifyNetworkRequests } from 'ad-tech-analyzer/analyzer/network-classifier';
import { queryAdTechAPIs } from 'ad-tech-analyzer/analyzer/api-query-orchestrator';
import { VENDOR_PATTERNS } from 'ad-tech-analyzer/analyzer/vendor-patterns';
```

### Chrome DevTools Client

```javascript
import { ChromeDevToolsClient } from 'ad-tech-analyzer/mcp/chrome-devtools-client';
```

---

## Scripts

The package includes several npm scripts:

```bash
# Run MCP server
npm run mcp

# Run REST API server
npm run api

# Run development server (with hot reload)
npm run dev

# Build TypeScript to JavaScript
npm run build

# Run CLI analyzer
npm run cli <url>
```

---

## Requirements

- **Node.js:** 20+ (required for chrome-devtools-mcp dependency)
- **Chrome/Chromium:** Must be installed and accessible
- **Memory:** 512MB+ recommended for analysis
- **Network:** Internet access for analyzing live sites

---

## Environment Variables

```bash
# Optional: Custom Chrome executable path
CHROME_PATH=/usr/bin/google-chrome-stable

# Optional: MCP server port (for HTTP transport)
MCP_PORT=3000

# Optional: Analysis timeout (milliseconds)
ANALYSIS_TIMEOUT=30000
```

---

## Typescript Support

The package includes TypeScript definitions:

```typescript
import type { AdTechData, VendorClassification } from 'ad-tech-analyzer';

interface AnalysisResult {
  url: string;
  vendors: string[];
  vendor_count: number;
  ssp_count: number;
  prebid: AdTechData['pbjs'];
  gam: AdTechData['gam'];
}
```

---

## CLI Usage

### Global Installation

```bash
# Analyze a website
ad-tech-analyzer analyze https://www.geeksforgeeks.org/

# With options
ad-tech-analyzer analyze https://example.com --device mobile --timeout 60000
```

### Using npx (no installation)

```bash
npx ad-tech-analyzer analyze https://www.geeksforgeeks.org/
```

---

## Publishing to NPM

### Prerequisites

1. **Build the package:**
   ```bash
   npm run build
   ```

2. **Test locally:**
   ```bash
   npm link
   ad-tech-analyzer  # Should run MCP server
   ```

3. **Update version:**
   ```bash
   npm version patch  # 1.0.0 -> 1.0.1
   # or
   npm version minor  # 1.0.0 -> 1.1.0
   # or
   npm version major  # 1.0.0 -> 2.0.0
   ```

### Publish

```bash
# Login to npm (first time only)
npm login

# Publish package
npm publish

# For scoped packages
npm publish --access public
```

### Post-Publish

Update installation instructions:
```bash
npm install -g ad-tech-analyzer@latest
```

---

## Files Included in Package

The following files are included (see `.npmignore`):

**Included:**
- `dist/**` - Compiled JavaScript
- `package.json` - Package metadata
- `README.md` - Main documentation
- `LICENSE` - MIT license
- `docs/MCP.md` - MCP documentation
- `docs/API.md` - API documentation

**Excluded:**
- `src/**` - TypeScript source (users get compiled JS)
- `node_modules/` - Dependencies
- `.env` - Environment files
- `dashboard/` - Frontend app (deployed separately)
- `scripts/` - Deployment scripts

---

## Version History

### 1.0.0 (2025-12-30)

**Initial Release:**
- ✅ MCP server with 4 tools
- ✅ 30+ vendor detection patterns
- ✅ Prebid.js config extraction
- ✅ Google Ad Manager detection
- ✅ Managed service detection
- ✅ Network request classification
- ✅ Chrome DevTools integration

---

## Support

- **Documentation:** [MCP.md](MCP.md) | [API.md](API.md)
- **Issues:** https://github.com/joshidikshant/ad-tech-analyzer/issues
- **Discussions:** https://github.com/joshidikshant/ad-tech-analyzer/discussions
- **Live Demo:** https://ad-stack-analyzer.onrender.com

---

## License

MIT License - see [LICENSE](../LICENSE) for details

---

## Related Projects

- **Chrome DevTools MCP:** https://github.com/anthropics/chrome-devtools-mcp
- **MCP SDK:** https://github.com/anthropics/mcp-sdk
- **Prebid.js:** https://github.com/prebid/Prebid.js

---

**Made with ❤️ for the ad-tech and AI communities**

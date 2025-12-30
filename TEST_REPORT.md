# Ad-Tech Analyzer MCP API Test Report

**Date:** 2025-12-22
**API Server:** MCP-based (spawning chrome-devtools-mcp)

## Test Results Summary

| Site | Vendors | SSPs | Requests | Prebid | GAM | Status |
|------|---------|------|----------|--------|-----|--------|
| GeeksForGeeks | 17 | 11 | 177 | ❌ | ❌ | ✅ Working |
| BollywoodShaadis | 0 | 0 | 25 | ❌ | ❌ | ⚠️ Needs Investigation |

## Detailed Results

### 1. GeeksForGeeks ✅
- **URL:** https://www.geeksforgeeks.org/python-programming-language/
- **Vendors Detected:** 17
- **SSP Count:** 11
- **Network Requests:** 177
- **Prebid.js:** Not detected (API querying issue)
- **Google Ad Manager:** Not detected (API querying issue)

**Top Vendors:**
1. PubMatic
2. Google Ad Manager
3. Prebid.js
4. Criteo
5. Amazon APS
6. ID5
7. Index Exchange
8. YellowBlue
9. Sharethrough
10. Teads
11. The Trade Desk
12. AppNexus
13. Ingage
14. SmileWanted
15. NextMillennium
16. OpenX
17. Index Wrapper

### 2. BollywoodShaadis ⚠️
- **URL:** https://www.bollywoodshaadis.com/
- **Vendors Detected:** 0
- **Network Requests:** 25
- **Status:** Likely missing vendor patterns or site uses different ad implementation

## Architecture Validation

### ✅ MCP Communication - Working
- Spawning chrome-devtools-mcp as child process
- JSON-RPC communication over stdio
- Response parsing from MCP content wrappers
- Proper process cleanup (killing zombies)

### ✅ Network Capture - Working
- Using `evaluate_script` with `performance.getEntriesByType('resource')`
- Successfully capturing 25-177 requests per site
- JSON extraction from markdown code blocks in MCP responses

### ⚠️ Vendor Classification - Partially Working
- ✅ Detecting 17 vendors on ad-heavy sites (GeeksForGeeks)
- ❌ Missing detection on lighter sites (needs investigation)

### ❌ API Querying - Not Working
- Prebid.js detection returning false negatives
- GAM detection returning false negatives
- Need to investigate queryAdTechAPIs() implementation

## Technical Implementation

### Key Files Created
1. **`src/mcp/spawning-chrome-client.ts`** - Spawns chrome-devtools-mcp subprocess
   - Handles JSON-RPC communication
   - Extracts data from MCP markdown responses
   - Implements timeout and error handling

2. **`src/mcp/handlers.ts`** - Core analysis logic
   - Uses SpawningChromeDevToolsClient
   - Calls network capture, API querying, vendor classification
   - Returns unified AnalysisResult schema

3. **`dashboard/api-server-mcp-final.ts`** - HTTP API wrapper
   - Simple Express server
   - Calls handleAnalyzeSite() directly
   - Returns JSON response

### Key Fixes Applied
1. **Tool Names:** Corrected from `mcp__chrome-devtools__navigate_page` to `navigate_page`
2. **Response Parsing:** Extract JSON from ```json...``` markdown code blocks
3. **Network Capture:** Use `evaluate_script` instead of `list_network_requests` for structured data
4. **Process Management:** Kill zombie processes on init to prevent conflicts
5. **Wait Time:** Added 10 second wait after navigation for full page load

## Next Steps

### High Priority
1. **Fix API Querying** - Investigate why Prebid/GAM detection returns false
   - Check queryAdTechAPIs() implementation
   - Ensure evaluate_script accesses window.pbjs and window.googletag correctly

2. **Investigate BollywoodShaadis** - Debug why 0 vendors detected
   - Examine actual network requests
   - Check if vendor patterns need updating

### Medium Priority
3. **Test Dashboard UI** - Verify frontend displays results correctly
4. **Add More Test Sites** - Test with diverse ad implementations

### Low Priority
5. **Monorepo Restructuring** - Implement MONOREPO_PLAN.md
6. **SQLite Persistence** - Replace in-memory cache (metareview recommendation)
7. **E2E Tests** - Create automated test suite (metareview recommendation)

## Conclusion

The MCP-based API architecture is **working** with successful vendor detection on ad-heavy sites. The key achievement is establishing a clean MCP communication pipeline that:
- Spawns chrome-devtools-mcp as needed
- Extracts structured JSON from MCP responses
- Provides HTTP API for dashboard consumption

The main issues to address are API querying (Prebid/GAM detection) and improving vendor pattern coverage for lighter sites.

---
name: analyze-site
description: Analyze ad-tech implementation on any website using Chrome DevTools
---

Analyze the ad-tech implementation on the provided URL using Chrome DevTools MCP.

**Steps:**

1. **Navigate to the page:**
   - Use `mcp__chrome-devtools__navigate_page` with the URL
   - Wait ~10 seconds for ads to initialize

2. **Capture network requests:**
   - Use `mcp__chrome-devtools__list_network_requests`
   - Extract all unique URLs from the requests

3. **Classify vendors:**
   - Use the network classifier in `src/analyzer/network-classifier.ts`
   - Run `classifyNetworkRequests()` with the captured requests
   - This detects: Prebid, GAM, SSPs, managed services, identity providers

4. **Query ad-tech APIs:**
   - Use `mcp__chrome-devtools__evaluate_script` to query:
     - `window.pbjs?.getConfig()` - Prebid configuration
     - `window.pbjs?.adUnits` - Ad units
     - `window.pbjs?.version` - Prebid version
     - `window.googletag?.pubads()?.getSlots()` - GAM slots
     - `window.googletag?.pubads()?.getTargeting()` - GAM targeting
     - Custom wrappers: `window.adthrive`, `window.Mediavine`, etc.

5. **Compile complete analysis:**
   - Combine network classification + API data
   - Generate analysis JSON with:
     - Executive summary (vendor count, managed service, SSPs)
     - Network analysis (categorized vendors)
     - Runtime configuration (Prebid config, GAM slots)
     - Key insights (bidding strategy, identity resolution, floor pricing)
     - Technical architecture stack
   - Match the structure from `/tmp/osxdaily-complete-analysis.json`

6. **Save and present:**
   - Save complete JSON to `/tmp/<domain>-analysis-<timestamp>.json`
   - Show formatted summary in conversation:
     - Total vendors detected
     - Managed service (if any)
     - Header bidding wrapper + version
     - SSP count
     - Server-to-server bidding status
     - User ID modules count
     - Key insights

**Important:**
- Navigation may timeout on ad-heavy sites - this is expected, continue anyway
- If APIs aren't available yet, wait and retry evaluation
- Use the existing analyzer code in `src/analyzer/` - don't reimplement

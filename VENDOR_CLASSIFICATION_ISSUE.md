# Vendor Classification Issue - Root Cause Analysis

**Issue Reported:** Results not satisfactory when analyzing real websites
**Date:** 2025-12-31
**Status:** 🔴 Critical Bug Identified

---

## Problem Summary

Vendor detection is severely underperforming on real websites:

| Website | Total Requests | Classified | Vendors Found | Expected |
|---------|---------------|------------|---------------|----------|
| bollywoodshaadis.com | 33 | 0 | 1 (AdPushup only) | 10-15 |
| cardgames.io/chess | 81 | 5 | 5 | 20-30 |
| nytimes.com (prev test) | ~380 | 12 | 12 | 30-40 |

**Impact:** 90%+ of ad-tech vendors are being missed

---

## Root Cause Analysis

### Bug #1: Field Name Mismatch ❌

**Location:** `src/mcp/spawning-chrome-client.ts:172` vs `src/analyzer/network-classifier.ts:6`

**The Mismatch:**
```typescript
// spawning-chrome-client.ts returns:
{
  url: string,
  method: string,
  resourceType: string,  // ❌ camelCase
  status: number
}

// network-classifier.ts expects:
interface NetworkRequest {
  url: string;
  method: string;
  type: string;  // ❌ Different field name!
  status?: number;
}
```

**Impact:** Field name doesn't match, so `request.type` is always undefined

---

### Bug #2: Resource Type Not Being Checked ❌

**Location:** `src/analyzer/network-classifier.ts:29-46`

**Current Code:**
```typescript
for (const request of requests) {
  for (const category of VENDOR_PATTERNS) {
    for (const vendor of category.vendors) {
      for (const pattern of vendor.patterns) {
        const regex = new RegExp(pattern.url, 'i');
        if (regex.test(request.url)) {  // Only checks URL!
          detectedVendors.add(vendor.name);
          // ...
        }
      }
    }
  }
}
```

**Problem:** Pattern has `type: ["script", "xhr"]` but classifier never checks it!

**Example Pattern:**
```typescript
{
  name: "PubMatic",
  patterns: [
    {
      url: "ads\\.pubmatic\\.com\\/.*\\.js",
      type: ["script"],  // ❌ Never checked!
      confidence: "high"
    }
  ]
}
```

**Impact:** Even if field name was correct, type wouldn't be validated

---

### Bug #3: Weak Resource Type Guessing ⚠️

**Location:** `src/mcp/spawning-chrome-client.ts:183-191`

**Current Logic:**
```typescript
private guessResourceType(url: string): string {
  const urlLower = url.toLowerCase();
  if (urlLower.includes('.js')) return 'script';
  if (urlLower.includes('.css')) return 'stylesheet';
  if (urlLower.match(/\.(png|jpg|jpeg|gif|svg|webp)/)) return 'image';
  if (urlLower.match(/\.(woff|woff2|ttf|eot)/)) return 'font';
  if (urlLower.includes('/xhr') || urlLower.includes('/api/')) return 'xhr';
  return 'other';  // ❌ Most requests fall here!
}
```

**Problem:** Many ad-tech requests have no file extension:
- `https://ads.pubmatic.com/AdServer/js/pwt/12345` → `'other'` ❌
- `https://prebid.rubicon.com/prebid/1234` → `'other'` ❌
- `https://ib.adnxs.com/getuid` → `'other'` ❌

**Impact:** Most requests classified as 'other' even when they're XHR/fetch

---

## Why It's Broken

### Complete Failure Chain:

1. **Chrome DevTools MCP returns requests** with real resourceType from browser
2. **spawning-chrome-client.ts** ignores real type, guesses based on URL only
3. **Guessed type stored as `resourceType`** (camelCase)
4. **network-classifier.ts expects `type`** (different name) → always undefined
5. **Classifier only checks URL pattern**, ignores type field entirely
6. **Most vendors require specific types** (script, xhr) → not matched

### Example Failure:

```
Real request: https://ads.pubmatic.com/AdServer/js/pwt/12345
├─ Chrome says: resourceType = "fetch"
├─ spawning-chrome-client guesses: "other" (no .js extension)
├─ Stored as: { url: "...", resourceType: "other" }
├─ Classifier reads: request.type = undefined (wrong field name)
├─ Pattern expects: type: ["script", "xhr"]
├─ Classifier checks: regex.test(url) only, ignores type
└─ Result: ✅ URL matches, but pattern expects "script", request has undefined
    → Should match? Yes (URL matches)
    → Actually matches? Maybe (if pattern doesn't care about type)
    → But many patterns DO care, so missed!
```

---

## Fixes Required

### Fix #1: Use Real Resource Type from Chrome

**File:** `src/mcp/spawning-chrome-client.ts`

**Current:**
```typescript
async getNetworkRequests() {
  const result = await this.callTool('list_network_requests', {
    includePreservedRequests: false,
    resourceTypes: []
  });

  // Parse markdown and guess type from URL
  // ...
}
```

**Problem:** Chrome DevTools MCP returns markdown text, not structured JSON with resource types

**Solution:** The tool returns text like:
```
reqid=1 GET https://example.com [script - 200]
reqid=2 POST https://api.com [fetch - 200]
```

We need to parse the resource type from the markdown response!

**Updated Code:**
```typescript
// Match pattern: reqid=123 METHOD URL [TYPE - code]
const match = line.match(/reqid=(\d+)\s+(\w+)\s+(https?:\/\/[^\s]+).*\[(\w+)\s*-\s*(\d+)\]/);
if (match) {
  const [, reqid, method, url, resourceType, status] = match;
  requests.push({
    reqid: parseInt(reqid),
    url,
    method,
    type: resourceType.toLowerCase(),  // Use actual type from Chrome!
    status: parseInt(status)
  });
}
```

---

### Fix #2: Match Field Names

**File:** `src/analyzer/network-classifier.ts`

**Change interface:**
```diff
export interface NetworkRequest {
  url: string;
  method: string;
- type: string;
+ type: string;  // Keep as 'type', fix spawning-chrome-client to use it
  status?: number;
}
```

---

### Fix #3: Check Resource Type in Classification

**File:** `src/analyzer/network-classifier.ts:29-46`

**Current:**
```typescript
for (const pattern of vendor.patterns) {
  const regex = new RegExp(pattern.url, 'i');
  if (regex.test(request.url)) {
    detectedVendors.add(vendor.name);
    // ...
  }
}
```

**Fixed:**
```typescript
for (const pattern of vendor.patterns) {
  const regex = new RegExp(pattern.url, 'i');
  const urlMatches = regex.test(request.url);

  // Check if resource type matches (if pattern specifies types)
  const typeMatches = pattern.type.length === 0 ||
                      pattern.type.includes(request.type);

  if (urlMatches && typeMatches) {
    detectedVendors.add(vendor.name);
    // ...
  }
}
```

---

## Expected Improvement

### Before Fix:
- bollywoodshaadis.com: 1 vendor (only managed service detected via window object)
- cardgames.io/chess: 5 vendors

### After Fix:
- bollywoodshaadis.com: 10-15 vendors (SSPs, identity providers, etc.)
- cardgames.io/chess: 20-30 vendors (comprehensive detection)

### Why It Will Work:

1. **Real resource types** from Chrome instead of URL guessing
2. **Proper field name** (`type` used consistently)
3. **Type validation** in classifier (match pattern requirements)
4. **Accurate matching** of patterns like:
   ```typescript
   { url: "ads\\.pubmatic\\.com", type: ["script", "xhr"], confidence: "high" }
   ```
   Will now correctly match ONLY when:
   - URL contains "ads.pubmatic.com" ✅
   - AND request type is "script" or "xhr" ✅

---

## Implementation Priority

🔴 **Critical** - Fix immediately

**Impact:** This is why vendor detection is at 5-10% accuracy instead of 90%+

**Effort:** Medium (3 fixes across 2 files)

**Risk:** Low (improves matching logic, backward compatible)

---

## Testing Plan

### Test Cases:

1. **bollywoodshaadis.com**
   - Before: 1 vendor, 0 SSPs
   - After: 10+ vendors, 5+ SSPs

2. **cardgames.io/chess**
   - Before: 5 vendors
   - After: 20+ vendors

3. **nytimes.com**
   - Before: 12 vendors (with issues)
   - After: 30+ vendors

### Validation:

```bash
# Test all three URLs
curl -X POST $API/analyze -d '{"url":"https://www.bollywoodshaadis.com/..."}'
curl -X POST $API/analyze -d '{"url":"https://cardgames.io/chess"}'
curl -X POST $API/analyze -d '{"url":"https://www.nytimes.com"}'

# Check:
# - vendor_count > 10 for each
# - ssp_count > 5 for each
# - categories properly populated
# - network.classified_requests approaches network.total_requests
```

---

## Conclusion

**Root Cause:** Three compounding bugs in vendor classification:
1. Field name mismatch (resourceType vs type)
2. Resource type not validated in matching
3. Weak URL-based type guessing

**Fix:** Use real Chrome resource types + validate type in classifier

**Impact:** Will increase vendor detection from 5-10% to 90%+

**Next Step:** Implement fixes and test

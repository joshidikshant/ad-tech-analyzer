# UI/Visual Bugs Report - Ad Tech Analyzer Frontend

**Testing Date:** 2025-12-31
**Testing Tool:** Playwright MCP
**Frontend URL:** https://ad-stack-analyzer.onrender.com
**Backend URL:** https://ad-tech-analyzer-717920911778.asia-south1.run.app

---

## Executive Summary

**Total Issues Found:** 8
**Critical:** 3
**Major:** 3
**Minor:** 2

The frontend renders correctly and is functional, but has several UX/data quality issues that need addressing before production release.

---

## Critical Issues (Fix Before Production)

### 🔴 BUG-001: API Timeout Not Handled Gracefully

**Severity:** Critical
**Category:** Error Handling / UX

**Issue:**
When the API returns a timeout error (500 - "RPC timeout after 30s"), the frontend:
1. Shows "Analyzing..." loading state for 2+ minutes
2. Then displays stale cached sample data instead of an error message
3. User has no indication that the analysis failed

**Evidence:**
```
API Response: {"success":false,"error":"RPC timeout after 30s"}
HTTP Status: 500
Frontend Behavior: Displayed old CarScoops sample data dated 12/27/2025
```

**Expected Behavior:**
- Show error message: "Analysis failed: Request timed out. Please try again."
- Provide "Retry" button
- Clear any old cached data
- Loading state should timeout after 2 minutes max

**Impact:** Users cannot tell if their analysis succeeded or failed

**Fix Location:** Frontend error handling in analysis submission logic

---

### 🔴 BUG-002: Server Returns 500 on Subsequent Requests

**Severity:** Critical
**Category:** Backend Stability

**Issue:**
After first successful analysis, subsequent analysis requests return HTTP 500 errors.

**Evidence:**
```
Request 1 (example.com): ✅ 200 OK (48s)
Request 2 (nytimes.com): ❌ 500 Internal Server Error
Request 3+: ❌ 500 Internal Server Error
```

**Root Cause:** Chrome processes not cleaning up properly (see PRODUCTION_TEST_RESULTS.md Priority 3)

**Impact:** Users can only analyze one site per page load

**Fix Required:** Backend - fix Chrome cleanup in spawning-chrome-client.ts:72

---

### 🔴 BUG-003: Sample Data Shows Stale Timestamp

**Severity:** Critical
**Category:** Data Quality / UX

**Issue:**
"Load Sample" button shows analysis from 4 days ago (12/27/2025) when clicked on 12/31/2025.

**Evidence:**
```
Today: December 31, 2025
Sample Data Timestamp: "Analyzed: 12/27/2025, 1:00:39 AM"
```

**Expected Behavior:**
- Sample should either:
  - Show "Sample Data" label (not a real analysis timestamp)
  - Or re-analyze the sample URL fresh when clicked

**Impact:** Misleading timestamp suggests data is old/stale

**Fix Options:**
1. Label as "Sample Data (not live)"
2. Re-fetch sample on button click
3. Update sample data regularly

---

## Major Issues (Should Fix)

### 🟡 BUG-004: Missing Favicon (404 Error)

**Severity:** Major
**Category:** Assets / Browser Console

**Issue:**
Browser console shows 404 error for missing favicon.

**Evidence:**
```
[ERROR] Failed to load resource: the server responded with a status of 404 ()
@ https://ad-stack-analyzer.onrender.com/favicon.ico
```

**Expected Behavior:**
Favicon should load successfully

**Impact:**
- Unprofessional browser tab appearance
- Console errors confuse debugging

**Fix:**
Add favicon.ico to public/ directory or update HTML <link rel="icon">

---

### 🟡 BUG-005: Prebid Timeout Shows "N/Ams"

**Severity:** Major
**Category:** Data Display / Typography

**Issue:**
Prebid timeout displays as "N/Ams" instead of "N/A" or proper value.

**Evidence from Screenshots:**
```
CarScoops Sample:
  Timeout: N/Ams

NYTimes Analysis:
  Timeout: 3000ms ✅ Correct
```

**Root Cause:**
- Likely concatenating "N/A" + "ms" when value is null/undefined
- Should check for null before appending "ms"

**Expected Behavior:**
- If timeout exists: "3000ms"
- If timeout is null/undefined: "N/A" (no "ms")

**Fix Location:** Prebid panel rendering component

---

### 🟡 BUG-006: No Visual Feedback for API Errors

**Severity:** Major
**Category:** Error Handling / UX

**Issue:**
When API returns an error, there's no error toast/alert/banner shown to user.

**Expected Behavior:**
- Red error banner at top: "Analysis failed: [error message]"
- Or error toast notification
- Maintain error state until user dismisses or retries

**Impact:**
Users don't know analysis failed (related to BUG-001)

**Fix:**
Add error state UI component with dismiss/retry actions

---

## Minor Issues (Nice to Fix)

### 🟢 BUG-007: Analyze Button Disabled on Initial Load

**Severity:** Minor
**Category:** UX

**Issue:**
"Analyze" button is disabled when page loads, even though a placeholder URL is shown.

**Current Behavior:**
```
Input field: "https://example.com/article" (placeholder)
Button: [Analyze] (disabled)
```

**Expected Behavior:**
- Either enable button with default URL
- Or clear the input field entirely

**Impact:**
Minor UX confusion - users might think button is broken

**Workaround:**
User must type in URL field to enable button

---

### 🟢 BUG-008: Mobile Layout Slightly Cramped

**Severity:** Minor
**Category:** Responsive Design

**Issue:**
On mobile viewport (375x667), some text appears slightly cramped in vendor cards.

**Observed:**
- Vendor names wrap awkwardly
- Chart legends overlap slightly
- Overall readable but not optimal

**Impact:**
Functional but not polished on mobile

**Recommendation:**
- Increase padding on mobile
- Adjust font sizes for smaller screens
- Test on real devices (iPhone, Android)

---

## Positive Findings ✅

### What Works Well:

1. **Desktop Layout:** Clean, professional, well-organized
2. **Charts Rendering:** Pie and bar charts display correctly
3. **Vendor Categorization:** Properly grouped and labeled
4. **Prebid/GAM Panels:** Expandable sections work smoothly
5. **Mobile Responsive:** Layout adapts (with minor issues above)
6. **Load Sample Feature:** Provides quick demo of functionality
7. **Color Scheme:** Cyan/dark theme is modern and readable
8. **Data Visualization:** Stats cards are clear and prominent

---

## Screenshots Reference

**Captured Screenshots:**
1. `frontend-initial-load.png` - Initial page load
2. `frontend-results-displayed.png` - Full analysis results (desktop)
3. `frontend-mobile-view.png` - Mobile responsive layout
4. `frontend-sample-data.png` - Sample data loaded

All screenshots saved to: `/Users/Dikshant/Desktop/Projects/.playwright-mcp/`

---

## Testing Summary

### Tested Features:
- ✅ Page load and initial render
- ✅ URL input and validation
- ✅ Device selection (desktop/mobile)
- ✅ Analyze button functionality
- ✅ Load Sample feature
- ✅ Results display (vendors, charts, stats)
- ✅ Prebid.js panel expansion
- ✅ GAM panel expansion and slot details
- ✅ Mobile responsive layout
- ⚠️ Error handling (found issues)
- ⚠️ API timeout handling (found issues)

### Browser Console Errors:
1. 404 - /favicon.ico (BUG-004)
2. 500 - /api/analyze on subsequent requests (BUG-002)

### Network Requests:
- POST to /api/analyze observed
- CORS working correctly
- Response times: 48s (example.com), timeout after 2min (nytimes.com)

---

## Recommendations

### Immediate Fixes (Before Production):
1. **BUG-001:** Add error UI for failed analyses
2. **BUG-002:** Fix backend Chrome cleanup (see PRODUCTION_TEST_RESULTS.md)
3. **BUG-003:** Update or relabel sample data timestamp

### Should Fix (Next Sprint):
4. **BUG-004:** Add favicon
5. **BUG-005:** Fix "N/Ams" display bug
6. **BUG-006:** Implement error toast/banner component

### Nice to Have (Future):
7. **BUG-007:** Improve initial button state UX
8. **BUG-008:** Polish mobile layout

---

## PRD Alignment Check

### 3.3 Interactive Dashboard Requirements:

| Feature | Status | Notes |
|---------|--------|-------|
| Overview Stats Cards | ✅ Working | Total vendors, SSPs, requests shown |
| Pie Chart | ✅ Working | Vendor distribution displayed |
| Bar Chart | ✅ Working | Category breakdown rendered |
| Prebid.js Panel | ✅ Working | Shows granularity, timeout, currency |
| GAM Panel | ✅ Working | Shows 5 ad slots with sizes |
| Deep Dives | ✅ Working | Expandable sections functional |

**Verdict:** All PRD v1.0 dashboard features are functional. Issues are UX/data quality, not core functionality.

---

## Next Steps

1. **Fix Critical Issues (BUG-001, BUG-002, BUG-003)**
   - Backend: Fix Chrome cleanup
   - Frontend: Add error handling UI
   - Update sample data handling

2. **Re-test After Fixes**
   - Run Playwright tests again
   - Verify 5+ sequential analyses work
   - Confirm error states display correctly

3. **User Acceptance Testing**
   - Test on real mobile devices
   - Get feedback on error messaging
   - Validate sample data UX

---

## Conclusion

The frontend is **visually polished and functional** for demos, but needs **critical error handling improvements** before production use. The main blocker is the backend stability issue (BUG-002) which causes all subsequent requests to fail.

**Status:** Ready for demos, NOT ready for production until critical bugs fixed.

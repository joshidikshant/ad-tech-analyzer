# QA Test Cases - Ad-Tech Analyzer Deployment

## Test Environment
- **Backend:** https://ad-tech-analyzer.onrender.com
- **Frontend:** https://ad-stack-analyzer.onrender.com
- **Date:** 2025-12-30

---

## Backend API Tests

### TC-001: Health Endpoint
**Endpoint:** `GET /health`
**Expected:** 200 OK with `{"status":"ok","timestamp":"..."}`

**Test Steps:**
```bash
curl -i https://ad-tech-analyzer.onrender.com/health
```

**Pass Criteria:**
- ✅ HTTP 200 status
- ✅ JSON response with status="ok"
- ✅ Valid timestamp

---

### TC-002: CORS Headers (Preflight)
**Endpoint:** `OPTIONS /api/analyze`
**Expected:** Proper CORS headers for frontend domain

**Test Steps:**
```bash
curl -i -X OPTIONS https://ad-tech-analyzer.onrender.com/api/analyze \
  -H "Origin: https://ad-stack-analyzer.onrender.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type"
```

**Pass Criteria:**
- ✅ HTTP 200/204 status
- ✅ Header: `Access-Control-Allow-Origin: https://ad-stack-analyzer.onrender.com`
- ✅ Header: `Access-Control-Allow-Methods` includes POST
- ✅ Header: `Access-Control-Allow-Headers` includes Content-Type

---

### TC-003: Analyze API - Valid Request
**Endpoint:** `POST /api/analyze`
**Expected:** 200 OK with analysis results

**Test Steps:**
```bash
curl -i -X POST https://ad-tech-analyzer.onrender.com/api/analyze \
  -H "Content-Type: application/json" \
  -H "Origin: https://ad-stack-analyzer.onrender.com" \
  -d '{
    "url": "https://www.example.com",
    "device": "desktop",
    "timeout": 30000
  }'
```

**Pass Criteria:**
- ✅ HTTP 200 status
- ✅ JSON response with `success: true`
- ✅ Contains `data.url`, `data.vendors`, `data.vendor_count`
- ✅ Response time < 60 seconds (cold start) or < 30 seconds (warm)

---

### TC-004: Analyze API - Missing URL
**Endpoint:** `POST /api/analyze`
**Expected:** 400 Bad Request

**Test Steps:**
```bash
curl -i -X POST https://ad-tech-analyzer.onrender.com/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"device": "desktop"}'
```

**Pass Criteria:**
- ✅ HTTP 400 status
- ✅ Error message indicates missing URL

---

### TC-005: Analyze API - Invalid URL
**Endpoint:** `POST /api/analyze`
**Expected:** 400 Bad Request or error response

**Test Steps:**
```bash
curl -i -X POST https://ad-tech-analyzer.onrender.com/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"url": "not-a-valid-url", "device": "desktop"}'
```

**Pass Criteria:**
- ✅ HTTP 400/500 status
- ✅ Error message indicates invalid URL

---

### TC-006: Analyze API - Real Ad-Tech Site (GeeksForGeeks)
**Endpoint:** `POST /api/analyze`
**Expected:** Detects vendors successfully

**Test Steps:**
```bash
curl -X POST https://ad-tech-analyzer.onrender.com/api/analyze \
  -H "Content-Type: application/json" \
  -H "Origin: https://ad-stack-analyzer.onrender.com" \
  -d '{
    "url": "https://www.geeksforgeeks.org/",
    "device": "desktop",
    "timeout": 30000
  }' | jq '.data | {vendor_count, vendors: .vendors[0:5]}'
```

**Pass Criteria:**
- ✅ HTTP 200 status
- ✅ `vendor_count` > 10
- ✅ Detects common vendors (Prebid, GAM, Criteo, etc.)
- ✅ `prebid.detected` = true
- ✅ `gam.detected` = true

---

### TC-007: Analyze API - Real Ad-Tech Site (CarScoops)
**Endpoint:** `POST /api/analyze`
**Expected:** Detects AdPushup managed service

**Test Steps:**
```bash
curl -X POST https://ad-tech-analyzer.onrender.com/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.carscoops.com/",
    "device": "desktop",
    "timeout": 30000
  }' | jq '.data | {vendor_count, managed_service, adpushup: .managed_services_detected.adpushup}'
```

**Pass Criteria:**
- ✅ HTTP 200 status
- ✅ `vendor_count` > 15
- ✅ `managed_services_detected.adpushup` = true
- ✅ GAM slots detected

---

## Frontend Tests

### TC-101: Frontend Loads
**URL:** https://ad-stack-analyzer.onrender.com
**Expected:** Page loads without errors

**Test Steps:**
1. Open https://ad-stack-analyzer.onrender.com in browser
2. Check console for errors

**Pass Criteria:**
- ✅ Page title: "Ad Tech Analyzer Dashboard"
- ✅ No console errors
- ✅ Input field visible
- ✅ "Analyze" button visible (disabled)
- ✅ "Load Sample" button visible

---

### TC-102: Sample Data Loads
**Action:** Click "Load Sample" button
**Expected:** Sample analysis displays

**Test Steps:**
1. Open frontend
2. Click "Load Sample" button
3. Verify results display

**Pass Criteria:**
- ✅ Results section appears
- ✅ Vendor count displayed
- ✅ Charts/visualizations render
- ✅ No errors in console

---

### TC-103: URL Input Validation
**Action:** Enter URL and check button state
**Expected:** Button enables when valid URL entered

**Test Steps:**
1. Input field starts empty
2. Type "invalid" → button stays disabled
3. Type "https://example.com" → button enables

**Pass Criteria:**
- ✅ Button disabled with no/invalid URL
- ✅ Button enabled with valid URL

---

### TC-104: Analyze Real Site (Frontend Integration)
**Action:** Analyze GeeksForGeeks via frontend
**Expected:** Analysis completes successfully

**Test Steps:**
1. Enter: `https://www.geeksforgeeks.org/`
2. Select: Desktop
3. Click: "Analyze"
4. Wait for results

**Pass Criteria:**
- ✅ Loading indicator appears
- ✅ Results appear within 60 seconds
- ✅ Vendor count > 10 displayed
- ✅ Prebid/GAM sections show data
- ✅ No "Analysis Failed" error
- ✅ No CORS errors in console

---

### TC-105: Mobile Device Selection
**Action:** Analyze with mobile device
**Expected:** Analysis works with mobile viewport

**Test Steps:**
1. Enter: `https://www.example.com/`
2. Select: Mobile
3. Click: "Analyze"

**Pass Criteria:**
- ✅ Analysis completes
- ✅ `device: "mobile"` in response
- ✅ Results display correctly

---

## Integration Tests

### TC-201: Cold Start (First Request)
**Scenario:** Backend asleep, first request wakes it
**Expected:** Slow but successful response

**Test Steps:**
1. Wait 20 minutes (backend sleeps)
2. Make request via frontend or curl
3. Measure response time

**Pass Criteria:**
- ✅ Response received (not timeout)
- ✅ Response time: 30-90 seconds acceptable
- ✅ Valid analysis data returned

---

### TC-202: Warm Request (Follow-up)
**Scenario:** Backend already awake
**Expected:** Fast response

**Test Steps:**
1. Make initial request (TC-201)
2. Immediately make another request
3. Measure response time

**Pass Criteria:**
- ✅ Response time: < 35 seconds
- ✅ Valid analysis data returned

---

### TC-203: Concurrent Requests
**Scenario:** Multiple users analyzing simultaneously
**Expected:** All requests succeed

**Test Steps:**
```bash
# Start 3 requests in parallel
curl -X POST https://ad-tech-analyzer.onrender.com/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "device": "desktop"}' &
curl -X POST https://ad-tech-analyzer.onrender.com/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"url": "https://geeksforgeeks.org", "device": "desktop"}' &
curl -X POST https://ad-tech-analyzer.onrender.com/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"url": "https://carscoops.com", "device": "desktop"}' &
wait
```

**Pass Criteria:**
- ✅ All 3 requests complete successfully
- ✅ No 502/503 errors
- ✅ Correct results for each URL

---

## Error Handling Tests

### TC-301: Timeout Handling
**Scenario:** Very slow website
**Expected:** Graceful timeout

**Test Steps:**
```bash
curl -X POST https://ad-tech-analyzer.onrender.com/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"url": "https://httpstat.us/200?sleep=40000", "device": "desktop", "timeout": 5000}'
```

**Pass Criteria:**
- ✅ Returns error response (not hang)
- ✅ Error message mentions timeout
- ✅ Response time ≈ timeout value

---

### TC-302: Network Error Handling
**Scenario:** Non-existent domain
**Expected:** Appropriate error message

**Test Steps:**
```bash
curl -X POST https://ad-tech-analyzer.onrender.com/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"url": "https://this-domain-definitely-does-not-exist-12345.com", "device": "desktop"}'
```

**Pass Criteria:**
- ✅ Returns error response
- ✅ Error message indicates navigation failure
- ✅ No server crash

---

## Performance Tests

### TC-401: Large Site Analysis
**URL:** https://www.nytimes.com (many ads)
**Expected:** Handles high request volume

**Pass Criteria:**
- ✅ Analysis completes
- ✅ Response time < 60 seconds
- ✅ Detects 20+ vendors

---

### TC-402: Memory Stability
**Scenario:** 10 consecutive analyses
**Expected:** No memory leaks

**Test Steps:**
Run 10 analyses back-to-back, monitor response times

**Pass Criteria:**
- ✅ All requests succeed
- ✅ Response times don't degrade significantly
- ✅ No 502/503 errors

---

## Security Tests

### TC-501: CORS Protection
**Scenario:** Request from unauthorized origin
**Expected:** CORS blocks it

**Test Steps:**
```bash
curl -X POST https://ad-tech-analyzer.onrender.com/api/analyze \
  -H "Origin: https://evil-site.com" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

**Pass Criteria:**
- ✅ Request reaches server (no network error)
- ✅ Browser would block response (CORS)
- ✅ No `Access-Control-Allow-Origin` header in response

---

### TC-502: XSS Protection
**Scenario:** Inject script in URL parameter
**Expected:** Safe handling

**Test Steps:**
```bash
curl -X POST https://ad-tech-analyzer.onrender.com/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/<script>alert(1)</script>"}'
```

**Pass Criteria:**
- ✅ URL validation rejects malicious input
- ✅ Or safely escapes output
- ✅ No script execution

---

## Test Summary Template

| Test ID | Test Name | Status | Notes |
|---------|-----------|--------|-------|
| TC-001 | Health Endpoint | ⏳ | |
| TC-002 | CORS Headers | ⏳ | |
| TC-003 | Analyze API Valid | ⏳ | |
| TC-006 | GeeksForGeeks Analysis | ⏳ | |
| TC-007 | CarScoops Analysis | ⏳ | |
| TC-104 | Frontend Integration | ⏳ | |
| ... | ... | ... | |

**Legend:**
- ⏳ Pending
- ✅ Pass
- ❌ Fail
- ⚠️ Partial/Warning

# Ad Tech Analyzer - Test Plan v1.0

## Test Environment
- **Frontend:** https://ad-stack-analyzer.onrender.com
- **Backend:** https://ad-tech-analyzer-717920911778.asia-south1.run.app
- **Date:** 2025-12-31
- **Version:** v1.0 Production

---

## Test Categories

### 1. API Endpoint Tests

#### TC-001: Health Check Endpoint
**Requirement:** API should respond to health checks
**Steps:**
1. Send GET request to `/health`
2. Verify 200 status code
3. Verify response contains health status

**Expected Result:** Returns 200 OK with health status

#### TC-002: CORS Configuration
**Requirement:** API should allow requests from frontend domain
**Steps:**
1. Send OPTIONS request with Origin header
2. Verify CORS headers are present
3. Verify frontend domain is allowed

**Expected Result:** Proper CORS headers returned

#### TC-003: Analyze Endpoint - Valid URL
**Requirement:** API should analyze valid website URLs
**Steps:**
1. POST to `/api/analyze` with valid URL (https://www.nytimes.com)
2. Set device: desktop
3. Set timeout: 30000ms
4. Verify response contains vendor data

**Expected Result:**
- 200 status code
- JSON response with vendors array
- Detected vendors > 0

#### TC-004: Analyze Endpoint - Invalid URL
**Requirement:** API should handle invalid URLs gracefully
**Steps:**
1. POST to `/api/analyze` with invalid URL
2. Verify error response

**Expected Result:**
- Appropriate error status code (400/422)
- Error message explaining the issue

#### TC-005: Analyze Endpoint - Timeout Handling
**Requirement:** API should handle long-running analyses
**Steps:**
1. POST to `/api/analyze` with complex site
2. Monitor response time
3. Verify timeout handling

**Expected Result:**
- Response within configured timeout
- Graceful timeout error if exceeded

---

### 2. Vendor Detection Tests

#### TC-101: SSP Detection
**Requirement:** Detect Supply-Side Platforms (3.1 - Detection)
**Test URL:** https://www.nytimes.com
**Steps:**
1. Analyze the test URL
2. Check vendors array for SSP category
3. Verify known SSPs are detected (e.g., Pubmatic, OpenX, Rubicon)

**Expected Result:**
- Multiple SSPs detected
- Each SSP has correct category classification

#### TC-102: Ad Server Detection
**Requirement:** Detect ad server vendors
**Test URL:** https://www.nytimes.com
**Steps:**
1. Analyze the test URL
2. Check for Google Ad Manager (GAM) detection
3. Verify ad server category

**Expected Result:**
- GAM detected
- Category: Ad Server

#### TC-103: Identity Provider Detection
**Requirement:** Detect identity solution providers
**Test URL:** https://www.nytimes.com
**Steps:**
1. Analyze the test URL
2. Check for ID providers (e.g., LiveRamp, ID5)
3. Verify identity category

**Expected Result:**
- At least one ID provider detected
- Correct category assignment

#### TC-104: Managed Service Detection
**Requirement:** Detect managed wrapper services
**Test URL:** https://www.nytimes.com
**Steps:**
1. Analyze the test URL
2. Check for managed services
3. Verify managed service flag

**Expected Result:**
- Managed service detected if present
- Correct identification

---

### 3. Network Analysis Tests

#### TC-201: Network Request Capture
**Requirement:** Capture all network requests during page load (3.2)
**Steps:**
1. Analyze a test URL
2. Verify networkRequests array is populated
3. Check for ad-related requests

**Expected Result:**
- networkRequests array contains > 10 requests
- Includes ad-related domains

#### TC-202: Request Classification
**Requirement:** Classify requests by type
**Steps:**
1. Analyze test URL
2. Check request classification (script, xhr, image, etc.)
3. Verify accuracy

**Expected Result:**
- Requests properly classified
- resourceType field populated

#### TC-203: Failed Request Handling
**Requirement:** Handle failed network requests
**Steps:**
1. Analyze site with some failed requests
2. Verify failed requests are captured
3. Check status codes

**Expected Result:**
- Failed requests included in data
- Status codes recorded correctly

---

### 4. Runtime Analysis Tests

#### TC-301: Prebid.js Detection
**Requirement:** Detect and extract Prebid configuration (3.2, 3.3)
**Test URL:** https://www.nytimes.com (or known Prebid site)
**Steps:**
1. Analyze test URL
2. Check prebid object in response
3. Verify timeout, priceGranularity, currency

**Expected Result:**
- prebid.detected = true
- timeout value present
- priceGranularity configuration captured

#### TC-302: Google Ad Manager (GAM) Detection
**Requirement:** Detect and extract GAM configuration (3.2, 3.3)
**Test URL:** https://www.nytimes.com
**Steps:**
1. Analyze test URL
2. Check gam object in response
3. Verify ad slots, sizes, targeting

**Expected Result:**
- gam.detected = true
- Ad slots array populated
- Sizes and targeting extracted

#### TC-303: Runtime Bridge Injection
**Requirement:** Successfully inject bridge script (3.2)
**Steps:**
1. Analyze test URL
2. Verify bridge script executed
3. Check for runtime data capture

**Expected Result:**
- Runtime data successfully captured
- No injection errors

---

### 5. Data Quality Tests

#### TC-401: Vendor Count Accuracy
**Requirement:** Accurate vendor counting
**Steps:**
1. Analyze test URL
2. Count unique vendors
3. Verify no duplicates
4. Cross-reference with network data

**Expected Result:**
- Vendor count matches unique vendors
- No duplicate entries

#### TC-402: Category Distribution
**Requirement:** Vendors properly categorized
**Steps:**
1. Analyze test URL
2. Check category distribution
3. Verify all vendors have categories

**Expected Result:**
- All vendors assigned to categories
- Categories align with PRD definitions

#### TC-403: Data Completeness
**Requirement:** All required fields present
**Steps:**
1. Analyze test URL
2. Verify response schema
3. Check for null/undefined critical fields

**Expected Result:**
- All critical fields populated
- Schema matches expected format

---

### 6. Frontend Dashboard Tests

#### TC-501: Dashboard Load
**Requirement:** Dashboard loads successfully
**Steps:**
1. Navigate to https://ad-stack-analyzer.onrender.com
2. Verify page loads without errors
3. Check UI elements render

**Expected Result:**
- Page loads < 3 seconds
- No console errors
- UI fully rendered

#### TC-502: URL Input Validation
**Requirement:** Validate user input
**Steps:**
1. Enter invalid URL
2. Attempt to submit
3. Verify validation

**Expected Result:**
- Validation error displayed
- Analysis not triggered

#### TC-503: Analysis Trigger
**Requirement:** Trigger analysis from UI
**Steps:**
1. Enter valid URL: https://www.nytimes.com
2. Click "Analyze" button
3. Monitor loading state

**Expected Result:**
- Loading indicator appears
- API request sent
- Results displayed

#### TC-504: Stats Cards Display
**Requirement:** Overview stats displayed (3.3)
**Steps:**
1. Complete analysis
2. Verify stats cards render
3. Check vendor count, SSP count, etc.

**Expected Result:**
- Total Vendors count displayed
- SSPs count displayed
- Managed Service status shown
- Numbers match API data

#### TC-505: Vendor Charts Display
**Requirement:** Pie and Bar charts render (3.3)
**Steps:**
1. Complete analysis
2. Verify charts render
3. Check data accuracy

**Expected Result:**
- Pie chart shows vendor distribution
- Bar chart shows category breakdown
- Chart data matches vendor data

#### TC-506: Prebid Panel Display
**Requirement:** Prebid.js panel shows configuration (3.3)
**Steps:**
1. Analyze Prebid-enabled site
2. Navigate to Prebid panel
3. Verify timeout, price granularity, currency displayed

**Expected Result:**
- Panel shows "Detected" status
- Timeout value displayed
- Price granularity shown
- Currency shown

#### TC-507: GAM Panel Display
**Requirement:** GAM panel shows ad slots (3.3)
**Steps:**
1. Analyze site with GAM
2. Navigate to GAM panel
3. Verify ad slots, sizes, targeting

**Expected Result:**
- Panel shows "Detected" status
- Ad slots listed
- Sizes displayed
- Targeting keys shown

#### TC-508: Error Handling in UI
**Requirement:** Graceful error handling
**Steps:**
1. Trigger analysis failure (invalid URL, timeout, etc.)
2. Verify error message displayed
3. Check UI remains functional

**Expected Result:**
- User-friendly error message
- Ability to retry
- No UI crash

---

### 7. Performance Tests

#### TC-601: API Response Time
**Requirement:** Acceptable response times
**Steps:**
1. Analyze standard website
2. Measure response time
3. Verify within acceptable range

**Expected Result:**
- Response time < 60 seconds for standard site
- Timeout at 120 seconds

#### TC-602: Chrome Process Management
**Requirement:** Proper Chrome lifecycle (3.2)
**Steps:**
1. Trigger multiple analyses
2. Verify Chrome processes cleanup
3. Check for zombie processes

**Expected Result:**
- No zombie Chrome processes
- Proper cleanup after analysis

#### TC-603: Concurrent Request Handling
**Requirement:** Handle multiple requests
**Steps:**
1. Send multiple concurrent analysis requests
2. Verify all complete successfully
3. Check for resource exhaustion

**Expected Result:**
- All requests complete
- No server crashes
- Proper queueing

---

### 8. Cross-Browser & Device Tests

#### TC-701: Mobile Device Analysis
**Requirement:** Analyze sites in mobile mode
**Steps:**
1. POST to /api/analyze with device: "mobile"
2. Verify mobile user agent used
3. Check vendor detection accuracy

**Expected Result:**
- Mobile viewport used
- Vendors detected correctly
- Mobile-specific ads captured

#### TC-702: Desktop Device Analysis
**Requirement:** Analyze sites in desktop mode
**Steps:**
1. POST to /api/analyze with device: "desktop"
2. Verify desktop user agent
3. Check detection accuracy

**Expected Result:**
- Desktop viewport used
- Vendors detected correctly

---

### 9. Security Tests

#### TC-801: API Authentication
**Requirement:** No sensitive data exposed
**Steps:**
1. Attempt to access API without proper headers
2. Check for exposed credentials
3. Verify CORS restrictions

**Expected Result:**
- No credentials in responses
- CORS properly configured
- No XSS vulnerabilities

#### TC-802: Input Sanitization
**Requirement:** Protect against injection attacks
**Steps:**
1. Send malicious URL payloads
2. Verify input sanitization
3. Check for code injection

**Expected Result:**
- Malicious input rejected
- No code execution
- Proper error handling

---

### 10. Integration Tests

#### TC-901: End-to-End Analysis Flow
**Requirement:** Complete analysis workflow
**Steps:**
1. Open frontend
2. Enter URL: https://www.nytimes.com
3. Submit analysis
4. Wait for results
5. Verify all dashboard sections populated

**Expected Result:**
- Analysis completes successfully
- All dashboard sections show data
- No errors in console

#### TC-902: Frontend-Backend Integration
**Requirement:** Proper API communication
**Steps:**
1. Monitor network requests from frontend
2. Verify API endpoint URLs
3. Check request/response format

**Expected Result:**
- Correct API URL used
- Request format matches API spec
- Response parsed correctly

---

## Test Data

### Test URLs

1. **Standard Site:** https://www.nytimes.com
   - Expected: 10+ vendors, Prebid, GAM, multiple SSPs

2. **Simple Site:** https://www.example.com
   - Expected: Minimal ad tech stack

3. **Complex Site:** https://www.cnn.com
   - Expected: Complex stack, managed services

4. **E-commerce:** https://www.amazon.com
   - Expected: Different vendor mix

---

## Success Criteria

### Critical (Must Pass)
- [ ] API health check functional
- [ ] Vendor detection working (min 5 vendors on NYTimes)
- [ ] Frontend loads and displays results
- [ ] No server crashes
- [ ] CORS configured correctly

### Important (Should Pass)
- [ ] Prebid detection working
- [ ] GAM detection working
- [ ] Charts render correctly
- [ ] Response time < 60s
- [ ] Error handling graceful

### Nice to Have
- [ ] Mobile device analysis
- [ ] Concurrent requests handled
- [ ] All vendor categories detected

---

## Test Execution Log

**Execution Date:** 2025-12-31
**Executed By:** Claude Sonnet 4.5
**Environment:** Production (GCP Cloud Run)

Results will be documented below...

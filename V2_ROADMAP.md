# Ad Tech Analyzer v2 Roadmap

## Feature Comparison: Ad Tech Analyzer vs Competitors

### Current State Matrix

| Feature | Professor Prebid | HTL Debug | PubGuru | **Our Tool** |
|---------|-----------------|-----------|---------|--------------|
| **VENDOR DETECTION** |
| Prebid.js detection | ✅ Deep | ✅ | ✅ | ✅ |
| GAM/GPT detection | ✅ | ✅ | ✅ | ✅ |
| Amazon TAM | ❌ | ✅ | ❌ | ⚠️ Partial (network) |
| Universal vendor classification | ❌ | ❌ | ❌ | ✅ |
| Custom wrapper detection (`mmPrebid`, etc.) | ✅ | ✅ | ✅ | ❌ Missing |
| Managed service detection | ❌ | ❌ | ❌ | ✅ |
| **AUCTION DATA** |
| Auction timeline visualization | ✅ | ❌ | ❌ | ❌ |
| Bid comparison table | ✅ | ✅ | ✅ | ❌ |
| Bid request/response payloads | ✅ | ✅ | ✅ | ❌ |
| Win/no-bid/timeout breakdown | ✅ | ✅ | ✅ | ❌ |
| CPM override testing | ✅ | ❌ | ❌ | ❌ |
| **GAM DETAILS** |
| Slot listing | ✅ | ✅ | ✅ | ✅ |
| Page-level targeting | ✅ | ✅ | ✅ | ✅ |
| Slot-level targeting | ✅ | ✅ | ✅ | ❌ |
| GAM Event Log analysis | ✅ | ❌ | ✅ | ❌ |
| "Fetch Before Refresh" detection | ✅ | ❌ | ✅ | ❌ |
| Direct GAM line item linking | ✅ | ✅ | ❌ | ❌ |
| Size mapping | ❌ | ✅ | ❌ | ❌ |
| **COMPLIANCE** |
| CMP detection | Basic | ✅ CCPA/GDPR/GPP | ✅ | ❌ |
| TCF string display | ✅ | ✅ | ✅ | ❌ |
| ads.txt validation | ❌ | ❌ | ✅ | ❌ |
| **IDENTITY** |
| User ID module listing | ✅ | ✅ | ❌ | ⚠️ Basic (network) |
| ID sync status | ✅ | ✅ | ❌ | ❌ |
| Identity graph visualization | ❌ | ❌ | ❌ | ❌ |
| **UI/UX** |
| Chrome extension | ✅ | ✅ | ✅ | ❌ |
| Web dashboard | ❌ | ❌ | ❌ | ✅ |
| On-page overlay | ✅ | ❌ | ❌ | ❌ |
| **ADVANCED (OUR ROADMAP)** |
| HTTP waterfall | ❌ | ❌ | ❌ | ❌ |
| Performance attribution | ❌ | ❌ | ❌ | ❌ |
| Bid shading detection | ❌ | ❌ | ❌ | ❌ |
| Floor analysis | ❌ | ❌ | ❌ | ❌ |
| Historical tracking | ❌ | ❌ | ❌ | ❌ |
| MCP/API interface | ❌ | ❌ | ❌ | ✅ |

---

## Prioritized Feature Gap

### **Tier 1: Must Have (Parity + Quick Wins)**

| Priority | Feature | Why | Effort | Status |
|----------|---------|-----|--------|--------|
| **P1** | Bid details table - Show bidders with CPM, status (win/no-bid/timeout) | Every competitor has this | Medium | ⬜ |
| **P2** | CMP/Consent detection - CCPA, GDPR, GPP, TCF string | Privacy is critical | Low | ⬜ |
| **P3** | Custom Prebid wrapper support - Detect `_pbjsGlobals` array | Many sites use custom wrappers | Low | ⬜ |
| **P4** | Auction timing - Show bidder response times | Key for debugging | Medium | ⬜ |

### **Tier 2: Differentiation (What Competitors Lack)**

| Priority | Feature | Why | Effort | Status |
|----------|---------|-----|--------|--------|
| **P5** | HTTP Waterfall - Gantt-style request timeline | No competitor has this | High | ⬜ |
| **P6** | Performance attribution - Lighthouse + vendor impact | Unique value prop | High | ⬜ |
| **P7** | "Fetch Before Refresh" detection - GAM event log | High value for ops | Medium | ⬜ |
| **P8** | Refresh pattern detection - Time vs viewability | Nobody detects this | Medium | ⬜ |

### **Tier 3: Advanced (Market Leadership)**

| Priority | Feature | Why | Effort | Status |
|----------|---------|-----|--------|--------|
| **P9** | Bid shading detection - Detect `cpm *= 0.95` | Our unique discovery | High | ⬜ |
| **P10** | Identity sync graph - Visual node graph | Nobody has this | High | ⬜ |
| **P11** | Historical tracking - SQLite persistence | Track changes over time | Medium | ⬜ |
| **P12** | Floor analysis - `floors.dev` API tracing | Advanced yield insight | High | ⬜ |

---

## Sprint Plan

### Sprint 1: Parity (Week 1-2)
- [ ] P1: Bid details table with CPM, status, response time
- [ ] P2: CMP detection (`__tcfapi`, `__uspapi`, `__gpp`)
- [ ] P3: Support `window._pbjsGlobals` for custom wrappers

### Sprint 2: Visualization (Week 3-4)
- [ ] P5: HTTP waterfall timeline
- [ ] P4: Auction timeline visualization

### Sprint 3: Performance (Week 5-6)
- [ ] P6: Lighthouse integration
- [ ] Per-vendor CLS/LCP attribution
- [ ] P7: GAM Event Log analysis

### Sprint 4: Intelligence (Week 7-8)
- [ ] P8: Refresh pattern detection
- [ ] P9: Bid shading detection
- [ ] P10: Identity sync graph

---

## Technical Implementation Notes

### P1: Bid Details Table
**Data Source:** `pbjs.getBidResponses()`, `pbjs.getAllWinningBids()`, `pbjs.getNoBids()`
**UI:** Sortable table with columns: Bidder, Ad Unit, CPM, Status, Response Time

### P2: CMP Detection
**Check for:**
- `window.__tcfapi` (TCF v2)
- `window.__uspapi` (CCPA)
- `window.__gpp` (GPP)
- Extract consent strings and decode

### P3: Custom Wrapper Support
**Logic:** Check `window._pbjsGlobals` array, iterate and extract from each instance
**Example:** `['pbjs', 'mmPrebid', 'voltaxPlayerPrebid']`

### P5: HTTP Waterfall
**Data:** Network requests with timestamps
**Visualization:** Gantt chart showing request start/end times, grouped by vendor

### P7: GAM Event Log
**Source:** `googletag.getEventLog().getAllEvents()`
**Detect:** "Fetch Before Refresh", "Fetch Before Key-Value" race conditions

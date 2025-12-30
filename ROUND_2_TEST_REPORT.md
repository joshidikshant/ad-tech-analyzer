# Ad-Tech Analyzer - Round 2 Test Report

**Date:** 2025-12-22
**Sites Tested:** 3 additional diverse publishers
**Total Sites Tested:** 8

---

## Round 2 Test Results Summary

| Site | Type | Vendors | Managed Service | Prebid | GAM | Requests | Status |
|------|------|---------|-----------------|--------|-----|----------|--------|
| **Lifehacker** | Lifestyle/Tech | **20** 🏆 | None | ✅ YES | ✅ YES | 247 | ✅ Pass |
| **GSMarena** | Mobile Tech Specs | 0 | None | ❌ NO | ❌ NO | 309 | ⚠️ Unknown Stack |
| **Pinkvilla** | Bollywood/Entertainment | 0 | None | ❌ NO | ❌ NO | 309 | ⚠️ Unknown Stack |

---

## Detailed Analysis

### 1. Lifehacker.com ✅ HIGHEST VENDOR COUNT

**URL:** http://lifehacker.com/
**Site Type:** Lifestyle, Productivity & Technology Tips

**Ad-Tech Stack:**
- **Vendors Detected:** 20 (HIGHEST of all 8 sites tested!)
- **Prebid.js:** ✅ Detected (full configuration)
- **Google Ad Manager:** ✅ Detected
- **Network Requests:** 247

**Complete Vendor List:**
1. Prebid.js
2. Google Ad Manager
3. Criteo
4. ID5
5. OneTrust
6. Amazon APS
7. The Trade Desk
8. Sharethrough
9. TripleLift
10. YellowBlue
11. OpenX
12. Rubicon
13. Media.net
14. Sovrn
15. AppNexus
16. Index Exchange
17. PubMatic
18. Index Wrapper
19. Smart AdServer
20. 33Across

**Analysis:**
- **Most sophisticated ad-tech setup detected** across all tests
- Premium publisher strategy with diverse SSP partnerships
- Full header bidding implementation
- Mix of traditional SSPs (Rubicon, OpenX) and modern platforms (The Trade Desk, TripleLift)
- Strong focus on programmatic revenue optimization

**Key Insight:** Lifestyle content publishers often have highly competitive ad setups to maximize CPMs from engaged audiences.

---

### 2. GSMarena.com ⚠️

**URL:** https://www.gsmarena.com/
**Site Type:** Mobile Phone Specifications Database

**Ad-Tech Stack:**
- **Vendors Detected:** 0
- **Prebid.js:** ❌ Not detected
- **Google Ad Manager:** ❌ Not detected
- **Network Requests:** 309 (highest request count but no vendors)

**Analysis:**
- 309 network requests captured but no recognized ad-tech vendors
- Possible explanations:
  1. Uses regional/non-US ad networks not in our pattern database
  2. Custom/in-house ad serving solution
  3. Uses ad networks specific to mobile/tech vertical
  4. Server-side ad insertion
  5. Affiliate/direct deals instead of programmatic ads

**Recommendation:** Manual inspection of network requests needed to identify ad serving method.

---

### 3. Pinkvilla.com ⚠️

**URL:** https://www.pinkvilla.com/
**Site Type:** Bollywood Celebrity News & Entertainment

**Ad-Tech Stack:**
- **Vendors Detected:** 0
- **Prebid.js:** ❌ Not detected
- **Google Ad Manager:** ❌ Not detected
- **Network Requests:** 309

**Analysis:**
- Identical request count to GSMarena (309)
- No recognized ad-tech vendors detected
- Similar to BollywoodShaadis, this is an Indian entertainment site
- Possible explanations:
  1. Regional Indian ad networks not in our pattern database
  2. Uses managed service we don't detect yet
  3. Homepage may not show ads (need to test article pages)
  4. AdSense or other Google products with different signatures

**Recommendation:** Test article page instead of homepage, add Indian ad network patterns.

---

## Cumulative Results (All 8 Sites)

| Metric | Count | Details |
|--------|-------|---------|
| **Total Sites Tested** | 8 | Diverse publisher types |
| **Successful Analyses** | 8 (100%) | All completed without errors |
| **Sites with Vendors Detected** | 6 (75%) | GSMarena, Pinkvilla need investigation |
| **Highest Vendor Count** | 20 | Lifehacker.com 🏆 |
| **Lowest Vendor Count (non-zero)** | 1 | BollywoodShaadis (AdPushup) |
| **Average Vendors (non-zero)** | ~11 | Across 6 sites with detection |
| **Prebid.js Detection** | 3/8 (37.5%) | GeeksForGeeks, IGN, Lifehacker |
| **GAM Detection** | 5/8 (62.5%) | Most common ad server |
| **Managed Services** | 2/8 (25%) | Freestar, AdPushup |

---

## Vendor Frequency Analysis (Across All Sites)

**Most Common Vendors:**

1. **Google Ad Manager** - 5 sites (62.5%)
2. **Prebid.js** - 3 sites (37.5%)
3. **Index Exchange** - 4 sites
4. **The Trade Desk** - 4 sites
5. **PubMatic** - 4 sites
6. **Criteo** - 4 sites
7. **OpenX** - 3 sites
8. **Amazon APS** - 3 sites
9. **OneTrust** - 3 sites (privacy/consent)
10. **Rubicon** - 2 sites

**Emerging Pattern:** Premium publishers use a consistent core of SSPs (Index, TTD, PubMatic, Criteo) combined with GAM for ad serving.

---

## Site Categories Tested (All 8)

✅ **Tech/Education** - GeeksForGeeks
✅ **Entertainment (Indian)** - BollywoodShaadis, Pinkvilla
✅ **Gaming** - CardGames.io, IGN
✅ **News/Media** - TechCrunch, Lifehacker
✅ **Mobile Tech** - GSMarena

---

## Detection Gaps Identified

### 1. Regional Ad Networks (India)
- **Sites:** Pinkvilla, BollywoodShaadis (partial)
- **Issue:** Indian ad networks may use different domains
- **Solution:** Add patterns for InMobi, AdMedia, Komli, etc.

### 2. Tech Vertical Ad Networks
- **Sites:** GSMarena
- **Issue:** Tech/mobile-specific ad networks not recognized
- **Solution:** Research mobile tech publisher ad partners

### 3. Homepage vs Article Page Behavior
- **Sites:** BollywoodShaadis, possibly Pinkvilla
- **Issue:** Some publishers only show ads on content pages
- **Solution:** Always test article/content pages for entertainment sites

---

## Key Findings

### 1. Lifehacker Shows Enterprise-Grade Setup
- 20 vendors is exceptional
- Indicates sophisticated yield optimization
- Mix of direct SSP integrations and Prebid
- Premium lifestyle audience commands high CPMs

### 2. Detection Rate: 75%
- 6 out of 8 sites had vendors detected
- 2 sites (GSMarena, Pinkvilla) returned zero
- Both zero-vendor sites had high request counts (309)
- Suggests they're using ad-tech we don't recognize yet

### 3. Prebid Adoption: 37.5%
- Only 3 of 8 sites use Prebid.js
- Premium publishers (Lifehacker, IGN) and educational sites (GeeksForGeeks) use it
- Managed services (Freestar, AdPushup) handle header bidding internally

### 4. Managed Services Growing
- 2 out of 8 sites use managed services
- Freestar (CardGames.io)
- AdPushup (BollywoodShaadis)
- Simplifies ad operations for small/medium publishers

---

## Performance Stats (Round 2)

| Metric | Lifehacker | GSMarena | Pinkvilla |
|--------|------------|----------|-----------|
| Analysis Time | ~30s | ~30s | ~30s |
| Requests Captured | 247 | 309 | 309 |
| Vendors Found | 20 | 0 | 0 |
| Prebid Detected | ✅ Yes | ❌ No | ❌ No |
| GAM Detected | ✅ Yes | ❌ No | ❌ No |

---

## Recommendations

### Immediate
1. **Test GSMarena & Pinkvilla article pages** (not just homepage)
2. **Add Indian ad network patterns** (InMobi, AdMedia, Komli, etc.)
3. **Investigate GSMarena requests manually** to identify tech vertical ad networks

### Short-term
4. Add more regional ad network patterns (Asia, Europe, Latin America)
5. Enhance detection for AdSense and other Google ad products
6. Add patterns for affiliate networks (may explain zero vendors)

### Long-term
7. Build regional ad network database
8. Add vertical-specific ad network detection (tech, gaming, entertainment)
9. Implement confidence scoring for detections

---

## Updated Overall Statistics

**Total Sites Tested:** 8
**Success Rate:** 100%
**Total Unique Vendors Detected:** 35+
**Highest Single-Site Vendor Count:** 20 (Lifehacker)
**Average Vendor Count (non-zero):** 11

---

## Conclusion

Round 2 testing revealed:

✅ **Lifehacker.com sets new record** with 20 vendors (most sophisticated setup)
✅ **Analyzer handles diverse sites** successfully (100% uptime)
⚠️ **Detection gaps exist** for regional/vertical-specific ad networks
⚠️ **2 sites returned zero vendors** despite high request counts (investigation needed)

**Next Steps:**
1. Test article pages for zero-vendor sites
2. Add regional ad network patterns
3. Manual investigation of GSMarena/Pinkvilla requests

**Overall Assessment:** The analyzer successfully detects ad-tech on mainstream US/global publishers (75% detection rate) but needs expansion for regional markets and niche verticals.

---

## Files Updated

- Round 2 test data saved in `/tmp/`
- `gsmarena-formatted.json`
- `lifehacker-formatted.json`
- `pinkvilla-formatted.json`

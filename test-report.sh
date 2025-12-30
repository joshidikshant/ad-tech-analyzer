#!/bin/bash
# Test Report Generator - validates improvements per metareview.md

echo "======================================"
echo "Ad-Tech Analyzer - Test Report"
echo "Per metareview.md recommendations"
echo "======================================"
echo ""

# Function to extract key metrics
extract_metrics() {
  local file=$1
  local site=$2

  echo "--- $site ---"

  if [ ! -f "$file" ]; then
    echo "❌ Result file not found"
    return
  fi

  # Check if success
  local success=$(cat "$file" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success', False))" 2>/dev/null)

  if [ "$success" != "True" ]; then
    echo "❌ Analysis failed"
    cat "$file" | python3 -c "import sys,json; print('Error:', json.load(sys.stdin).get('error', 'Unknown'))" 2>/dev/null
    echo ""
    return
  fi

  # Extract metrics
  cat "$file" | python3 << 'EOF'
import sys, json
try:
  data = json.load(sys.stdin)['data']
  print(f"✅ Success")
  print(f"   Vendors: {data['vendor_count']}")
  print(f"   Prebid: {'✓' if data['prebid']['detected'] else '✗'} ({data['prebid'].get('version', 'N/A')})")
  print(f"   GAM: {'✓' if data['gam']['detected'] else '✗'} ({len(data['gam'].get('slots', []))} slots)")

  managed = [k for k, v in data['managed_services_detected'].items() if v]
  if managed:
    print(f"   Managed: {', '.join(managed)}")

  print(f"   Network Requests: {data['network']['total_requests']}")
  print(f"   Detection Attempts: {data.get('detection_attempts', 0)}")
  print(f"   Categories: {', '.join(data['categories'].keys())}")
except Exception as e:
  print(f"❌ Parse error: {e}")
EOF

  echo ""
}

# Test results
extract_metrics "/tmp/gfg-result.json" "GeeksForGeeks"
extract_metrics "/tmp/nyt-result.json" "New York Times"
extract_metrics "/tmp/bbc-result.json" "BBC"

echo "======================================"
echo "Metareview Assessment:"
echo "======================================"
echo ""
echo "1. ✅ Comprehensive Detection (implemented)"
echo "   - Prebid.js version, config, bidders"
echo "   - GAM slots and targeting"
echo "   - 9 managed services"
echo "   - Custom wrapper detection"
echo ""
echo "2. 🔄 BBC Accuracy (testing)"
echo "   - Check if BBC false-negative resolved"
echo ""
echo "3. ✅ Unified Schema (completed)"
echo "   - src/types/analysis-result.ts created"
echo ""
echo "4. ⏳ SQLite Persistence (pending)"
echo "   - Still using in-memory"
echo ""
echo "5. ⏳ E2E Tests (pending)"
echo "   - No automated test suite yet"
echo ""

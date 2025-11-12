#!/bin/bash

# API Testing Script
# Tests all endpoints to ensure they're working correctly

API="http://localhost:8080"

echo ""
echo "═══════════════════════════════════════════════"
echo "  Wander API - Endpoint Tests"
echo "═══════════════════════════════════════════════"
echo ""

# Check if jq is available
if ! command -v jq &> /dev/null; then
    echo "⚠️  Note: 'jq' is not installed. Responses will not be formatted."
    echo "   Install with: brew install jq"
    JQ_CMD="cat"
else
    JQ_CMD="jq"
fi

# Check if API is running
echo "→ Checking if API is running..."
if ! curl -s -f "$API" > /dev/null; then
    echo "✗ API is not running at $API"
    echo "  Start it with: cd backend && bun run dev"
    exit 1
fi
echo "✓ API is running"
echo ""

# Test 1: Health Check
echo "1️⃣  Testing Health Check (GET /health)"
echo "─────────────────────────────────────────────"
curl -s "$API/health" | $JQ_CMD
echo ""

# Test 2: List Services
echo "2️⃣  Testing List Services (GET /api/services)"
echo "─────────────────────────────────────────────"
curl -s "$API/api/services" | $JQ_CMD
echo ""

# Test 3: List Environments
echo "3️⃣  Testing List Environments (GET /api/environments)"
echo "─────────────────────────────────────────────"
curl -s "$API/api/environments" | $JQ_CMD
echo ""

# Test 4: List All Deployments
echo "4️⃣  Testing List All Deployments (GET /api/deployments)"
echo "─────────────────────────────────────────────"
curl -s "$API/api/deployments?limit=5" | $JQ_CMD
echo ""

# Test 5: Filter Deployments by Environment
echo "5️⃣  Testing Filter by Environment (GET /api/deployments?environment=production)"
echo "─────────────────────────────────────────────"
curl -s "$API/api/deployments?environment=production&limit=3" | $JQ_CMD
echo ""

# Test 6: Get Single Deployment
echo "6️⃣  Testing Get Single Deployment (GET /api/deployments/1)"
echo "─────────────────────────────────────────────"
curl -s "$API/api/deployments/1" | $JQ_CMD
echo ""

# Test 7: Create New Deployment
echo "7️⃣  Testing Create Deployment (POST /api/deployments)"
echo "─────────────────────────────────────────────"
curl -s -X POST "$API/api/deployments" \
  -H "Content-Type: application/json" \
  -d '{
    "service_id": 1,
    "environment_id": 2,
    "version": "v2.2.0-test",
    "deployed_by": "test-script@wander.com",
    "metadata": {
      "test": true,
      "commit": "test123"
    }
  }' | $JQ_CMD
echo ""

# Test 8: Cache Stats
echo "8️⃣  Testing Cache Stats (GET /api/cache/stats)"
echo "─────────────────────────────────────────────"
curl -s "$API/api/cache/stats" | $JQ_CMD
echo ""

# Test 9: Clear Cache
echo "9️⃣  Testing Clear Cache (DELETE /api/cache)"
echo "─────────────────────────────────────────────"
curl -s -X DELETE "$API/api/cache" | $JQ_CMD
echo ""

# Test 10: Verify Cache Miss After Clear
echo "🔟 Testing Cache Miss (GET /api/services - should be cached: false)"
echo "─────────────────────────────────────────────"
curl -s "$API/api/services" | $JQ_CMD | grep -E '"cached"'
echo ""

echo "═══════════════════════════════════════════════"
echo "  ✓ All Tests Complete!"
echo "═══════════════════════════════════════════════"
echo ""

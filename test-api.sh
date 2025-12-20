#!/bin/bash

echo "==================================="
echo "PAWNABLE API Test Script"
echo "==================================="
echo ""

BASE_URL="http://localhost:8085/api"

# 1. Create Asset (ETH)
echo "1. Creating ETH asset..."
ETH_RESPONSE=$(curl -s -X POST "$BASE_URL/assets" \
  -H "Content-Type: application/json" \
  -d '{
    "blockchain": "ethereum",
    "asset_type": "native",
    "symbol": "ETH",
    "name": "Ethereum",
    "contract_address": ""
  }')
echo "Response: $ETH_RESPONSE"
ETH_ASSET_ID=$(echo $ETH_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['asset_id'])")
echo "ETH Asset ID: $ETH_ASSET_ID"
echo ""

# 2. Create Asset (USDT)
echo "2. Creating USDT asset..."
USDT_RESPONSE=$(curl -s -X POST "$BASE_URL/assets" \
  -H "Content-Type: application/json" \
  -d '{
    "blockchain": "ethereum",
    "asset_type": "erc20",
    "symbol": "USDT",
    "name": "Tether USD",
    "contract_address": "0xdac17f958d2ee523a2206206994597c13d831ec7"
  }')
echo "Response: $USDT_RESPONSE"
USDT_ASSET_ID=$(echo $USDT_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['asset_id'])")
echo "USDT Asset ID: $USDT_ASSET_ID"
echo ""

# 3. Get all assets
echo "3. Getting all assets..."
curl -s "$BASE_URL/assets" | python3 -m json.tool
echo ""

# 4. Get auth message
echo "4. Getting authentication message..."
WALLET="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
AUTH_MSG_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/message" \
  -H "Content-Type: application/json" \
  -d "{\"wallet_address\": \"$WALLET\"}")
echo "Response: $AUTH_MSG_RESPONSE"
echo ""

# 5. Check marketplace (should be empty)
echo "5. Checking marketplace..."
curl -s "$BASE_URL/loans/marketplace" | python3 -m json.tool
echo ""

echo "==================================="
echo "Test completed!"
echo "==================================="

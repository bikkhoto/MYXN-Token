#!/bin/bash

# Full Deployment Suite
# Runs all deployment steps in sequence
# Usage: NETWORK=devnet bash scripts/deploy-full-suite.sh

set -e

echo ""
echo "🚀 MYXN Full Deployment Suite"
echo "═══════════════════════════════════════════════════════"
echo ""

# Load environment
source .env

# Validate required vars
if [ -z "$TMP_KEYPAIR_PATH" ]; then
  echo "❌ TMP_KEYPAIR_PATH not set in .env"
  exit 1
fi

if [ -z "$TREASURY_PUB" ]; then
  echo "❌ TREASURY_PUB not set in .env"
  exit 1
fi

if [ -z "$WEB3_STORAGE_TOKEN" ]; then
  echo "⚠️  WEB3_STORAGE_TOKEN not set - skipping metadata upload"
  SKIP_METADATA=true
fi

NETWORK=${NETWORK:-devnet}
echo "📡 Network: $NETWORK"
echo "🔑 Using keypair: $TMP_KEYPAIR_PATH"
echo ""

# Mainnet safety check
if [ "$NETWORK" = "mainnet-beta" ] && [ "$CONFIRM_MAINNET" != "true" ]; then
  echo "❌ MAINNET deployment requires CONFIRM_MAINNET=true in .env"
  echo "   Review all parameters carefully!"
  exit 1
fi

# Configure Solana CLI
if [ "$NETWORK" = "mainnet-beta" ]; then
  solana config set --url https://api.mainnet-beta.solana.com
else
  solana config set --url https://api.devnet.solana.com
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 1: Create Mint and Initial Supply"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

node scripts/create-mint-and-supply.js

# Extract mint address from latest record
MINT_RECORD=$(ls -t deploy-records/mint-*.json | head -n1)
if [ -f "$MINT_RECORD" ]; then
  export TOKEN_MINT=$(cat "$MINT_RECORD" | grep -o '"mint": "[^"]*' | cut -d'"' -f4)
  echo "✅ TOKEN_MINT extracted: $TOKEN_MINT"
else
  echo "❌ Could not find mint record"
  exit 1
fi

echo ""
sleep 2

if [ "$SKIP_METADATA" != "true" ]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Step 2: Upload Metadata to IPFS"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  
  node scripts/upload-metadata-web3storage.js
  
  echo ""
  sleep 2
  
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Step 3: Attach On-Chain Metadata"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  
  export TOKEN_MINT
  node scripts/attach-metadata-mainnet.js
  
  echo ""
  sleep 2
else
  echo "⚠️  Skipping metadata upload (WEB3_STORAGE_TOKEN not set)"
  echo ""
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 4: Transfer Authorities to Hardware Wallet"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

node scripts/transfer-authorities.js

echo ""
sleep 2

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 5: Verify Deployment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

export TOKEN_MINT
bash scripts/verify-onchain.sh

echo ""
echo "═══════════════════════════════════════════════════════"
echo "✅ DEPLOYMENT COMPLETE!"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "Token Mint: $TOKEN_MINT"
echo ""
echo "Next steps:"
echo "1. Verify all details on explorer"
echo "2. Test token transfers"
echo "3. Deploy presale program (anchor deploy)"
echo "4. After presale, follow scripts/revoke-authorities-guide.md"
echo ""

#!/bin/bash

# MYXN Token Verification Script
# Checks on-chain state and outputs verification data

set -e

source .env 2>/dev/null || true

NETWORK=${NETWORK:-devnet}
MINT=${TOKEN_MINT:-""}

if [ -z "$MINT" ]; then
  echo "❌ TOKEN_MINT not set. Set it in .env or export TOKEN_MINT=<address>"
  exit 1
fi

echo ""
echo "🔍 MYXN Token On-Chain Verification"
echo "═══════════════════════════════════════════════════════"
echo ""

# Configure network
if [ "$NETWORK" = "mainnet-beta" ]; then
  solana config set --url https://api.mainnet-beta.solana.com > /dev/null
  EXPLORER_BASE="https://solscan.io"
else
  solana config set --url https://api.devnet.solana.com > /dev/null
  EXPLORER_BASE="https://solscan.io?cluster=devnet"
fi

echo "📡 Network: $NETWORK"
echo "🪙 Mint: $MINT"
echo ""

# Mint info
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 MINT INFORMATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
spl-token display $MINT
echo ""

# Get supply
SUPPLY=$(spl-token supply $MINT 2>/dev/null || echo "N/A")
echo "💰 Current Supply: $SUPPLY"
echo ""

# Treasury account if set
if [ -n "$TREASURY_PUB" ]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🏦 TREASURY ACCOUNT"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Address: $TREASURY_PUB"
  
  # Get associated token account
  TREASURY_ATA=$(spl-token address --token $MINT --owner $TREASURY_PUB 2>/dev/null || echo "")
  
  if [ -n "$TREASURY_ATA" ]; then
    echo "Token Account: $TREASURY_ATA"
    TREASURY_BALANCE=$(spl-token balance --address $TREASURY_ATA 2>/dev/null || echo "N/A")
    echo "Balance: $TREASURY_BALANCE MYXN"
  else
    echo "Token Account: Not found"
  fi
  echo ""
fi

# Metadata check
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎨 METADATA"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if metadata exists (using metaboss if available)
if command -v metaboss &> /dev/null; then
  echo "Fetching metadata with metaboss..."
  metaboss decode mint --mint $MINT 2>/dev/null || echo "Metadata not found or metaboss not configured"
else
  echo "⚠️  metaboss not installed. Install with: cargo install metaboss"
  echo "   Or check metadata manually on Solscan"
fi
echo ""

# Explorer links
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔗 EXPLORER LINKS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ "$NETWORK" = "mainnet-beta" ]; then
  echo "Solscan:  https://solscan.io/token/$MINT"
  echo "Solana FM: https://solana.fm/address/$MINT"
  echo "Explorer: https://explorer.solana.com/address/$MINT"
else
  echo "Solscan:  https://solscan.io/token/$MINT?cluster=devnet"
  echo "Explorer: https://explorer.solana.com/address/$MINT?cluster=devnet"
fi
echo ""

# Deployment records
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📁 DEPLOYMENT RECORDS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -d "deploy-records" ]; then
  echo "Recent deployment files:"
  ls -lt deploy-records/ | head -n 10
else
  echo "No deploy-records directory found"
fi
echo ""

# Checklist
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ VERIFICATION CHECKLIST"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Copy and paste the following after verification:"
echo ""
echo "[ ] Mint address matches: $MINT"
echo "[ ] Total supply is correct: $SUPPLY"
echo "[ ] Decimals = 9"
echo "[ ] Treasury balance verified"
echo "[ ] Metadata is attached and visible on explorer"
echo "[ ] Creator is verified (creators[0].verified = true)"
echo "[ ] Authorities are set correctly"
echo "[ ] All deployment signatures are saved"
echo ""
echo "═══════════════════════════════════════════════════════"
echo ""

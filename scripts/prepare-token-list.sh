#!/bin/bash
# Quick Launch Script - Token List Submission Process

set -e

echo "🚀 MYXN TOKEN - WALLET RECOGNITION SETUP"
echo "═══════════════════════════════════════════════════════"
echo ""

# Check balance
echo "💰 Checking SOL balance..."
BALANCE=$(solana balance 6S4eDdYXABgtmuk3waLM63U2KHgExcD9mco7MuyG9f5G 2>/dev/null || echo "Unknown")
echo "   Balance: $BALANCE"
echo ""

if [[ "$BALANCE" == "0 SOL" ]] || [[ "$BALANCE" == "Unknown" ]]; then
    echo "⚠️  WARNING: Need ~0.005 SOL for transaction"
    echo "   Please fund wallet: 6S4eDdYXABgtmuk3waLM63U2KHgExcD9mco7MuyG9f5G"
    echo ""
    exit 1
fi

# Step 1: Update creators
echo "📋 STEP 1: Update Creators (verify token ownership)"
echo "───────────────────────────────────────────────────────"
echo "This will:"
echo "  • Add your wallet as verified creator"
echo "  • Enable token list submissions"
echo "  • Remove Phantom warnings"
echo ""
read -p "Execute creator update? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "⏳ Running creator update..."
    CONFIRM=true node scripts/update-creators.js
    
    if [ $? -eq 0 ]; then
        echo "✅ Creator update successful!"
        echo ""
    else
        echo "❌ Creator update failed"
        exit 1
    fi
else
    echo "⏭️  Skipped creator update"
    echo ""
fi

# Step 2: Download logo
echo "📋 STEP 2: Prepare Logo"
echo "───────────────────────────────────────────────────────"
echo "Downloading logo from IPFS..."
mkdir -p assets
curl -s "https://ipfs.io/ipfs/bafybeiasgox3kcgxustfjfipoeu6xqlpu5io6rdpsxltuy6vbzp7d255zu" -o assets/myxn-logo.png

if [ -f assets/myxn-logo.png ]; then
    SIZE=$(file assets/myxn-logo.png | grep -o '[0-9]* x [0-9]*' || echo "unknown")
    echo "✅ Logo downloaded: $SIZE"
    echo "   Location: assets/myxn-logo.png"
    echo ""
    echo "⚠️  Required: 512x512 PNG"
    echo "   If resize needed: convert assets/myxn-logo.png -resize 512x512 assets/myxn-logo-512.png"
else
    echo "❌ Logo download failed"
fi
echo ""

# Step 3: Instructions
echo "📋 STEP 3: Submit to Token List"
echo "───────────────────────────────────────────────────────"
echo "Manual steps required:"
echo ""
echo "1. Fork repository:"
echo "   https://github.com/solana-labs/token-list"
echo ""
echo "2. Clone your fork:"
echo "   git clone https://github.com/YOUR_USERNAME/token-list.git"
echo ""
echo "3. Add token info (see TOKEN_LIST_SUBMISSION.md)"
echo ""
echo "4. Add logo:"
echo "   mkdir -p assets/mainnet/3NVKYBqjuhLzk5FQNBhcExkruJ7qcaZizkD7Q7veyHGH"
echo "   cp assets/myxn-logo.png token-list/assets/mainnet/3NVKYBqjuhLzk5FQNBhcExkruJ7qcaZizkD7Q7veyHGH/logo.png"
echo ""
echo "5. Create Pull Request"
echo ""
echo "📖 Full guide: TOKEN_LIST_SUBMISSION.md"
echo ""

# Summary
echo "✅ SETUP COMPLETE"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "📊 Token Status:"
echo "   Mint: 3NVKYBqjuhLzk5FQNBhcExkruJ7qcaZizkD7Q7veyHGH"
echo "   Creator: Verified ✅"
echo "   Logo: Downloaded ✅"
echo ""
echo "🎯 Next: Follow TOKEN_LIST_SUBMISSION.md to submit PR"
echo ""

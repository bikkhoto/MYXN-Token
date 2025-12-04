#!/bin/bash
# Solana Token List Submission - Step by Step Guide

set -e

echo "🚀 SOLANA TOKEN LIST SUBMISSION"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Step 1: Fork the repository
echo "📋 STEP 1: Fork the Token List Repository"
echo "───────────────────────────────────────────────────────────────"
echo ""
echo "1. Go to: https://github.com/solana-labs/token-list"
echo "2. Click 'Fork' button in top right"
echo "3. Wait for fork to complete"
echo ""
read -p "Press ENTER when you've forked the repository..."
echo ""

# Step 2: Clone your fork
echo "📋 STEP 2: Clone Your Fork"
echo "───────────────────────────────────────────────────────────────"
echo ""
read -p "Enter your GitHub username: " GITHUB_USER
echo ""

FORK_URL="https://github.com/${GITHUB_USER}/token-list.git"
echo "Cloning from: $FORK_URL"
echo ""

if [ -d "token-list" ]; then
    echo "⚠️  token-list directory already exists"
    read -p "Remove and re-clone? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf token-list
        git clone "$FORK_URL"
    fi
else
    git clone "$FORK_URL"
fi

cd token-list
echo "✅ Repository cloned"
echo ""

# Step 3: Create branch
echo "📋 STEP 3: Create Branch"
echo "───────────────────────────────────────────────────────────────"
echo ""
git checkout -b add-myxn-token
echo "✅ Branch created: add-myxn-token"
echo ""

# Step 4: Add logo
echo "📋 STEP 4: Add Logo"
echo "───────────────────────────────────────────────────────────────"
echo ""
LOGO_DIR="assets/mainnet/3NVKYBqjuhLzk5FQNBhcExkruJ7qcaZizkD7Q7veyHGH"
mkdir -p "$LOGO_DIR"
cp ../token-list-assets/myxn-logo.png "$LOGO_DIR/logo.png"
echo "✅ Logo copied to: $LOGO_DIR/logo.png"
echo ""

# Step 5: Add token info
echo "📋 STEP 5: Add Token Info to solana.tokenlist.json"
echo "───────────────────────────────────────────────────────────────"
echo ""
echo "⚠️  MANUAL STEP REQUIRED:"
echo ""
echo "1. Open: src/tokens/solana.tokenlist.json"
echo "2. Find the tokens array"
echo "3. Add this entry (in alphabetical order by symbol):"
echo ""
cat ../token-list-assets/token-info.json | jq .
echo ""
echo "4. Make sure to add a comma after the previous token"
echo "5. Save the file"
echo ""
read -p "Press ENTER when you've added the token info..."
echo ""

# Step 6: Validate
echo "📋 STEP 6: Validate Changes"
echo "───────────────────────────────────────────────────────────────"
echo ""
if command -v npm &> /dev/null; then
    echo "Running npm install..."
    npm install
    echo ""
    echo "Running validation tests..."
    npm test
    echo ""
    if [ $? -eq 0 ]; then
        echo "✅ Validation passed!"
    else
        echo "❌ Validation failed - please fix errors above"
        exit 1
    fi
else
    echo "⚠️  npm not found - skipping validation"
    echo "   Make sure your JSON is valid!"
fi
echo ""

# Step 7: Commit changes
echo "📋 STEP 7: Commit Changes"
echo "───────────────────────────────────────────────────────────────"
echo ""
git add .
git commit -m "Add MYXN (MyXen) token

Token: 3NVKYBqjuhLzk5FQNBhcExkruJ7qcaZizkD7Q7veyHGH
Name: MyXen
Symbol: MYXN
Website: https://myxenpay.finance

MyXen is a next-generation, KYC-secured crypto super-app offering 22 integrated services—from payments and remittances to charity and governance. \$MYXN is the utility token that powers this entire ecosystem."

echo "✅ Changes committed"
echo ""

# Step 8: Push to GitHub
echo "📋 STEP 8: Push to Your Fork"
echo "───────────────────────────────────────────────────────────────"
echo ""
git push origin add-myxn-token
echo "✅ Pushed to GitHub"
echo ""

# Step 9: Create Pull Request
echo "📋 STEP 9: Create Pull Request"
echo "───────────────────────────────────────────────────────────────"
echo ""
echo "1. Go to: https://github.com/${GITHUB_USER}/token-list"
echo "2. Click 'Compare & pull request' button"
echo "3. Title: Add MYXN (MyXen) token"
echo "4. Description:"
echo ""
cat << 'PR_DESC'
## Token Information

- **Name:** MyXen
- **Symbol:** MYXN
- **Mint Address:** `3NVKYBqjuhLzk5FQNBhcExkruJ7qcaZizkD7Q7veyHGH`
- **Decimals:** 9
- **Network:** Solana Mainnet

## Project Details

MyXen is a next-generation, KYC-secured crypto super-app offering 22 integrated services—from payments and remittances to charity and governance. $MYXN is the utility token that powers this entire ecosystem.

- **Website:** https://myxenpay.finance
- **Twitter:** https://x.com/myxenpay
- **Telegram:** https://t.me/myxenpay
- **Whitepaper:** https://myxenpay.finance/whitepaper.php
- **GitHub:** https://github.com/bikkhoto/MYXN-Token

## Verification

- ✅ Token deployed on Solana Mainnet
- ✅ Metadata attached with IPFS URI
- ✅ Creator verified
- ✅ Logo: 512x512 PNG
- ✅ Active project with documentation

## Links

- [Solscan Explorer](https://solscan.io/token/3NVKYBqjuhLzk5FQNBhcExkruJ7qcaZizkD7Q7veyHGH)
- [Token Metadata](https://ipfs.io/ipfs/bafkreibblbmneln444gmqr2fq353ipscvlifysuavszxz6lyjpsduncrfq)

PR_DESC
echo ""
echo "5. Click 'Create pull request'"
echo ""
read -p "Press ENTER when you've created the PR..."
echo ""

# Summary
echo "═══════════════════════════════════════════════════════════════"
echo "🎉 SUBMISSION COMPLETE!"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "✅ Fork created"
echo "✅ Logo added"
echo "✅ Token info added"
echo "✅ Changes committed and pushed"
echo "✅ Pull Request created"
echo ""
echo "📊 What happens next?"
echo ""
echo "1. Solana Labs team will review your PR"
echo "2. They may request changes or ask questions"
echo "3. Respond promptly to any comments"
echo "4. Once approved, they'll merge your PR"
echo "5. Your token will appear in wallets within 24-48 hours"
echo ""
echo "⏱️  Typical review time: 3-7 days"
echo ""
echo "🔔 Monitor your PR at:"
echo "   https://github.com/solana-labs/token-list/pulls"
echo ""
echo "Good luck! 🚀"
echo ""

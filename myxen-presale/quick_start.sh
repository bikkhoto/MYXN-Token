#!/bin/bash
# quick_start.sh
# Fast setup and devnet deployment for MYXN presale

set -e

echo "========================================="
echo "MYXN Presale Quick Start"
echo "========================================="

# Step 1: Check dependencies
echo ""
echo "[1/7] Checking dependencies..."
which node > /dev/null || { echo "❌ Node.js not found"; exit 1; }
which anchor > /dev/null || { echo "❌ Anchor CLI not found"; exit 1; }
which solana > /dev/null || { echo "❌ Solana CLI not found"; exit 1; }
echo "✓ Dependencies OK"

# Step 2: Install npm packages
echo ""
echo "[2/7] Installing npm packages..."
npm install --quiet
echo "✓ npm packages installed"

# Step 3: Configure Solana CLI to devnet
echo ""
echo "[3/7] Configuring Solana CLI to devnet..."
solana config set --url devnet > /dev/null
solana config set --keypair ~/.config/solana/id.json > /dev/null 2>&1 || true
echo "✓ Solana CLI configured"

# Step 4: Check SOL balance
echo ""
echo "[4/7] Checking SOL balance..."
BALANCE=$(solana balance 2>&1 | grep -oE '[0-9]+\.[0-9]+' | head -1 || echo "0")
echo "✓ Current balance: ${BALANCE} SOL"
if (( $(echo "$BALANCE < 0.5" | bc -l) )); then
  echo "⚠ Low balance. Requesting airdrop..."
  solana airdrop 2 --url devnet || true
fi

# Step 5: Build Anchor program
echo ""
echo "[5/7] Building Anchor program..."
cd anchor
anchor build --quiet
cd ..
echo "✓ Anchor program built"

# Step 6: Deploy to devnet
echo ""
echo "[6/7] Deploying to devnet..."
DEPLOY_OUTPUT=$(anchor deploy --provider.cluster devnet 2>&1)
PROGRAM_ID=$(echo "$DEPLOY_OUTPUT" | grep -oP "Program Id: \K[A-Za-z0-9]+" || echo "")
if [ -z "$PROGRAM_ID" ]; then
  echo "⚠ Could not extract program ID. Manual deployment may be needed."
else
  echo "✓ Program deployed: $PROGRAM_ID"
  # Update config with new program ID
  sed -i "s/\"PROGRAM_ID\":.*/\"PROGRAM_ID\": \"$PROGRAM_ID\",/" config/default.json
fi

# Step 7: Initialize presale config
echo ""
echo "[7/7] Initializing presale config..."
ts-node scripts/init_presale.ts config/default.json > /dev/null && echo "✓ Config initialized" || echo "⚠ Config initialization needs manual run"

echo ""
echo "========================================="
echo "✓ Quick start completed!"
echo "========================================="
echo ""
echo "Next steps:"
echo "  1. Update config/default.json with real values (token mint, treasury, etc.)"
echo "  2. Run a test buy: ts-node scripts/test_buy.ts SOL 3500000 1"
echo "  3. Check distributor: ts-node offchain/distributor/run_distributor.ts --dry-run"
echo ""
echo "For full instructions, see HOW_TO_RUN.md"

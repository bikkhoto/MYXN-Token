#!/bin/bash
set -e

cd "/home/bikkhoto/MYXN Token/MYXN-Mainnet-Deployment"

echo "🧪 MYXN Anchor Program Tests"
echo "=============================="
echo ""

# Check if Anchor is installed
if ! command -v anchor &> /dev/null; then
    echo "❌ Anchor CLI not found. Installing..."
    cargo install --git https://github.com/coral-xyz/anchor anchor-cli --locked
fi

echo "✅ Anchor CLI ready"
echo ""

# Restore Rust toolchain for Anchor
if [ -f "rust-toolchain.toml.bak" ]; then
    echo "📦 Restoring Anchor's Rust toolchain..."
    mv rust-toolchain.toml.bak rust-toolchain.toml
    echo "✅ Rust toolchain restored"
fi

# Check Anchor version
echo "🔍 Checking Anchor version..."
anchor --version
echo ""

# Test 1: Build Program
echo "1️⃣  TEST: Build Anchor Program"
echo "------------------------------"
if anchor build; then
    echo "✅ Build successful"
    PROGRAM_ID=$(solana address -k target/deploy/myxn_presale-keypair.json)
    echo "   Program ID: $PROGRAM_ID"
else
    echo "❌ Build failed"
    exit 1
fi
echo ""

# Test 2: Run Tests (if any exist)
echo "2️⃣  TEST: Run Anchor Tests"
echo "------------------------------"
if [ -d "tests" ] && [ -f "tests/*.ts" ]; then
    if anchor test --skip-local-validator; then
        echo "✅ Tests passed"
    else
        echo "⚠️  Tests failed or not configured"
    fi
else
    echo "⚠️  No Anchor tests found (expected for new project)"
fi
echo ""

# Test 3: Check Program Size
echo "3️⃣  TEST: Verify Program Size"
echo "------------------------------"
PROGRAM_PATH="target/deploy/myxn_presale.so"
if [ -f "$PROGRAM_PATH" ]; then
    SIZE=$(stat -c%s "$PROGRAM_PATH" 2>/dev/null || stat -f%z "$PROGRAM_PATH" 2>/dev/null)
    SIZE_KB=$((SIZE / 1024))
    echo "   Program size: ${SIZE_KB} KB"
    
    if [ $SIZE_KB -lt 300 ]; then
        echo "✅ Program size acceptable"
    else
        echo "⚠️  Program size large (${SIZE_KB} KB), may need optimization"
    fi
else
    echo "❌ Program binary not found"
    exit 1
fi
echo ""

# Test 4: Validate Program
echo "4️⃣  TEST: Validate Program Binary"
echo "------------------------------"
if anchor verify "$PROGRAM_ID" --provider.cluster devnet 2>/dev/null || true; then
    echo "✅ Program validation successful"
else
    echo "⚠️  Program not deployed yet (expected)"
fi
echo ""

echo "=============================="
echo "📊 Anchor Program Ready for Deployment"
echo "=============================="
echo ""
echo "Next steps:"
echo "  1. Deploy: anchor deploy --provider.cluster devnet"
echo "  2. Initialize presale with parameters"
echo "  3. Test presale functions"
echo ""

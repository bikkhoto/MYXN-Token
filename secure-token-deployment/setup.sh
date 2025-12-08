#!/bin/bash

# Secure MYXN Token Deployment Setup Script

echo "🚀 Setting up Secure MYXN Token Deployment Environment"
echo "═══════════════════════════════════════════════════════"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: This script must be run from the secure-token-deployment directory"
    echo "   Please navigate to the secure-token-deployment folder and try again"
    exit 1
fi

echo "📁 Current directory: $(pwd)"
echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    echo "   Please install Node.js v16+ and try again"
    exit 1
fi

NODE_VERSION=$(node -v)
echo "✅ Node.js version: $NODE_VERSION"

# Check for npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed"
    echo "   Please install npm and try again"
    exit 1
fi

NPM_VERSION=$(npm -v)
echo "✅ npm version: $NPM_VERSION"

# Check for Solana CLI
if ! command -v solana &> /dev/null; then
    echo "❌ Solana CLI is not installed"
    echo "   Please install Solana CLI tools and try again"
    echo "   Visit: https://docs.solana.com/cli/install-solana-cli-tools"
    exit 1
fi

SOLANA_VERSION=$(solana -V)
echo "✅ Solana CLI: $SOLANA_VERSION"

echo ""
echo "📦 Installing dependencies..."
echo ""

# Install npm dependencies
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install npm dependencies"
    exit 1
fi

echo ""
echo "✅ Dependencies installed successfully"
echo ""

# Check for .env file
if [ ! -f ".env" ]; then
    echo "📋 Creating .env file from template..."
    cp .env.example .env
    echo "✅ .env file created"
    echo "   Please edit .env with your configuration values"
else
    echo "✅ .env file already exists"
fi

echo ""
echo "🔑 Checking keypair files..."
echo ""

# Check for treasury keypair
if [ ! -f "keypairs/treasury-keypair.json" ]; then
    echo "⚠️  Treasury keypair not found"
    echo "   Please place your treasury keypair at keypairs/treasury-keypair.json"
    echo "   Or update TMP_KEYPAIR_PATH in .env to point to your keypair"
else
    echo "✅ Treasury keypair found"
fi

echo ""
echo "✅ Setup completed successfully!"
echo ""
echo "📋 Next steps:"
echo "   1. Edit .env with your configuration values"
echo "   2. Fund your treasury wallet with at least 0.5 SOL"
echo "   3. Run 'npm run deploy' to deploy the token"
echo ""
echo "📖 Refer to README.md for detailed deployment instructions"
echo ""
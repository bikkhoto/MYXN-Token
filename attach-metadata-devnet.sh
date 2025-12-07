#!/bin/bash
set -e

cd "/home/bikkhoto/MYXN Token/MYXN-Mainnet-Deployment"

echo "🚀 Attaching Metadata to MYXN Devnet Token"
echo "=========================================="
echo ""

# Configure network
solana config set --url https://api.devnet.solana.com

# Token details
MINT="DL41ms25heCSkxNuYnC2C7aXjogDnC6fk3V2hDcuU35C"
KEYPAIR="$PWD/keypair-Azvjj21u.json"
METADATA="$PWD/metadata/metaboss-metadata.json"

echo "Mint: $MINT"
echo "Keypair: $KEYPAIR"
echo "Metadata: $METADATA"
echo ""

# Wait for metaboss
echo "Waiting for metaboss installation..."
while ! command -v metaboss &> /dev/null; do
    sleep 5
    echo -n "."
done
echo ""
echo "✅ Metaboss ready!"
echo ""

# Attach metadata
echo "📝 Attaching metadata..."
metaboss create metadata \
    --keypair "$KEYPAIR" \
    --mint "$MINT" \
    --metadata "$METADATA" \
    --url https://api.devnet.solana.com

echo ""
echo "✅ Metadata attached successfully!"
echo ""
echo "🔍 Verifying..."
spl-token display "$MINT"
echo ""
echo "🌐 Explorer:"
echo "https://explorer.solana.com/address/$MINT?cluster=devnet"

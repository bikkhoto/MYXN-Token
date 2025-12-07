#!/bin/bash
# Quick metadata attachment using Metaboss (when available) or manual approach

set -e

MINT_ADDRESS="DL41ms25heCSkxNuYnC2C7aXjogDnC6fk3V2hDcuU35C"
NETWORK="devnet"
METADATA_URI="ipfs://bafybeiasgox3kcgxustfjfipoeu6xqlpu5io6rdpsxltuy6vbzp7d255zu"

echo "🚀 MYXN Devnet Metadata Attachment"
echo "=================================="
echo ""
echo "Mint: $MINT_ADDRESS"
echo "Network: $NETWORK"
echo "URI: $METADATA_URI"
echo ""

# Configure network
solana config set --url https://api.devnet.solana.com
echo "✅ Network configured"

# Create minimal metadata JSON for metaboss
cat > /tmp/myxn-metadata.json << EOF
{
  "name": "MyXen",
  "symbol": "MYXN",
  "uri": "$METADATA_URI",
  "seller_fee_basis_points": 0,
  "creators": [
    {
      "address": "Azvjj21uXQzHbM9VHhyDfdbj14HD8Tef7ZuC1p7sEMk9",
      "share": 100,
      "verified": false
    }
  ]
}
EOF

echo "✅ Metadata JSON prepared"
echo ""

# Try with metaboss if available
if command -v metaboss &> /dev/null; then
    echo "Using Metaboss CLI..."
    metaboss create metadata \
        --keypair "$TMP_KEYPAIR_PATH" \
        --mint "$MINT_ADDRESS" \
        --metadata /tmp/myxn-metadata.json \
        --url https://api.devnet.solana.com
    echo "✅ Metadata created!"
else
    echo "⚠️  Metaboss not available"
    echo ""
    echo "MANUAL STEPS REQUIRED:"
    echo "1. Install metaboss: cargo install metaboss"
    echo "2. Run: metaboss create metadata \\"
    echo "     --keypair \"$TMP_KEYPAIR_PATH\" \\"
    echo "     --mint $MINT_ADDRESS \\"
    echo "     --metadata /tmp/myxn-metadata.json \\"
    echo "     --url https://api.devnet.solana.com"
    echo ""
    echo "OR use Sugar CLI or other Metaplex tools"
    exit 1
fi

# Verify
echo ""
echo "Verifying metadata..."
spl-token display $MINT_ADDRESS || true

echo ""
echo "✨ Devnet deployment complete!"
echo "Explorer: https://explorer.solana.com/address/$MINT_ADDRESS?cluster=devnet"

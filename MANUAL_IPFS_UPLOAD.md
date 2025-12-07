# Manual IPFS Upload Guide

Since Web3.Storage is under maintenance, here's how to upload manually:

## Option 1: Use Pinata (Recommended)

1. **Sign up for free account:**
   - Go to https://app.pinata.cloud/register
   - Free tier: 1GB storage, plenty for metadata

2. **Upload metadata:**
   - Click "Upload" → "File"
   - Select: `metadata/metadata-verified.json`
   - Copy the CID (starts with "baf...")

3. **Get IPFS URI:**
   ```
   ipfs://YOUR_CID
   ```

## Option 2: Use NFT.Storage

1. **Sign up:**
   - Go to https://nft.storage
   - Get free API key

2. **Upload via curl:**
   ```bash
   curl -X POST --data-binary @metadata/metadata-verified.json \
     https://api.nft.storage/upload \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json"
   ```

## Option 3: Use IPFS Desktop

1. **Install IPFS Desktop:**
   - Download from https://github.com/ipfs/ipfs-desktop/releases
   
2. **Add file:**
   - Open IPFS Desktop
   - Add `metadata/metadata-verified.json`
   - Copy CID

## After Getting CID

Run the update command:

```bash
cd "/home/bikkhoto/MYXN Token/MYXN-Mainnet-Deployment"

# Replace YOUR_CID with actual CID
export NEW_URI="ipfs://YOUR_CID"
export SKIP_UPLOAD=true
export CONFIRM=true

node scripts/fix-creator-complete.js
```

## Current Metadata

The file `metadata/metadata-verified.json` contains:
- ✅ Your wallet as creator: `6S4eDdYXABgtmuk3waLM63U2KHgExcD9mco7MuyG9f5G`
- ✅ Correct share: 100%
- ✅ All token details

Once uploaded to IPFS and URI updated on-chain, wallets will see your wallet as the verified creator.

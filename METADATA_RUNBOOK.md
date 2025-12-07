# MYXN Metadata Management Runbook

**Complete operational guide for MYXN token metadata management on Solana Mainnet**

Version: 1.0  
Last Updated: December 5, 2025

---

## Table of Contents

1. [Overview](#overview)
2. [Pre-flight Checks](#pre-flight-checks)
3. [Upload Metadata to IPFS](#upload-metadata-to-ipfs)
4. [Attach Metadata to Token](#attach-metadata-to-token)
5. [Verify Creator](#verify-creator)
6. [Post-Verification Checks](#post-verification-checks)
7. [Audit Record](#audit-record)
8. [Rollback & Safety](#rollback--safety)
9. [Troubleshooting](#troubleshooting)

---

## Overview

This runbook guides you through the complete metadata management workflow for the $MYXN token:

- **Upload** metadata to IPFS with integrity verification
- **Attach** metadata to the token on Solana
- **Verify** creator to prove ownership
- **Validate** on-chain metadata and IPFS content

**Token Details:**
- Mint: `3NVKYBqjuhLzk5FQNBhcExkruJ7qcaZizkD7Q7veyHGH`
- Network: Solana Mainnet-Beta
- Treasury: `6S4eDdYXABgtmuk3waLM63U2KHgExcD9mco7MuyG9f5G`

---

## Pre-flight Checks

### 1. Verify Keypair Balance

Check that your wallet has sufficient SOL:

```bash
solana balance --keypair ./mainnet-wallet-keypair.json --url mainnet-beta
```

**Required:**
- Minimum: 0.05 SOL
- Recommended: 0.1 SOL (for metadata operations)

### 2. Confirm Keypair Matches Mint Authority

Verify the keypair address matches your expected wallet:

```bash
solana-keygen pubkey ./mainnet-wallet-keypair.json
```

Expected: `6S4eDdYXABgtmuk3waLM63U2KHgExcD9mco7MuyG9f5G`

### 3. Verify Metadata File

Check the metadata file integrity:

```bash
sha256sum metadata/metadata-verified.json
```

Save this hash for audit records.

**Review metadata content:**
```bash
cat metadata/metadata-verified.json | jq
```

Verify:
- ✅ Name: "MyXen"
- ✅ Symbol: "MYXN"
- ✅ Presale allocation: 50% (500,000,000 tokens)
- ✅ Image CID present
- ✅ All GitHub repos listed

---

## Upload Metadata to IPFS

### Option 1: Web3.Storage (Recommended)

1. **Get API Token:**
   - Visit: https://web3.storage
   - Sign up for free account
   - Generate API token

2. **Set Environment Variable:**
   ```bash
   export WEB3_STORAGE_TOKEN='your-token-here'
   export IPFS_PROVIDER='web3storage'
   ```

3. **Upload Metadata:**
   ```bash
   node scripts/upload-metadata.js
   ```

### Option 2: Pinata

1. **Get JWT Token:**
   - Visit: https://pinata.cloud
   - Create account
   - Get JWT from API Keys

2. **Set Environment Variable:**
   ```bash
   export PINATA_JWT='your-jwt-here'
   export IPFS_PROVIDER='pinata'
   ```

3. **Upload Metadata:**
   ```bash
   node scripts/upload-metadata.js
   ```

### What Happens:

1. Script loads `metadata/metadata-verified.json`
2. Computes SHA256 hash of local file
3. Uploads to chosen IPFS provider
4. Downloads from IPFS gateway
5. Computes SHA256 hash of downloaded file
6. **Compares hashes** - ABORTS if mismatch
7. Saves record to `deploy-records/.metadata.cids.json`

**Expected Output:**
```
✅ Upload complete! CID: bafyrei...
✅ INTEGRITY CHECK PASSED
📝 Record saved to: deploy-records/.metadata.cids.json
```

**Save the Metadata CID** - you'll need it for the next step!

---

## Attach Metadata to Token

### Test on Devnet First (Recommended)

Always test on devnet before mainnet:

```bash
# Set temporary keypair for devnet testing
export TMP_KEYPAIR_PATH='./devnet-test-keypair.json'

# Create test mint on devnet (if needed)
solana-keygen new -o $TMP_KEYPAIR_PATH
solana airdrop 1 --keypair $TMP_KEYPAIR_PATH --url devnet

# Attach metadata (devnet)
node scripts/attach-metadata.js \
  --mint <DEVNET_TOKEN_MINT> \
  --metadata-cid <YOUR_CID> \
  --network https://api.devnet.solana.com
```

### Mainnet Deployment

**⚠️ WARNING: This is irreversible on mainnet!**

```bash
# Set keypair path
export TMP_KEYPAIR_PATH='./mainnet-wallet-keypair.json'

# Run attach script
node scripts/attach-metadata.js \
  --mint 3NVKYBqjuhLzk5FQNBhcExkruJ7qcaZizkD7Q7veyHGH \
  --metadata-cid <YOUR_METADATA_CID> \
  --network https://api.mainnet-beta.solana.com \
  --confirm
```

**The script will:**
1. Validate keypair SOL balance (>= 0.05 SOL)
2. Check if metadata PDA already exists (abort if yes)
3. Create Metadata account V2
4. Set creators with `verified=false` initially
5. Save transaction record

**Expected Output:**
```
✅ Metadata attached successfully!
   Metadata PDA: 5b3ZVjpE9i3GDWEVjQEGRbNnES9PExMqQSJxwVNJvFAV
   Transaction: <signature>
```

**Save the Metadata PDA** for creator verification!

---

## Verify Creator

Creator verification sets `verified=true` and removes wallet security warnings.

### Option 1: Hardware Wallet (RECOMMENDED for Mainnet)

**Use the Web Interface:**

```bash
# Navigate to verification app
cd scripts/verify-creator-web/
npm install
npm start
```

Open `http://localhost:3000` and:
1. Connect hardware wallet (Ledger/Phantom)
2. Verify wallet address matches: `6S4eDdYXABgtmuk3waLM63U2KHgExcD9mco7MuyG9f5G`
3. Click "Verify Creator"
4. Sign transaction on hardware wallet
5. Save the transaction signature

### Option 2: CLI (For Testing Only)

**⚠️ Only use on devnet or with ephemeral keypairs!**

```bash
# Set creator keypair
export CREATOR_KEYPAIR_PATH='./mainnet-wallet-keypair.json'
export CONFIRM='true'

# Run verification
node scripts/verify-creator-cli.js \
  --mint 3NVKYBqjuhLzk5FQNBhcExkruJ7qcaZizkD7Q7veyHGH \
  --network https://api.mainnet-beta.solana.com
```

**Expected Output:**
```
✅ Creator verified successfully!
   Transaction signature: <signature>
📝 Audit record saved to: deploy-records/verify-creator-<timestamp>.json
```

**Security Best Practices:**
- ✅ Use hardware wallet for mainnet
- ✅ Verify all addresses before signing
- ✅ Save transaction signatures
- ❌ Never commit private keys to git
- ❌ Don't share keypair files

---

## Post-Verification Checks

### 1. Check On-Chain Metadata

```bash
node scripts/check-metadata.js \
  --mint 3NVKYBqjuhLzk5FQNBhcExkruJ7qcaZizkD7Q7veyHGH \
  --network https://api.mainnet-beta.solana.com
```

**Verify Output:**
- ✅ Name: "MyXen"
- ✅ Symbol: "MYXN"
- ✅ URI matches your IPFS CID
- ✅ Creator verified: **true**
- ✅ Creator address: `6S4eDdYXABgtmuk3waLM63U2KHgExcD9mco7MuyG9f5G`

### 2. Check on Solana Explorer

Visit: https://explorer.solana.com/address/3NVKYBqjuhLzk5FQNBhcExkruJ7qcaZizkD7Q7veyHGH

Verify:
- Token name and symbol appear correctly
- Image loads from IPFS
- Metadata is present

### 3. Check on Solscan

Visit: https://solscan.io/token/3NVKYBqjuhLzk5FQNBhcExkruJ7qcaZizkD7Q7veyHGH

Verify:
- Token information displays
- Creator is verified
- Metadata loads

### 4. Test in Phantom Wallet

1. Import token in Phantom: `3NVKYBqjuhLzk5FQNBhcExkruJ7qcaZizkD7Q7veyHGH`
2. **Verify: Security warning should be GONE**
3. Token name, symbol, and icon should display

**Note:** Wallets may cache data. If warning persists:
- Wait 15-30 minutes for cache refresh
- Try removing and re-adding the token
- Clear Phantom cache in settings

---

## Audit Record

Create a comprehensive audit record for compliance and verification.

### Generate Audit Proof

```bash
# Use the template
cp docs/audit-proof-template.json deploy-records/audit-proof-mainnet.json
```

**Fill in the template with:**

```json
{
  "audit_version": "1.0",
  "token_mint": "3NVKYBqjuhLzk5FQNBhcExkruJ7qcaZizkD7Q7veyHGH",
  "metadata_pda": "5b3ZVjpE9i3GDWEVjQEGRbNnES9PExMqQSJxwVNJvFAV",
  "operations": [
    {
      "step": 1,
      "operation": "metadata_upload",
      "timestamp": "<from .metadata.cids.json>",
      "metadata_cid": "<your CID>",
      "sha256_local": "<from upload record>",
      "sha256_remote": "<from upload record>",
      "integrity": "VERIFIED"
    },
    {
      "step": 2,
      "operation": "attach_metadata",
      "timestamp": "<from attach record>",
      "transaction_signature": "<from attach record>",
      "metadata_pda": "5b3ZVjpE9i3GDWEVjQEGRbNnES9PExMqQSJxwVNJvFAV"
    },
    {
      "step": 3,
      "operation": "verify_creator",
      "timestamp": "<from verify record>",
      "transaction_signature": "<from verify record>",
      "creator_address": "6S4eDdYXABgtmuk3waLM63U2KHgExcD9mco7MuyG9f5G",
      "verified": true
    }
  ],
  "operator": "MyXen Foundation",
  "notes": "All operations completed successfully on Solana Mainnet"
}
```

**All transaction signatures and records are saved in:**
```
deploy-records/
├── .metadata.cids.json
├── attach-metadata-<timestamp>.json
├── verify-creator-<timestamp>.json
└── metadata-check-<timestamp>.json
```

---

## Rollback & Safety

### Important Limitations

**⚠️ Metadata operations are IRREVERSIBLE:**
- Cannot delete metadata once attached
- Cannot change metadata URI directly
- Must create new version with new CID

### If Metadata Needs Changes

1. **Edit Local File:**
   ```bash
   vim metadata/metadata-verified.json
   ```

2. **Generate New CID:**
   ```bash
   # Upload again - will create NEW CID
   node scripts/upload-metadata.js
   ```

3. **Update Metadata (If Mutable):**
   ```bash
   # Use Metaplex update authority
   # Requires updateAuthority keypair
   ```

### Security Recommendations

**Hardware Wallet Best Practices:**
- ✅ Use Ledger or similar for mainnet signing
- ✅ Verify addresses on device screen
- ✅ Never enter seed phrase on computer
- ✅ Use multi-sig for treasury operations

**Keypair Management:**
- ✅ Store keypairs encrypted
- ✅ Use hardware security modules (HSM) for production
- ✅ Keep backups in secure offline storage
- ❌ Never commit to git
- ❌ Never share via unsecured channels

**Air-Gapped Signing (Maximum Security):**
1. Generate transaction on online machine
2. Transfer unsigned tx to air-gapped machine
3. Sign on air-gapped machine
4. Transfer signed tx back to online machine
5. Broadcast to network

---

## Troubleshooting

### Upload Fails

**Problem:** Upload to IPFS times out or fails

**Solutions:**
1. Check internet connection
2. Verify API token is valid
3. Try different IPFS provider
4. Check file size (should be < 1MB)
5. Retry after a few minutes

### Integrity Check Fails

**Problem:** SHA256 hashes don't match

**Solutions:**
1. Wait 1-2 minutes for IPFS propagation
2. Try different IPFS gateway
3. Re-upload file
4. Verify local file not corrupted

### Insufficient SOL Balance

**Problem:** "Insufficient lamports" error

**Solutions:**
1. Check balance: `solana balance --keypair <path>`
2. Fund wallet with at least 0.1 SOL
3. Wait for transaction to confirm
4. Retry operation

### Metadata PDA Already Exists

**Problem:** "Metadata account already exists"

**Solutions:**
1. Metadata already attached (check with `check-metadata.js`)
2. If incorrect, contact Solana support
3. Cannot re-attach; must update existing metadata

### Creator Verification Fails

**Problem:** "Not authorized" or "Invalid signer"

**Solutions:**
1. Verify keypair matches creator in metadata
2. Check keypair has signing authority
3. Ensure creator address matches exactly
4. Try with hardware wallet instead

### Phantom Warning Persists

**Problem:** Security warning still shows after verification

**Solutions:**
1. Wait 24-48 hours for wallet cache update
2. Clear Phantom cache (Settings → Advanced → Clear Cache)
3. Remove and re-add token
4. Check creator verified on explorer
5. Add liquidity to create trading history
6. Submit token to Phantom token list

### Transaction Fails

**Problem:** Transaction errors or times out

**Solutions:**
1. Check RPC endpoint is responsive
2. Increase compute units if needed
3. Retry with different RPC (Helius, QuickNode)
4. Check Solana network status
5. Wait during high congestion periods

---

## Support & Resources

### Documentation
- Repository: https://github.com/bikkhoto/MYXN-Token
- Solana Docs: https://docs.solana.com
- Metaplex Docs: https://docs.metaplex.com

### Explorers
- Solana Explorer: https://explorer.solana.com
- Solscan: https://solscan.io
- Solana Beach: https://solanabeach.io

### IPFS Gateways
- https://ipfs.io/ipfs/<CID>
- https://gateway.pinata.cloud/ipfs/<CID>
- https://dweb.link/ipfs/<CID>

### Emergency Contacts
- MyXen Foundation: [Contact Info]
- Technical Support: [Support Channel]

---

## Version History

- **v1.0** (2025-12-05): Initial release
  - Complete metadata management workflow
  - Creator verification implemented
  - Phantom security warning resolved

---

**Document Owner:** MyXen Foundation Technical Team  
**Last Review:** December 5, 2025  
**Next Review:** March 5, 2026

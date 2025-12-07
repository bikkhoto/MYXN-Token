# MYXN Mainnet Deployment Configuration

**Target Network:** Solana Mainnet-Beta  
**Deployment Date:** December 5, 2025

---

## 🎯 Mainnet Specifications

### Token Details
- **Name:** MyXen
- **Symbol:** MYXN
- **Decimals:** 9
- **Total Supply:** 1,000,000,000 MYXN
- **Mint Address:** `6S4eDdYXABgtmuk3waLM63U2KHgExcD9mco7MuyG9f5G` ✅ (MUST USE THIS)

### Treasury Wallet
- **Address:** `6S4eDdYXABgtmuk3waLM63U2KHgExcD9mco7MuyG9f5G`
- **Role:** Receives all minted tokens, has mint & freeze authority initially

### Metadata
- **IPFS CID:** `bafkreiholwopitkccosr6ebn42frwmpwlzel2c4fcl6wdsvk6y7rwx337a` ✅ (NEW MAINNET METADATA)
- **URI:** `ipfs://bafkreiholwopitkccosr6ebn42frwmpwlzel2c4fcl6wdsvk6y7rwx337a`
- **Gateway:** `https://ipfs.io/ipfs/bafkreiholwopitkccosr6ebn42frwmpwlzel2c4fcl6wdsvk6y7rwx337a`

---

## ⚠️ CRITICAL: Pre-Deployment Checklist

### Treasury Wallet Funding
- [ ] Send **0.5-1.0 SOL** to `6S4eDdYXABgtmuk3waLM63U2KHgExcD9mco7MuyG9f5G`
- [ ] Current balance: **0.007 SOL** (INSUFFICIENT - MUST FUND FIRST)
- [ ] Verify transaction confirmed before proceeding

### Environment Configuration
- [ ] Set `NETWORK=mainnet-beta` in `.env`
- [ ] Set `CONFIRM_MAINNET=true` in `.env`
- [ ] Set `TOKEN_MINT=6S4eDdYXABgtmuk3waLM63U2KHgExcD9mco7MuyG9f5G` in `.env`
- [ ] Update metadata URI to new IPFS CID
- [ ] Verify RPC endpoint is mainnet-beta

### Security Verification
- [ ] Backup treasury keypair (multiple secure locations)
- [ ] Backup hardware wallet mnemonic securely
- [ ] Test all scripts on devnet first
- [ ] Review all transaction parameters
- [ ] Have emergency contacts ready

---

## 📋 Mainnet Deployment Steps

### Step 1: Prepare Environment
```bash
cd "/home/bikkhoto/MYXN Token/MYXN-Mainnet-Deployment"

# Update .env file
cat >> .env << 'EOF'
# MAINNET CONFIGURATION
NETWORK=mainnet-beta
TOKEN_MINT=6S4eDdYXABgtmuk3waLM63U2KHgExcD9mco7MuyG9f5G
MAINNET_METADATA_CID=bafkreiholwopitkccosr6ebn42frwmpwlzel2c4fcl6wdsvk6y7rwx337a
CONFIRM_MAINNET=true
EOF
```

### Step 2: Verify Treasury Balance
```bash
# Check current balance (MUST BE >0.5 SOL)
solana balance 6S4eDdYXABgtmuk3waLM63U2KHgExcD9mco7MuyG9f5G --url mainnet-beta

# If insufficient, STOP and fund wallet first
```

### Step 3: Import/Create Mint with Specific Address
⚠️ **IMPORTANT:** The mint address `6S4eDdYXABgtmuk3waLM63U2KHgExcD9mco7MuyG9f5G` must already exist or be created with a specific keypair.

**Option A: If mint already exists**
```bash
# Verify mint exists
spl-token display 6S4eDdYXABgtmuk3waLM63U2KHgExcD9mco7MuyG9f5G --url mainnet-beta

# If exists, skip to Step 4
```

**Option B: If mint needs to be created**
```bash
# You need the keypair file that generates this address
# Place it at: ./mainnet-mint-keypair.json
# Then run:
export TOKEN_MINT=6S4eDdYXABgtmuk3waLM63U2KHgExcD9mco7MuyG9f5G
node scripts/create-mint-mainnet.js
```

### Step 4: Mint Total Supply
```bash
# Mint 1 billion MYXN to treasury
export NETWORK=mainnet-beta
export TOKEN_MINT=6S4eDdYXABgtmuk3waLM63U2KHgExcD9mco7MuyG9f5G
node scripts/mint-supply-mainnet.js

# Verify supply
spl-token supply 6S4eDdYXABgtmuk3waLM63U2KHgExcD9mco7MuyG9f5G --url mainnet-beta
```

### Step 5: Attach Metadata
```bash
# Attach Metaplex metadata with new IPFS CID
export TOKEN_MINT=6S4eDdYXABgtmuk3waLM63U2KHgExcD9mco7MuyG9f5G
export MAINNET_METADATA_CID=bafkreiholwopitkccosr6ebn42frwmpwlzel2c4fcl6wdsvk6y7rwx337a
node scripts/attach-metadata-mainnet.js

# Verify metadata on-chain
solana account <METADATA_PDA> --url mainnet-beta
```

### Step 6: Deploy Presale Program
```bash
# Deploy Anchor program to mainnet
anchor build
anchor deploy --provider.cluster mainnet

# Save program ID
echo "PRESALE_PROGRAM_ID=<PROGRAM_ID>" >> .env
```

### Step 7: Initialize Presale
```bash
# Initialize presale with production parameters
node scripts/initialize-presale-mainnet.js
```

### Step 8: Transfer Authorities (OPTIONAL - Can wait)
```bash
# Transfer to hardware wallet (IRREVERSIBLE if mint authority removed)
export TOKEN_MINT=6S4eDdYXABgtmuk3waLM63U2KHgExcD9mco7MuyG9f5G
node scripts/transfer-authorities.js

# Verify new authorities
spl-token display 6S4eDdYXABgtmuk3waLM63U2KHgExcD9mco7MuyG9f5G --url mainnet-beta
```

---

## 🔐 Security Considerations

### Mint Authority
- **Initial:** Treasury wallet (for minting supply)
- **After Minting:** Can transfer to hardware wallet or revoke
- **Recommendation:** Keep active during presale, revoke after distribution complete

### Freeze Authority
- **Initial:** Treasury wallet
- **Consideration:** Can freeze malicious accounts
- **Recommendation:** Transfer to secure multisig or revoke

### Upgrade Authority (Program)
- **Initial:** Treasury wallet
- **After Testing:** Transfer to secure governance or multisig
- **Never:** Revoke until certain no bugs exist

---

## 📊 Cost Estimates (Mainnet)

| Operation | Estimated SOL | Notes |
|-----------|---------------|-------|
| Create Mint | ~0.00144 | Rent-exempt account |
| Create Token Account | ~0.00203 | ATA for treasury |
| Mint Supply | ~0.00001 | Transaction fee |
| Attach Metadata | ~0.0152 | Metadata PDA rent |
| Deploy Program | ~0.5-2.0 | Size dependent |
| Initialize Presale | ~0.01 | State account rent |
| **Total (Estimated)** | **~0.53-2.03 SOL** | Conservative estimate |

**Current Treasury:** 0.007 SOL ❌  
**Required:** 0.5-1.0 SOL minimum ✅  
**Recommended:** 1.5-2.0 SOL (buffer for operations) ✅

---

## 🧪 Testing Before Mainnet

### Devnet Validation Complete ✅
- [x] Token creation tested
- [x] Metadata attachment verified
- [x] Transfer functionality confirmed
- [x] Program deployed successfully
- [x] Authorities working correctly

### Mainnet Rehearsal (Recommended)
```bash
# Run mainnet scripts in dry-run mode
NETWORK=mainnet-beta DRY_RUN=true node scripts/create-mint-mainnet.js
NETWORK=mainnet-beta DRY_RUN=true node scripts/attach-metadata-mainnet.js
```

---

## 🚨 Emergency Procedures

### If Transaction Fails
1. Check Solana status: https://status.solana.com
2. Verify RPC endpoint responding
3. Check treasury SOL balance
4. Review transaction logs
5. Retry with higher compute units if needed

### If Mint Created Wrong
- **Cannot fix** - mint address is permanent
- Must create new mint with correct parameters
- Previous mint can be abandoned

### If Metadata Wrong
- Can update if `is_mutable: true`
- Use `update-metadata.js` script
- Requires update authority signature

### Rollback Plan
- **Token Creation:** Cannot rollback, must create new
- **Metadata:** Can update if mutable
- **Program:** Can upgrade if authority retained
- **Authorities:** Transfer is final (unless revoked)

---

## ✅ Post-Deployment Verification

### On-Chain Verification
```bash
# Verify mint
spl-token display 6S4eDdYXABgtmuk3waLM63U2KHgExcD9mco7MuyG9f5G --url mainnet-beta

# Verify metadata
solana account <METADATA_PDA> --url mainnet-beta

# Verify program
solana program show <PROGRAM_ID> --url mainnet-beta
```

### Explorer Verification
- Solana Explorer: https://explorer.solana.com/address/6S4eDdYXABgtmuk3waLM63U2KHgExcD9mco7MuyG9f5G
- Solscan: https://solscan.io/token/6S4eDdYXABgtmuk3waLM63U2KHgExcD9mco7MuyG9f5G
- SolanaFM: https://solana.fm/address/6S4eDdYXABgtmuk3waLM63U2KHgExcD9mco7MuyG9f5G

### Metadata Verification
- IPFS Gateway: https://ipfs.io/ipfs/bafkreiholwopitkccosr6ebn42frwmpwlzel2c4fcl6wdsvk6y7rwx337a
- Pinata Gateway: https://gateway.pinata.cloud/ipfs/bafkreiholwopitkccosr6ebn42frwmpwlzel2c4fcl6wdsvk6y7rwx337a

---

## 📞 Support & Resources

### Solana Documentation
- SPL Token: https://spl.solana.com/token
- Metaplex: https://docs.metaplex.com/
- Anchor: https://www.anchor-lang.com/

### Status Pages
- Solana Status: https://status.solana.com/
- Metaplex Status: https://status.metaplex.com/

### Community
- Solana Discord: https://discord.gg/solana
- Anchor Discord: https://discord.gg/anchor

---

## 📝 Deployment Log Template

```
=== MYXN MAINNET DEPLOYMENT LOG ===
Date: _______________
Operator: _______________

Pre-Deployment:
[ ] Treasury funded with ___ SOL
[ ] Environment configured
[ ] Backups secured
[ ] Team notified

Deployment:
[ ] Mint created/verified: 6S4eDdYXABgtmuk3waLM63U2KHgExcD9mco7MuyG9f5G
[ ] Supply minted: 1,000,000,000 MYXN
[ ] Metadata attached: bafkreiholwopitkccosr6ebn42frwmpwlzel2c4fcl6wdsvk6y7rwx337a
[ ] Program deployed: _______________
[ ] Presale initialized: _______________

Verification:
[ ] Token visible on explorers
[ ] Metadata loading correctly
[ ] Program instructions callable
[ ] Authorities verified

Post-Deployment:
[ ] Authorities transferred (if applicable)
[ ] Documentation updated
[ ] Team notified
[ ] Marketing materials ready

Notes:
_________________________________
_________________________________
_________________________________
```

---

**Generated:** December 5, 2025  
**Status:** READY FOR MAINNET (pending treasury funding)  
**Next Action:** Fund treasury with 0.5-1.0 SOL

# 🚀 Token List Submission Guide

## Overview

This guide covers submitting $MYXN to major Solana token registries for wallet recognition.

## 📋 Prerequisites Checklist

Before submitting, ensure:

- [x] Token deployed on Solana Mainnet
- [x] Metadata attached with IPFS URI
- [ ] Creator verified (run `update-creators.js` first)
- [ ] Logo image hosted on IPFS (512x512 PNG recommended)
- [ ] Token has some liquidity/trading activity (recommended)
- [ ] Website and social links active

## 🎯 Target Registries

### 1. Solana Token List (Priority)
**Repo:** https://github.com/solana-labs/token-list

**Requirements:**
- Token on Solana Mainnet ✅
- Valid metadata ✅
- Logo (512x512 PNG) ✅
- Active project with website ✅

**Steps:**
1. Fork the repository
2. Add token info to `src/tokens/solana.tokenlist.json`
3. Add logo to `assets/mainnet/<mint_address>/logo.png`
4. Create Pull Request

**Token Info Format:**
```json
{
  "chainId": 101,
  "address": "3NVKYBqjuhLzk5FQNBhcExkruJ7qcaZizkD7Q7veyHGH",
  "symbol": "MYXN",
  "name": "MyXen",
  "decimals": 9,
  "logoURI": "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/3NVKYBqjuhLzk5FQNBhcExkruJ7qcaZizkD7Q7veyHGH/logo.png",
  "tags": [
    "utility-token",
    "payment",
    "defi"
  ],
  "extensions": {
    "website": "https://myxenpay.finance",
    "twitter": "https://x.com/myxenpay",
    "telegram": "https://t.me/myxenpay",
    "whitepaper": "https://myxenpay.finance/whitepaper.php"
  }
}
```

### 2. Phantom Token List
**Submission:** Through Phantom's form

**URL:** https://phantom.app/learn/developer-powertools/token-metadata

**Requirements:**
- Listed on Solana Token List (do #1 first)
- High-quality logo
- Active community
- Trading volume

**Process:**
1. Complete Solana Token List submission first
2. Wait for merge (can take 1-2 weeks)
3. Apply through Phantom's developer form
4. Provide: Token address, logo, description, links

### 3. Jupiter Aggregator
**Auto-listing:** Jupiter automatically indexes tokens with liquidity

**Requirements:**
- Token with active DEX liquidity pool
- Minimum liquidity threshold (~$1000)

**How to get listed:**
1. Add liquidity on Raydium or Orca
2. Jupiter will auto-detect within 24-48 hours
3. Verify at https://station.jup.ag/

### 4. CoinGecko (Optional)
**Submission:** https://www.coingecko.com/en/coins/request

**Requirements:**
- Active trading on DEX
- Listed on Solana Token List
- Working website
- Active community

**Timeline:** 7-14 days review

### 5. CoinMarketCap (Optional)
**Submission:** https://coinmarketcap.com/request/

**Requirements:**
- Similar to CoinGecko
- Active trading volume
- Project documentation

## 🛠️ Step-by-Step Execution

### Step 1: Verify Creator (MUST DO FIRST)

```bash
cd "/home/bikkhoto/MYXN Token/MYXN-Mainnet-Deployment"

# Dry run
node scripts/update-creators.js

# Execute (requires ~0.005 SOL)
CONFIRM=true node scripts/update-creators.js
```

**Expected Result:**
- Creator address set to your wallet
- Verified flag set to `true`
- Transaction confirmed on Solana

### Step 2: Prepare Logo

```bash
# Download current logo from IPFS
curl -s "https://ipfs.io/ipfs/bafybeiasgox3kcgxustfjfipoeu6xqlpu5io6rdpsxltuy6vbzp7d255zu" -o logo-original.png

# Check dimensions
file logo-original.png

# If needed, resize to 512x512
convert logo-original.png -resize 512x512 logo.png
```

### Step 3: Fork and Clone Token List Repo

```bash
# Fork on GitHub first: https://github.com/solana-labs/token-list

# Clone your fork
git clone https://github.com/YOUR_USERNAME/token-list.git
cd token-list

# Create branch
git checkout -b add-myxn-token
```

### Step 4: Add Token Info

```bash
# Edit src/tokens/solana.tokenlist.json
# Add the token info JSON above in alphabetical order by symbol

# Create logo directory
mkdir -p assets/mainnet/3NVKYBqjuhLzk5FQNBhcExkruJ7qcaZizkD7Q7veyHGH

# Copy logo
cp /path/to/logo.png assets/mainnet/3NVKYBqjuhLzk5FQNBhcExkruJ7qcaZizkD7Q7veyHGH/logo.png

# Validate
npm install
npm test
```

### Step 5: Create Pull Request

```bash
git add .
git commit -m "Add MYXN token"
git push origin add-myxn-token

# Create PR on GitHub
# Title: "Add MYXN (MyXen) token"
# Description: Brief project description with links
```

### Step 6: Monitor PR

- Check daily for reviewer comments
- Respond promptly to requested changes
- Typical merge time: 3-7 days

## 📊 Current Token Status

**Token Details:**
- Mint: `3NVKYBqjuhLzk5FQNBhcExkruJ7qcaZizkD7Q7veyHGH`
- Symbol: `MYXN`
- Name: `MyXen`
- Decimals: `9`
- Supply: `1,000,000,000`

**Metadata:**
- URI: `ipfs://bafkreiholwopitkccosr6ebn42frwmpwlzel2c4fcl6wdsvk6y7rwx337a`
- Logo: `ipfs://bafybeiasgox3kcgxustfjfipoeu6xqlpu5io6rdpsxltuy6vbzp7d255zu`

**Links:**
- Website: https://myxenpay.finance
- Twitter: https://x.com/myxenpay
- Telegram: https://t.me/myxenpay
- GitHub: https://github.com/bikkhoto/myxenpay.finance
- Whitepaper: https://myxenpay.finance/whitepaper.php

## ⚠️ Important Notes

1. **Creator Verification First**: Must complete before token list submission
2. **Logo Quality**: 512x512 PNG, transparent background recommended
3. **Response Time**: Reply to PR comments within 24 hours
4. **Liquidity**: Adding DEX liquidity helps approval process
5. **Patience**: Token list PRs can take 1-2 weeks to merge

## 🔍 Verification After Submission

Once merged, verify token appears in:

**Phantom Wallet:**
```
1. Open Phantom
2. Search for MYXN or paste address
3. Should show logo and name
```

**Solscan:**
```
https://solscan.io/token/3NVKYBqjuhLzk5FQNBhcExkruJ7qcaZizkD7Q7veyHGH
```

**Jupiter:**
```
https://jup.ag/swap/SOL-MYXN
```

## 📞 Support

If submission is rejected or delayed:
- Check GitHub PR comments for feedback
- Join Solana Discord: https://discord.gg/solana
- Review other successful token submissions for reference

## 🎯 Success Criteria

Token is successfully listed when:
- ✅ Appears in Phantom wallet with logo
- ✅ Shows metadata in Solscan
- ✅ Available for trading on Jupiter
- ✅ Listed on CoinGecko (optional, takes longer)

---

**Next Steps:**
1. Run `update-creators.js` to verify creator
2. Prepare 512x512 PNG logo
3. Fork token-list repo
4. Create PR with token info + logo
5. Monitor and respond to PR comments

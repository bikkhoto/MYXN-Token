# MYXN Token - Official Repository

**Status:** ✅ PRODUCTION READY  
**Network:** Solana Mainnet  
**Token Mint Address:** `BiG61e2Xk5aYuRXCW5LzsUSE2PCHsJHjrYUrdQ5ZBU8z`  
**Total Supply:** 1,000,000,000 MYXN (Fixed, Immutable)

---

## 🔐 Token Security Status

| Feature | Status | Details |
|---------|--------|---------|
| Mint Authority | ✅ REVOKED | Cannot create new tokens |
| Freeze Authority | ✅ REVOKED | Cannot freeze accounts |
| Supply | ✅ FIXED | 1 Billion MYXN (permanent) |
| Metadata | ✅ IMMUTABLE | Token info locked |

**Security Verification on SolScan:**
- ✅ [Mint Authority Revoked](https://solscan.io/tx/2efr2arVnMrboeTvHeujMeY253TJEX9YLCL285MRs9TtQpAbqwmDU9VSAKoyFceaChaprCuhKFoL7viurzfsMiaJ?cluster=mainnet-beta)
- ✅ [Freeze Authority Revoked](https://solscan.io/tx/62USW8LkTJLHSUDPXbQZPz35NEXDN4ESMMcKcwmSydbWqkEWmUXVp4iuV6ryQrn4EAfzoZ1JWJFHRbDCnSnGuGcK?cluster=mainnet-beta)

---

## 📁 Repository Structure

```
MYXN-Token/
├── README.md                          # 📖 This file
├── .gitignore                         # 🔐 Security - prevents uploading secrets
│
├── User Data/
│   ├── metadata.json                 # Token metadata (public)
│   ├── fee_distribution_config.json  # Fee system config
│   ├── Wallet List with address.txt  # Public wallet info
│   ├── token-icon.png               # Token logo/icon
│   ├── Public Key.txt                # Public key (safe)
│   └── Official Git Repo list.txt    # Repository links
│
├── myxen-presale/                    # Presale smart contracts & scripts
│   ├── scripts/
│   │   ├── fee_distribution_system.ts      # Fee distribution logic
│   │   ├── monthly_auto_burn.ts            # Monthly burn mechanism
│   │   ├── verify_token_security.ts        # Check authorities
│   │   ├── fix_token_security.ts           # Revoke authorities
│   │   └── check_balance.ts                # Check wallet balance
│   ├── docs/
│   │   └── TOKEN_SECURITY_HARDENING.md    # Security implementation
│   └── config/
│
├── MYXN-Mainnet-Deployment/          # Mainnet deployment files
├── MYXN-Mainnet-Deployment/          # Deployment & configuration
│
├── Documentation/
│   ├── FEE_DISTRIBUTION_SYSTEM.md          # 📖 Fee system guide
│   ├── FEE_DISTRIBUTION_QUICK_REFERENCE.md # 🚀 Quick start
│   ├── FEE_DISTRIBUTION_INTEGRATION.md     # 👨‍💻 Developer guide
│   ├── FEE_DISTRIBUTION_COMPLETE.md        # ✅ Summary & checklist
│   ├── FEE_DISTRIBUTION_INDEX.md           # 📑 Navigation
│   ├── BURN_TIMELINE_CORRECTION.md         # 🔥 Burn schedule
│   ├── LISTING_QUICK_START.md              # 🚀 Token listings
│   └── SUBMISSION_TEMPLATES.md             # 📋 Listing templates
│
└── .git/                              # Git repository data
```

---

## 🚀 Quick Start Guide

### 1. Verify Token Security (Confirm Immutability)
```bash
cd myxen-presale
npx ts-node scripts/verify_token_security.ts --network mainnet-beta
```
**Expected Output:** Both authorities confirmed REVOKED ✅

### 2. Check Wallet Balance
```bash
npx ts-node scripts/check_balance.ts
```

### 3. Test Fee Distribution System
```bash
npx ts-node scripts/fee_distribution_system.ts --dry-run --network mainnet-beta
```

### 4. View Fee Configuration
```bash
cat ../User\ Data/fee_distribution_config.json
```

### 5. Submit for Token Listings
See **LISTING_QUICK_START.md** for detailed step-by-step instructions for:
- Magic Eden
- SolScan
- Raydium
- Jupiter
- OKX
- Binance
- Other exchanges

---

## 📞 Official Links & Communities

### 🌐 Official Website
- **Website:** https://myxenpay.finance
- **Whitepaper:** https://myxenpay.finance/whitepaper.php

### 🔗 Social Media & Communities
- 🐙 **GitHub:** https://github.com/bikkhoto/MYXN-Token.git
- 🐦 **Twitter:** https://x.com/myxenpay
- 📱 **Telegram:** https://t.me/myxenpay
- 🔴 **Reddit:** https://www.reddit.com/user/MyXen_Inc/
- ✏️ **Medium:** https://medium.com/@myxeninc
- 📸 **Instagram:** https://www.instagram.com/myxenp_inc/
- 👥 **Facebook:** https://www.facebook.com/myxen.foundation/

### 🏢 Corporate
- 🏛️ **MyXen Foundation:** https://myxenfoundation.org
- 💼 **Business:** info@myxenpay.finance
- 📧 **Support:** support@myxenpay.finance

---

## 💰 Presale Information

### Presale Overview
| Allocation | Tokens | Details |
|-----------|--------|---------|
| **Total Presale** | **500,000,000 MYXN** | 50% of total supply |
| **Private Presale** | 150,000,000 MYXN | Early contributors & partners |
| **Public Presale** | 350,000,000 MYXN | Community & public sale |

### Pricing Structure

**Private Presale (150M MYXN)**
- **Price:** $0.007 per MYXN
- **Allocation:** Early-bird & strategic partners
- **Vesting:** 20% lifetime allocation of MyXen Foundation stake
- **Special Benefit:** Receive 20% of All MyXen Foundation's Monthly Revenue (LIFETIME)
- **Status:** Early Contributors Program

**Public Presale (350M MYXN)**
- **Price:** $0.01 per MYXN  
- **Allocation:** Open to all community members
- **Launch Date:** December 15, 2025
- **Network:** Solana Mainnet
- **Status:** Coming Soon

### Private Buyer Benefits
```
🎁 Exclusive Lifetime Rewards
├─ Price: $0.007 per MYXN (30% discount vs public)
├─ Allocation: Up to 150,000,000 MYXN available
├─ Vesting: 20% lifetime stake in MyXen Foundation
├─ Monthly Rewards: 20% of foundation's monthly revenue
├─ Duration: LIFETIME (no expiration)
└─ Status: Limited to early contributors & strategic partners
```

### Fee Distribution System
All transactions include a small fee structure:
- **General Users:** 0.075%
- **Freelancers/Payroll/Merchants:** 0.05%
- **Students:** 0% (FREE)

Fee Distribution Breakdown:
- 🔥 **10% → Burn** (Permanent supply reduction)
- ❤️ **30% → Charity** (MyXen Life Foundation)
- 💧 **20% → Liquidity** (Market support)
- 🏦 **40% → Treasury** (Operations & growth)

Monthly auto-burn happens on the last day of every month at 00:00 UTC.

---

## ✅ Presale Information

| Detail | Value |
|--------|-------|
| Launch Date | **December 15, 2025** |
| Total Supply | 1,000,000,000 MYXN |
| Presale Allocation | 500,000,000 MYXN (50%) |
| Network | Solana Mainnet |
| Decimals | 9 |

---

## 📚 Documentation Index

| Document | Purpose | Best For |
|----------|---------|----------|
| **README.md** | 📖 Project overview (this file) | Getting started |
| **LISTING_QUICK_START.md** | 🚀 Token exchange listings | Listing on DEXs/CEXs |
| **SUBMISSION_TEMPLATES.md** | 📋 Copy-paste templates | Quick submissions |
| **FEE_DISTRIBUTION_SYSTEM.md** | 📖 Complete fee guide | Understanding fees |
| **FEE_DISTRIBUTION_QUICK_REFERENCE.md** | ⚡ Quick fee lookup | Fast answers |
| **FEE_DISTRIBUTION_INTEGRATION.md** | 👨‍💻 Developer integration | Building with MYXN |
| **FEE_DISTRIBUTION_COMPLETE.md** | ✅ Summary & checklist | Project planning |
| **FEE_DISTRIBUTION_INDEX.md** | 📑 Navigation guide | Finding information |
| **BURN_TIMELINE_CORRECTION.md** | 🔥 Burn schedule | Monthly burn details |
| **TOKEN_SECURITY_HARDENING.md** | 🔐 Security details | Security verification |

---

## 🔐 Security & Privacy

### ⚠️ IMPORTANT - Files Never Committed to Git

The following sensitive files are **PROTECTED** by `.gitignore` and will **NEVER** be uploaded:
- ❌ `Mintwallet Privatekey.txt` - Private keys
- ❌ `.env` files - Environment variables
- ❌ Any files with keywords: `private`, `secret`, `key`, `credential`

**Why this matters:**
- Private keys grant full wallet access
- Environment variables contain sensitive data
- Anyone with these files can access/steal your funds
- GitHub repositories are public - never upload secrets!

### ✅ Safe Files (Public, Always OK to Share)
- `metadata.json` - Token info
- `Wallet List with address.txt` - Public wallet addresses
- `Public Key.txt` - Public keys (safe)
- `token-icon.png` - Token logo
- All `.md` documentation files
- All TypeScript source code files

### 🔍 Before Every Git Commit
Always check:
```bash
# See what will be committed
git status

# See what will actually be pushed
git diff --cached

# Verify no sensitive files
git check-ignore -v User\ Data/*
```

---

## 📞 Support & Contact

**Need Help?**
1. 📖 Check **LISTING_QUICK_START.md** for listings guidance
2. 📚 Check **FEE_DISTRIBUTION_SYSTEM.md** for fee questions
3. 💬 Join **Telegram:** https://t.me/myxenpay
4. 🌐 Visit **Website:** https://myxenpay.finance
5. 📧 Email **Support:** support@myxenpay.finance

**Want to Contribute?**
- Fork this repository
- Create a feature branch: `git checkout -b feature/your-feature`
- Commit changes: `git commit -m 'Add feature'`
- Push to branch: `git push origin feature/your-feature`
- Open a Pull Request

**Found a Security Issue?**
⚠️ Please DO NOT open a public issue. Instead:
- Email: security@myxenpay.finance
- Describe the issue
- Wait for confirmation before disclosing publicly

---

## 📜 License & Terms

**Token Contract:** Deployed on Solana Mainnet  
**Mint Authority:** ✅ PERMANENTLY REVOKED  
**Freeze Authority:** ✅ PERMANENTLY REVOKED  
**Supply:** ✅ FIXED (1,000,000,000 MYXN)

This token contract is **IMMUTABLE** and operates according to SPL Token standards.

All repository code is provided **AS IS** for informational purposes.

---

## 📊 Key Statistics

```
Network:              Solana Mainnet
Token Standard:       SPL Token (fungible)
Total Supply:         1,000,000,000 MYXN
Decimals:            9
Mint Authority:      🔐 REVOKED
Freeze Authority:    🔐 REVOKED
Token Metadata:      🔐 LOCKED

Presale Allocation:   500,000,000 MYXN (50%)
├─ Private:          150,000,000 MYXN @ $0.007
└─ Public:           350,000,000 MYXN @ $0.01

Fee Structure:
├─ General:          0.075%
├─ Pro (Freelance):  0.05%
└─ Student:          0% (FREE)

Distribution:
├─ Burn:             10% (destroyed)
├─ Charity:          30% (foundation)
├─ Liquidity:        20% (pools)
└─ Treasury:         40% (operations)
```

---

**Last Updated:** December 8, 2025  
**Status:** ✅ Production Ready  
**Version:** 1.0  

---

## 🎯 Next Steps

1. ✅ Review this README
2. ✅ Check token security status (authorities revoked)
3. ⏳ December 9-14: Integration & testing
4. 🚀 December 15: Presale launch
5. 🔥 January 31, 2026: First monthly burn

**Ready to launch MYXN!** 🚀

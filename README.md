<p align="center">
  <img src="tests/Gemini_Generated_Image_5o2u165o2u165o2u.png" alt="MYXN Token Header" width="100%">
</p>

# $MYXN Token - MyXen Foundation 

[![Solana](https://img.shields.io/badge/Blockchain-Solana-green)](https://solana.com/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Status](https://img.shields.io/badge/Status-Development-orange)](https://myxen.org)
[![CodeQL Advanced](https://github.com/bikkhoto/MYXN-Token/actions/workflows/codeql.yml/badge.svg)](https://github.com/bikkhoto/MYXN-Token/actions/workflows/codeql.yml)

**The official Solana SPL Token repository for the MyXen Foundation V2 Ecosystem.**

MyXen is a next-generation, KYC-secured crypto super-app offering 22 integrated services—from payments and remittances to charity and governance. $MYXN is the utility token that powers this entire ecosystem.

---

## 🔵 Token Information

- **Token Name:** MyXen
- **Symbol:** MYXN
- **Decimals:** 9
- **Total Supply:** 1,000,000,000 (1 Billion)
- **Blockchain:** Solana (SPL Standard)

### 📍 Official Mainnet Addresses
**⚠️ Verify these addresses on the Solana Explorer before interacting.**

| Role | Address | Description |
| :--- | :--- | :--- |
| **Mint Address (LIVE)** | `3NVKYBqjuhLzk5FQNBhcExkruJ7qcaZizkD7Q7veyHGH` | **Active mainnet token** - [View on Explorer](https://explorer.solana.com/address/3NVKYBqjuhLzk5FQNBhcExkruJ7qcaZizkD7Q7veyHGH) |
| **Treasury Wallet** | `6S4eDdYXABgtmuk3waLM63U2KHgExcD9mco7MuyG9f5G` | Managed via Multisig (5/7 signers). |
| **Burn Wallet** | `13m6FRnMKjcyuX53ryBW7AJkXG4Dt9SR5y1qPjBxSQhc` | Address where tokens are permanently destroyed. |

**Legacy Mint** (Deprecated): `CHXoAEvTi3FAEZMkWDJJmUSRXxYAoeco4bDMDZQJVWen`

---

## 📊 Tokenomics

$MYXN is designed with a deflationary utility model.

- **Presale Allocation:** 500,000,000 MYXN
- **Transaction Fees:** 0.075% (General) / 0.05% (Freelancer/Payroll) / 0% (Education)

### Fee Distribution Mechanism
Every transaction fee collected by the platform is distributed as follows:

1.  🔥 **10% Burn:** Permanently removed from circulation (sent to Burn Wallet).
2.  ❤️ **30% Charity:** Funds the MyXen Life foundation.
3.  💧 **20% Liquidity:** Auto-added to the Liquidity Pool.
4.  🏦 **40% Treasury:** Funds development, operations, and marketing.

<p align="center">
  <img src="tests/Gemini_Generated_Image_vj2l6pvj2l6pvj2l.png" alt="MYXN Ecosystem" width="100%">
</p>

---

## 🛠 Technical Setup

This repository contains the Anchor programs (if applicable), SPL token metadata scripts, and management tools.

### Prerequisites
- [Rust](https://www.rust-lang.org/tools/install)
- [Solana CLI](https://docs.solanalabs.com/cli/install)
- [Anchor](https://www.anchor-lang.com/docs/installation)
- Node.js & Yarn

### Installation

1. **Clone the repo**
   ```bash
   git clone https://github.com/bikkhoto/MYXN-Token.git
   cd MYXN-Token
   ```

2.  **Install Dependencies**

    ```bash
    yarn install
    ```

3.  **Configure Solana Environment (Devnet)**

    ```bash
    solana config set --url devnet
    ```

### Deployment Scripts

#### Mainnet Deployment (Production)
```bash
# Deploy token to mainnet
export CONFIRM_MAINNET=true
node scripts/deploy-mainnet-simple.js

# Attach metadata
export TOKEN_MINT=3NVKYBqjuhLzk5FQNBhcExkruJ7qcaZizkD7Q7veyHGH
node scripts/attach-metadata-mainnet-umi.js

# Deploy presale program
anchor build
anchor deploy --provider.cluster mainnet
```

#### Testing & Development
```bash
# Run token function tests
node tests/test-token-functions.js

# Test Anchor program
bash tests/test-anchor-program.sh

# Devnet deployment
solana config set --url devnet
node scripts/create-mint-and-supply.js
```

### Project Structure
```
├── programs/               # Anchor smart contracts
│   └── myxn-presale/      # Presale program with vesting
├── scripts/               # Deployment and utility scripts
│   ├── deploy-mainnet-simple.js
│   ├── attach-metadata-mainnet-umi.js
│   └── create-mint-mainnet.js
├── metadata/              # Token metadata & icon
├── tests/                 # Comprehensive test suites
└── docs/                  # Full documentation
```

### Documentation
- [Mainnet Deployment Guide](./MAINNET_DEPLOYMENT_GUIDE.md) - Complete deployment walkthrough
- [Test Summary](./TEST_SUMMARY.md) - 9/9 tests passed
- [Devnet Success](./DEVNET_SUCCESS.md) - Devnet testing results

---

## 🌐 Ecosystem Integration

This token connects to the MyXen Super-App services:

  - **Backend:** Laravel API Monorepo
  - **Mobile:** Flutter
  - **Services:** MyXenPay, Remittance, Marketplace, University Platform, etc.

For full ecosystem documentation, please visit the [Developer Portal](https://developer.myxen.org).

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

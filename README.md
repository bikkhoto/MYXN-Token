# $MYXN Token - MyXen Foundation 

[![Solana](https://img.shields.io/badge/Blockchain-Solana-green)](https://solana.com/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Status](https://img.shields.io/badge/Status-Development-orange)](https://myxen.org)

**The official Solana SPL Token repository for the MyXen Foundation V2 Ecosystem.**

MyXen is a next-generation, KYC-secured crypto super-app offering 22 integrated services—from payments and remittances to charity and governance. $MYXN is the utility token that powers this entire ecosystem.

---

## 🔵 Token Information

- **Token Name:** MyXen
- **Symbol:** MYXN
- **Decimals:** 9
- **Total Supply:** 1,000,000,000 (1 Billion)
- **Blockchain:** Solana (SPL Standard)

### 📍 Official Addresses
**⚠️ Verify these addresses on the Solana Explorer before interacting.**

| Role | Address | Description |
| :--- | :--- | :--- |
| **Mint Address** | `CHXoAEvTi3FAEZMkWDJJmUSRXxYAoeco4bDMDZQJVWen` | The contract address of the token. |
| **Treasury Wallet** | `6S4eDdYXABgtmuk3waLM63U2KHgExcD9mco7MuyG9f5G` | Managed via Multisig (5/7 signers). |
| **Burn Wallet** | `13m6FRnMKjcyuX53ryBW7AJkXG4Dt9SR5y1qPjBxSQhc` | Address where tokens are permanently destroyed. |

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

### Scripts

  - `yarn mint`: Scripts to initialize the token mint (Devnet only).
  - `yarn metadata`: Updates the On-Chain metadata (Name, Symbol, Logo).
  - `yarn transfer`: Helper script for batch transfers.

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

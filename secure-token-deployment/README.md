# Secure MYXN Token Deployment

This repository contains the scripts and configuration needed to deploy a new secure version of the MYXN token after a wallet compromise incident.

## Overview

The secure token (MYXNS) is designed with enhanced security measures:
- New mint address with fresh keypair
- Multi-signature requirements for authority transfers
- Timelock mechanisms for authority changes
- Emergency procedures for security incidents

## Prerequisites

1. Node.js v16+
2. Solana CLI tools
3. Sufficient SOL in treasury wallet (minimum 0.5 SOL)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy and configure environment variables:
```bash
cp .env.example .env
# Edit .env with your values
```

3. Ensure you have the treasury keypair file at the path specified in `TMP_KEYPAIR_PATH`

## Deployment Process

### 1. Deploy Token Contract

```bash
# Set CONFIRM_MAINNET=true in .env first
npm run deploy
```

This will:
- Create a new mint account
- Create a treasury token account
- Mint the total supply to the treasury
- Save deployment details to `deployment-record.json`

### 2. Attach Metadata

```bash
npm run attach-metadata
```

This will:
- Attach Metaplex metadata to the token
- Save metadata details to `metadata-record.json`

### 3. Transfer Authorities (Recommended)

For enhanced security, transfer mint and freeze authorities to a multisig wallet:

```bash
npm run transfer-authorities
```

## Security Recommendations

1. **Immediate Actions:**
   - Transfer mint/freeze authorities to a multisig wallet
   - Set up a 2-of-3 multisig with keys held by different team members
   - Store keypairs in hardware wallets or secure offline storage

2. **Ongoing Practices:**
   - Never commit keypair files to version control
   - Regularly audit token contracts and associated wallets
   - Monitor token activity on chain explorers
   - Implement timelocks for authority changes

3. **Emergency Procedures:**
   - Contact team immediately for security incidents
   - Use freeze authority if malicious activity is detected
   - Coordinate with exchanges to delist compromised tokens

## Directory Structure

```
secure-token-deployment/
├── keypairs/                 # Keypair files (NEVER commit to git)
│   ├── new-mint-keypair.json # New token mint keypair
│   └── treasury-keypair.json # Treasury wallet keypair (example)
├── metadata/                 # Token metadata
│   └── secure-token-metadata.json # Metadata definition
├── scripts/                  # Deployment scripts
│   ├── deploy-secure-token.js     # Main deployment script
│   ├── attach-metadata.js         # Metadata attachment script
│   └── transfer-authorities.js    # Authority transfer script
├── .env.example              # Environment variables template
├── deployment-record.json    # Generated after deployment
├── metadata-record.json      # Generated after metadata attachment
└── package.json              # Project dependencies
```

## Token Details

- **Name:** MyXen Secure
- **Symbol:** MYXNS
- **Decimals:** 9
- **Total Supply:** 1,000,000,000 MYXNS
- **Type:** SPL Token on Solana

## Support

For issues or questions, contact the MyXenPay team at security@myxenpay.finance.
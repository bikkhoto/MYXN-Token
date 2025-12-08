# Devnet Token Deployment

This directory contains scripts for deploying and testing a token on Solana Devnet using your actual wallet addresses.

## Overview

This deployment uses:
- Your treasury wallet address: `HDaSHPBdE61agHAgajStypwu639E5N7TEBGiqLjfEoMu`
- A new mint keypair generated specifically for devnet testing
- 1 billion token supply with 9 decimals

## Setup

1. Install dependencies:
```bash
npm install
```

2. The `.env` file is already configured with your wallet addresses

## Deployment

Run the deployment script:
```bash
npm run deploy
```

This will:
1. Generate a new keypair for the token mint
2. Create a temporary treasury keypair for devnet testing
3. Airdrop 1 SOL to the treasury for transaction fees
4. Create the token mint account
5. Create a token account for the treasury
6. Mint the total supply to the treasury
7. Save deployment details to `deployment-record.json`

## Testing Process

The deployment script will:
- Create a new token on devnet
- Mint 1 billion tokens to the treasury
- Verify all operations completed successfully
- Provide explorer links for verification

## Next Steps

After successful devnet testing:
1. Deploy to mainnet using your actual treasury keypair
2. Implement metadata integration
3. Set up authority management
4. Configure security measures

## Important Notes

- This is for testing purposes only
- The treasury keypair generated is temporary and will be discarded
- Actual mainnet deployment will use your real treasury keypair
- Always test thoroughly on devnet before mainnet deployment
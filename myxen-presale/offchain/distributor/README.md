MyXen distribution worker

This folder contains a minimal scaffold for a distribution worker that reads contributor accounts from the on-chain program, computes vested amounts, and builds token transfer transactions for claiming vested tokens.

This scaffold is not fully automated — private keys, multisig signing, and safety checks must be done locally.

Quick start:

1. Install dependencies:

```bash
npm install @solana/web3.js @project-serum/anchor @solana/spl-token
```

2. Configure `config/default.json` with `DISTRIBUTION_WALLET` and program ID.

3. Run the distributor in dry-run mode to print pending transfers:

```bash
ts-node offchain/distributor/run_distributor.ts --dry-run
```

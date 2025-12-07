# MYXN Presale: Complete Execution Guide

This guide walks through building, testing, and deploying the MYXN presale system from scratch.

## Prerequisites

- **Node.js 18+** and **npm**
- **Rust 1.70+** and **Cargo**
- **Anchor CLI 0.27.0+** (`cargo install --git https://github.com/coral-xyz/anchor avm` then `avm install 0.27.0`)
- **Solana CLI 1.18+** (`curl https://release.solana.com/v1.18.0/install | sh`)
- **Keypairs** for:
  - Devnet payer (funded with SOL from devnet faucet)
  - Mainnet payer (funded with SOL)
  - Distribution wallet (for claiming and distributing tokens)

---

## Setup

### 1. Install Dependencies

```bash
cd myxen-presale
npm install
```

Install key packages:
- `@project-serum/anchor` — Anchor TypeScript/JavaScript client
- `@solana/web3.js` — Solana blockchain client
- `@solana/spl-token` — SPL token library
- `@coral-xyz/anchor` — Anchor core
- `ts-node` — TypeScript runtime
- `typescript` — TypeScript compiler

### 2. Configure Keypair

Set the Solana CLI default payer:

```bash
solana config set --keypair ~/.config/solana/devnet_payer.json
solana config set --url devnet  # or mainnet-beta
```

Or export the keypair path:

```bash
export ANCHOR_WALLET=~/.config/solana/devnet_payer.json
```

### 3. Review Configuration

Edit `config/default.json` to verify all presale parameters:

```json
{
  "TOKEN_MINT": "3NVKYBqjuhLzk5FQNBhcExkruJ7qcaZizkD7Q7veyHGH",
  "TREASURY_ADDRESS": "H1Lq4SN2tADNqHzVkCkLayoDpdujVxu2RaHvmbg9ifH9",
  "PRESALE_PRICE_USD": 0.007,
  "MIN_BUY_USD": 35,
  "MAX_BUY_USD": 5000,
  "PRESALE_START": "2025-12-15T00:00:00Z",
  "PRESALE_END": "2026-01-15T23:59:59Z",
  "DISTRIBUTION_START": "2026-01-18T00:00:00Z",
  "DAILY_RELEASE_BPS": 500,
  "VESTING_DAYS": 20,
  "ACCEPTED_SPL_MINTS": ["EPjFWaLb3odcccccccccccccccccccccccccccccccccc", "..."],
  "ORACLE_PUBKEY": "8KxK9hpk4hrvkgafRcSJygADKhWj7KaGTWfyx7RhqpNF",
  "DISTRIBUTION_WALLET": "3sS4PVQBsutDyH1gj7bDmkSXY7ymS9kgjPFcj84KXt3k",
  "DISTRIBUTION_WALLET_2": "5DmFJMduNjCPpWrfrAFVyJ1qeBvLUVqF9YpjAfCRTQHz",
  "DISTRIBUTION_WALLET_3": "..."
}
```

---

## Build

### 4. Compile Anchor Program

```bash
cd anchor
anchor build
```

This generates:
- `target/debug/myxen_presale.so` — compiled program binary
- `target/idl/myxen_presale.json` — IDL (Interface Description Language) for TypeScript client generation

If you see Rust compilation errors, ensure:
- Rust version: `rustc --version` (should be 1.70+)
- Anchor: `anchor --version` (should be 0.27.0)

### 5. Deploy to Devnet (First Time)

```bash
anchor deploy --provider.cluster devnet
```

This will:
1. Compile the program (if not already built)
2. Airdrop SOL to your payer if needed
3. Deploy the program binary and update `Anchor.toml` with the new program ID

**Save the deployed Program ID** — you'll need it for subsequent steps.

Update `Anchor.toml`:
```toml
[programs.devnet]
myxen_presale = "YOUR_NEW_PROGRAM_ID"
```

And update `config/default.json`:
```json
{
  "PROGRAM_ID": "YOUR_NEW_PROGRAM_ID"
}
```

---

## Initialize Presale On-Chain

### 6. Create PresaleConfig PDA

Run the migration script to initialize the presale configuration:

```bash
ts-node scripts/init_presale.ts config/default.json
```

This will:
1. Read configuration from `config/default.json`
2. Derive the deterministic config PDA seed: `["presale-config", token_mint]`
3. Call `program.rpc.initialize()` to create the on-chain PresaleConfig
4. Print the config PDA address for reference

**Expected output:**
```
Config PDA: Presale1234567890abcdefg...
Transaction: https://solscan.io/tx/...
Presale initialized successfully.
```

---

## Test: Attestation Signing

### 7. Create Signed USD Attestations

To test the presale buy() function with attestation-verified pricing, sign a test attestation:

```bash
ts-node scripts/create_attestation.ts 9B5X4brJMYh... 3500000 1
```

Where:
- `9B5X4brJMYh...` is the test payer's public key
- `3500000` is the amount in USD cents (i.e., $35.00)
- `1` is a nonce (incremented per buy to prevent replay)

**Expected output:**
```json
{
  "payer": "9B5X4brJMYh...",
  "usd_amount": 3500000,
  "nonce": 1,
  "signature": "..."
}
```

Use this attestation in a `buy()` call for USDC/USDT purchases.

---

## Buy (Test as User)

### 8. Purchase Tokens During Presale

To test a presale purchase, use the TypeScript client:

```typescript
// scripts/test_buy.ts (create this file)
import * as anchor from '@project-serum/anchor';
import { PublicKey } from '@solana/web3.js';

const program = new anchor.Program(idl, programId, provider);
const attestation = {
  payer: provider.wallet.publicKey,
  usd_amount: 3500000, // $35
  nonce: 1,
  signature: Buffer.from([...]) // from create_attestation.ts
};

await program.rpc.buy(
  new anchor.BN(3500000), // amount in cents
  'SOL', // currency type
  attestation,
  {
    accounts: {
      config: configPDA,
      contributor: contributorPDA,
      payer: provider.wallet.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    },
  }
);
```

Or use Anchor test framework:

```bash
anchor test --provider.cluster devnet
```

(Write tests in `tests/myxen_presale.ts`)

---

## Distribute (Post-Vesting)

### 9. Run Distributor to Send Claims

After the vesting start date (Jan 18, 2026), run the distributor:

```bash
# Dry-run mode (show what would be distributed)
ts-node offchain/distributor/run_distributor.ts --dry-run --network devnet

# Preview mode (calculate vested amounts, no TX)
ts-node offchain/distributor/run_distributor.ts --network devnet

# Execute mode (send actual claim transactions)
ts-node offchain/distributor/run_distributor.ts --execute --network devnet
```

This will:
1. Scan all Contributor accounts
2. Calculate each contributor's claimable tokens (based on vesting schedule)
3. Send `claim()` instructions to transfer vested tokens
4. Log transaction hashes and outcomes

---

## Admin Operations

### 10. Pause/Unpause Presale

If you need to stop accepting purchases:

```typescript
// scripts/pause_presale.ts
await program.rpc.pause({
  accounts: {
    config: configPDA,
    owner: provider.wallet.publicKey,
  },
});
```

### 11. Withdraw Funds (Treasury Only)

To withdraw collected USDC/USDT to the treasury wallet:

```typescript
// scripts/withdraw_funds.ts
await program.rpc.withdrawFunds(
  new anchor.BN(amountInLamports), // or SPL token units
  {
    accounts: {
      config: configPDA,
      vault: vaultPDA,
      owner: provider.wallet.publicKey,
      destinationWallet: new PublicKey(cfg.TREASURY_ADDRESS),
      tokenProgram: TOKEN_PROGRAM_ID,
    },
  }
);
```

---

## Mainnet Deployment

### 12. Deploy to Mainnet

Once satisfied with devnet testing:

```bash
anchor deploy --provider.cluster mainnet-beta
```

Then:
1. Update `Anchor.toml` with the mainnet program ID
2. Update `config/default.json` with mainnet addresses (token mint, treasury, etc.)
3. Run `ts-node scripts/init_presale.ts config/default.json` to initialize mainnet config
4. Have the oracle wallet (`ORACLE_PUBKEY`) ready to sign attestations
5. Be prepared to pause/unpause during the presale window and run distributor after vesting start

### 13. Revoke Mint Authority (IRREVERSIBLE)

Once you're confident the total token supply is finalized:

```bash
ts-node scripts/revoke_mint_authority.ts <MINT_PUBKEY> --network mainnet-beta
```

**⚠️ WARNING: This is irreversible. No more tokens can be minted.**

---

## Troubleshooting

### "Program already deployed at address X"
- You've already deployed. Update `Anchor.toml` with the existing address or deploy to a new program ID.

### "Insufficient SOL in payer account"
- Request SOL from devnet faucet: `solana airdrop 2 --url devnet`

### "Config PDA not found"
- Run `ts-node scripts/init_presale.ts config/default.json` to create it.

### "IDL not found"
- Run `anchor build` first to generate IDL at `anchor/target/idl/myxen_presale.json`.

### "Attestation signature invalid"
- Ensure the `ORACLE_PUBKEY` in config matches the key that signed the attestation.
- Verify the attestation structure: `{payer, usd_amount, nonce, signature}`.

### "Contributor not found"
- Run a test buy first to create a Contributor account.
- Check that the contributor PDA seed is correct: `["contributor", payer_pubkey]`.

---

## Verification Checklist

- [ ] Anchor program builds: `anchor build` succeeds
- [ ] Program deployed to devnet
- [ ] Config PDA initialized: `ts-node scripts/init_presale.ts config/default.json`
- [ ] Test buy transaction succeeds
- [ ] Test attestation signer: `ts-node scripts/create_attestation.ts ...`
- [ ] Contributor account created and visible
- [ ] Distributor dry-run shows pending claims
- [ ] Vesting calculation is correct (5% daily over 20 days)
- [ ] All three distribution wallets are in config
- [ ] Oracle pubkey is set correctly in config and on-chain
- [ ] Mainnet config is separate from devnet config
- [ ] Mint authority revoke script is ready (for mainnet only, when finalized)

---

## Next Steps

1. **Devnet Testing** (Now):
   - Test buy, claim, pause, withdraw functions
   - Verify Pyth price parsing with real Pyth oracle accounts
   - Test attestation signing and verification

2. **Pre-Mainnet Audit** (Week before mainnet):
   - Have a security audit review `anchor/programs/myxen_presale/src/lib.rs`
   - Test all admin functions (pause, unpause, withdraw)
   - Verify all config values match mainnet requirements

3. **Mainnet Launch** (Dec 15, 2025):
   - Deploy program to mainnet
   - Initialize mainnet config
   - Be ready to pause if needed
   - Monitor transactions and account balances

4. **Vesting + Distribution** (Jan 18, 2026 onwards):
   - Run `ts-node offchain/distributor/run_distributor.ts --execute` daily or weekly
   - Monitor that claims are processed correctly
   - Track total distributed tokens

5. **Final Cleanup** (After all vesting completes):
   - Revoke mint authority (if no more tokens needed)
   - Archive config and scripts for record-keeping

---

## Support

For issues or questions:
1. Check the **Troubleshooting** section above
2. Review Anchor docs: https://www.anchor-lang.com
3. Check Solana docs: https://docs.solana.com
4. Review SPL token docs: https://github.com/solana-labs/solana-program-library/tree/master/token

---

**Last Updated:** $(date)
**Presale Schedule:**
- Start: Dec 15, 2025
- End: Jan 15, 2026
- Distribution Start: Jan 18, 2026
- Vesting: 5% daily for 20 days

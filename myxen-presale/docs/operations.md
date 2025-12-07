Revoking mint authority (IRREVERSIBLE)

- If you want to revoke the mint authority for the token mint (prevent any further minting), you must run the revoke script or `spl-token` CLI with the current mint authority keypair. This operation is irreversible.
- A helper script was added at `scripts/revoke_mint_authority.ts`. Run it locally with a wallet that currently holds the mint authority.

Example:

```bash
# install deps if needed
npm install @solana/web3.js @solana/spl-token ts-node typescript

# then run (devnet/mainnet):
ts-node scripts/revoke_mint_authority.ts <MINT_PUBKEY> --network mainnet-beta
```

Migration / init

- `scripts/init_presale.ts` reads `config/default.json` and calls the program `initialize()` to create the `PresaleConfig` account. Build the Anchor program and ensure `anchor/target/idl/myxen_presale.json` exists before running.

Accepted SPL mints

- `config/default.json` contains `ACCEPTED_SPL_MINTS` (4 entries). Replace the `TODO_...` placeholders with the real SPL mint addresses for `USDC` and `USDT` on your target network before calling the migration script.

Notes

- Revoke the mint authority only after you have confirmed the token supply and distribution vaults are fully funded and all stakeholders agree. This is irreversible.

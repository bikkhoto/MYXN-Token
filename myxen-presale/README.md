MyXen Presale (Anchor)

WARNING: Do not deploy to mainnet until this program has been audited and multisig keys are configured.

This repository contains an Anchor-based Solana program and off-chain helpers implementing the MYXN presale rules.

Top-level folders:
- `anchor/programs/myxen_presale` — Anchor Rust program
- `offchain` — Node.js/TypeScript watcher and distribution worker
- `scripts` — deployment & demo scripts (devnet default)
- `config` — default.json and example .env
- `tests` — integration test scaffolding
- `.github/workflows` — CI for building and running tests
- `docs` — design, security, audit checklists

Presale economic constants (also in `config/default.json`):
- TOKEN_MINT: `3NVKYBqjuhLzk5FQNBhcExkruJ7qcaZizkD7Q7veyHGH`
- TREASURY_ADDRESS: `H1Lq4SN2tADNqHzVkCkLayoDpdujVxu2RaHvmbg9ifH9`
- TOTAL_PRESALE_TOKENS: 500_000_000 * 10^9
- PRIVATE_ALLOCATION: 100_000_000 * 10^9
- PUBLIC_ALLOCATION: 400_000_000 * 10^9
- etc. See `config/default.json` for full list.

Distribution & Schedule
- **Presale start:** `2025-12-15T00:00:00Z`
- **Presale end:** `2026-01-15T23:59:59Z`
- **Distribution start:** `2026-01-18T00:00:00Z`
- **Daily release:** `5%` per day (configured as `DAILY_RELEASE_BPS: 500`)
- **Vesting days:** `20`
- **Min buy:** `$35` (USD-equivalent)
- **Max per wallet:** `$5000` (USD-equivalent)
- **Accepted payment methods:** `USDC`, `USDT`, `SOL`
- **Distribution wallet (provided):** `8KxK9hpk4hrvkgafRcSJygADKhWj7KaGTWfyx7RhqpNF`

How to use (quick):
1. Install dependencies: `npm ci` in repo root and `cargo build-bpf` for Anchor programs
2. Run local devnet: `scripts/dev_local.sh` (spins up `solana-test-validator`)
3. Deploy to devnet: `scripts/deploy_devnet.sh` (defaults to devnet; requires confirmation to use mainnet)
4. Run demo buys: `npm run demo`

See `docs/` for detailed instructions and security checklist.

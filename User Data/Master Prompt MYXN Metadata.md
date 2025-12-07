# Master Prompt — **MYXN Metadata & Verification Suite (Production-Ready)**

Use this prompt **exactly** in GitHub Copilot or Gemini. It instructs the model to generate a complete, production-ready repository that implements a secure, auditable metadata management workflow for the $MYXN token on Solana Mainnet. The repo must include deterministic metadata (PRESALE = 50%), upload utilities, attach/verify scripts, hardware-wallet signing flows, devnet dry-run support, CI-friendly tests, audit-record generation, and clear runbook documentation.

**Important**: generate code only (files, folders, docs). Do NOT include any private keys or real secrets in the output — only environment-variable loading and clear instructions to use a hardware wallet for creator-signing. All scripts must be safe for devnet dry-runs and require explicit `--network mainnet-beta` or `CONFIRM=true` for mainnet.

---

## Global constants (use these exact values in generated code)

* `TOKEN_NAME = "MyXen"`
* `TOKEN_SYMBOL = "MYXN"`
* `TOTAL_SUPPLY = 1_000_000_000` (decimals = 9)
* `DECIMALS = 9`
* `PRESALE_TOKENS = 500_000_000` (50% of supply)

  * Private = 20,000,000
  * Public = 480,000,000
* `PRESALE_PRICE_USD = 0.007`
* `PRESALE_MAX_PER_WALLET_USD = 2000`
* `VESTING`: `cliff = 0`, `daily_release_bps = 500` (5%/day), `days = 20`
* `LP_TARGET_USD = 2_000_000`
* `LP_MIN_THRESHOLD_USD = 1_200_000`
* `LP_LOCK_MONTHS = 12`
* `IMAGE_CID = "bafkreiholwopitkccosr6ebn42frwmpwlzel2c4fcl6wdsvk6y7rwx337a"`
* `TREASURY_PUB = "3Pke1UY5yi1onj56DSgBta9yHJNe7CvYHxXCm1yMKEJA"`
* `PRESALE_PHASES`:

  * `{ "phase": "Private", "tokens": 20000000 }`
  * `{ "phase": "Public", "tokens": 480000000 }`
* GitHub repos to include in metadata links:

  1. [https://github.com/bikkhoto/MYXN-Token.git](https://github.com/bikkhoto/MYXN-Token.git)
  2. [https://github.com/bikkhoto/myxen-foundation.git](https://github.com/bikkhoto/myxen-foundation.git)
  3. [https://github.com/bikkhoto/Solana-DEX-Trading-Platform.git](https://github.com/bikkhoto/Solana-DEX-Trading-Platform.git)
  4. [https://github.com/bikkhoto/MyXen-Mobile-Application.git](https://github.com/bikkhoto/MyXen-Mobile-Application.git)

---

## What to generate (file tree and contents)

Produce a single repository with the structure and files below. Each file must be fully implemented, well-commented, and tested for devnet.

```
myxn-metadata-suite/
├─ README.md
├─ METADATA_RUNBOOK.md
├─ package.json
├─ .env.example
├─ metadata/
│  └─ metadata.json            # final deterministic metadata (PRESALE = 50%)
├─ scripts/
│  ├─ upload-metadata.js       # upload to web3.storage or Pinata, integrity checks
│  ├─ attach-metadata.js       # attach metadata PDA (TMP signer)
│  ├─ verify-creator-cli.js    # CLI signer version (keypair file)
│  ├─ verify-creator-web.js    # Wallet-adapter snippet for hardware wallets
│  ├─ check-metadata.js        # read & validate on-chain metadata + ipfs hash check
│  ├─ deploy-records/          # directory written at runtime (not committed)
│  └─ helper-utils.js          # shared utilities (ipfs, hashing, validation)
├─ tests/
│  ├─ test-upload.js
│  ├─ test-attach-devnet.js
│  └─ test-verify-simulation.js
├─ ci/
│  └─ lint-and-test.yml
└─ docs/
   └─ audit-proof-template.json
```

---

## metadata/metadata.json (deterministic, final)

Generate a ready-to-upload `metadata/metadata.json` using the exact values above. Requirements:

* Include `image: "ipfs://<IMAGE_CID>"` using the `IMAGE_CID` constant.
* Set `properties.creators[0].address = TREASURY_PUB` and `verified = false` initially.
* Include `properties.presale_parameters` with `presale_total_tokens`, `presale_price_usd`, `presale_max_per_wallet_usd`.
* Include `properties.presale_phases` with Private (20,000,000) and Public (480,000,000).
* Include `properties.tokenomics.allocations` with:

  * `presale_and_public: 50`, `treasury_liquidity: 10`, `team_and_advisors: 15`, `ecosystem_grants: 10`, `staking_and_rewards: 8`, `marketing_and_growth: 5`, `charity_reserve: 2`
* Include `links.github_repositories` with the four repos.
* `created_at` ISO8601 timestamp and `metadata_version: "1.0"`.

Make sure JSON keys are sorted for determinism and include no placeholders.

---

## scripts/upload-metadata.js

Node script that:

* Loads `metadata/metadata.json`.
* Uploads the file to chosen provider (support both `WEB3_STORAGE` and `PINATA` via env var `IPFS_PROVIDER`).
* After upload:

  * Downloads the uploaded CID back via public gateway.
  * Computes SHA256 of local file and downloaded file and compares — abort if mismatch.
  * Writes `deploy-records/.metadata.cids.json` containing:

    * `metadata_cid`
    * `image_cid` (from metadata.image)
    * `sha256_local`
    * `sha256_remote`
    * `timestamp`
* Logging must be verbose and human-friendly.
* Validate env vars: `WEB3_STORAGE_TOKEN` or `PINATA_JWT`.
* Exit non-zero on any mismatch.

---

## scripts/attach-metadata.js

Node script that:

* Accepts CLI args: `--mint <TOKEN_MINT>`, `--metadata-cid <CID>`, `--network <RPC_URL>`, `--confirm` (required for mainnet).
* Loads `TMP_KEYPAIR` from env var `TMP_KEYPAIR_PATH`.
* Validates TMP_KEYPAIR SOL balance >= 0.05 SOL; aborts if not.
* Uses `@metaplex-foundation/mpl-token-metadata` to create the Metadata account V2:

  * `mintAuthority` = TMP_KEYPAIR.publicKey (document this requirement in runbook)
  * `updateAuthority` = TMP_KEYPAIR.publicKey
  * `creators[0].verified = false` in the created metadata on-chain
* Prevents re-attach if metadata PDA already exists (reads PDA first and errors if present).
* Writes `deploy-records/attach-metadata-<timestamp>.json` including metadataPDA, metadataCID, txSig, and full on-chain metadata raw response.

---

## scripts/verify-creator-cli.js

Node script that:

* Accepts `--mint <TOKEN_MINT>`, `--metadata-pda <PDA>`, `--network <RPC_URL>`.
* Loads creator keypair from `CREATOR_KEYPAIR_PATH` env var and **requires** `CONFIRM=true` for mainnet.
* Builds and submits the `SignMetadata` instruction to set `creators[0].verified = true`.
* Signs with creator keypair (local or ephemeral).
* After confirm, writes `deploy-records/verify-creator-<timestamp>.json` including txSig, metadataPDA, and resulting on-chain creators array.
* Includes clear comments explaining risks and recommends hardware-wallet flow.

---

## scripts/verify-creator-web.js

Provide a complete React component (small app) that uses `@solana/wallet-adapter`:

* Component `VerifyCreatorButton` accepts `mint` and `metadataPDA`.
* Connects to wallet (Phantom/Wallet Adapter). If connected wallet pubkey !== TREASURY_PUB, shows clear error.
* Constructs `SignMetadata` instruction and requests wallet to sign & send transaction.
* Shows progress, txSig, and saves a copyable audit JSON for copy-paste into repo.
* Include instructions to run locally with `npm install` and `npm start`.

---

## scripts/check-metadata.js

Node script that:

* Accepts `--mint <TOKEN_MINT>` and `--network`.
* Computes metadata PDA, reads on-chain metadata, prints:

  * `uri`, `name`, `symbol`, `creators` (with verified flag), `isMutable`.
* Downloads metadata via `ipfs://CID` gateway, computes SHA256, compares with stored `.metadata.cids.json` (if present).
* Produces human-friendly report and writes `deploy-records/metadata-check-<ts>.json`.

---

## helper-utils.js

Include reusable helpers:

* `ipfsUpload(filePath)`, `ipfsDownload(cid)`, `sha256File(pathOrBuffer)`, `validateBase58(str)`, address & CID validators, timestamp helpers.
* Use robust error handling and retries for network calls.

---

## tests/

Create JS tests (using mocha or jest):

* `test-upload.js`: Mocks IPFS provider and verifies upload → download → hash comparison logic.
* `test-attach-devnet.js`: Uses local validator or devnet fork to simulate attach flow (create mint, mint sample supply, attach metadata).
* `test-verify-simulation.js`: Simulates SignMetadata instruction using test keypairs and verifies creator flag flips.

All tests must run in CI and pass on Node 18+.

---

## METADATA_RUNBOOK.md

Detailed operational runbook with exact command sequences and safety checks.

Include these sections:

1. **Pre-flight checks**:

   * Confirm TMP_KEYPAIR balance (`solana balance --keypair /path/to/tmp.json`)
   * Confirm TMP_KEYPAIR === mintAuthority used in `myxen-mainnet-mint.sh` (if used)
   * Confirm `metadata/metadata.json` sha256 (save it)

2. **Upload metadata**:

   ```
   WEB3_STORAGE_TOKEN=... node scripts/upload-metadata.js
   ```

   * Save `metadata_cid` from `deploy-records/.metadata.cids.json`.

3. **Attach metadata** (devnet dry-run):

   ```
   TMP_KEYPAIR_PATH=/path/to/tmp-keypair.json node scripts/attach-metadata.js --mint <TOKEN_MINT> --metadata-cid <CID> --network https://api.devnet.solana.com
   ```

   * Confirm metadataPDA printed, txSig stored.

4. **Creator verification (hardware wallet)**:

   * Recommended: run `verify-creator-web.js` locally and attach hardware wallet through Phantom/Adapter.
   * Alternative: `CREATOR_KEYPAIR_PATH=/path/to/creator.json CONFIRM=true node scripts/verify-creator-cli.js --mint <TOKEN_MINT> --metadata-pda <PDA> --network https://api.mainnet-beta.solana.com`
   * Save txSig and attach to audit.

5. **Post-verify checks**:

   ```
   node scripts/check-metadata.js --mint <TOKEN_MINT> --network https://api.mainnet-beta.solana.com
   ```

   * Expect `creators[0].verified: true` and `uri == ipfs://<METADATA_CID>`.

6. **Audit record**:

   * Provide a JSON `docs/audit-proof-template.json` filled with:

     * local metadata sha256, METADATA_CID, attach txSig, metadataPDA, verify txSig, final on-chain creators array, timestamp, operator name.

7. **Rollback & safety**:

   * Describe that metadata change requires a new CID (cannot mutate existing pin) and how to generate a new metadata CID if edits needed.
   * Emphasize hardware-wallet use & ephemeral/air-gapped keypair recommendations.

---

## CI & safety

* Add `ci/lint-and-test.yml` that runs `npm ci && npm test` on PRs.
* Linting (ESLint) and Prettier enforced.
* No secrets in repo; `.env.example` shows required envs:

  * `TMP_KEYPAIR_PATH`
  * `CREATOR_KEYPAIR_PATH` (only for CLI tests, recommend not used on mainnet)
  * `WEB3_STORAGE_TOKEN`
  * `PINATA_JWT`
  * `NETWORK`
* Scripts must require `--network` param and `--confirm` for mainnet actions; otherwise default to devnet.

---

## Documentation: README.md

* Short project summary
* Quickstart devnet steps (upload → attach → verify)
* Exact commands and expected outputs
* Safety checklist and recommended hardware-wallet procedure
* Contact & audit notes section

---

## Output quality instructions for Copilot

* Produce runnable code (no pseudocode). Use `@metaplex-foundation/mpl-token-metadata` and `@solana/web3.js`.
* Include comprehensive comments and usage examples at top of each script.
* Use Promises/async-await correctly with try/catch.
* Ensure deterministic metadata JSON (sorted keys) and include a short script or function `canonicalizeJson()` in helper-utils to canonicalize before hashing.
* All network calls must have retries and short exponential backoff.
* Tests must be deterministic when run on devnet/local validator.
* All printed tx signatures, PDAs, and hashes must also be saved to `deploy-records/` for audit.

---

## Final note to Copilot

This repo is the single source of truth for $MYXN metadata and creator verification. Be conservative: when in doubt, add a safety check, abort on ambiguous inputs, and require explicit confirmations for irreversible steps. Generate the entire repository content in one pass. End.

---

Paste the block above exactly into GitHub Copilot (or Gemini). It should now generate the complete repository described.


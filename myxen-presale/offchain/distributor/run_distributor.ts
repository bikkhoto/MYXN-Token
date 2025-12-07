#!/usr/bin/env ts-node
/**
 * run_distributor.ts
 * Distribution worker: reads contributors, computes vested amounts, and sends transfer transactions.
 * Usage: ts-node offchain/distributor/run_distributor.ts [--dry-run] [--execute] [--network devnet|mainnet-beta]
 */

import * as anchor from '@project-serum/anchor';
import { PublicKey, Keypair, Transaction, SystemProgram } from '@solana/web3.js';
import { Token, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import fs from 'fs';

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const execute = process.argv.includes('--execute');
  const network = process.argv.includes('--network') ? process.argv[process.argv.indexOf('--network')+1] : 'devnet';
  
  const cfg = JSON.parse(fs.readFileSync('config/default.json', 'utf8'));
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  let idlData: any;
  try {
    idlData = JSON.parse(fs.readFileSync('anchor/target/idl/myxen_presale.json', 'utf8'));
  } catch (e) {
    console.warn('IDL not found at anchor/target/idl/myxen_presale.json. Run `anchor build` first.');
    return;
  }

  const programId = new PublicKey(cfg.PROGRAM_ID || 'Presale1111111111111111111111111111111111111');
  const program = new anchor.Program(idlData, programId, provider);

  console.log(`[Distributor] Starting on ${network} in ${dryRun ? 'DRY-RUN' : execute ? 'EXECUTE' : 'PREVIEW'} mode`);

  // Find all contributor accounts
  const accounts = await provider.connection.getProgramAccounts(programId);
  console.log(`[Distributor] Found ${accounts.length} program-owned accounts`);

  const now = Math.floor(Date.now() / 1000);
  const distStart = new Date(cfg.DISTRIBUTION_START).getTime() / 1000;

  if (now < distStart) {
    console.log(`[Distributor] Distribution not yet started. Start date: ${cfg.DISTRIBUTION_START}`);
    return;
  }

  let claimsCount = 0;

  // Try to decode each account as a Contributor
  for (const acc of accounts) {
    try {
      const contributor = program.account.contributor?.coder?.accounts?.decode('contributor', acc.account.data);
      if (!contributor) continue;

      // Compute vested amount
      const vestStart = contributor.vesting_start_ts.toNumber?.() || contributor.vesting_start_ts;
      const elapsedSecs = now - vestStart;
      const elapsedDays = Math.floor(elapsedSecs / 86400);
      const vestDays = Math.min(elapsedDays, contributor.vesting_days || 20);

      const dailyBps = contributor.daily_release_bps?.toNumber?.() || 500; // 5%
      const claimable = contributor.claimable_tokens?.toNumber?.() || 0;
      const claimed = contributor.claimed_tokens?.toNumber?.() || 0;
      const total = claimable + claimed;

      const vestedRaw = (total * dailyBps * vestDays) / 10000;
      const vestable = Math.max(0, Math.floor(vestedRaw) - claimed);

      if (vestable > 0) {
        console.log(`[Claim] Account: ${acc.pubkey.toBase58()} | Vested: ${vestable} tokens | Elapsed days: ${vestDays}`);
        claimsCount++;

        if (execute && !dryRun) {
          try {
            // Call claim instruction
            await program.rpc.claim({
              accounts: {
                config: new PublicKey(cfg.CONFIG_PDA || 'Presale1111111111111111111111111111111111111'),
                contributor: acc.pubkey,
                payer: provider.wallet.publicKey,
                tokenProgram: TOKEN_PROGRAM_ID,
              },
            });
            console.log(`[Claim] TX sent for ${acc.pubkey.toBase58()}`);
          } catch (e: any) {
            console.error(`[Claim] Error for ${acc.pubkey.toBase58()}:`, e.message?.slice(0, 100));
          }
        }
      }
    } catch (e) {
      // skip non-matching
    }
  }

  console.log(`[Distributor] Summary: ${claimsCount} pending claims | Mode: ${dryRun ? 'DRY-RUN' : execute ? 'EXECUTE' : 'PREVIEW'}`);
}

main().catch(e => { console.error('[Distributor] Error:', e.message); process.exit(1); });

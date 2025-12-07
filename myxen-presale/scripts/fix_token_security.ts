#!/usr/bin/env ts-node
/**
 * fix_token_security.ts
 * 
 * Hardens MYXN token security by revoking mint and freeze authorities
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import { createSetAuthorityInstruction, AuthorityType, getMint } from '@solana/spl-token';
import fs from 'fs';

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const execute = process.argv.includes('--execute');
  const network = process.argv.includes('--network')
    ? process.argv[process.argv.indexOf('--network') + 1]
    : 'mainnet-beta';

  if (!dryRun && !execute) {
    console.log('❌ Mode not specified. Use --dry-run or --execute');
    console.log('Usage: ts-node scripts/fix_token_security.ts [--dry-run | --execute] [--network mainnet-beta]');
    process.exit(1);
  }

  const metadata = JSON.parse(fs.readFileSync('../User Data/metadata.json', 'utf8'));
  const tokenMint = new PublicKey(metadata.properties.token_mint);
  const connection = new Connection(`https://api.${network}.solana.com`, 'confirmed');

  // Load keypair
  let payer: Keypair;
  try {
    const keyPath = process.env.ANCHOR_WALLET || `${process.env.HOME}/.config/solana/id.json`;
    const keyData = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    payer = Keypair.fromSecretKey(Buffer.from(keyData));
  } catch (e) {
    console.error('❌ Could not load keypair. Set ANCHOR_WALLET or place keypair at ~/.config/solana/id.json');
    process.exit(1);
  }

  console.log(`\n📋 MYXN Token Security Hardening`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Network: ${network}`);
  console.log(`Token Mint: ${tokenMint.toBase58()}`);
  console.log(`Payer: ${payer.publicKey.toBase58()}`);
  console.log(`Mode: ${dryRun ? '🔍 DRY-RUN (no changes)' : '⚠️  EXECUTE (irreversible)'}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  // Fetch mint info
  let mint;
  try {
    mint = await getMint(connection, tokenMint);
  } catch (e) {
    console.error('❌ Failed to fetch token mint info:', (e as any).message);
    process.exit(1);
  }

  const actions: string[] = [];
  const transactions: Transaction[] = [];

  // Check and prepare transactions
  console.log(`📊 Current Token Status:\n`);

  // 1. Check mint authority
  const hasMintAuth = mint.mintAuthority !== null;
  console.log(`  Mintable (has mint authority): ${hasMintAuth ? '❌ YES' : '✅ NO'}`);
  if (hasMintAuth && mint.mintAuthority) {
    console.log(`    → Mint Authority: ${mint.mintAuthority.toBase58()}`);
  }

  // 2. Check freeze authority
  const hasFreezeAuth = mint.freezeAuthority !== null;
  console.log(`  Freezable (has freeze authority): ${hasFreezeAuth ? '❌ YES' : '✅ NO'}`);
  if (hasFreezeAuth && mint.freezeAuthority) {
    console.log(`    → Freeze Authority: ${mint.freezeAuthority.toBase58()}`);
  }

  // Prepare revoke transactions
  if (hasMintAuth) {
    console.log(`\n🔧 Action 1: Revoke Mint Authority`);
    console.log(`   Purpose: Make token supply fixed (no new tokens can be minted)`);
    console.log(`   Status: ${dryRun ? '(would execute)' : '(will execute)'}`);
    actions.push('Revoke mint authority');

    if (!dryRun) {
      const tx = new Transaction().add(
        createSetAuthorityInstruction(
          tokenMint,
          payer.publicKey,
          AuthorityType.MintTokens,
          null // null = revoke
        )
      );
      transactions.push(tx);
      console.log(`   ✅ Transaction prepared`);
    }
  } else {
    console.log(`\n✅ Mint Authority: Already revoked (good!)`);
  }

  // Freeze authority
  if (hasFreezeAuth) {
    console.log(`\n🔧 Action 2: Revoke Freeze Authority`);
    console.log(`   Purpose: Make tokens non-freezable`);
    console.log(`   Status: ${dryRun ? '(would execute)' : '(will execute)'}`);
    actions.push('Revoke freeze authority');

    if (!dryRun) {
      const tx = new Transaction().add(
        createSetAuthorityInstruction(
          tokenMint,
          payer.publicKey,
          AuthorityType.FreezeAccount,
          null // null = revoke
        )
      );
      transactions.push(tx);
      console.log(`   ✅ Transaction prepared`);
    }
  } else {
    console.log(`\n✅ Freeze Authority: Already revoked (good!)`);
  }

  // Summary
  console.log(`\n📋 Summary of Actions:`);
  if (actions.length === 0) {
    console.log(`   ✅ Token is already secure! No actions needed.`);
    console.log(`   Status:`);
    console.log(`      • Mint Authority: REVOKED ✅`);
    console.log(`      • Freeze Authority: REVOKED ✅`);
  } else {
    actions.forEach((action, i) => {
      console.log(`   ${i + 1}. ${action}`);
    });
  }

  // Execute
  if (execute && !dryRun && transactions.length > 0) {
    console.log(`\n⏳ Executing ${transactions.length} transaction(s)...`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    for (let i = 0; i < transactions.length; i++) {
      try {
        const sig = await sendAndConfirmTransaction(connection, transactions[i], [payer], {
          commitment: 'confirmed',
          maxRetries: 3,
        });
        console.log(`✅ Transaction ${i + 1}/${transactions.length} confirmed:`);
        console.log(`   Signature: ${sig}`);
        console.log(`   View: https://solscan.io/tx/${sig}?cluster=${network}\n`);
      } catch (e) {
        console.error(`❌ Transaction ${i + 1} failed:`, (e as any).message);
        process.exit(1);
      }
    }

    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`✅ All security hardening complete!`);
    console.log(`\n🔐 Token is now secure:`);
    console.log(`   ✅ Supply is fixed (no more minting possible)`);
    console.log(`   ✅ Tokens cannot be frozen`);
  } else if (dryRun) {
    console.log(`\n📝 DRY-RUN COMPLETE`);
    console.log(`   No changes were made. Run with --execute to apply changes.`);
  }

  console.log(`\n🔗 View on SolScan:`);
  console.log(`   https://solscan.io/token/${tokenMint.toBase58()}?cluster=${network}`);
}

main().catch((e) => {
  console.error('❌ Fatal error:', e.message);
  process.exit(1);
});

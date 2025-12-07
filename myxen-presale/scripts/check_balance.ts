#!/usr/bin/env ts-node
/**
 * check_balance.ts
 * 
 * Checks wallet balance and provides diagnostics for transaction failures
 */

import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import fs from 'fs';

async function main() {
  const network = process.argv.includes('--network')
    ? process.argv[process.argv.indexOf('--network') + 1]
    : 'mainnet-beta';

  const connection = new Connection(`https://api.${network}.solana.com`, 'confirmed');

  console.log(`\n💰 WALLET BALANCE CHECK`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Network: ${network}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  // Load keypair
  let payer: Keypair;
  try {
    const keyPath = process.env.ANCHOR_WALLET || `${process.env.HOME}/.config/solana/id.json`;
    const keyData = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    payer = Keypair.fromSecretKey(Buffer.from(keyData));
    console.log(`✅ Keypair loaded: ${payer.publicKey.toBase58()}`);
  } catch (e) {
    console.error('❌ Could not load keypair:', (e as any).message);
    process.exit(1);
  }

  // Check balance
  try {
    const balanceLamports = await connection.getBalance(payer.publicKey);
    const balanceSOL = balanceLamports / LAMPORTS_PER_SOL;

    console.log(`\n💳 Account Balance:`);
    console.log(`   Address: ${payer.publicKey.toBase58()}`);
    console.log(`   Balance: ${balanceSOL.toFixed(6)} SOL (${balanceLamports} lamports)`);

    console.log(`\n📊 Transaction Cost Analysis:`);
    console.log(`   Typical revoke transaction: ~0.0025 SOL`);
    console.log(`   Two transactions: ~0.005 SOL`);
    console.log(`   Safe buffer: ~0.01 SOL`);
    console.log(`   Recommended minimum: 0.05 SOL`);

    if (balanceSOL < 0.01) {
      console.log(`\n❌ INSUFFICIENT BALANCE`);
      console.log(`   Current: ${balanceSOL.toFixed(6)} SOL`);
      console.log(`   Required: 0.05 SOL minimum`);
      console.log(`   Shortfall: ${(0.05 - balanceSOL).toFixed(6)} SOL`);
      console.log(`\n💡 SOLUTION:`);
      console.log(`   1. Send SOL to this address from another wallet`);
      console.log(`   2. Or use a different wallet with more SOL`);
      console.log(`\n📝 Example command to send SOL:`);
      console.log(`   solana transfer ${payer.publicKey.toBase58()} 0.1 --network ${network}`);
      process.exit(1);
    } else if (balanceSOL < 0.05) {
      console.log(`\n⚠️  LOW BALANCE`);
      console.log(`   Current: ${balanceSOL.toFixed(6)} SOL`);
      console.log(`   Recommended: 0.05 SOL`);
      console.log(`   You can proceed, but consider adding more SOL`);
    } else {
      console.log(`\n✅ BALANCE SUFFICIENT`);
      console.log(`   Current: ${balanceSOL.toFixed(6)} SOL`);
      console.log(`   Ready to execute transactions`);
    }

    // Network info
    console.log(`\n🔗 Network Information:`);
    try {
      const networkVersion = await connection.getVersion();
      console.log(`   Cluster Version: ${networkVersion['solana-core']}`);
    } catch (e) {
      console.log(`   Cluster Version: Unable to fetch`);
    }

    console.log(`\n✅ Diagnostics Complete`);
    if (balanceSOL >= 0.05) {
      console.log(`\n🚀 Ready to execute: fix_token_security.ts --execute`);
    }

  } catch (e) {
    console.error('❌ Error checking balance:', (e as any).message);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('❌ Fatal error:', e.message);
  process.exit(1);
});

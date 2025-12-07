#!/usr/bin/env ts-node
/**
 * fee_distribution_system.ts
 * 
 * Manages MYXN transaction fee collection and distribution:
 * - 10% Burn (monthly auto-send to on-chain burn wallet)
 * - 30% Charity (MyXen Life Foundation)
 * - 20% Liquidity (LP Pool)
 * - 40% Treasury (Operations)
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  createTransferInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import fs from 'fs';

interface FeeConfig {
  burn_percentage: number;
  charity_percentage: number;
  liquidity_percentage: number;
  treasury_percentage: number;
  burn_wallet: string;
  charity_wallet: string;
  liquidity_wallet: string;
  treasury_wallet: string;
  token_mint: string;
}

interface FeeCollection {
  total_collected: bigint;
  burn_amount: bigint;
  charity_amount: bigint;
  liquidity_amount: bigint;
  treasury_amount: bigint;
  timestamp: number;
  transaction_count: number;
}

class FeeDistributionSystem {
  private connection: Connection;
  private payer: Keypair;
  private config: FeeConfig;
  private collections: FeeCollection[] = [];

  constructor(
    connection: Connection,
    payer: Keypair,
    configPath: string
  ) {
    this.connection = connection;
    this.payer = payer;
    this.config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }

  /**
   * Calculate fee distribution for a transaction amount
   */
  calculateDistribution(amount: bigint): {
    burn: bigint;
    charity: bigint;
    liquidity: bigint;
    treasury: bigint;
  } {
    const burn = (amount * BigInt(this.config.burn_percentage)) / BigInt(100);
    const charity = (amount * BigInt(this.config.charity_percentage)) / BigInt(100);
    const liquidity = (amount * BigInt(this.config.liquidity_percentage)) / BigInt(100);
    const treasury = (amount * BigInt(this.config.treasury_percentage)) / BigInt(100);

    return { burn, charity, liquidity, treasury };
  }

  /**
   * Record transaction fee collection
   */
  recordFeeCollection(
    amount: bigint,
    transactionCount: number = 1
  ): FeeCollection {
    const distribution = this.calculateDistribution(amount);
    const collection: FeeCollection = {
      total_collected: amount,
      burn_amount: distribution.burn,
      charity_amount: distribution.charity,
      liquidity_amount: distribution.liquidity,
      treasury_amount: distribution.treasury,
      timestamp: Date.now(),
      transaction_count: transactionCount,
    };

    this.collections.push(collection);
    return collection;
  }

  /**
   * Get current accumulated fees
   */
  getAccumulatedFees(): {
    total: bigint;
    burn: bigint;
    charity: bigint;
    liquidity: bigint;
    treasury: bigint;
    transaction_count: number;
  } {
    let total = BigInt(0);
    let burn = BigInt(0);
    let charity = BigInt(0);
    let liquidity = BigInt(0);
    let treasury = BigInt(0);
    let transactionCount = 0;

    for (const collection of this.collections) {
      total += collection.total_collected;
      burn += collection.burn_amount;
      charity += collection.charity_amount;
      liquidity += collection.liquidity_amount;
      treasury += collection.treasury_amount;
      transactionCount += collection.transaction_count;
    }

    return { total, burn, charity, liquidity, treasury, transaction_count: transactionCount };
  }

  /**
   * Distribute accumulated fees to their destinations
   */
  async distributeAccumulatedFees(dryRun: boolean = false): Promise<string[]> {
    const accumulated = this.getAccumulatedFees();

    console.log(`\n💰 FEE DISTRIBUTION REPORT`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Total Collected: ${accumulated.total.toString()} tokens`);
    console.log(`Transactions: ${accumulated.transaction_count}`);
    console.log(`\n📊 Distribution Breakdown:`);
    console.log(`  🔥 Burn (10%): ${accumulated.burn.toString()} tokens`);
    console.log(`  ❤️  Charity (30%): ${accumulated.charity.toString()} tokens`);
    console.log(`  💧 Liquidity (20%): ${accumulated.liquidity.toString()} tokens`);
    console.log(`  🏦 Treasury (40%): ${accumulated.treasury.toString()} tokens`);

    if (dryRun) {
      console.log(`\n✅ DRY RUN MODE - No transactions sent`);
      return [];
    }

    const tokenMint = new PublicKey(this.config.token_mint);
    const signatures: string[] = [];

    try {
      // Transfer to Burn Wallet
      if (accumulated.burn > BigInt(0)) {
        const sig = await this.transferTokens(
          tokenMint,
          new PublicKey(this.config.burn_wallet),
          accumulated.burn,
          '🔥 Burn'
        );
        signatures.push(sig);
      }

      // Transfer to Charity Wallet
      if (accumulated.charity > BigInt(0)) {
        const sig = await this.transferTokens(
          tokenMint,
          new PublicKey(this.config.charity_wallet),
          accumulated.charity,
          '❤️ Charity'
        );
        signatures.push(sig);
      }

      // Transfer to Liquidity Wallet
      if (accumulated.liquidity > BigInt(0)) {
        const sig = await this.transferTokens(
          tokenMint,
          new PublicKey(this.config.liquidity_wallet),
          accumulated.liquidity,
          '💧 Liquidity'
        );
        signatures.push(sig);
      }

      // Transfer to Treasury Wallet
      if (accumulated.treasury > BigInt(0)) {
        const sig = await this.transferTokens(
          tokenMint,
          new PublicKey(this.config.treasury_wallet),
          accumulated.treasury,
          '🏦 Treasury'
        );
        signatures.push(sig);
      }

      // Clear collections after successful distribution
      this.collections = [];
      console.log(`\n✅ Distribution complete! ${signatures.length} transfers sent.`);

    } catch (error) {
      console.error('❌ Distribution failed:', error);
      throw error;
    }

    return signatures;
  }

  /**
   * Transfer tokens to a destination wallet
   */
  private async transferTokens(
    tokenMint: PublicKey,
    destination: PublicKey,
    amount: bigint,
    label: string
  ): Promise<string> {
    const sourceATA = await getAssociatedTokenAddress(tokenMint, this.payer.publicKey);
    const destATA = await getAssociatedTokenAddress(tokenMint, destination);

    // Check if destination ATA exists
    const destATAInfo = await this.connection.getAccountInfo(destATA);
    const transaction = new Transaction();

    if (!destATAInfo) {
      transaction.add(
        createAssociatedTokenAccountInstruction(
          this.payer.publicKey,
          destATA,
          destination,
          tokenMint
        )
      );
    }

    transaction.add(
      createTransferInstruction(
        sourceATA,
        destATA,
        this.payer.publicKey,
        amount,
        [],
        TOKEN_PROGRAM_ID
      )
    );

    const sig = await sendAndConfirmTransaction(this.connection, transaction, [this.payer]);
    console.log(`  ✅ ${label}: ${amount.toString()} → ${sig.slice(0, 8)}...`);
    return sig;
  }

  /**
   * Export fee collection history
   */
  exportHistory(): string {
    const history = {
      config: this.config,
      collections: this.collections,
      accumulated: this.getAccumulatedFees(),
      exported_at: new Date().toISOString(),
    };
    return JSON.stringify(history, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    , 2);
  }
}

// Main execution
async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const distribute = process.argv.includes('--distribute');
  const export_report = process.argv.includes('--export');
  const network = process.argv.includes('--network')
    ? process.argv[process.argv.indexOf('--network') + 1]
    : 'mainnet-beta';

  if (!dryRun && !distribute && !export_report) {
    console.log('❌ Mode not specified.');
    console.log('Usage: ts-node fee_distribution_system.ts [--dry-run | --distribute | --export] [--network mainnet-beta]');
    console.log('\nOptions:');
    console.log('  --dry-run      Show what would be distributed (no transactions)');
    console.log('  --distribute   Execute fee distribution to all wallets');
    console.log('  --export       Export fee collection history to JSON');
    process.exit(1);
  }

  const connection = new Connection(`https://api.${network}.solana.com`, 'confirmed');

  // Load payer keypair
  let payer: Keypair;
  try {
    const keyPath = process.env.ANCHOR_WALLET || `${process.env.HOME}/.config/solana/id.json`;
    const keyData = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    payer = Keypair.fromSecretKey(Buffer.from(keyData));
  } catch (e) {
    console.error('❌ Could not load keypair. Set ANCHOR_WALLET or place keypair at ~/.config/solana/id.json');
    process.exit(1);
  }

  const configPath = process.argv.includes('--config')
    ? process.argv[process.argv.indexOf('--config') + 1]
    : '../User Data/fee_distribution_config.json';

  const system = new FeeDistributionSystem(connection, payer, configPath);

  // Record sample collections for demonstration
  system.recordFeeCollection(BigInt(100_000_000_000), 150); // 100B tokens from 150 transactions
  system.recordFeeCollection(BigInt(50_000_000_000), 75);   // 50B tokens from 75 transactions

  if (dryRun) {
    await system.distributeAccumulatedFees(true);
  } else if (distribute) {
    await system.distributeAccumulatedFees(false);
  } else if (export_report) {
    const history = system.exportHistory();
    const outputPath = '../User Data/fee_distribution_history.json';
    fs.writeFileSync(outputPath, history);
    console.log(`\n✅ Fee history exported to: ${outputPath}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

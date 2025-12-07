#!/usr/bin/env ts-node
/**
 * monthly_auto_burn.ts
 * 
 * Automated monthly burn mechanism:
 * - Executes on the last day of each month
 * - Sends accumulated burn funds to on-chain Solana burn wallet
 * - Creates verifiable transaction proof on SolScan
 * - Logs all burn activities
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  createTransferInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import fs from 'fs';
import cron from 'node-cron';

interface BurnRecord {
  date: string;
  amount_tokens: string;
  transaction_signature: string;
  solscan_url: string;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: number;
}

class MonthlyAutoBurn {
  private connection: Connection;
  private payer: Keypair;
  private tokenMint: PublicKey;
  private burnWallet: PublicKey;
  private burnRecords: BurnRecord[] = [];
  private burnLogPath: string;
  private network: string;

  constructor(
    connection: Connection,
    payer: Keypair,
    tokenMint: string,
    burnWallet: string,
    network: string = 'mainnet-beta',
    logPath: string = '../User Data/burn_logs.json'
  ) {
    this.connection = connection;
    this.payer = payer;
    this.tokenMint = new PublicKey(tokenMint);
    this.burnWallet = new PublicKey(burnWallet);
    this.network = network;
    this.burnLogPath = logPath;

    // Load existing burn records
    this.loadBurnLogs();
  }

  /**
   * Load existing burn records from file
   */
  private loadBurnLogs(): void {
    try {
      if (fs.existsSync(this.burnLogPath)) {
        const data = fs.readFileSync(this.burnLogPath, 'utf8');
        this.burnRecords = JSON.parse(data);
        console.log(`✅ Loaded ${this.burnRecords.length} previous burn records`);
      }
    } catch (error) {
      console.warn('⚠️ Could not load existing burn logs, starting fresh');
    }
  }

  /**
   * Save burn records to file
   */
  private saveBurnLogs(): void {
    fs.writeFileSync(this.burnLogPath, JSON.stringify(this.burnRecords, null, 2));
  }

  /**
   * Check if today is the last day of the month
   */
  isLastDayOfMonth(): boolean {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return today.getMonth() !== tomorrow.getMonth();
  }

  /**
   * Get the last day of the current month
   */
  getLastDayOfMonth(): number {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  }

  /**
   * Get accumulated burn amount from contract
   */
  async getAccumulatedBurnAmount(): Promise<bigint> {
    try {
      // This would typically query your presale contract's burn accumulation
      // For now, return placeholder - integrate with your actual contract
      const sourceATA = await getAssociatedTokenAddress(this.tokenMint, this.payer.publicKey);
      const accountInfo = await this.connection.getTokenAccountBalance(sourceATA);
      
      // In production, query your contract's burn amount state
      // For demonstration, using a fraction of the account balance
      const balance = BigInt(accountInfo.value.amount);
      return balance / BigInt(100); // 1% as example
    } catch (error) {
      console.error('❌ Could not fetch accumulated burn amount:', error);
      return BigInt(0);
    }
  }

  /**
   * Execute the monthly burn
   */
  async executeBurn(): Promise<BurnRecord | null> {
    console.log(`\n🔥 MONTHLY AUTO-BURN EXECUTION`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Date: ${new Date().toISOString()}`);

    try {
      // Get accumulated burn amount
      const burnAmount = await this.getAccumulatedBurnAmount();

      if (burnAmount === BigInt(0)) {
        console.log('⚠️  No funds to burn this month');
        return null;
      }

      console.log(`📊 Burn Amount: ${burnAmount.toString()} tokens`);

      const sourceATA = await getAssociatedTokenAddress(this.tokenMint, this.payer.publicKey);
      const burnATA = await getAssociatedTokenAddress(this.tokenMint, this.burnWallet);

      // Check if burn wallet ATA exists
      const burnATAInfo = await this.connection.getAccountInfo(burnATA);
      const transaction = new Transaction();

      if (!burnATAInfo) {
        console.log('📝 Creating burn wallet ATA...');
        transaction.add(
          createAssociatedTokenAccountInstruction(
            this.payer.publicKey,
            burnATA,
            this.burnWallet,
            this.tokenMint
          )
        );
      }

      // Add transfer instruction
      transaction.add(
        createTransferInstruction(
          sourceATA,
          burnATA,
          this.payer.publicKey,
          burnAmount,
          [],
          TOKEN_PROGRAM_ID
        )
      );

      console.log('📤 Sending burn transaction...');
      const signature = await sendAndConfirmTransaction(this.connection, transaction, [
        this.payer,
      ]);

      const solscanUrl = `https://solscan.io/tx/${signature}?cluster=${this.network}`;

      const record: BurnRecord = {
        date: new Date().toISOString(),
        amount_tokens: burnAmount.toString(),
        transaction_signature: signature,
        solscan_url: solscanUrl,
        status: 'confirmed',
        timestamp: Date.now(),
      };

      this.burnRecords.push(record);
      this.saveBurnLogs();

      console.log(`\n✅ BURN SUCCESSFUL`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`Amount: ${burnAmount.toString()} MYXN tokens 🔥`);
      console.log(`TX: ${signature}`);
      console.log(`View: ${solscanUrl}`);

      return record;
    } catch (error) {
      console.error('❌ Burn execution failed:', error);

      const failureRecord: BurnRecord = {
        date: new Date().toISOString(),
        amount_tokens: '0',
        transaction_signature: '',
        solscan_url: '',
        status: 'failed',
        timestamp: Date.now(),
      };

      this.burnRecords.push(failureRecord);
      this.saveBurnLogs();

      return null;
    }
  }

  /**
   * Get burn statistics
   */
  getBurnStats(): {
    total_burns: number;
    total_burned: bigint;
    successful_burns: number;
    failed_burns: number;
    last_burn_date: string | null;
  } {
    let totalBurned = BigInt(0);
    let successfulBurns = 0;
    let failedBurns = 0;

    for (const record of this.burnRecords) {
      if (record.status === 'confirmed') {
        totalBurned += BigInt(record.amount_tokens);
        successfulBurns++;
      } else if (record.status === 'failed') {
        failedBurns++;
      }
    }

    return {
      total_burns: this.burnRecords.length,
      total_burned: totalBurned,
      successful_burns: successfulBurns,
      failed_burns: failedBurns,
      last_burn_date: this.burnRecords.length > 0
        ? this.burnRecords[this.burnRecords.length - 1].date
        : null,
    };
  }

  /**
   * Display burn history
   */
  showBurnHistory(): void {
    console.log(`\n🔥 BURN HISTORY`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    if (this.burnRecords.length === 0) {
      console.log('No burns recorded yet.');
      return;
    }

    for (const record of this.burnRecords) {
      console.log(`\n📅 ${record.date}`);
      console.log(`   Status: ${record.status}`);
      console.log(`   Amount: ${record.amount_tokens} MYXN`);
      if (record.transaction_signature) {
        console.log(`   TX: ${record.transaction_signature.slice(0, 20)}...`);
        console.log(`   View: ${record.solscan_url}`);
      }
    }

    const stats = this.getBurnStats();
    console.log(`\n📊 STATISTICS`);
    console.log(`   Total Burns: ${stats.total_burns}`);
    console.log(`   Successful: ${stats.successful_burns}`);
    console.log(`   Failed: ${stats.failed_burns}`);
    console.log(`   Total Burned: ${stats.total_burned.toString()} MYXN 🔥`);
  }

  /**
   * Schedule automatic monthly burn
   */
  scheduleMonthlyCron(): void {
    // Run at 00:00 UTC on the last day of every month
    const cronExpression = '0 0 L * *'; // Non-standard, use alternative

    // Run check every day at UTC 00:00
    const job = cron.schedule('0 0 * * *', async () => {
      console.log(`\n📅 Daily burn check at ${new Date().toISOString()}`);

      if (this.isLastDayOfMonth()) {
        console.log('✅ Last day of month detected - executing burn...');
        await this.executeBurn();
      } else {
        const today = new Date();
        const lastDay = this.getLastDayOfMonth();
        const daysUntilBurn = lastDay - today.getDate();
        console.log(`⏳ Days until next burn: ${daysUntilBurn}`);
      }
    });

    console.log('✅ Monthly auto-burn scheduler started');
    console.log('   Will execute on the last day of each month at 00:00 UTC');
    return job;
  }
}

// Main execution
async function main() {
  const command = process.argv[2];
  const network = process.argv.includes('--network')
    ? process.argv[process.argv.indexOf('--network') + 1]
    : 'mainnet-beta';

  if (!command || !['--execute', '--history', '--stats', '--schedule'].includes(command)) {
    console.log('❌ Command not specified.');
    console.log('Usage: ts-node monthly_auto_burn.ts [--execute | --history | --stats | --schedule] [--network mainnet-beta]');
    console.log('\nCommands:');
    console.log('  --execute   Execute burn immediately (for testing or manual trigger)');
    console.log('  --history   Show all burn records');
    console.log('  --stats     Show burn statistics');
    console.log('  --schedule  Start automatic monthly scheduler');
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

  // Load configuration
  const metadata = JSON.parse(fs.readFileSync('../User Data/metadata.json', 'utf8'));
  const feeConfig = JSON.parse(fs.readFileSync('../User Data/fee_distribution_config.json', 'utf8'));

  const tokenMint = metadata.properties.token_mint;
  const burnWallet = feeConfig.burn_wallet;

  const autoBurn = new MonthlyAutoBurn(connection, payer, tokenMint, burnWallet, network);

  switch (command) {
    case '--execute':
      await autoBurn.executeBurn();
      break;
    case '--history':
      autoBurn.showBurnHistory();
      break;
    case '--stats':
      const stats = autoBurn.getBurnStats();
      console.log('\n📊 BURN STATISTICS');
      console.log(`   Total Burns: ${stats.total_burns}`);
      console.log(`   Successful: ${stats.successful_burns}`);
      console.log(`   Failed: ${stats.failed_burns}`);
      console.log(`   Total Burned: ${stats.total_burned.toString()} MYXN 🔥`);
      console.log(`   Last Burn: ${stats.last_burn_date || 'Never'}`);
      break;
    case '--schedule':
      autoBurn.scheduleMonthlyCron();
      // Keep the process alive
      setInterval(() => {}, 1000);
      break;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

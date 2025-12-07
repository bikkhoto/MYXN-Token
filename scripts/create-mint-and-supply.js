#!/usr/bin/env node

/**
 * Create SPL Token Mint and Mint Initial Supply
 * Network: Configurable (devnet or mainnet-beta)
 * 
 * Steps:
 * 1. Create new mint with 9 decimals
 * 2. Create treasury token account
 * 3. Mint total supply to treasury
 * 4. Output mint address and treasury token account
 */

require('dotenv').config();
const {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
} = require('@solana/web3.js');
const {
  createInitializeMintInstruction,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  getAssociatedTokenAddress,
  getMint,
  getAccount,
  TOKEN_PROGRAM_ID,
  MINT_SIZE,
  getMinimumBalanceForRentExemptMint,
} = require('@solana/spl-token');
const fs = require('fs');
const path = require('path');
const bs58 = require('bs58');

// Configuration
const NETWORK = process.env.NETWORK || 'devnet';
const RPC_URL = NETWORK === 'mainnet-beta' 
  ? 'https://api.mainnet-beta.solana.com'
  : 'https://api.devnet.solana.com';

const TOTAL_SUPPLY = parseInt(process.env.TOTAL_SUPPLY || '1000000000');
const DECIMALS = parseInt(process.env.DECIMALS || '9');
const TREASURY_PUB = new PublicKey(process.env.TREASURY_PUB || 'Azvjj21uXQzHbM9VHhyDfdbj14HD8Tef7ZuC1p7sEMk9');

// Safety checks
const MIN_SOL_BALANCE = 0.1; // Minimum SOL needed for operations

async function createMintAndSupply() {
  console.log('\n🚀 MYXN Token Mint Creation Script');
  console.log('═══════════════════════════════════════════════════════\n');

  // Load keypair
  const keypairPath = process.env.TMP_KEYPAIR_PATH;
  if (!keypairPath) {
    console.error('❌ TMP_KEYPAIR_PATH not set in environment');
    process.exit(1);
  }

  if (!fs.existsSync(keypairPath)) {
    console.error(`❌ Keypair file not found: ${keypairPath}`);
    process.exit(1);
  }

  const secretKey = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
  const payer = Keypair.fromSecretKey(new Uint8Array(secretKey));

  console.log(`📡 Network: ${NETWORK}`);
  console.log(`🔑 Payer: ${payer.publicKey.toBase58()}`);
  console.log(`🏦 Treasury: ${TREASURY_PUB.toBase58()}`);
  console.log(`💰 Total Supply: ${TOTAL_SUPPLY.toLocaleString()} tokens`);
  console.log(`🔢 Decimals: ${DECIMALS}\n`);

  // Confirm mainnet operations
  if (NETWORK === 'mainnet-beta' && process.env.CONFIRM_MAINNET !== 'true') {
    console.error('❌ MAINNET deployment requires CONFIRM_MAINNET=true');
    console.error('   Review all parameters carefully before proceeding!');
    process.exit(1);
  }

  const connection = new Connection(RPC_URL, 'confirmed');

  // Check balance
  console.log('⏳ Checking payer balance...');
  const balance = await connection.getBalance(payer.publicKey);
  const balanceSOL = balance / 1e9;
  console.log(`   Balance: ${balanceSOL.toFixed(4)} SOL`);

  if (balanceSOL < MIN_SOL_BALANCE) {
    console.error(`❌ Insufficient balance. Need at least ${MIN_SOL_BALANCE} SOL`);
    if (NETWORK === 'devnet') {
      console.log(`   Get devnet SOL: solana airdrop 2 ${payer.publicKey.toBase58()}`);
    }
    process.exit(1);
  }

  console.log('✅ Balance check passed\n');

  // Create mint keypair
  const mintKeypair = Keypair.generate();
  const mint = mintKeypair.publicKey;
  console.log(`🪙 New Mint Address: ${mint.toBase58()}\n`);

  // Get rent for mint account
  const lamports = await getMinimumBalanceForRentExemptMint(connection);

  console.log('📝 Creating mint account...');
  const createMintAccountIx = SystemProgram.createAccount({
    fromPubkey: payer.publicKey,
    newAccountPubkey: mint,
    space: MINT_SIZE,
    lamports,
    programId: TOKEN_PROGRAM_ID,
  });

  const initializeMintIx = createInitializeMintInstruction(
    mint,
    DECIMALS,
    payer.publicKey, // Mint authority (temporary)
    payer.publicKey, // Freeze authority (temporary)
    TOKEN_PROGRAM_ID
  );

  const createMintTx = new Transaction().add(createMintAccountIx, initializeMintIx);

  try {
    const sig1 = await sendAndConfirmTransaction(connection, createMintTx, [payer, mintKeypair], {
      commitment: 'confirmed',
    });
    console.log(`✅ Mint created: ${sig1}\n`);
  } catch (err) {
    console.error('❌ Failed to create mint:', err.message);
    process.exit(1);
  }

  // Create treasury token account
  console.log('📝 Creating treasury token account...');
  const treasuryTokenAccount = await getAssociatedTokenAddress(
    mint,
    TREASURY_PUB,
    false,
    TOKEN_PROGRAM_ID
  );

  console.log(`🏦 Treasury Token Account: ${treasuryTokenAccount.toBase58()}\n`);

  const createATAIx = createAssociatedTokenAccountInstruction(
    payer.publicKey,
    treasuryTokenAccount,
    TREASURY_PUB,
    mint,
    TOKEN_PROGRAM_ID
  );

  const createATATx = new Transaction().add(createATAIx);

  try {
    const sig2 = await sendAndConfirmTransaction(connection, createATATx, [payer], {
      commitment: 'confirmed',
    });
    console.log(`✅ Treasury account created: ${sig2}\n`);
  } catch (err) {
    console.error('❌ Failed to create treasury account:', err.message);
    process.exit(1);
  }

  // Mint total supply
  const amount = BigInt(TOTAL_SUPPLY) * BigInt(10 ** DECIMALS);
  console.log(`💎 Minting ${TOTAL_SUPPLY.toLocaleString()} tokens to treasury...`);

  const mintToIx = createMintToInstruction(
    mint,
    treasuryTokenAccount,
    payer.publicKey,
    amount,
    [],
    TOKEN_PROGRAM_ID
  );

  const mintToTx = new Transaction().add(mintToIx);

  try {
    const sig3 = await sendAndConfirmTransaction(connection, mintToTx, [payer], {
      commitment: 'confirmed',
    });
    console.log(`✅ Tokens minted: ${sig3}\n`);
  } catch (err) {
    console.error('❌ Failed to mint tokens:', err.message);
    process.exit(1);
  }

  // Verify
  console.log('🔍 Verifying mint and account...');
  const mintInfo = await getMint(connection, mint);
  const accountInfo = await getAccount(connection, treasuryTokenAccount);

  console.log(`   Mint Supply: ${mintInfo.supply.toString()}`);
  console.log(`   Treasury Balance: ${accountInfo.amount.toString()}`);
  console.log(`   Mint Authority: ${mintInfo.mintAuthority?.toBase58() || 'None'}`);
  console.log(`   Freeze Authority: ${mintInfo.freezeAuthority?.toBase58() || 'None'}\n`);

  // Save deployment record
  const deployRecord = {
    timestamp: new Date().toISOString(),
    network: NETWORK,
    mint: mint.toBase58(),
    treasury_token_account: treasuryTokenAccount.toBase58(),
    treasury_pubkey: TREASURY_PUB.toBase58(),
    total_supply: TOTAL_SUPPLY,
    decimals: DECIMALS,
    mint_authority: payer.publicKey.toBase58(),
    freeze_authority: payer.publicKey.toBase58(),
    supply_minted: amount.toString(),
  };

  const recordsDir = './deploy-records';
  if (!fs.existsSync(recordsDir)) {
    fs.mkdirSync(recordsDir, { recursive: true });
  }

  const recordPath = path.join(recordsDir, `mint-${Date.now()}.json`);
  fs.writeFileSync(recordPath, JSON.stringify(deployRecord, null, 2));
  console.log(`💾 Deployment record saved: ${recordPath}\n`);

  // Print summary
  console.log('═══════════════════════════════════════════════════════');
  console.log('✅ DEPLOYMENT SUCCESSFUL');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`Mint Address:              ${mint.toBase58()}`);
  console.log(`Treasury Token Account:    ${treasuryTokenAccount.toBase58()}`);
  console.log(`Network:                   ${NETWORK}`);
  console.log(`Total Supply:              ${TOTAL_SUPPLY.toLocaleString()} MYXN`);
  console.log('═══════════════════════════════════════════════════════');
  console.log('\n🔗 Solana Explorer:');
  const explorerUrl = NETWORK === 'mainnet-beta' 
    ? `https://solscan.io/token/${mint.toBase58()}`
    : `https://solscan.io/token/${mint.toBase58()}?cluster=devnet`;
  console.log(`   ${explorerUrl}\n`);

  console.log('⚠️  NEXT STEPS:');
  console.log('   1. Attach metadata using attach-metadata-mainnet.js');
  console.log('   2. Transfer authorities to hardware wallet');
  console.log('   3. Verify all details before revoking authorities\n');

  return deployRecord;
}

if (require.main === module) {
  createMintAndSupply()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('❌ Deployment failed:', err);
      process.exit(1);
    });
}

module.exports = { createMintAndSupply };

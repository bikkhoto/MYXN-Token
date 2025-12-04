#!/usr/bin/env node

/**
 * Create MYXN Token on Mainnet with Specific Mint Address
 * 
 * CRITICAL: This script uses the pre-determined mint address:
 * 6S4eDdYXABgtmuk3waLM63U2KHgExcD9mco7MuyG9f5G
 * 
 * The mint keypair MUST generate this exact address.
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

// MAINNET CONFIGURATION
const RPC_URL = 'https://api.mainnet-beta.solana.com';
const EXPECTED_MINT = '6S4eDdYXABgtmuk3waLM63U2KHgExcD9mco7MuyG9f5G';
const TREASURY_WALLET = '6S4eDdYXABgtmuk3waLM63U2KHgExcD9mco7MuyG9f5G';

const TOTAL_SUPPLY = 1000000000; // 1 billion
const DECIMALS = 9;

async function createMainnetToken() {
  console.log('\n🚀 MYXN MAINNET TOKEN CREATION');
  console.log('═══════════════════════════════════════════════════════\n');
  
  // SAFETY CHECK
  console.log('⚠️  MAINNET DEPLOYMENT - PLEASE VERIFY:');
  console.log('   Expected Mint: ' + EXPECTED_MINT);
  console.log('   Treasury: ' + TREASURY_WALLET);
  console.log('   Total Supply: ' + TOTAL_SUPPLY.toLocaleString() + ' MYXN');
  console.log('   Decimals: ' + DECIMALS);
  console.log('');
  
  // Check for confirmation
  const confirmMainnet = process.env.CONFIRM_MAINNET;
  if (confirmMainnet !== 'true') {
    console.error('❌ MAINNET deployment not confirmed!');
    console.error('   Set CONFIRM_MAINNET=true in .env to proceed');
    console.error('   This is a safety check to prevent accidental mainnet deployment.');
    process.exit(1);
  }
  
  console.log('✅ Mainnet deployment confirmed\n');
  
  const connection = new Connection(RPC_URL, 'confirmed');
  
  // Load mint keypair
  const mintKeypairPath = './mainnet-mint-keypair.json';
  if (!fs.existsSync(mintKeypairPath)) {
    console.error('❌ Mint keypair not found: ' + mintKeypairPath);
    console.error('   You must provide the keypair that generates address:');
    console.error('   ' + EXPECTED_MINT);
    process.exit(1);
  }
  
  const mintKeypairData = JSON.parse(fs.readFileSync(mintKeypairPath, 'utf-8'));
  const mintKeypair = Keypair.fromSecretKey(new Uint8Array(mintKeypairData));
  
  // VERIFY MINT ADDRESS
  if (mintKeypair.publicKey.toBase58() !== EXPECTED_MINT) {
    console.error('❌ CRITICAL ERROR: Mint keypair mismatch!');
    console.error('   Expected: ' + EXPECTED_MINT);
    console.error('   Got: ' + mintKeypair.publicKey.toBase58());
    console.error('   The provided keypair does not generate the required mint address.');
    process.exit(1);
  }
  
  console.log('✅ Mint keypair verified: ' + EXPECTED_MINT + '\n');
  
  // Load treasury keypair
  const treasuryKeypairPath = process.env.TMP_KEYPAIR_PATH;
  const treasuryKeypairData = JSON.parse(fs.readFileSync(treasuryKeypairPath, 'utf-8'));
  const treasuryKeypair = Keypair.fromSecretKey(new Uint8Array(treasuryKeypairData));
  
  if (treasuryKeypair.publicKey.toBase58() !== TREASURY_WALLET) {
    console.error('❌ Treasury wallet mismatch!');
    console.error('   Expected: ' + TREASURY_WALLET);
    console.error('   Got: ' + treasuryKeypair.publicKey.toBase58());
    process.exit(1);
  }
  
  console.log('✅ Treasury keypair verified: ' + TREASURY_WALLET + '\n');
  
  // Check treasury balance
  const balance = await connection.getBalance(treasuryKeypair.publicKey);
  const solBalance = balance / 1e9;
  console.log('💰 Treasury Balance: ' + solBalance.toFixed(4) + ' SOL');
  
  if (solBalance < 0.5) {
    console.error('❌ INSUFFICIENT SOL BALANCE!');
    console.error('   Current: ' + solBalance.toFixed(4) + ' SOL');
    console.error('   Required: 0.5 SOL minimum');
    console.error('   Please fund the treasury wallet before proceeding.');
    process.exit(1);
  }
  
  console.log('✅ Sufficient balance for deployment\n');
  
  // Check if mint already exists
  try {
    const existingMint = await getMint(connection, mintKeypair.publicKey);
    console.log('⚠️  Mint already exists on mainnet!');
    console.log('   Address: ' + mintKeypair.publicKey.toBase58());
    console.log('   Supply: ' + existingMint.supply.toString());
    console.log('   Decimals: ' + existingMint.decimals);
    console.log('   Mint Authority: ' + (existingMint.mintAuthority?.toBase58() || 'None'));
    console.log('');
    
    const continueMint = process.env.SKIP_MINT_CREATE === 'true';
    if (!continueMint) {
      console.log('✅ Mint already created, proceeding to supply minting...\n');
    }
  } catch (error) {
    // Mint doesn't exist, create it
    console.log('📝 Creating new mint on mainnet...\n');
    
    const lamports = await getMinimumBalanceForRentExemptMint(connection);
    
    const transaction = new Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: treasuryKeypair.publicKey,
        newAccountPubkey: mintKeypair.publicKey,
        space: MINT_SIZE,
        lamports,
        programId: TOKEN_PROGRAM_ID,
      }),
      createInitializeMintInstruction(
        mintKeypair.publicKey,
        DECIMALS,
        treasuryKeypair.publicKey, // mint authority
        treasuryKeypair.publicKey, // freeze authority
        TOKEN_PROGRAM_ID
      )
    );
    
    console.log('📡 Sending create mint transaction...');
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [treasuryKeypair, mintKeypair],
      { commitment: 'confirmed' }
    );
    
    console.log('✅ Mint created!');
    console.log('   Signature: ' + signature);
    console.log('   Mint: ' + mintKeypair.publicKey.toBase58() + '\n');
  }
  
  // Create treasury token account (ATA)
  const treasuryATA = await getAssociatedTokenAddress(
    mintKeypair.publicKey,
    treasuryKeypair.publicKey
  );
  
  console.log('📝 Creating treasury token account...');
  console.log('   ATA: ' + treasuryATA.toBase58());
  
  try {
    await getAccount(connection, treasuryATA);
    console.log('   ℹ️  Token account already exists\n');
  } catch (error) {
    const transaction = new Transaction().add(
      createAssociatedTokenAccountInstruction(
        treasuryKeypair.publicKey, // payer
        treasuryATA, // ata
        treasuryKeypair.publicKey, // owner
        mintKeypair.publicKey // mint
      )
    );
    
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [treasuryKeypair],
      { commitment: 'confirmed' }
    );
    
    console.log('   ✅ Token account created');
    console.log('   Signature: ' + signature + '\n');
  }
  
  // Mint total supply
  console.log('🪙  Minting total supply...');
  const supplyWithDecimals = BigInt(TOTAL_SUPPLY) * BigInt(10 ** DECIMALS);
  
  const transaction = new Transaction().add(
    createMintToInstruction(
      mintKeypair.publicKey,
      treasuryATA,
      treasuryKeypair.publicKey, // mint authority
      supplyWithDecimals
    )
  );
  
  console.log('📡 Sending mint transaction...');
  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [treasuryKeypair],
    { commitment: 'confirmed' }
  );
  
  console.log('✅ Supply minted!');
  console.log('   Signature: ' + signature);
  console.log('   Amount: ' + TOTAL_SUPPLY.toLocaleString() + ' MYXN\n');
  
  // Verify final state
  console.log('🔍 Verifying final state...\n');
  
  const mintInfo = await getMint(connection, mintKeypair.publicKey);
  const accountInfo = await getAccount(connection, treasuryATA);
  
  console.log('═══════════════════════════════════════════════════════');
  console.log('🎉 MAINNET DEPLOYMENT SUCCESSFUL!');
  console.log('═══════════════════════════════════════════════════════\n');
  console.log('Token Details:');
  console.log('   Mint: ' + mintKeypair.publicKey.toBase58());
  console.log('   Supply: ' + (Number(mintInfo.supply) / 10 ** DECIMALS).toLocaleString() + ' MYXN');
  console.log('   Decimals: ' + mintInfo.decimals);
  console.log('   Mint Authority: ' + mintInfo.mintAuthority?.toBase58());
  console.log('   Freeze Authority: ' + mintInfo.freezeAuthority?.toBase58() + '\n');
  
  console.log('Treasury Account:');
  console.log('   Address: ' + treasuryATA.toBase58());
  console.log('   Balance: ' + (Number(accountInfo.amount) / 10 ** DECIMALS).toLocaleString() + ' MYXN');
  console.log('   Owner: ' + accountInfo.owner.toBase58() + '\n');
  
  console.log('Explorer:');
  console.log('   https://explorer.solana.com/address/' + mintKeypair.publicKey.toBase58());
  console.log('   https://solscan.io/token/' + mintKeypair.publicKey.toBase58());
  console.log('');
  
  console.log('Next Steps:');
  console.log('   1. Attach metadata with: node scripts/attach-metadata-mainnet.js');
  console.log('   2. Deploy presale program: anchor deploy --provider.cluster mainnet');
  console.log('   3. Transfer authorities (optional): node scripts/transfer-authorities.js');
  console.log('');
  
  // Save deployment record
  const deploymentRecord = {
    network: 'mainnet-beta',
    timestamp: new Date().toISOString(),
    mint: mintKeypair.publicKey.toBase58(),
    treasury: treasuryKeypair.publicKey.toBase58(),
    treasuryATA: treasuryATA.toBase58(),
    supply: TOTAL_SUPPLY,
    decimals: DECIMALS,
    mintAuthority: mintInfo.mintAuthority?.toBase58(),
    freezeAuthority: mintInfo.freezeAuthority?.toBase58(),
    signature: signature,
  };
  
  fs.writeFileSync(
    './deployment-mainnet.json',
    JSON.stringify(deploymentRecord, null, 2)
  );
  
  console.log('✅ Deployment record saved to: deployment-mainnet.json\n');
}

createMainnetToken().catch(console.error);

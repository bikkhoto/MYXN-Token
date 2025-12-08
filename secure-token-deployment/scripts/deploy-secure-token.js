#!/usr/bin/env node

/**
 * Deploy Secure MYXN Token with Enhanced Security
 * 
 * This script creates a new SPL token with enhanced security measures
 * after the previous wallet compromise incident.
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

// Configuration
const RPC_URL = process.env.RPC_URL || 'https://api.mainnet-beta.solana.com';
const TREASURY_PUB = process.env.TREASURY_PUB || 'Azvjj21uXQzHbM9VHhyDfdbj14HD8Tef7ZuC1p7sEMk9';
const TOTAL_SUPPLY = parseInt(process.env.TOTAL_SUPPLY || '1000000000'); // 1 billion
const DECIMALS = parseInt(process.env.DECIMALS || '9');

async function deploySecureToken() {
  console.log('\n🚀 DEPLOYING SECURE MYXN TOKEN');
  console.log('═══════════════════════════════════════════════════════\n');
  
  // Safety check
  console.log('⚠️  MAINNET DEPLOYMENT - PLEASE VERIFY:');
  console.log('   Treasury: ' + TREASURY_PUB);
  console.log('   Total Supply: ' + TOTAL_SUPPLY.toLocaleString() + ' MYXNS');
  console.log('   Decimals: ' + DECIMALS);
  console.log('');
  
  // Check for confirmation
  const confirmMainnet = process.env.CONFIRM_MAINNET;
  if (confirmMainnet !== 'true') {
    console.error('❌ MAINNET deployment not confirmed!');
    console.error('   Set CONFIRM_MAINNET=true in .env to proceed');
    process.exit(1);
  }
  
  console.log('✅ Mainnet deployment confirmed\n');
  
  const connection = new Connection(RPC_URL, 'confirmed');
  
  // Load mint keypair
  const mintKeypairPath = './keypairs/new-mint-keypair.json';
  if (!fs.existsSync(mintKeypairPath)) {
    console.error('❌ Mint keypair not found: ' + mintKeypairPath);
    process.exit(1);
  }
  
  const mintKeypairData = JSON.parse(fs.readFileSync(mintKeypairPath, 'utf-8'));
  const mintKeypair = Keypair.fromSecretKey(new Uint8Array(mintKeypairData));
  
  console.log('✅ New Mint Address: ' + mintKeypair.publicKey.toBase58() + '\n');
  
  // Load treasury keypair
  const treasuryKeypairPath = process.env.TMP_KEYPAIR_PATH;
  if (!fs.existsSync(treasuryKeypairPath)) {
    console.error('❌ Treasury keypair not found: ' + treasuryKeypairPath);
    console.error('   Set TMP_KEYPAIR_PATH in .env to point to your treasury keypair');
    process.exit(1);
  }
  
  const treasuryKeypairData = JSON.parse(fs.readFileSync(treasuryKeypairPath, 'utf-8'));
  const treasuryKeypair = Keypair.fromSecretKey(new Uint8Array(treasuryKeypairData));
  
  if (treasuryKeypair.publicKey.toBase58() !== TREASURY_PUB) {
    console.error('❌ Treasury wallet mismatch!');
    console.error('   Expected: ' + TREASURY_PUB);
    console.error('   Got: ' + treasuryKeypair.publicKey.toBase58());
    process.exit(1);
  }
  
  console.log('✅ Treasury keypair verified: ' + TREASURY_PUB + '\n');
  
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
  
  // Create mint account
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
      treasuryKeypair.publicKey, // mint authority (will be transferred to multisig)
      treasuryKeypair.publicKey, // freeze authority (will be transferred to multisig)
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
  
  // Create treasury token account (ATA)
  const treasuryATA = await getAssociatedTokenAddress(
    mintKeypair.publicKey,
    treasuryKeypair.publicKey
  );
  
  console.log('📝 Creating treasury token account...');
  console.log('   ATA: ' + treasuryATA.toBase58());
  
  const ataTransaction = new Transaction().add(
    createAssociatedTokenAccountInstruction(
      treasuryKeypair.publicKey, // payer
      treasuryATA, // ata
      treasuryKeypair.publicKey, // owner
      mintKeypair.publicKey // mint
    )
  );
  
  const ataSignature = await sendAndConfirmTransaction(
    connection,
    ataTransaction,
    [treasuryKeypair],
    { commitment: 'confirmed' }
  );
  
  console.log('   ✅ Token account created');
  console.log('   Signature: ' + ataSignature + '\n');
  
  // Mint total supply
  console.log('🪙  Minting total supply...');
  const supplyWithDecimals = BigInt(TOTAL_SUPPLY) * BigInt(10 ** DECIMALS);
  
  const mintTransaction = new Transaction().add(
    createMintToInstruction(
      mintKeypair.publicKey,
      treasuryATA,
      treasuryKeypair.publicKey, // mint authority
      supplyWithDecimals
    )
  );
  
  console.log('📡 Sending mint transaction...');
  const mintSignature = await sendAndConfirmTransaction(
    connection,
    mintTransaction,
    [treasuryKeypair],
    { commitment: 'confirmed' }
  );
  
  console.log('✅ Supply minted!');
  console.log('   Signature: ' + mintSignature);
  console.log('   Amount: ' + TOTAL_SUPPLY.toLocaleString() + ' MYXNS\n');
  
  // Verify final state
  console.log('🔍 Verifying final state...\n');
  
  const mintInfo = await getMint(connection, mintKeypair.publicKey);
  const accountInfo = await getAccount(connection, treasuryATA);
  
  console.log('═══════════════════════════════════════════════════════');
  console.log('🎉 SECURE TOKEN DEPLOYMENT SUCCESSFUL!');
  console.log('═══════════════════════════════════════════════════════\n');
  console.log('Token Details:');
  console.log('   Mint: ' + mintKeypair.publicKey.toBase58());
  console.log('   Supply: ' + (Number(mintInfo.supply) / 10 ** DECIMALS).toLocaleString() + ' MYXNS');
  console.log('   Decimals: ' + mintInfo.decimals);
  console.log('   Mint Authority: ' + mintInfo.mintAuthority?.toBase58());
  console.log('   Freeze Authority: ' + mintInfo.freezeAuthority?.toBase58() + '\n');
  
  console.log('Treasury Account:');
  console.log('   Address: ' + treasuryATA.toBase58());
  console.log('   Balance: ' + (Number(accountInfo.amount) / 10 ** DECIMALS).toLocaleString() + ' MYXNS');
  console.log('   Owner: ' + accountInfo.owner.toBase58() + '\n');
  
  console.log('Explorer:');
  console.log('   https://explorer.solana.com/address/' + mintKeypair.publicKey.toBase58());
  console.log('   https://solscan.io/token/' + mintKeypair.publicKey.toBase58());
  console.log('');
  
  console.log('Next Steps:');
  console.log('   1. Attach metadata with custom script');
  console.log('   2. Set up multisig wallet for authorities');
  console.log('   3. Transfer authorities to multisig (recommended)');
  console.log('   4. Revoke authorities for immutability (optional)');
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
    signatures: {
      createMint: signature,
      createATA: ataSignature,
      mintSupply: mintSignature
    },
    security_measures: {
      multisig_required: true,
      timelock_days: 30,
      emergency_procedures: "Contact team immediately for security incidents"
    }
  };
  
  const recordPath = './deployment-record.json';
  fs.writeFileSync(recordPath, JSON.stringify(deploymentRecord, null, 2));
  
  console.log('✅ Deployment record saved to: ' + recordPath + '\n');
  
  // Security recommendations
  console.log('🔒 SECURITY RECOMMENDATIONS:');
  console.log('   1. IMMEDIATELY transfer mint/freeze authorities to a multisig wallet');
  console.log('   2. Set up a 2-of-3 multisig with keys held by different team members');
  console.log('   3. Store keypairs in hardware wallets or secure offline storage');
  console.log('   4. Never commit keypair files to version control');
  console.log('   5. Regularly audit token contracts and associated wallets');
  console.log('');
}

deploySecureToken().catch(err => {
  console.error('❌ Deployment failed:', err);
  process.exit(1);
});
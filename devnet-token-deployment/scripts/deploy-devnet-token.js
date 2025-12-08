#!/usr/bin/env node

/**
 * Deploy Token on Devnet for Testing
 * Uses the wallet addresses from your configuration
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

// Configuration
const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';
const TREASURY_PUB = process.env.TREASURY_PUB;
const TOTAL_SUPPLY = parseInt(process.env.TOTAL_SUPPLY || '1000000000');
const DECIMALS = parseInt(process.env.DECIMALS || '9');

async function deployDevnetToken() {
  console.log('\n🚀 DEPLOYING TOKEN ON DEVNET FOR TESTING');
  console.log('═══════════════════════════════════════════════════════\n');
  
  console.log('📡 Network: Devnet');
  console.log('💰 Treasury: ' + TREASURY_PUB);
  console.log('🔢 Supply: ' + TOTAL_SUPPLY.toLocaleString() + ' tokens');
  console.log('🔢 Decimals: ' + DECIMALS);
  console.log('');
  
  const connection = new Connection(RPC_URL, 'confirmed');
  
  // Generate a new mint keypair for devnet testing
  const mintKeypair = Keypair.generate();
  console.log('🔧 Generated new mint keypair for devnet');
  console.log('🪙 New Mint Address: ' + mintKeypair.publicKey.toBase58() + '\n');
  
  // For devnet testing, we'll need to create a temporary treasury keypair
  // In a real scenario, you would use your actual treasury keypair
  const treasuryKeypair = Keypair.generate();
  console.log('🔧 Generated temporary treasury keypair for devnet');
  console.log('🏦 Treasury Address: ' + treasuryKeypair.publicKey.toBase58() + '\n');
  
  // Airdrop some SOL to the treasury for testing
  console.log('💸 Requesting airdrop to treasury wallet...');
  const airdropSignature = await connection.requestAirdrop(
    treasuryKeypair.publicKey,
    1 * 1e9 // 1 SOL
  );
  
  await connection.confirmTransaction(airdropSignature, 'confirmed');
  console.log('✅ Airdrop successful\n');
  
  // Check treasury balance
  const balance = await connection.getBalance(treasuryKeypair.publicKey);
  const solBalance = balance / 1e9;
  console.log('💰 Treasury Balance: ' + solBalance.toFixed(4) + ' SOL\n');
  
  // Create mint account
  console.log('📝 Creating mint account...');
  const lamports = await getMinimumBalanceForRentExemptMint(connection);
  
  const createMintAccountIx = SystemProgram.createAccount({
    fromPubkey: treasuryKeypair.publicKey,
    newAccountPubkey: mintKeypair.publicKey,
    space: MINT_SIZE,
    lamports,
    programId: TOKEN_PROGRAM_ID,
  });
  
  const initializeMintIx = createInitializeMintInstruction(
    mintKeypair.publicKey,
    DECIMALS,
    treasuryKeypair.publicKey, // mint authority
    treasuryKeypair.publicKey, // freeze authority
    TOKEN_PROGRAM_ID
  );
  
  const createMintTx = new Transaction().add(createMintAccountIx, initializeMintIx);
  
  const createMintSig = await sendAndConfirmTransaction(
    connection,
    createMintTx,
    [treasuryKeypair, mintKeypair],
    { commitment: 'confirmed' }
  );
  
  console.log('✅ Mint account created!');
  console.log('   Signature: ' + createMintSig);
  console.log('   Mint: ' + mintKeypair.publicKey.toBase58() + '\n');
  
  // Create treasury token account (ATA)
  console.log('🏦 Creating treasury token account...');
  const treasuryATA = await getAssociatedTokenAddress(
    mintKeypair.publicKey,
    treasuryKeypair.publicKey
  );
  
  const createATATx = new Transaction().add(
    createAssociatedTokenAccountInstruction(
      treasuryKeypair.publicKey,
      treasuryATA,
      treasuryKeypair.publicKey,
      mintKeypair.publicKey
    )
  );
  
  const createATASig = await sendAndConfirmTransaction(
    connection,
    createATATx,
    [treasuryKeypair],
    { commitment: 'confirmed' }
  );
  
  console.log('✅ Treasury token account created!');
  console.log('   Address: ' + treasuryATA.toBase58());
  console.log('   Signature: ' + createATASig + '\n');
  
  // Mint total supply to treasury
  console.log('🪙 Minting total supply to treasury...');
  const supplyWithDecimals = BigInt(TOTAL_SUPPLY) * BigInt(10 ** DECIMALS);
  
  const mintToTx = new Transaction().add(
    createMintToInstruction(
      mintKeypair.publicKey,
      treasuryATA,
      treasuryKeypair.publicKey,
      supplyWithDecimals,
      [],
      TOKEN_PROGRAM_ID
    )
  );
  
  const mintToSig = await sendAndConfirmTransaction(
    connection,
    mintToTx,
    [treasuryKeypair],
    { commitment: 'confirmed' }
  );
  
  console.log('✅ Total supply minted!');
  console.log('   Amount: ' + TOTAL_SUPPLY.toLocaleString() + ' tokens');
  console.log('   Signature: ' + mintToSig + '\n');
  
  // Verify final state
  console.log('🔍 Verifying final state...\n');
  
  const mintInfo = await getMint(connection, mintKeypair.publicKey);
  const accountInfo = await getAccount(connection, treasuryATA);
  
  console.log('═══════════════════════════════════════════════════════');
  console.log('🎉 DEVNET TOKEN DEPLOYMENT SUCCESSFUL!');
  console.log('═══════════════════════════════════════════════════════\n');
  
  console.log('Token Details:');
  console.log('   Mint: ' + mintKeypair.publicKey.toBase58());
  console.log('   Supply: ' + (Number(mintInfo.supply) / 10 ** DECIMALS).toLocaleString() + ' tokens');
  console.log('   Decimals: ' + mintInfo.decimals);
  console.log('   Mint Authority: ' + mintInfo.mintAuthority?.toBase58());
  console.log('   Freeze Authority: ' + mintInfo.freezeAuthority?.toBase58() + '\n');
  
  console.log('Treasury Account:');
  console.log('   Address: ' + treasuryATA.toBase58());
  console.log('   Balance: ' + (Number(accountInfo.amount) / 10 ** DECIMALS).toLocaleString() + ' tokens');
  console.log('   Owner: ' + accountInfo.owner.toBase58() + '\n');
  
  console.log('Explorer Links:');
  console.log('   https://explorer.solana.com/address/' + mintKeypair.publicKey.toBase58() + '?cluster=devnet');
  console.log('   https://solscan.io/token/' + mintKeypair.publicKey.toBase58() + '?cluster=devnet');
  console.log('');
  
  // Save deployment record
  const deploymentRecord = {
    network: 'devnet',
    timestamp: new Date().toISOString(),
    mint: mintKeypair.publicKey.toBase58(),
    treasury: treasuryKeypair.publicKey.toBase58(),
    treasuryATA: treasuryATA.toBase58(),
    supply: TOTAL_SUPPLY,
    decimals: DECIMALS,
    signatures: {
      createMint: createMintSig,
      createATA: createATASig,
      mintTo: mintToSig
    }
  };
  
  fs.writeFileSync(
    './deployment-record.json',
    JSON.stringify(deploymentRecord, null, 2)
  );
  
  console.log('💾 Deployment record saved to: deployment-record.json\n');
  
  console.log('📋 Next steps:');
  console.log('   1. Test token transfers');
  console.log('   2. Verify metadata integration');
  console.log('   3. When ready, deploy to mainnet using your actual wallets\n');
}

deployDevnetToken().catch(err => {
  console.error('❌ Deployment failed:', err);
  process.exit(1);
});
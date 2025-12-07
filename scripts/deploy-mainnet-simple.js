#!/usr/bin/env node

/**
 * MYXN Mainnet Token Creation - Using Existing Wallet
 * 
 * This script will:
 * 1. Create a NEW mint (token) on mainnet
 * 2. Mint supply to your wallet: 6S4eDdYXABgtmuk3waLM63U2KHgExcD9mco7MuyG9f5G
 * 3. Your wallet will be the authority
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

// MAINNET CONFIGURATION - Use environment variables
require('dotenv').config();
const RPC_URL = process.env.RPC_URL || 'https://api.mainnet-beta.solana.com';
const YOUR_WALLET = process.env.TREASURY_PUB || 'Azvjj21uXQzHbM9VHhyDfdbj14HD8Tef7ZuC1p7sEMk9';
const TOTAL_SUPPLY = parseInt(process.env.TOTAL_SUPPLY || '1000000000'); // 1 billion
const DECIMALS = parseInt(process.env.DECIMALS || '9');

async function deployMainnetToken() {
  console.log('\n🚀 MYXN MAINNET TOKEN DEPLOYMENT');
  console.log('═══════════════════════════════════════════════════════\n');
  
  // SAFETY CHECK
  console.log('⚠️  MAINNET DEPLOYMENT - PLEASE VERIFY:');
  console.log('   Your Wallet: ' + YOUR_WALLET);
  console.log('   Total Supply: ' + TOTAL_SUPPLY.toLocaleString() + ' MYXN');
  console.log('   Decimals: ' + DECIMALS);
  console.log('');
  
  const confirmMainnet = process.env.CONFIRM_MAINNET;
  if (confirmMainnet !== 'true') {
    console.error('❌ MAINNET deployment not confirmed!');
    console.error('   Set CONFIRM_MAINNET=true in .env to proceed');
    console.error('');
    console.error('   Quick start: export CONFIRM_MAINNET=true && node scripts/deploy-mainnet-simple.js');
    process.exit(1);
  }
  
  console.log('✅ Mainnet deployment confirmed\n');
  
  const connection = new Connection(RPC_URL, 'confirmed');
  
  // Load mainnet wallet keypair (for signing and paying fees)
  const walletKeypairPath = './mainnet-wallet-keypair.json';
  if (!fs.existsSync(walletKeypairPath)) {
    console.error('❌ Wallet keypair not found: ' + walletKeypairPath);
    console.error('   Please run: node convert-private-key.js');
    process.exit(1);
  }
  
  const walletKeypairData = JSON.parse(fs.readFileSync(walletKeypairPath, 'utf-8'));
  const walletKeypair = Keypair.fromSecretKey(new Uint8Array(walletKeypairData));
  
  if (walletKeypair.publicKey.toBase58() !== YOUR_WALLET) {
    console.error('❌ Wallet address mismatch!');
    console.error('   Expected: ' + YOUR_WALLET);
    console.error('   Got: ' + walletKeypair.publicKey.toBase58());
    process.exit(1);
  }
  
  console.log('✅ Wallet keypair verified: ' + YOUR_WALLET + '\n');
  
  // Check balance
  const balance = await connection.getBalance(walletKeypair.publicKey);
  const solBalance = balance / 1e9;
  console.log('💰 Wallet Balance: ' + solBalance.toFixed(6) + ' SOL');
  
  if (solBalance < 0.02) {
    console.error('❌ INSUFFICIENT SOL BALANCE!');
    console.error('   Current: ' + solBalance.toFixed(6) + ' SOL');
    console.error('   Required: ~0.02 SOL minimum');
    console.error('   You have: ' + solBalance.toFixed(6) + ' SOL');
    
    if (solBalance < 0.015) {
      console.error('   ⚠️  This may not be enough. Continue anyway? (risky)');
      process.exit(1);
    } else {
      console.log('   ⚠️  Low balance but might work. Continuing...\n');
    }
  } else {
    console.log('✅ Sufficient balance for deployment\n');
  }
  
  // Generate NEW mint keypair
  const mintKeypair = Keypair.generate();
  console.log('🆕 Generated NEW mint address: ' + mintKeypair.publicKey.toBase58());
  console.log('   (This will be your $MYXN token address)\n');
  
  // Save mint keypair
  fs.writeFileSync(
    './mainnet-mint-keypair.json',
    JSON.stringify(Array.from(mintKeypair.secretKey))
  );
  console.log('✅ Mint keypair saved to: ./mainnet-mint-keypair.json\n');
  
  // Create mint
  console.log('📝 Creating token mint on mainnet...\n');
  
  const lamports = await getMinimumBalanceForRentExemptMint(connection);
  console.log('   Rent for mint: ' + (lamports / 1e9).toFixed(6) + ' SOL');
  
  const createMintTx = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: walletKeypair.publicKey,
      newAccountPubkey: mintKeypair.publicKey,
      space: MINT_SIZE,
      lamports,
      programId: TOKEN_PROGRAM_ID,
    }),
    createInitializeMintInstruction(
      mintKeypair.publicKey,
      DECIMALS,
      walletKeypair.publicKey, // mint authority
      walletKeypair.publicKey, // freeze authority
      TOKEN_PROGRAM_ID
    )
  );
  
  console.log('📡 Sending create mint transaction...');
  const mintSig = await sendAndConfirmTransaction(
    connection,
    createMintTx,
    [walletKeypair, mintKeypair],
    { commitment: 'confirmed' }
  );
  
  console.log('✅ Mint created!');
  console.log('   Signature: ' + mintSig);
  console.log('   Mint: ' + mintKeypair.publicKey.toBase58() + '\n');
  
  // Create your token account (ATA)
  const yourTokenAccount = await getAssociatedTokenAddress(
    mintKeypair.publicKey,
    walletKeypair.publicKey
  );
  
  console.log('📝 Creating your token account...');
  console.log('   Token Account: ' + yourTokenAccount.toBase58());
  
  const createATATx = new Transaction().add(
    createAssociatedTokenAccountInstruction(
      walletKeypair.publicKey, // payer
      yourTokenAccount, // ata
      walletKeypair.publicKey, // owner
      mintKeypair.publicKey // mint
    )
  );
  
  console.log('📡 Sending create token account transaction...');
  const ataSig = await sendAndConfirmTransaction(
    connection,
    createATATx,
    [walletKeypair],
    { commitment: 'confirmed' }
  );
  
  console.log('✅ Token account created!');
  console.log('   Signature: ' + ataSig + '\n');
  
  // Mint total supply
  console.log('🪙  Minting total supply to your wallet...');
  const supplyWithDecimals = BigInt(TOTAL_SUPPLY) * BigInt(10 ** DECIMALS);
  
  const mintToTx = new Transaction().add(
    createMintToInstruction(
      mintKeypair.publicKey,
      yourTokenAccount,
      walletKeypair.publicKey, // mint authority
      supplyWithDecimals
    )
  );
  
  console.log('📡 Sending mint transaction...');
  const mintToSig = await sendAndConfirmTransaction(
    connection,
    mintToTx,
    [walletKeypair],
    { commitment: 'confirmed' }
  );
  
  console.log('✅ Supply minted!');
  console.log('   Signature: ' + mintToSig);
  console.log('   Amount: ' + TOTAL_SUPPLY.toLocaleString() + ' MYXN\n');
  
  // Check final balance
  const finalBalance = await connection.getBalance(walletKeypair.publicKey);
  const finalSol = finalBalance / 1e9;
  const spent = solBalance - finalSol;
  
  console.log('💰 Final Balance: ' + finalSol.toFixed(6) + ' SOL');
  console.log('   Spent: ' + spent.toFixed(6) + ' SOL\n');
  
  // Verify
  console.log('🔍 Verifying final state...\n');
  
  const mintInfo = await getMint(connection, mintKeypair.publicKey);
  const accountInfo = await getAccount(connection, yourTokenAccount);
  
  console.log('═══════════════════════════════════════════════════════');
  console.log('🎉 MAINNET DEPLOYMENT SUCCESSFUL!');
  console.log('═══════════════════════════════════════════════════════\n');
  console.log('Token Details:');
  console.log('   Mint: ' + mintKeypair.publicKey.toBase58());
  console.log('   Supply: ' + (Number(mintInfo.supply) / 10 ** DECIMALS).toLocaleString() + ' MYXN');
  console.log('   Decimals: ' + mintInfo.decimals);
  console.log('   Mint Authority: ' + mintInfo.mintAuthority?.toBase58());
  console.log('   Freeze Authority: ' + mintInfo.freezeAuthority?.toBase58() + '\n');
  
  console.log('Your Token Account:');
  console.log('   Address: ' + yourTokenAccount.toBase58());
  console.log('   Balance: ' + (Number(accountInfo.amount) / 10 ** DECIMALS).toLocaleString() + ' MYXN');
  console.log('   Owner: ' + accountInfo.owner.toBase58() + '\n');
  
  console.log('Explorer Links:');
  console.log('   Token: https://explorer.solana.com/address/' + mintKeypair.publicKey.toBase58());
  console.log('   Solscan: https://solscan.io/token/' + mintKeypair.publicKey.toBase58());
  console.log('   Your Account: https://explorer.solana.com/address/' + yourTokenAccount.toBase58());
  console.log('');
  
  console.log('Next Steps:');
  console.log('   1. Update .env with: TOKEN_MINT=' + mintKeypair.publicKey.toBase58());
  console.log('   2. Attach metadata: node scripts/attach-metadata-mainnet-umi.js');
  console.log('   3. Deploy presale: anchor deploy --provider.cluster mainnet');
  console.log('');
  
  // Save deployment record
  const deploymentRecord = {
    network: 'mainnet-beta',
    timestamp: new Date().toISOString(),
    mint: mintKeypair.publicKey.toBase58(),
    wallet: YOUR_WALLET,
    tokenAccount: yourTokenAccount.toBase58(),
    supply: TOTAL_SUPPLY,
    decimals: DECIMALS,
    mintAuthority: mintInfo.mintAuthority?.toBase58(),
    freezeAuthority: mintInfo.freezeAuthority?.toBase58(),
    signatures: {
      createMint: mintSig,
      createATA: ataSig,
      mintTo: mintToSig,
    },
    costSOL: spent.toFixed(6),
    remainingSOL: finalSol.toFixed(6),
  };
  
  fs.writeFileSync(
    './deployment-mainnet-record.json',
    JSON.stringify(deploymentRecord, null, 2)
  );
  
  console.log('✅ Deployment record saved to: deployment-mainnet-record.json\n');
  
  // Update .env
  console.log('📝 Updating .env file...');
  const envContent = fs.readFileSync('.env', 'utf-8');
  const updatedEnv = envContent.includes('TOKEN_MINT=')
    ? envContent.replace(/TOKEN_MINT=.*/g, 'TOKEN_MINT=' + mintKeypair.publicKey.toBase58())
    : envContent + '\nTOKEN_MINT=' + mintKeypair.publicKey.toBase58() + '\n';
  fs.writeFileSync('.env', updatedEnv);
  console.log('✅ .env updated with TOKEN_MINT\n');
}

deployMainnetToken().catch(err => {
  console.error('\n❌ DEPLOYMENT FAILED:');
  console.error(err);
  process.exit(1);
});

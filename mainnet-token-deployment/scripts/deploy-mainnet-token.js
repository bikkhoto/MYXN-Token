#!/usr/bin/env node

/**
 * Deploy MYXN Token on Solana Mainnet
 * Treasury: HDaSHPBdE61agHAgajStypwu639E5N7TEBGiqLjfEoMu
 */

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
const readline = require('readline');

// Configuration
const RPC_URL = 'https://api.mainnet-beta.solana.com';
const TREASURY_PUB = 'HDaSHPBdE61agHAgajStypwu639E5N7TEBGiqLjfEoMu';
const TOTAL_SUPPLY = 1000000000;
const DECIMALS = 9;

async function deployMainnetToken() {
  console.log('\n🚀 DEPLOYING MYXN TOKEN ON MAINNET');
  console.log('═══════════════════════════════════════════════════════\n');
  
  console.log('⚠️  MAINNET DEPLOYMENT - REAL SOL WILL BE SPENT!');
  console.log('💰 Treasury: ' + TREASURY_PUB);
  console.log('🔢 Supply: ' + TOTAL_SUPPLY.toLocaleString() + ' MYXN');
  console.log('🔢 Decimals: ' + DECIMALS + '\n');
  
  const connection = new Connection(RPC_URL, 'confirmed');
  
  // Generate new mint keypair
  const mintKeypair = Keypair.generate();
  console.log('🪙 New Mint Address: ' + mintKeypair.publicKey.toBase58() + '\n');
  
  // Save mint keypair
  fs.writeFileSync(
    './keypairs/mainnet-mint-keypair.json',
    JSON.stringify(Array.from(mintKeypair.secretKey))
  );
  console.log('💾 Mint keypair saved\n');
  
  // Ask for treasury keypair location
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  rl.question('📁 Enter the path to your treasury keypair file: ', async (keypairPath) => {
    rl.close();
    
    if (!fs.existsSync(keypairPath)) {
      console.error('❌ Keypair file not found: ' + keypairPath);
      process.exit(1);
    }
    
    try {
      const secretKey = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
      const treasuryKeypair = Keypair.fromSecretKey(new Uint8Array(secretKey));
      
      if (treasuryKeypair.publicKey.toBase58() !== TREASURY_PUB) {
        console.error('❌ Treasury wallet mismatch!');
        console.error('   Expected: ' + TREASURY_PUB);
        console.error('   Got: ' + treasuryKeypair.publicKey.toBase58());
        process.exit(1);
      }
      
      console.log('\n✅ Treasury keypair verified!\n');
      
      // Check balance
      const balance = await connection.getBalance(treasuryKeypair.publicKey);
      const solBalance = balance / 1e9;
      console.log('💰 Treasury Balance: ' + solBalance.toFixed(4) + ' SOL');
      
      if (solBalance < 0.5) {
        console.error('❌ INSUFFICIENT SOL BALANCE!');
        console.error('   Current: ' + solBalance.toFixed(4) + ' SOL');
        console.error('   Required: 0.5 SOL minimum');
        process.exit(1);
      }
      
      console.log('✅ Sufficient balance\n');
      
      // Create mint account
      console.log('📝 Step 1: Creating mint account...');
      const lamports = await getMinimumBalanceForRentExemptMint(connection);
      
      const createMintTx = new Transaction().add(
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
          treasuryKeypair.publicKey,
          treasuryKeypair.publicKey,
          TOKEN_PROGRAM_ID
        )
      );
      
      const createMintSig = await sendAndConfirmTransaction(
        connection,
        createMintTx,
        [treasuryKeypair, mintKeypair],
        { commitment: 'confirmed' }
      );
      
      console.log('✅ Mint created!');
      console.log('   Signature: ' + createMintSig + '\n');
      
      // Create treasury token account
      console.log('📝 Step 2: Creating treasury token account...');
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
      
      // Mint total supply
      console.log('📝 Step 3: Minting total supply...');
      const supplyWithDecimals = BigInt(TOTAL_SUPPLY) * BigInt(10 ** DECIMALS);
      
      const mintToTx = new Transaction().add(
        createMintToInstruction(
          mintKeypair.publicKey,
          treasuryATA,
          treasuryKeypair.publicKey,
          supplyWithDecimals
        )
      );
      
      const mintToSig = await sendAndConfirmTransaction(
        connection,
        mintToTx,
        [treasuryKeypair],
        { commitment: 'confirmed' }
      );
      
      console.log('✅ Total supply minted!');
      console.log('   Signature: ' + mintToSig + '\n');
      
      // Verify
      const mintInfo = await getMint(connection, mintKeypair.publicKey);
      const accountInfo = await getAccount(connection, treasuryATA);
      
      console.log('═══════════════════════════════════════════════════════');
      console.log('🎉 MAINNET TOKEN DEPLOYMENT SUCCESSFUL!');
      console.log('═══════════════════════════════════════════════════════\n');
      
      console.log('Token Details:');
      console.log('   Mint: ' + mintKeypair.publicKey.toBase58());
      console.log('   Supply: ' + (Number(mintInfo.supply) / 10 ** DECIMALS).toLocaleString() + ' MYXN');
      console.log('   Decimals: ' + mintInfo.decimals);
      console.log('   Mint Authority: ' + mintInfo.mintAuthority?.toBase58());
      console.log('   Freeze Authority: ' + mintInfo.freezeAuthority?.toBase58() + '\n');
      
      console.log('Treasury Account:');
      console.log('   Address: ' + treasuryATA.toBase58());
      console.log('   Balance: ' + (Number(accountInfo.amount) / 10 ** DECIMALS).toLocaleString() + ' MYXN\n');
      
      console.log('Explorer:');
      console.log('   https://explorer.solana.com/address/' + mintKeypair.publicKey.toBase58());
      console.log('   https://solscan.io/token/' + mintKeypair.publicKey.toBase58() + '\n');
      
      // Save deployment record
      const deploymentRecord = {
        network: 'mainnet-beta',
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
      
      console.log('💾 Deployment record saved!\n');
      console.log('📋 Next step: Attach metadata with: npm run attach-metadata\n');
      
    } catch (error) {
      console.error('❌ Deployment failed:', error);
      process.exit(1);
    }
  });
}

deployMainnetToken();
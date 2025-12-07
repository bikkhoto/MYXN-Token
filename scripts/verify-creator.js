#!/usr/bin/env node

/**
 * Verify Token Creator - Sign metadata to prove ownership
 * This removes security warnings from wallets like Phantom
 */

require('dotenv').config();
const { createUmi } = require('@metaplex-foundation/umi-bundle-defaults');
const { createSignerFromKeypair, signerIdentity, publicKey } = require('@metaplex-foundation/umi');
const { findMetadataPda, verifyCreatorV1 } = require('@metaplex-foundation/mpl-token-metadata');
const fs = require('fs');

// Configuration from environment variables
const TOKEN_MINT = process.env.TOKEN_MINT;
const NETWORK = process.env.NETWORK || 'mainnet-beta';
const RPC_URL = NETWORK === 'mainnet-beta' 
  ? (process.env.RPC_URL || 'https://api.mainnet-beta.solana.com')
  : 'https://api.devnet.solana.com';

async function verifyCreator() {
  console.log('\n🔐 VERIFY TOKEN CREATOR');
  console.log('═══════════════════════════════════════════════════════\n');
  
  // Validate required environment variables
  if (!TOKEN_MINT) {
    console.error('❌ TOKEN_MINT not set in environment');
    console.error('   Set TOKEN_MINT=<mint-address> in .env or environment');
    process.exit(1);
  }
  
  console.log(`⚠️  ${NETWORK.toUpperCase()} OPERATION - Signing as creator`);
  console.log('   Mint: ' + TOKEN_MINT);
  console.log('');
  
  // Load wallet keypair
  const walletKeypairPath = process.env.TMP_KEYPAIR_PATH || process.env.CREATOR_KEYPAIR_PATH;
  if (!walletKeypairPath) {
    console.error('❌ Wallet keypair path not set');
    console.error('   Set TMP_KEYPAIR_PATH or CREATOR_KEYPAIR_PATH in environment');
    process.exit(1);
  }
  
  if (!fs.existsSync(walletKeypairPath)) {
    console.error('❌ Wallet keypair not found: ' + walletKeypairPath);
    process.exit(1);
  }
  
  const walletKeypairData = JSON.parse(fs.readFileSync(walletKeypairPath, 'utf-8'));
  const walletKeypairBytes = new Uint8Array(walletKeypairData);
  
  console.log('✅ Keypair loaded\n');
  
  // Initialize UMI
  console.log('🔧 Initializing UMI SDK for ' + NETWORK + '...');
  const umi = createUmi(RPC_URL);
  
  const umiKeypair = umi.eddsa.createKeypairFromSecretKey(walletKeypairBytes);
  const signer = createSignerFromKeypair(umi, umiKeypair);
  umi.use(signerIdentity(signer));
  
  console.log('   Signer: ' + signer.publicKey);
  console.log('   Mint: ' + TOKEN_MINT);
  console.log('');
  
  // Find metadata PDA
  const mint = publicKey(TOKEN_MINT);
  const metadataPda = findMetadataPda(umi, { mint });
  
  console.log('📝 Metadata PDA: ' + metadataPda[0]);
  console.log('');
  
  try {
    console.log('📝 Verifying creator...');
    
    const result = await verifyCreatorV1(umi, {
      metadata: metadataPda[0],
      authority: signer,
    }).sendAndConfirm(umi);
    
    console.log('✅ Creator verified successfully!');
    console.log('   Signature:', result.signature);
    console.log('');
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('🎉 CREATOR VERIFICATION COMPLETE!');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log('This should remove security warnings from wallets like Phantom.');
    console.log('The wallet may take a few minutes to update.');
    console.log('');
    console.log('Verify on Explorer:');
    console.log('https://explorer.solana.com/address/' + TOKEN_MINT);
    
  } catch (error) {
    console.error('❌ Failed to verify creator:', error.message);
    
    // Check if already verified
    if (error.message.includes('AlreadyVerified') || error.message.includes('already verified')) {
      console.log('');
      console.log('ℹ️  Creator is already verified!');
      console.log('   The security warning may be due to:');
      console.log('   1. Token is too new (created today)');
      console.log('   2. Phantom needs to update their security list');
      console.log('   3. Token needs trading history/liquidity');
      console.log('');
      console.log('💡 Solutions:');
      console.log('   1. Wait 24-48 hours for Phantom to recognize the token');
      console.log('   2. Submit token to Phantom token list');
      console.log('   3. Add liquidity on a DEX (Raydium, Orca)');
      console.log('   4. Get listed on token registries');
    }
    
    process.exit(1);
  }
}

verifyCreator().catch(console.error);

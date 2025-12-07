#!/usr/bin/env node

/**
 * MYXN Creator Verification (CLI Version)
 * 
 * This script signs the metadata as the creator to set verified=true.
 * This removes security warnings from wallets like Phantom.
 * 
 * SECURITY: Use hardware wallet for mainnet! This CLI version is for
 * testing on devnet or if you must use a keypair file.
 * 
 * Usage:
 *   node verify-creator-cli.js --mint <TOKEN_MINT> --network <RPC_URL>
 *   
 * Environment Variables:
 *   CREATOR_KEYPAIR_PATH - Path to creator keypair JSON
 *   CONFIRM - Must be 'true' for mainnet operations
 */

require('dotenv').config();
const { Connection, Keypair, PublicKey } = require('@solana/web3.js');
const { createUmi } = require('@metaplex-foundation/umi-bundle-defaults');
const { createSignerFromKeypair, signerIdentity, publicKey } = require('@metaplex-foundation/umi');
const { findMetadataPda, verifyCreatorV1, fetchMetadata } = require('@metaplex-foundation/mpl-token-metadata');
const fs = require('fs');
const { getTimestamp, saveDeployRecord, validateBase58 } = require('./helper-utils');

// Parse CLI arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    mint: null,
    network: 'https://api.devnet.solana.com'
  };
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--mint' && args[i + 1]) {
      options.mint = args[i + 1];
      i++;
    } else if (args[i] === '--network' && args[i + 1]) {
      options.network = args[i + 1];
      i++;
    }
  }
  
  return options;
}

async function verifyCreator() {
  console.log('\n🔐 MYXN CREATOR VERIFICATION (CLI)');
  console.log('═══════════════════════════════════════════════════════\n');
  
  // Parse arguments
  const options = parseArgs();
  
  if (!options.mint) {
    console.error('❌ Error: --mint parameter required');
    console.error('   Usage: node verify-creator-cli.js --mint <TOKEN_MINT> --network <RPC_URL>');
    process.exit(1);
  }
  
  if (!validateBase58(options.mint)) {
    console.error('❌ Error: Invalid mint address');
    process.exit(1);
  }
  
  // Check if mainnet and require confirmation
  const isMainnet = options.network.includes('mainnet');
  
  if (isMainnet && process.env.CONFIRM !== 'true') {
    console.error('❌ MAINNET OPERATION REQUIRES CONFIRMATION');
    console.error('   Set CONFIRM=true environment variable to proceed');
    console.error('');
    console.error('   Example: CONFIRM=true node verify-creator-cli.js --mint <MINT> --network mainnet-beta');
    console.error('');
    console.error('⚠️  WARNING: For mainnet, we STRONGLY recommend using the hardware wallet');
    console.error('   flow (verify-creator-web.js) instead of this CLI script!');
    process.exit(1);
  }
  
  console.log('📋 Configuration:');
  console.log('   Mint:', options.mint);
  console.log('   Network:', options.network);
  console.log('   Is Mainnet:', isMainnet ? 'YES ⚠️' : 'No');
  console.log('');
  
  // Load creator keypair
  const keypairPath = process.env.CREATOR_KEYPAIR_PATH || './mainnet-wallet-keypair.json';
  
  if (!fs.existsSync(keypairPath)) {
    console.error('❌ Creator keypair not found:', keypairPath);
    console.error('   Set CREATOR_KEYPAIR_PATH environment variable');
    process.exit(1);
  }
  
  console.log('🔑 Loading creator keypair from:', keypairPath);
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
  const keypair = Keypair.fromSecretKey(new Uint8Array(keypairData));
  
  console.log('   Creator address:', keypair.publicKey.toBase58());
  console.log('');
  
  // Initialize UMI
  console.log('🔧 Initializing UMI SDK...');
  const umi = createUmi(options.network);
  
  const umiKeypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(keypair.secretKey));
  const signer = createSignerFromKeypair(umi, umiKeypair);
  umi.use(signerIdentity(signer));
  
  // Find metadata PDA
  const mint = publicKey(options.mint);
  const metadataPda = findMetadataPda(umi, { mint });
  
  console.log('   Metadata PDA:', metadataPda[0]);
  console.log('');
  
  // Fetch current metadata to check creator
  try {
    console.log('📖 Fetching current metadata...');
    const metadata = await fetchMetadata(umi, metadataPda[0]);
    
    console.log('   Name:', metadata.name);
    console.log('   Symbol:', metadata.symbol);
    console.log('   URI:', metadata.uri);
    console.log('   Creators:');
    
    metadata.creators.forEach((creator, i) => {
      console.log(`     ${i + 1}. ${creator.address} - verified: ${creator.verified}, share: ${creator.percentage}%`);
      
      if (creator.address === signer.publicKey) {
        if (creator.verified) {
          console.log('');
          console.log('✅ Creator is already verified!');
          console.log('   No action needed. The Phantom warning may be due to:');
          console.log('   1. Token is too new (needs 24-48h for wallet indexing)');
          console.log('   2. Token needs trading history/liquidity');
          console.log('   3. Submit token to Phantom token list');
          process.exit(0);
        }
      }
    });
    
    console.log('');
    
  } catch (error) {
    console.warn('⚠️  Could not fetch metadata (may not exist yet):', error.message);
    console.log('');
  }
  
  // Verify creator
  if (isMainnet) {
    console.log('⚠️  ⚠️  ⚠️  MAINNET OPERATION ⚠️  ⚠️  ⚠️');
    console.log('');
    console.log('You are about to sign metadata on MAINNET.');
    console.log('This is an irreversible operation.');
    console.log('');
    console.log('Press Ctrl+C to abort, or wait 5 seconds to continue...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log('');
  }
  
  console.log('📝 Verifying creator (setting verified=true)...');
  
  const startTime = Date.now();
  
  try {
    const result = await verifyCreatorV1(umi, {
      metadata: metadataPda[0],
      authority: signer,
    }).sendAndConfirm(umi);
    
    const endTime = Date.now();
    
    console.log('✅ Creator verified successfully!');
    console.log('   Transaction signature:', Buffer.from(result.signature).toString('hex'));
    console.log('   Time taken:', (endTime - startTime), 'ms');
    console.log('');
    
    // Save deploy record
    const record = {
      operation: 'verify_creator',
      mint: options.mint,
      metadataPda: metadataPda[0].toString(),
      creator: signer.publicKey.toString(),
      txSignature: Buffer.from(result.signature).toString('hex'),
      network: options.network,
      timestamp: getTimestamp(),
      duration_ms: endTime - startTime
    };
    
    const filename = `verify-creator-${Date.now()}.json`;
    saveDeployRecord(filename, record);
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('🎉 CREATOR VERIFICATION COMPLETE!');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log('✅ This should remove security warnings from wallets like Phantom.');
    console.log('   The wallet may take a few minutes to update its cache.');
    console.log('');
    console.log('🔍 Verify on Explorer:');
    console.log('   https://explorer.solana.com/address/' + options.mint);
    if (isMainnet) {
      console.log('   https://solscan.io/token/' + options.mint);
    }
    console.log('');
    console.log('📝 Audit record saved to: deploy-records/' + filename);
    
  } catch (error) {
    console.error('❌ Failed to verify creator:', error.message);
    
    if (error.message.includes('0x0')) {
      console.log('');
      console.log('ℹ️  This error usually means creator is already verified');
      console.log('   or you are not the creator listed in the metadata.');
    }
    
    if (error.logs) {
      console.log('');
      console.log('Transaction logs:');
      error.logs.forEach(log => console.log('  ', log));
    }
    
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  verifyCreator().catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { verifyCreator };

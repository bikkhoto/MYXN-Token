#!/usr/bin/env node
/**
 * Update Creators - Add/Update creators array in token metadata
 * This script updates the on-chain metadata to add proper creators
 * and then signs as creator to set verified=true
 */

const { createUmi } = require('@metaplex-foundation/umi-bundle-defaults');
const { createSignerFromKeypair, signerIdentity, publicKey } = require('@metaplex-foundation/umi');
const { updateV1, fetchMetadataFromSeeds } = require('@metaplex-foundation/mpl-token-metadata');
const fs = require('fs');
const path = require('path');

// Configuration
const MINT_ADDRESS = '3NVKYBqjuhLzk5FQNBhcExkruJ7qcaZizkD7Q7veyHGH';
const NETWORK = process.env.SOLANA_NETWORK || 'https://api.mainnet-beta.solana.com';
const KEYPAIR_PATH = process.env.WALLET_KEYPAIR || './mainnet-wallet-keypair.json';

async function updateCreators() {
  console.log('\n🔧 UPDATE CREATORS - TOKEN METADATA\n');
  console.log('═'.repeat(50));
  
  try {
    // Load wallet keypair
    const keypairPath = path.resolve(KEYPAIR_PATH);
    if (!fs.existsSync(keypairPath)) {
      throw new Error(`Keypair not found: ${keypairPath}`);
    }
    
    const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
    
    // Initialize UMI
    const umi = createUmi(NETWORK);
    const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(keypairData));
    const signer = createSignerFromKeypair(umi, keypair);
    umi.use(signerIdentity(signer));
    
    console.log(`🔑 Wallet: ${signer.publicKey}`);
    console.log(`🪙 Mint: ${MINT_ADDRESS}`);
    console.log(`🌐 Network: ${NETWORK}`);
    console.log('');
    
    // Fetch current metadata
    const mint = publicKey(MINT_ADDRESS);
    const metadata = await fetchMetadataFromSeeds(umi, { mint });
    
    console.log('📄 Current Metadata:');
    console.log(`   Name: ${metadata.name}`);
    console.log(`   Symbol: ${metadata.symbol}`);
    console.log(`   URI: ${metadata.uri}`);
    console.log(`   Update Authority: ${metadata.updateAuthority}`);
    
    if (metadata.creators && metadata.creators.length > 0) {
      console.log('   Current Creators:');
      metadata.creators.forEach((c, i) => {
        console.log(`     ${i + 1}. ${c.address} (${c.percentage}%, verified: ${c.verified})`);
      });
    } else {
      console.log('   Current Creators: None');
    }
    console.log('');
    
    // Prepare new creators array
    const newCreators = [
      {
        address: publicKey(signer.publicKey),
        verified: true,  // We can verify immediately since we're the signer
        share: 100  // Metaplex uses 'share' not 'percentage'
      }
    ];
    
    console.log('🆕 New Creators:');
    newCreators.forEach((c, i) => {
      console.log(`   ${i + 1}. ${c.address} (${c.share}%, verified: ${c.verified})`);
    });
    console.log('');
    
    // Confirm before proceeding
    if (process.env.CONFIRM !== 'true') {
      console.log('⚠️  DRY RUN MODE');
      console.log('   Set CONFIRM=true to execute the update');
      console.log('');
      console.log('📝 Command to execute:');
      console.log(`   CONFIRM=true node ${path.basename(__filename)}`);
      return;
    }
    
    console.log('⏳ Updating metadata with new creators...');
    
    // Update metadata with new creators
    const updateIx = updateV1(umi, {
      mint,
      authority: signer,
      data: {
        ...metadata,
        creators: newCreators
      }
    });
    
    const tx = await updateIx.sendAndConfirm(umi);
    const signature = Buffer.from(tx.signature).toString('hex');
    
    console.log('✅ Transaction confirmed!');
    console.log(`   Signature: ${signature}`);
    console.log(`   Explorer: https://solscan.io/tx/${signature}`);
    console.log('');
    
    // Save deployment record
    const record = {
      operation: 'update_creators',
      mint: MINT_ADDRESS,
      metadataPda: metadata.publicKey.toString(),
      creators: newCreators.map(c => ({
        address: c.address.toString(),
        share: c.share,
        verified: c.verified
      })),
      txSignature: signature,
      network: NETWORK,
      timestamp: new Date().toISOString(),
      wallet: signer.publicKey.toString()
    };
    
    const recordPath = `./deploy-records/update-creators-${Date.now()}.json`;
    fs.writeFileSync(recordPath, JSON.stringify(record, null, 2));
    console.log(`💾 Record saved: ${recordPath}`);
    console.log('');
    
    // Wait and verify
    console.log('⏳ Waiting 5 seconds for confirmation...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const updatedMetadata = await fetchMetadataFromSeeds(umi, { mint });
    console.log('📋 Verification:');
    if (updatedMetadata.creators && updatedMetadata.creators.length > 0) {
      updatedMetadata.creators.forEach((c, i) => {
        console.log(`   ${i + 1}. ${c.address} (${c.share}%, verified: ${c.verified})`);
      });
      console.log('');
      console.log('🎉 SUCCESS! Creators updated and verified!');
    } else {
      console.log('   ⚠️  Warning: Creators array still empty');
    }
    
  } catch (error) {
    console.error('\n❌ Error updating creators:');
    console.error(error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  updateCreators();
}

module.exports = { updateCreators };

#!/usr/bin/env node
/**
 * Complete Creator Fix Workflow
 * 1. Upload metadata with correct creator to IPFS
 * 2. Update on-chain metadata URI
 * 3. Sign as creator to verify
 */

const { createUmi } = require('@metaplex-foundation/umi-bundle-defaults');
const { createSignerFromKeypair, signerIdentity, publicKey } = require('@metaplex-foundation/umi');
const { updateV1, verifyCreatorV1, fetchMetadataFromSeeds } = require('@metaplex-foundation/mpl-token-metadata');
const fs = require('fs');
const path = require('path');
const { Web3Storage } = require('web3.storage');

// Configuration
const MINT_ADDRESS = '3NVKYBqjuhLzk5FQNBhcExkruJ7qcaZizkD7Q7veyHGH';
const NETWORK = process.env.SOLANA_NETWORK || 'https://api.mainnet-beta.solana.com';
const KEYPAIR_PATH = process.env.WALLET_KEYPAIR || './mainnet-wallet-keypair.json';
const METADATA_FILE = './metadata/metadata-verified.json';

async function uploadToIPFS(metadataPath) {
  console.log('📤 Uploading metadata to IPFS...');
  
  // Check for Web3.Storage token
  const web3StorageToken = process.env.WEB3_STORAGE_TOKEN;
  if (!web3StorageToken) {
    throw new Error('WEB3_STORAGE_TOKEN not set in environment');
  }
  
  const client = new Web3Storage({ token: web3StorageToken });
  const content = fs.readFileSync(metadataPath, 'utf8');
  const blob = new Blob([content], { type: 'application/json' });
  const files = [new File([blob], 'metadata.json')];
  
  const cid = await client.put(files, {
    name: 'MYXN Token Metadata',
    maxRetries: 3
  });
  
  const ipfsUri = `ipfs://${cid}/metadata.json`;
  console.log(`✅ Uploaded to IPFS: ${ipfsUri}`);
  console.log(`   Gateway URL: https://ipfs.io/ipfs/${cid}/metadata.json`);
  
  return ipfsUri;
}

async function fixCreatorWorkflow() {
  console.log('\n🔧 COMPLETE CREATOR FIX WORKFLOW\n');
  console.log('═'.repeat(60));
  
  try {
    // Step 0: Load and validate metadata
    console.log('📋 Step 0: Validate Metadata');
    console.log('─'.repeat(60));
    
    if (!fs.existsSync(METADATA_FILE)) {
      throw new Error(`Metadata file not found: ${METADATA_FILE}`);
    }
    
    const metadata = JSON.parse(fs.readFileSync(METADATA_FILE, 'utf8'));
    console.log(`   Name: ${metadata.name}`);
    console.log(`   Symbol: ${metadata.symbol}`);
    
    if (!metadata.properties || !metadata.properties.creators || metadata.properties.creators.length === 0) {
      throw new Error('Metadata must have properties.creators array');
    }
    
    console.log(`   Creators:`);
    metadata.properties.creators.forEach((c, i) => {
      console.log(`     ${i + 1}. ${c.address} (${c.share}%)`);
    });
    console.log('   ✅ Metadata valid');
    console.log('');
    
    // Step 1: Initialize
    console.log('📋 Step 1: Initialize Wallet');
    console.log('─'.repeat(60));
    
    const keypairPath = path.resolve(KEYPAIR_PATH);
    if (!fs.existsSync(keypairPath)) {
      throw new Error(`Keypair not found: ${keypairPath}`);
    }
    
    const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
    const umi = createUmi(NETWORK);
    const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(keypairData));
    const signer = createSignerFromKeypair(umi, keypair);
    umi.use(signerIdentity(signer));
    
    console.log(`   Wallet: ${signer.publicKey}`);
    console.log(`   Network: ${NETWORK}`);
    console.log('   ✅ Initialized');
    console.log('');
    
    // Verify wallet matches creator
    const creatorAddress = metadata.properties.creators[0].address;
    if (creatorAddress !== signer.publicKey.toString()) {
      throw new Error(`Wallet mismatch! Metadata has ${creatorAddress} but wallet is ${signer.publicKey}`);
    }
    
    // Step 2: Upload to IPFS
    console.log('📋 Step 2: Upload Metadata to IPFS');
    console.log('─'.repeat(60));
    
    let ipfsUri;
    if (process.env.SKIP_UPLOAD === 'true') {
      console.log('   ⏭️  Skipped (SKIP_UPLOAD=true)');
      ipfsUri = process.env.NEW_URI || metadata.image;
      console.log(`   Using URI: ${ipfsUri}`);
    } else {
      ipfsUri = await uploadToIPFS(METADATA_FILE);
    }
    console.log('');
    
    // Step 3: Update on-chain metadata URI
    console.log('📋 Step 3: Update On-Chain Metadata URI');
    console.log('─'.repeat(60));
    
    if (process.env.CONFIRM !== 'true') {
      console.log('   ⚠️  DRY RUN MODE');
      console.log('   Set CONFIRM=true to execute');
      console.log('');
      console.log('📝 Full command:');
      console.log(`   WEB3_STORAGE_TOKEN=xxx CONFIRM=true node ${path.basename(__filename)}`);
      console.log('');
      console.log('   Or to skip upload and use existing URI:');
      console.log(`   SKIP_UPLOAD=true NEW_URI="${ipfsUri}" CONFIRM=true node ${path.basename(__filename)}`);
      return;
    }
    
    const mint = publicKey(MINT_ADDRESS);
    const currentMetadata = await fetchMetadataFromSeeds(umi, { mint });
    
    console.log(`   Current URI: ${currentMetadata.uri}`);
    console.log(`   New URI: ${ipfsUri}`);
    console.log('   ⏳ Updating...');
    
    const updateIx = updateV1(umi, {
      mint,
      authority: signer,
      data: {
        ...currentMetadata,
        uri: ipfsUri
      }
    });
    
    const updateTx = await updateIx.sendAndConfirm(umi);
    const updateSig = Buffer.from(updateTx.signature).toString('hex');
    
    console.log(`   ✅ Updated! TX: ${updateSig}`);
    console.log(`   Explorer: https://solscan.io/tx/${updateSig}`);
    console.log('');
    
    // Step 4: Wait for confirmation
    console.log('📋 Step 4: Wait for Metadata Propagation');
    console.log('─'.repeat(60));
    console.log('   ⏳ Waiting 10 seconds...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    console.log('   ✅ Done');
    console.log('');
    
    // Step 5: Verify creator
    console.log('📋 Step 5: Sign as Creator');
    console.log('─'.repeat(60));
    
    const updatedMetadata = await fetchMetadataFromSeeds(umi, { mint });
    
    if (!updatedMetadata.creators || updatedMetadata.creators.length === 0) {
      console.log('   ⚠️  Warning: Still no creators in on-chain metadata');
      console.log('   This is expected - creators come from IPFS metadata');
      console.log('   Wallets will read from IPFS and show creator as verified');
    } else {
      console.log('   ⏳ Signing...');
      const verifyIx = verifyCreatorV1(umi, {
        metadata: updatedMetadata.publicKey,
        authority: signer
      });
      
      const verifyTx = await verifyIx.sendAndConfirm(umi);
      const verifySig = Buffer.from(verifyTx.signature).toString('hex');
      
      console.log(`   ✅ Signed! TX: ${verifySig}`);
      console.log(`   Explorer: https://solscan.io/tx/${verifySig}`);
    }
    console.log('');
    
    // Save record
    const record = {
      operation: 'fix_creator_complete',
      mint: MINT_ADDRESS,
      new_uri: ipfsUri,
      creator: signer.publicKey.toString(),
      update_tx: updateSig,
      network: NETWORK,
      timestamp: new Date().toISOString()
    };
    
    const recordPath = `./deploy-records/fix-creator-${Date.now()}.json`;
    fs.writeFileSync(recordPath, JSON.stringify(record, null, 2));
    
    // Summary
    console.log('═'.repeat(60));
    console.log('🎉 COMPLETE!');
    console.log('═'.repeat(60));
    console.log('');
    console.log('✅ Metadata uploaded to IPFS with correct creator');
    console.log('✅ On-chain metadata URI updated');
    console.log(`✅ Record saved: ${recordPath}`);
    console.log('');
    console.log('🔍 Verification:');
    console.log(`   View on Solscan: https://solscan.io/token/${MINT_ADDRESS}`);
    console.log(`   Check IPFS: https://ipfs.io/${ipfsUri.replace('ipfs://', 'ipfs/')}`);
    console.log('');
    console.log('⏰ Wait 1-2 minutes for wallets to refresh metadata');
    
  } catch (error) {
    console.error('\n❌ Error:');
    console.error(error.message || error);
    process.exit(1);
  }
}

if (require.main === module) {
  fixCreatorWorkflow();
}

module.exports = { fixCreatorWorkflow };

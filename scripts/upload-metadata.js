#!/usr/bin/env node

/**
 * Upload MYXN Metadata to IPFS
 * 
 * Uploads metadata.json to IPFS with integrity verification
 * Supports Web3.Storage and Pinata providers
 * 
 * Usage:
 *   IPFS_PROVIDER=web3storage WEB3_STORAGE_TOKEN=xxx node upload-metadata.js
 *   IPFS_PROVIDER=pinata PINATA_JWT=xxx node upload-metadata.js
 * 
 * Environment Variables:
 *   IPFS_PROVIDER - 'web3storage' or 'pinata'
 *   WEB3_STORAGE_TOKEN - API token for Web3.Storage
 *   PINATA_JWT - JWT token for Pinata
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const {
  sha256File,
  canonicalizeJson,
  ipfsDownload,
  uploadWeb3Storage,
  uploadPinata,
  getTimestamp,
  saveDeployRecord,
  validateCID
} = require('./helper-utils');

async function uploadMetadata() {
  console.log('\n📤 MYXN METADATA UPLOAD');
  console.log('═══════════════════════════════════════════════════════\n');
  
  // Check environment variables
  const provider = process.env.IPFS_PROVIDER || 'web3storage';
  
  if (provider === 'web3storage' && !process.env.WEB3_STORAGE_TOKEN) {
    console.error('❌ Error: WEB3_STORAGE_TOKEN environment variable required');
    console.error('   Get a free token at: https://web3.storage');
    process.exit(1);
  }
  
  if (provider === 'pinata' && !process.env.PINATA_JWT) {
    console.error('❌ Error: PINATA_JWT environment variable required');
    console.error('   Get your JWT at: https://pinata.cloud');
    process.exit(1);
  }
  
  console.log('📋 Configuration:');
  console.log('   Provider:', provider);
  console.log('');
  
  // Load metadata file
  const metadataPath = path.join(__dirname, '../metadata/metadata-verified.json');
  
  if (!fs.existsSync(metadataPath)) {
    console.error('❌ Metadata file not found:', metadataPath);
    console.error('   Expected: metadata/metadata-verified.json');
    process.exit(1);
  }
  
  console.log('📄 Loading metadata...');
  const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
  
  console.log('   Name:', metadata.name);
  console.log('   Symbol:', metadata.symbol);
  console.log('   Image CID:', metadata.image.replace('ipfs://', ''));
  console.log('');
  
  // Compute local hash
  console.log('🔐 Computing local hash...');
  const localHash = sha256File(metadataPath);
  const fileSize = fs.statSync(metadataPath).size;
  
  console.log('   SHA256:', localHash);
  console.log('   File Size:', fileSize, 'bytes');
  console.log('');
  
  // Upload to IPFS
  let cid;
  
  try {
    if (provider === 'web3storage') {
      cid = await uploadWeb3Storage(metadataPath, process.env.WEB3_STORAGE_TOKEN);
    } else if (provider === 'pinata') {
      cid = await uploadPinata(metadataPath, process.env.PINATA_JWT);
    } else {
      throw new Error('Invalid IPFS provider: ' + provider);
    }
  } catch (error) {
    console.error('❌ Upload failed:', error.message);
    process.exit(1);
  }
  
  console.log('');
  console.log('✅ Upload complete! CID:', cid);
  console.log('');
  
  // Verify upload by downloading and comparing
  console.log('🔍 Verifying upload integrity...');
  console.log('   Downloading from IPFS gateway...');
  
  try {
    const downloadedContent = await ipfsDownload(cid);
    
    // Compute remote hash
    const remoteHash = require('crypto').createHash('sha256').update(downloadedContent).digest('hex');
    
    console.log('   Remote SHA256:', remoteHash);
    console.log('');
    
    // Compare hashes
    if (localHash === remoteHash) {
      console.log('✅ INTEGRITY CHECK PASSED');
      console.log('   Local and remote hashes match!');
    } else {
      console.error('❌ INTEGRITY CHECK FAILED');
      console.error('   Local hash:  ', localHash);
      console.error('   Remote hash: ', remoteHash);
      console.error('');
      console.error('   DO NOT USE THIS CID - DATA CORRUPTED');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    console.error('   Could not download from IPFS gateway');
    console.error('   The upload may have succeeded, but verification failed');
    console.error('   Wait a few minutes and try checking manually:');
    console.error('   https://ipfs.io/ipfs/' + cid);
    process.exit(1);
  }
  
  console.log('');
  
  // Extract image CID from metadata
  const imageCid = metadata.image.replace('ipfs://', '');
  
  // Save deployment record
  const record = {
    operation: 'metadata_upload',
    metadata_cid: cid,
    image_cid: imageCid,
    sha256_local: localHash,
    sha256_remote: remoteHash || localHash,
    file_size_bytes: fileSize,
    provider: provider,
    timestamp: getTimestamp(),
    metadata_uri: `ipfs://${cid}`,
    ipfs_gateway_url: `https://ipfs.io/ipfs/${cid}`,
    metadata_content: {
      name: metadata.name,
      symbol: metadata.symbol,
      description: metadata.description,
      presale_total_tokens: metadata.properties?.presale_parameters?.presale_total_tokens
    }
  };
  
  const filename = '.metadata.cids.json';
  const recordPath = saveDeployRecord(filename, record);
  
  console.log('═══════════════════════════════════════════════════════');
  console.log('🎉 METADATA UPLOAD & VERIFICATION COMPLETE');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
  console.log('✅ Metadata CID:', cid);
  console.log('✅ Image CID:', imageCid);
  console.log('✅ Integrity: VERIFIED');
  console.log('');
  console.log('📦 IPFS URLs:');
  console.log('   Metadata: ipfs://' + cid);
  console.log('   Gateway:  https://ipfs.io/ipfs/' + cid);
  console.log('   Image:    https://ipfs.io/ipfs/' + imageCid);
  console.log('');
  console.log('📝 Record saved to:', recordPath);
  console.log('');
  console.log('💡 Next Steps:');
  console.log('   1. Use this CID to attach metadata to your token');
  console.log('   2. Run: node scripts/attach-metadata.js --mint <TOKEN_MINT> --metadata-cid ' + cid);
  console.log('');
}

// Run if called directly
if (require.main === module) {
  uploadMetadata().catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { uploadMetadata };

#!/usr/bin/env node

/**
 * Upload metadata and image to Web3.Storage (IPFS)
 * Returns CIDs for both files
 */

require('dotenv').config();
const { Web3Storage, File } = require('web3.storage');
const fs = require('fs');
const path = require('path');

const TOKEN = process.env.WEB3_STORAGE_TOKEN;
const METADATA_FILE = process.env.METADATA_FILE || './metadata/metadata.json';
const IMAGE_FILE = process.env.IMAGE_FILE || './metadata/image.png';

if (!TOKEN) {
  console.error('❌ WEB3_STORAGE_TOKEN not found in environment');
  console.error('Get your token at: https://web3.storage');
  process.exit(1);
}

async function uploadToIPFS() {
  console.log('🚀 Starting upload to Web3.Storage...\n');

  const client = new Web3Storage({ token: TOKEN });

  // Check files exist
  if (!fs.existsSync(IMAGE_FILE)) {
    console.error(`❌ Image file not found: ${IMAGE_FILE}`);
    process.exit(1);
  }

  // Upload image first
  console.log(`📤 Uploading image: ${IMAGE_FILE}`);
  const imageBuffer = fs.readFileSync(IMAGE_FILE);
  const imageFile = new File([imageBuffer], 'image.png', { type: 'image/png' });
  const imageCid = await client.put([imageFile], { 
    name: 'MYXN-Token-Image',
    wrapWithDirectory: false 
  });
  const imageUri = `ipfs://${imageCid}`;
  console.log(`✅ Image uploaded: ${imageUri}\n`);

  // Read metadata template and replace placeholders
  let metadataContent = fs.readFileSync(METADATA_FILE, 'utf8');
  const metadataJson = JSON.parse(metadataContent);
  
  // Update image URIs
  metadataJson.image = imageUri;
  metadataJson.properties.files[0].uri = imageUri;
  
  // Replace placeholders if template
  metadataJson.properties.creators[0].address = process.env.TREASURY_PUB || metadataJson.properties.creators[0].address;
  metadataJson.burn_address = process.env.BURN_WALLET || metadataJson.burn_address;

  // Upload metadata
  console.log(`📤 Uploading metadata JSON...`);
  const metadataBuffer = Buffer.from(JSON.stringify(metadataJson, null, 2));
  const metadataFile = new File([metadataBuffer], 'metadata.json', { type: 'application/json' });
  const metadataCid = await client.put([metadataFile], { 
    name: 'MYXN-Token-Metadata',
    wrapWithDirectory: false 
  });
  const metadataUri = `ipfs://${metadataCid}`;
  console.log(`✅ Metadata uploaded: ${metadataUri}\n`);

  // Save CIDs to file
  const cidData = {
    timestamp: new Date().toISOString(),
    image_cid: imageCid,
    image_uri: imageUri,
    metadata_cid: metadataCid,
    metadata_uri: metadataUri,
    gateway_image: `https://${imageCid}.ipfs.w3s.link`,
    gateway_metadata: `https://${metadataCid}.ipfs.w3s.link`
  };

  fs.writeFileSync('.metadata.cids.json', JSON.stringify(cidData, null, 2));
  console.log('💾 CIDs saved to .metadata.cids.json\n');

  // Save updated metadata
  const finalMetadataPath = './metadata/metadata.final.json';
  fs.writeFileSync(finalMetadataPath, JSON.stringify(metadataJson, null, 2));
  console.log(`💾 Final metadata saved to ${finalMetadataPath}\n`);

  console.log('📋 Summary:');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`Image CID:    ${imageCid}`);
  console.log(`Image URI:    ${imageUri}`);
  console.log(`Metadata CID: ${metadataCid}`);
  console.log(`Metadata URI: ${metadataUri}`);
  console.log('═══════════════════════════════════════════════════════');
  console.log(`\n🌐 View on IPFS Gateway:`);
  console.log(`   Image:    ${cidData.gateway_image}`);
  console.log(`   Metadata: ${cidData.gateway_metadata}`);

  return cidData;
}

if (require.main === module) {
  uploadToIPFS()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('❌ Upload failed:', err);
      process.exit(1);
    });
}

module.exports = { uploadToIPFS };

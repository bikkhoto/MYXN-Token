#!/usr/bin/env node

/**
 * Upload Token Metadata to Pinata IPFS
 */

const fs = require('fs');
const axios = require('axios');

// Pinata API credentials
const PINATA_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJkNjFmZTgzYS01MmYwLTQyMzQtYTdkMy1jMTNjMzU5NzAwNGQiLCJlbWFpbCI6ImRldnNAbXl4ZW5wYXkuZmluYW5jZSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwaW5fcG9saWN5Ijp7InJlZ2lvbnMiOlt7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6IkZSQTEifSx7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6Ik5ZQzEifV0sInZlcnNpb24iOjF9LCJtZmFfZW5hYmxlZCI6ZmFsc2UsInN0YXR1cyI6IkFDVElWRSJ9LCJhdXRoZW50aWNhdGlvblR5cGUiOiJzY29wZWRLZXkiLCJzY29wZWRLZXlLZXkiOiI3OWNhOTdkOTFiZmQ1MjI1NTBmNCIsInNjb3BlZEtleVNlY3JldCI6IjBkY2E2NWRlNDcyNWMyYzU2ODU4NzhkNmFkZjEwMzcwZDhmMmQ1NDJkYzg0NTI0N2U2NjM2MGVjMmFmYTc3YzgiLCJleHAiOjE3OTY2ODc1MTd9.4nZt5uwqoTHyAylUmchqrqO9idcnYq5U211jW7K7tf8';

async function uploadMetadata() {
  console.log('\n📤 UPLOADING METADATA TO PINATA IPFS');
  console.log('═══════════════════════════════════════════════════════\n');

  // Load metadata file
  const metadataPath = './metadata/token-metadata.json';
  const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));

  console.log('📄 Metadata to upload:');
  console.log('   Name: ' + metadata.name);
  console.log('   Symbol: ' + metadata.symbol);
  console.log('   Image: ' + metadata.image + '\n');

  try {
    console.log('⏳ Uploading to Pinata...');

    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinJSONToIPFS',
      {
        pinataContent: metadata,
        pinataMetadata: {
          name: 'MYXN-Token-Metadata'
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${PINATA_JWT}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const ipfsHash = response.data.IpfsHash;
    console.log('✅ Metadata uploaded successfully!');
    console.log('   IPFS Hash: ' + ipfsHash);
    console.log('   IPFS URI: ipfs://' + ipfsHash + '\n');

    // Save upload result
    const uploadResult = {
      timestamp: new Date().toISOString(),
      ipfsHash: ipfsHash,
      ipfsUri: `ipfs://${ipfsHash}`,
      gatewayUrl: `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
      metadata: metadata
    };

    fs.writeFileSync(
      './metadata-upload-result.json',
      JSON.stringify(uploadResult, null, 2)
    );

    console.log('💾 Upload result saved to: metadata-upload-result.json\n');

    console.log('═══════════════════════════════════════════════════════');
    console.log('🎉 METADATA UPLOAD COMPLETE!');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('📋 IPFS Details:');
    console.log('   Hash: ' + ipfsHash);
    console.log('   URI: ipfs://' + ipfsHash);
    console.log('   Gateway: https://gateway.pinata.cloud/ipfs/' + ipfsHash + '\n');

    console.log('✅ Ready for token deployment!\n');

    return uploadResult;

  } catch (error) {
    console.error('❌ Upload failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

uploadMetadata();
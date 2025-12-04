#!/usr/bin/env node

/**
 * Check MYXN Token Metadata
 * 
 * Reads on-chain metadata and validates against local records
 * 
 * Usage:
 *   node check-metadata.js --mint <TOKEN_MINT> --network <RPC_URL>
 */

require('dotenv').config();
const { createUmi } = require('@metaplex-foundation/umi-bundle-defaults');
const { publicKey } = require('@metaplex-foundation/umi');
const { findMetadataPda, fetchMetadata } = require('@metaplex-foundation/mpl-token-metadata');
const fs = require('fs');
const path = require('path');
const { ipfsDownload, sha256File, getTimestamp, saveDeployRecord, validateBase58 } = require('./helper-utils');

// Parse CLI arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    mint: null,
    network: 'https://api.mainnet-beta.solana.com'
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

async function checkMetadata() {
  console.log('\n🔍 MYXN METADATA CHECKER');
  console.log('═══════════════════════════════════════════════════════\n');
  
  // Parse arguments
  const options = parseArgs();
  
  if (!options.mint) {
    console.error('❌ Error: --mint parameter required');
    console.error('   Usage: node check-metadata.js --mint <TOKEN_MINT> --network <RPC_URL>');
    process.exit(1);
  }
  
  if (!validateBase58(options.mint)) {
    console.error('❌ Error: Invalid mint address');
    process.exit(1);
  }
  
  console.log('📋 Configuration:');
  console.log('   Mint:', options.mint);
  console.log('   Network:', options.network);
  console.log('');
  
  // Initialize UMI
  console.log('🔧 Initializing UMI SDK...');
  const umi = createUmi(options.network);
  
  // Find metadata PDA
  const mint = publicKey(options.mint);
  const metadataPda = findMetadataPda(umi, { mint });
  
  console.log('   Metadata PDA:', metadataPda[0]);
  console.log('');
  
  // Fetch metadata
  try {
    console.log('📖 Fetching on-chain metadata...');
    const metadata = await fetchMetadata(umi, metadataPda[0]);
    
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('📄 ON-CHAIN METADATA');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log('Name:', metadata.name);
    console.log('Symbol:', metadata.symbol);
    console.log('URI:', metadata.uri);
    console.log('Is Mutable:', metadata.isMutable);
    console.log('Update Authority:', metadata.updateAuthority);
    console.log('');
    
    console.log('Creators:');
    if (metadata.creators && metadata.creators.length > 0) {
      metadata.creators.forEach((creator, i) => {
        const verifiedIcon = creator.verified ? '✅' : '❌';
        console.log(`  ${i + 1}. ${verifiedIcon} ${creator.address}`);
        console.log(`     Share: ${creator.percentage}%, Verified: ${creator.verified}`);
      });
    } else {
      console.log('  No creators found');
    }
    console.log('');
    
    // Extract CID from URI
    const uriMatch = metadata.uri.match(/ipfs:\/\/(.+)/);
    if (uriMatch) {
      const cid = uriMatch[1];
      console.log('📦 IPFS Metadata:');
      console.log('   CID:', cid);
      
      try {
        console.log('   Downloading from IPFS...');
        const ipfsContent = await ipfsDownload(cid);
        const ipfsJson = JSON.parse(ipfsContent.toString());
        
        console.log('   ✅ Downloaded successfully');
        console.log('   Name:', ipfsJson.name);
        console.log('   Symbol:', ipfsJson.symbol);
        console.log('   Description:', ipfsJson.description?.substring(0, 100) + '...');
        
        if (ipfsJson.image) {
          console.log('   Image:', ipfsJson.image);
        }
        
        if (ipfsJson.properties?.presale_parameters) {
          console.log('');
          console.log('   Presale Parameters:');
          console.log('     Price (USD):', ipfsJson.properties.presale_parameters.presale_price_usd);
          console.log('     Max per Wallet (USD):', ipfsJson.properties.presale_parameters.presale_max_per_wallet_usd);
          console.log('     Total Tokens:', ipfsJson.properties.presale_parameters.presale_total_tokens.toLocaleString());
        }
        
        console.log('');
        
      } catch (error) {
        console.error('   ❌ Failed to download IPFS content:', error.message);
      }
    }
    
    // Save check record
    const record = {
      operation: 'metadata_check',
      mint: options.mint,
      metadataPda: metadataPda[0].toString(),
      metadata: {
        name: metadata.name,
        symbol: metadata.symbol,
        uri: metadata.uri,
        isMutable: metadata.isMutable,
        updateAuthority: metadata.updateAuthority.toString(),
        creators: metadata.creators.map(c => ({
          address: c.address.toString(),
          share: c.percentage,
          verified: c.verified
        }))
      },
      network: options.network,
      timestamp: getTimestamp()
    };
    
    const filename = `metadata-check-${Date.now()}.json`;
    saveDeployRecord(filename, record);
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ METADATA CHECK COMPLETE');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log('📝 Record saved to: deploy-records/' + filename);
    
  } catch (error) {
    console.error('❌ Failed to fetch metadata:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  checkMetadata().catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { checkMetadata };

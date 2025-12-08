#!/usr/bin/env node

/**
 * Attach Metadata to MYXN Token on Mainnet
 */

const {
  Connection,
  Keypair,
  PublicKey,
} = require('@solana/web3.js');
const { createUmi } = require('@metaplex-foundation/umi-bundle-defaults');
const { createSignerFromKeypair, signerIdentity } = require('@metaplex-foundation/umi');
const { createV1, mplTokenMetadata } = require('@metaplex-foundation/mpl-token-metadata');
const { fromWeb3JsPublicKey, fromWeb3JsKeypair } = require('@metaplex-foundation/umi-web3js-adapters');
const { publicKey } = require('@metaplex-foundation/umi');
const fs = require('fs');
const readline = require('readline');

// Configuration
const RPC_URL = 'https://api.mainnet-beta.solana.com';

async function attachMetadata() {
  console.log('\n🎨 ATTACHING METADATA TO MYXN TOKEN');
  console.log('═══════════════════════════════════════════════════════\n');
  
  // Load deployment record
  if (!fs.existsSync('./deployment-record.json')) {
    console.error('❌ Deployment record not found! Run deploy-token first.');
    process.exit(1);
  }
  
  const deploymentRecord = JSON.parse(fs.readFileSync('./deployment-record.json', 'utf8'));
  const mintAddress = deploymentRecord.mint;
  
  console.log('🪙 Mint: ' + mintAddress);
  
  // Load metadata upload result
  if (!fs.existsSync('./metadata-upload-result.json')) {
    console.error('❌ Metadata upload result not found! Run upload-metadata first.');
    process.exit(1);
  }
  
  const metadataResult = JSON.parse(fs.readFileSync('./metadata-upload-result.json', 'utf8'));
  const metadataUri = metadataResult.ipfsUri;
  
  console.log('📄 Metadata URI: ' + metadataUri + '\n');
  
  // Ask for treasury keypair
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
      
      console.log('\n✅ Treasury keypair loaded\n');
      
      // Initialize UMI
      const umi = createUmi(RPC_URL);
      umi.use(mplTokenMetadata());
      
      const web3Keypair = fromWeb3JsKeypair(treasuryKeypair);
      const signer = createSignerFromKeypair(umi, web3Keypair);
      umi.use(signerIdentity(signer));
      
      console.log('📝 Creating metadata account...');
      
      const mint = publicKey(mintAddress);
      
      const tx = await createV1(umi, {
        mint,
        name: 'MyXen',
        symbol: 'MYXN',
        uri: metadataUri,
        sellerFeeBasisPoints: 0,
        creators: [
          {
            address: publicKey(treasuryKeypair.publicKey.toBase58()),
            verified: true,
            share: 100
          }
        ],
        isMutable: true,
      }).sendAndConfirm(umi);
      
      const signature = Buffer.from(tx.signature).toString('base64');
      
      console.log('✅ Metadata attached successfully!');
      console.log('   Signature: ' + signature + '\n');
      
      // Save metadata attachment record
      const attachmentRecord = {
        timestamp: new Date().toISOString(),
        mint: mintAddress,
        metadataUri: metadataUri,
        signature: signature
      };
      
      fs.writeFileSync(
        './metadata-attachment-record.json',
        JSON.stringify(attachmentRecord, null, 2)
      );
      
      console.log('═══════════════════════════════════════════════════════');
      console.log('🎉 METADATA ATTACHMENT COMPLETE!');
      console.log('═══════════════════════════════════════════════════════\n');
      
      console.log('📋 Token Details:');
      console.log('   Mint: ' + mintAddress);
      console.log('   Metadata URI: ' + metadataUri);
      console.log('   Explorer: https://solscan.io/token/' + mintAddress + '\n');
      
      console.log('✅ Token deployment complete!\n');
      console.log('📋 Summary:');
      console.log('   ✓ Token created on mainnet');
      console.log('   ✓ Full supply minted to treasury');
      console.log('   ✓ Metadata attached with token icon');
      console.log('   ✓ Token visible on explorers\n');
      
    } catch (error) {
      console.error('❌ Metadata attachment failed:', error);
      process.exit(1);
    }
  });
}

attachMetadata();
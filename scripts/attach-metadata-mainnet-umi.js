#!/usr/bin/env node

/**
 * Attach Metaplex Metadata to MYXN Token on Mainnet
 * Uses UMI SDK with mainnet-specific metadata CID
 */

require('dotenv').config();
const { createUmi } = require('@metaplex-foundation/umi-bundle-defaults');
const { createSignerFromKeypair, signerIdentity, publicKey } = require('@metaplex-foundation/umi');
const { createMetadataAccountV3 } = require('@metaplex-foundation/mpl-token-metadata');
const fs = require('fs');

// MAINNET CONFIGURATION
const RPC_URL = 'https://api.mainnet-beta.solana.com';
const TOKEN_MINT = process.env.TOKEN_MINT || '3NVKYBqjuhLzk5FQNBhcExkruJ7qcaZizkD7Q7veyHGH';
const METADATA_CID = 'bafkreiholwopitkccosr6ebn42frwmpwlzel2c4fcl6wdsvk6y7rwx337a';
const METADATA_URI = 'ipfs://' + METADATA_CID;

async function attachMetadataMainnet() {
  console.log('\n🎨 MYXN MAINNET METADATA ATTACHMENT');
  console.log('═══════════════════════════════════════════════════════\n');
  
  // SAFETY CHECK
  console.log('⚠️  MAINNET OPERATION - PLEASE VERIFY:');
  console.log('   Mint: ' + TOKEN_MINT);
  console.log('   Metadata CID: ' + METADATA_CID);
  console.log('   URI: ' + METADATA_URI);
  console.log('');
  
  const confirmMainnet = process.env.CONFIRM_MAINNET;
  if (confirmMainnet !== 'true') {
    console.error('❌ MAINNET operation not confirmed!');
    console.error('   Set CONFIRM_MAINNET=true in .env to proceed');
    process.exit(1);
  }
  
  console.log('✅ Mainnet operation confirmed\n');
  
  // Load metadata JSON
  const metadataPath = './metadata/metadata-mainnet.json';
  if (!fs.existsSync(metadataPath)) {
    console.error('❌ Metadata file not found: ' + metadataPath);
    process.exit(1);
  }
  
  const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
  console.log('📄 Loaded metadata:');
  console.log('   Name: ' + metadata.name);
  console.log('   Symbol: ' + metadata.symbol);
  console.log('   URI: ' + metadata.image);
  console.log('');
  
  // Verify URI matches
  if (metadata.image !== METADATA_URI) {
    console.error('❌ Metadata URI mismatch!');
    console.error('   Expected: ' + METADATA_URI);
    console.error('   In file: ' + metadata.image);
    process.exit(1);
  }
  
  // Load mainnet wallet keypair (for signing and paying fees)
  const walletKeypairPath = './mainnet-wallet-keypair.json';
  if (!fs.existsSync(walletKeypairPath)) {
    console.error('❌ Wallet keypair not found: ' + walletKeypairPath);
    console.error('   Please run: node convert-private-key.js');
    process.exit(1);
  }
  const walletKeypairData = JSON.parse(fs.readFileSync(walletKeypairPath, 'utf-8'));
  const walletKeypairBytes = new Uint8Array(walletKeypairData);
  
  console.log('✅ Keypair loaded\n');
  
  // Initialize UMI
  console.log('🔧 Initializing UMI SDK for mainnet...');
  const umi = createUmi(RPC_URL);
  
  // Create signer from keypair
  const umiKeypair = umi.eddsa.createKeypairFromSecretKey(walletKeypairBytes);
  const signer = createSignerFromKeypair(umi, umiKeypair);
  umi.use(signerIdentity(signer));
  
  console.log('   Signer: ' + signer.publicKey);
  console.log('   Mint: ' + TOKEN_MINT);
  console.log('');
  
  // Prepare metadata
  console.log('📝 Creating metadata account...');
  console.log('   Name: ' + metadata.name);
  console.log('   Symbol: ' + metadata.symbol);
  console.log('   URI: ' + METADATA_URI);
  console.log('');
  
  const creators = metadata.properties.creators.map(creator => ({
    address: publicKey(creator.address),
    verified: false,
    share: creator.share,
  }));
  
  try {
    const result = await createMetadataAccountV3(umi, {
      mint: publicKey(TOKEN_MINT),
      mintAuthority: signer,
      payer: signer,
      updateAuthority: signer.publicKey,
      data: {
        name: metadata.name,
        symbol: metadata.symbol,
        uri: METADATA_URI,
        sellerFeeBasisPoints: metadata.seller_fee_basis_points || 0,
        creators: creators,
        collection: null,
        uses: null,
      },
      isMutable: true,
      collectionDetails: null,
    }).sendAndConfirm(umi);
    
    console.log('✅ Metadata attached successfully!');
    console.log('   Signature:', result.signature);
    console.log('');
    
    // Calculate metadata PDA
    const TOKEN_METADATA_PROGRAM_ID = publicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
    const seeds = [
      Buffer.from('metadata'),
      Buffer.from(TOKEN_METADATA_PROGRAM_ID),
      Buffer.from(publicKey(TOKEN_MINT)),
    ];
    
    // Note: This is simplified PDA calculation for display
    console.log('═══════════════════════════════════════════════════════');
    console.log('🎉 MAINNET METADATA ATTACHED!');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('Token: ' + TOKEN_MINT);
    console.log('Metadata URI: ' + METADATA_URI);
    console.log('IPFS Gateway: https://ipfs.io/ipfs/' + METADATA_CID);
    console.log('');
    console.log('Verify on:');
    console.log('   Explorer: https://explorer.solana.com/address/' + TOKEN_MINT);
    console.log('   Solscan: https://solscan.io/token/' + TOKEN_MINT);
    console.log('');
    
    // Save metadata record
    const metadataRecord = {
      network: 'mainnet-beta',
      timestamp: new Date().toISOString(),
      mint: TOKEN_MINT,
      metadataCID: METADATA_CID,
      metadataURI: METADATA_URI,
      name: metadata.name,
      symbol: metadata.symbol,
      signature: Array.from(result.signature),
    };
    
    fs.writeFileSync(
      './metadata-mainnet-deployment.json',
      JSON.stringify(metadataRecord, null, 2)
    );
    
    console.log('✅ Metadata record saved to: metadata-mainnet-deployment.json\n');
    
    console.log('Next Steps:');
    console.log('   1. Verify metadata loads on explorers (may take 1-2 minutes)');
    console.log('   2. Deploy presale program: anchor deploy --provider.cluster mainnet');
    console.log('   3. (Optional) Sign metadata to set verified=true');
    console.log('');
    
  } catch (error) {
    console.error('❌ Failed to attach metadata:');
    console.error(error);
    process.exit(1);
  }
}

attachMetadataMainnet().catch(console.error);

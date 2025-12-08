#!/usr/bin/env node

/**
 * Attach Metadata to Secure MYXN Token
 * 
 * This script attaches Metaplex metadata to the newly created secure token.
 */

require('dotenv').config();
const {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} = require('@solana/web3.js');
const { createUmi } = require('@metaplex-foundation/umi-bundle-defaults');
const { createSignerFromKeypair, signerIdentity, generateSigner } = require('@metaplex-foundation/umi');
const { createMetadataAccountV3, mplTokenMetadata } = require('@metaplex-foundation/mpl-token-metadata');
const { fromWeb3JsPublicKey, fromWeb3JsKeypair } = require('@metaplex-foundation/umi-web3js-adapters');
const fs = require('fs');
const path = require('path');

// Configuration
const RPC_URL = process.env.RPC_URL || 'https://api.mainnet-beta.solana.com';
const METADATA_FILE = process.env.METADATA_FILE || './metadata/secure-token-metadata.json';

async function attachMetadata() {
  console.log('\n🎨 ATTACHING METADATA TO SECURE TOKEN');
  console.log('═══════════════════════════════════════════════════════\n');

  // Load metadata
  if (!fs.existsSync(METADATA_FILE)) {
    console.error(`❌ Metadata file not found: ${METADATA_FILE}`);
    process.exit(1);
  }

  const metadata = JSON.parse(fs.readFileSync(METADATA_FILE, 'utf8'));
  console.log(`📄 Loaded metadata: ${METADATA_FILE}`);
  console.log(`   Name: ${metadata.name}`);
  console.log(`   Symbol: ${metadata.symbol}\n`);

  // Get mint address from deployment record
  const recordPath = './deployment-record.json';
  if (!fs.existsSync(recordPath)) {
    console.error('❌ Deployment record not found. Run deploy-secure-token.js first!');
    process.exit(1);
  }

  const deploymentRecord = JSON.parse(fs.readFileSync(recordPath, 'utf8'));
  const mintAddress = deploymentRecord.mint;
  console.log(`🪙 Mint: ${mintAddress}\n`);

  // Load creator keypair
  const keypairPath = process.env.TMP_KEYPAIR_PATH;
  if (!keypairPath || !fs.existsSync(keypairPath)) {
    console.error('❌ TMP_KEYPAIR_PATH not found or invalid');
    process.exit(1);
  }

  const secretKey = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
  const creator = Keypair.fromSecretKey(new Uint8Array(secretKey));

  // Initialize UMI
  const umi = createUmi(RPC_URL);
  umi.use(mplTokenMetadata());

  const web3Keypair = fromWeb3JsKeypair(creator);
  const signer = createSignerFromKeypair(umi, web3Keypair);
  umi.use(signerIdentity(signer));

  console.log(`🔑 Creator: ${signer.publicKey}\n`);

  // Create metadata account
  const mint = fromWeb3JsPublicKey(new PublicKey(mintAddress));
  const metadataUri = metadata.image; // Using image URI as metadata URI for now

  console.log('📝 Creating metadata account...');

  try {
    const tx = await createMetadataAccountV3(umi, {
      mint,
      data: {
        name: metadata.name,
        symbol: metadata.symbol,
        uri: metadataUri,
        sellerFeeBasisPoints: metadata.seller_fee_basis_points || 0,
        creators: metadata.properties?.creators ? metadata.properties.creators.map(creator => ({
          address: creator.address,
          verified: creator.verified || false,
          share: creator.share
        })) : null,
        collection: null,
        uses: null
      },
      isMutable: true, // Keeping mutable for initial updates
    });

    const result = await tx.sendAndConfirm(umi, { send: { skipPreflight: false } });
    const signature = result.signature;

    console.log('✅ Metadata attached successfully!');
    console.log(`   Signature: ${signature}`);
    
    // Calculate metadata PDA
    const metadataPDA = umi.eddsa.findPda(umi.programs.get('mplTokenMetadata').publicKey, [
      Buffer.from('metadata'),
      umi.programs.get('mplTokenMetadata').publicKey.toBytes(),
      mint.toBytes(),
    ]);

    console.log(`   Metadata PDA: ${metadataPDA[0]}\n`);

    // Save metadata record
    const metadataRecord = {
      timestamp: new Date().toISOString(),
      network: 'mainnet-beta',
      mint: mintAddress,
      metadataPDA: metadataPDA[0].toString(),
      signature: signature,
      metadataUri: metadataUri,
      isMutable: true
    };

    const recordPath = './metadata-record.json';
    fs.writeFileSync(recordPath, JSON.stringify(metadataRecord, null, 2));
    console.log(`💾 Metadata record saved: ${recordPath}\n`);

    // Print summary
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ METADATA ATTACHED SUCCESSFULLY');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Mint:             ${mintAddress}`);
    console.log(`Metadata PDA:     ${metadataPDA[0]}`);
    console.log(`Metadata URI:     ${metadataUri}`);
    console.log('═══════════════════════════════════════════════════════');

    console.log('\n🔗 View on Solscan:');
    console.log(`   https://solscan.io/token/${mintAddress}\n`);

  } catch (err) {
    console.error('❌ Failed to create metadata:', err.message);
    process.exit(1);
  }
}

attachMetadata();
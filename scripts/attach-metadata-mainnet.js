#!/usr/bin/env node

/**
 * Attach Metaplex Metadata to SPL Token
 * Sets verified=true by signing with creator key
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
const { createSignerFromKeypair, signerIdentity } = require('@metaplex-foundation/umi');
const { createMetadataAccountV3, mplTokenMetadata } = require('@metaplex-foundation/mpl-token-metadata');
const { fromWeb3JsPublicKey, fromWeb3JsKeypair } = require('@metaplex-foundation/umi-web3js-adapters');
const fs = require('fs');
const path = require('path');

// Configuration
const NETWORK = process.env.NETWORK || 'devnet';
const RPC_URL = NETWORK === 'mainnet-beta' 
  ? 'https://api.mainnet-beta.solana.com'
  : 'https://api.devnet.solana.com';

async function attachMetadata() {
  console.log('\n🎨 MYXN Token Metadata Attachment');
  console.log('═══════════════════════════════════════════════════════\n');

  // Load metadata
  const metadataPath = process.env.METADATA_FILE || './metadata/metadata.final.json';
  if (!fs.existsSync(metadataPath)) {
    console.error(`❌ Metadata file not found: ${metadataPath}`);
    console.error('   Run upload-metadata-web3storage.js first!');
    process.exit(1);
  }

  const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  console.log(`📄 Loaded metadata: ${metadataPath}`);
  console.log(`   Name: ${metadata.name}`);
  console.log(`   Symbol: ${metadata.symbol}`);
  console.log(`   URI: ${metadata.image}\n`);

  // Get mint address from deployment record or env
  const mintAddress = process.env.TOKEN_MINT;
  if (!mintAddress) {
    console.error('❌ TOKEN_MINT not set in environment');
    console.error('   Set TOKEN_MINT=<mint-address> from previous deployment');
    process.exit(1);
  }

  const mint = new PublicKey(mintAddress);
  console.log(`🪙 Mint: ${mint.toBase58()}\n`);

  // Load creator keypair (must be treasury for verified=true)
  const keypairPath = process.env.TMP_KEYPAIR_PATH;
  if (!keypairPath || !fs.existsSync(keypairPath)) {
    console.error('❌ TMP_KEYPAIR_PATH not found or invalid');
    process.exit(1);
  }

  const secretKey = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
  const creator = Keypair.fromSecretKey(new Uint8Array(secretKey));

  console.log(`🔑 Creator: ${creator.publicKey.toBase58()}`);
  
  // Verify creator matches metadata
  const creatorInMetadata = metadata.properties.creators[0].address;
  if (creator.publicKey.toBase58() !== creatorInMetadata) {
    console.error(`❌ Creator mismatch!`);
    console.error(`   Keypair: ${creator.publicKey.toBase58()}`);
    console.error(`   Metadata: ${creatorInMetadata}`);
    console.error(`\n⚠️  For verified=true, creator must sign the transaction!`);
    process.exit(1);
  }

  console.log('✅ Creator verified\n');

  // Confirm mainnet
  if (NETWORK === 'mainnet-beta' && process.env.CONFIRM_MAINNET !== 'true') {
    console.error('❌ MAINNET operation requires CONFIRM_MAINNET=true');
    process.exit(1);
  }

  const connection = new Connection(RPC_URL, 'confirmed');

  // Check balance
  const balance = await connection.getBalance(creator.publicKey);
  const balanceSOL = balance / 1e9;
  console.log(`💰 Creator balance: ${balanceSOL.toFixed(4)} SOL`);

  if (balanceSOL < 0.02) {
    console.error('❌ Insufficient balance for metadata creation (need ~0.02 SOL)');
    process.exit(1);
  }

  // Derive metadata PDA
  const [metadataPDA] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata'),
      new PublicKey(METADATA_PROGRAM_ID).toBuffer(),
      mint.toBuffer(),
    ],
    new PublicKey(METADATA_PROGRAM_ID)
  );

  console.log(`📍 Metadata PDA: ${metadataPDA.toBase58()}\n`);

  // Check if metadata already exists
  const existingMetadata = await connection.getAccountInfo(metadataPDA);
  
  if (existingMetadata) {
    console.log('⚠️  Metadata account already exists!');
    console.log('   Skipping creation. To update, use update-metadata script.\n');
    return;
  }

  // Prepare metadata data
  const metadataData = {
    name: metadata.name,
    symbol: metadata.symbol,
    uri: metadata.image, // This should be the metadata URI, not image URI
    sellerFeeBasisPoints: metadata.seller_fee_basis_points || 0,
    creators: [
      {
        address: creator.publicKey,
        verified: true, // Will be true because creator signs tx
        share: 100,
      }
    ],
    collection: null,
    uses: null,
  };

  console.log('📝 Creating metadata account...');
  console.log(`   Name: ${metadataData.name}`);
  console.log(`   Symbol: ${metadataData.symbol}`);
  console.log(`   Creators[0].verified: true (creator signing)\n`);

  const createMetadataIx = createCreateMetadataAccountV3Instruction(
    {
      metadata: metadataPDA,
      mint: mint,
      mintAuthority: creator.publicKey,
      payer: creator.publicKey,
      updateAuthority: creator.publicKey,
    },
    {
      createMetadataAccountArgsV3: {
        data: metadataData,
        isMutable: true,
        collectionDetails: null,
      }
    }
  );

  const tx = new Transaction().add(createMetadataIx);

  try {
    const signature = await sendAndConfirmTransaction(connection, tx, [creator], {
      commitment: 'confirmed',
    });
    console.log(`✅ Metadata created: ${signature}\n`);

    // Save record
    const recordsDir = './deploy-records';
    if (!fs.existsSync(recordsDir)) {
      fs.mkdirSync(recordsDir, { recursive: true });
    }

    const record = {
      timestamp: new Date().toISOString(),
      network: NETWORK,
      mint: mint.toBase58(),
      metadata_pda: metadataPDA.toBase58(),
      signature: signature,
      metadata_data: metadataData,
      creator_verified: true,
    };

    const recordPath = path.join(recordsDir, `metadata-${Date.now()}.json`);
    fs.writeFileSync(recordPath, JSON.stringify(record, null, 2));
    console.log(`💾 Record saved: ${recordPath}\n`);

    // Print summary
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ METADATA ATTACHED SUCCESSFULLY');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Mint:             ${mint.toBase58()}`);
    console.log(`Metadata PDA:     ${metadataPDA.toBase58()}`);
    console.log(`Creator Verified: true`);
    console.log(`Signature:        ${signature}`);
    console.log('═══════════════════════════════════════════════════════');

    const explorerUrl = NETWORK === 'mainnet-beta' 
      ? `https://solscan.io/token/${mint.toBase58()}`
      : `https://solscan.io/token/${mint.toBase58()}?cluster=devnet`;
    console.log(`\n🔗 View on Solscan: ${explorerUrl}\n`);

  } catch (err) {
    console.error('❌ Failed to create metadata:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  attachMetadata()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('❌ Error:', err);
      process.exit(1);
    });
}

module.exports = { attachMetadata };

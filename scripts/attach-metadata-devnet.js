require('dotenv').config();
const {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} = require('@solana/web3.js');
const mpl = require('@metaplex-foundation/mpl-token-metadata');
const fs = require('fs');
const path = require('path');

// Metaplex Token Metadata Program ID
const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

async function attachMetadata() {
  try {
    console.log('🚀 Attaching Metadata to MYXN Token on Devnet...\n');

    // Connect to devnet
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    
    // Load treasury keypair
    const keypairPath = process.env.TMP_KEYPAIR_PATH;
    if (!keypairPath) {
      throw new Error('TMP_KEYPAIR_PATH not set in .env');
    }
    
    const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
    const payer = Keypair.fromSecretKey(new Uint8Array(keypairData));
    console.log('✅ Loaded treasury keypair:', payer.publicKey.toBase58());

    // Token mint
    const tokenMint = new PublicKey('DL41ms25heCSkxNuYnC2C7aXjogDnC6fk3V2hDcuU35C');
    console.log('✅ Token mint:', tokenMint.toBase58());

    // Load metadata
    const metadataPath = path.join(__dirname, '../metadata/metadata.json');
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
    console.log('✅ Loaded metadata:', metadata.name);

    // Derive metadata PDA
    const [metadataPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('metadata'),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        tokenMint.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    );
    console.log('✅ Metadata PDA:', metadataPDA.toBase58());

    // Check if metadata already exists
    const accountInfo = await connection.getAccountInfo(metadataPDA);
    if (accountInfo) {
      console.log('⚠️  Metadata account already exists. Skipping creation.');
      console.log('   Metadata PDA:', metadataPDA.toBase58());
      return;
    }

    // Prepare metadata instruction data
    const metadataData = {
      name: metadata.name,
      symbol: metadata.symbol,
      uri: `ipfs://${process.env.METADATA_CID || 'bafybeiasgox3kcgxustfjfipoeu6xqlpu5io6rdpsxltuy6vbzp7d255zu'}`,
      sellerFeeBasisPoints: metadata.seller_fee_basis_points || 0,
      creators: metadata.properties.creators.map(c => ({
        address: new PublicKey(c.address),
        verified: false, // Will be true when creator signs
        share: c.share,
      })),
      collection: null,
      uses: null,
    };

    console.log('\n📝 Creating metadata account...');
    console.log('   Name:', metadataData.name);
    console.log('   Symbol:', metadataData.symbol);
    console.log('   URI:', metadataData.uri);

    // Create instruction using the mpl namespace
    const instruction = mpl.createMetadataAccountV3(
      {
        metadata: metadataPDA,
        mint: tokenMint,
        mintAuthority: payer.publicKey,
        payer: payer.publicKey,
        updateAuthority: payer.publicKey,
      },
      {
        data: metadataData,
        isMutable: true,
        collectionDetails: null,
      }
    );

    // Send transaction
    const transaction = new Transaction().add(instruction);
    console.log('\n⏳ Sending transaction...');
    
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [payer],
      { commitment: 'confirmed' }
    );

    console.log('\n✅ Metadata attached successfully!');
    console.log('   Transaction:', signature);
    console.log('   Metadata PDA:', metadataPDA.toBase58());
    console.log('   Explorer:', `https://explorer.solana.com/address/${metadataPDA.toBase58()}?cluster=devnet`);

    // Save deployment record
    const recordsDir = path.join(__dirname, '../deploy-records');
    if (!fs.existsSync(recordsDir)) {
      fs.mkdirSync(recordsDir, { recursive: true });
    }
    
    const record = {
      timestamp: new Date().toISOString(),
      network: 'devnet',
      tokenMint: tokenMint.toBase58(),
      metadataPDA: metadataPDA.toBase58(),
      signature: signature,
      metadata: metadataData,
    };
    
    fs.writeFileSync(
      path.join(recordsDir, `metadata-${Date.now()}.json`),
      JSON.stringify(record, null, 2)
    );

    console.log('\n✨ Next steps:');
    console.log('   1. Verify metadata on-chain');
    console.log('   2. Transfer authorities to hardware wallet');
    console.log('   3. Deploy presale program');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.logs) {
      console.error('Transaction logs:', error.logs);
    }
    process.exit(1);
  }
}

attachMetadata();

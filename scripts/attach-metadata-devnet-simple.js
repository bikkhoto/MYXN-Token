require('dotenv').config();
const { Connection, Keypair, PublicKey } = require('@solana/web3.js');
const { Metaplex, keypairIdentity } = require('@metaplex-foundation/js');
const fs = require('fs');
const path = require('path');

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

    // Initialize Metaplex
    const metaplex = Metaplex.make(connection).use(keypairIdentity(payer));
    console.log('✅ Metaplex SDK initialized');

    // Token mint
    const tokenMint = new PublicKey('DL41ms25heCSkxNuYnC2C7aXjogDnC6fk3V2hDcuU35C');
    console.log('✅ Token mint:', tokenMint.toBase58());

    // Load metadata
    const metadataPath = path.join(__dirname, '../metadata/metadata.json');
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
    console.log('✅ Loaded metadata:', metadata.name);

    // Check if metadata already exists
    try {
      const existingMetadata = await metaplex.nfts().findByMint({ mintAddress: tokenMint });
      if (existingMetadata) {
        console.log('\n⚠️  Metadata already exists for this token!');
        console.log('   Name:', existingMetadata.name);
        console.log('   Symbol:', existingMetadata.symbol);
        console.log('   URI:', existingMetadata.uri);
        console.log('   Explorer:', `https://explorer.solana.com/address/${existingMetadata.metadataAddress.toBase58()}?cluster=devnet`);
        return;
      }
    } catch (err) {
      console.log('✅ No existing metadata found (expected for first run)');
    }

    console.log('\n📝 Creating metadata account...');
    console.log('   Name:', metadata.name);
    console.log('   Symbol:', metadata.symbol);
    console.log('   URI: ipfs://bafybeiasgox3kcgxustfjfipoeu6xqlpu5io6rdpsxltuy6vbzp7d255zu');

    // Create metadata
    const { response } = await metaplex.nfts().create({
      uri: 'ipfs://bafybeiasgox3kcgxustfjfipoeu6xqlpu5io6rdpsxltuy6vbzp7d255zu',
      name: metadata.name,
      symbol: metadata.symbol,
      sellerFeeBasisPoints: metadata.seller_fee_basis_points || 0,
      useExistingMint: tokenMint,
      creators: metadata.properties.creators.map(c => ({
        address: new PublicKey(c.address),
        share: c.share,
        verified: false,
      })),
      isMutable: true,
    });

    console.log('\n✅ Metadata attached successfully!');
    console.log('   Transaction:', response.signature);
    console.log('   TX Explorer:', `https://explorer.solana.com/tx/${response.signature}?cluster=devnet`);

    // Get metadata address
    const nft = await metaplex.nfts().findByMint({ mintAddress: tokenMint });
    console.log('   Metadata PDA:', nft.metadataAddress.toBase58());
    console.log('   Explorer:', `https://explorer.solana.com/address/${nft.metadataAddress.toBase58()}?cluster=devnet`);

    // Save deployment record
    const recordsDir = path.join(__dirname, '../deploy-records');
    if (!fs.existsSync(recordsDir)) {
      fs.mkdirSync(recordsDir, { recursive: true });
    }
    
    const record = {
      timestamp: new Date().toISOString(),
      network: 'devnet',
      tokenMint: tokenMint.toBase58(),
      metadataPDA: nft.metadataAddress.toBase58(),
      signature: response.signature,
      metadata: {
        name: metadata.name,
        symbol: metadata.symbol,
        uri: 'ipfs://bafybeiasgox3kcgxustfjfipoeu6xqlpu5io6rdpsxltuy6vbzp7d255zu',
      },
    };
    
    fs.writeFileSync(
      path.join(recordsDir, `metadata-${Date.now()}.json`),
      JSON.stringify(record, null, 2)
    );

    console.log('\n✨ Devnet testing complete!');
    console.log('   ✅ Token created: 1B MYXN');
    console.log('   ✅ Metadata attached with Pinata IPFS');
    console.log('   ✅ Ready for mainnet deployment');
    console.log('\n📋 Next steps:');
    console.log('   1. Fund treasury with ~0.5 SOL on mainnet');
    console.log('   2. Run mainnet deployment');
    console.log('   3. Transfer authorities to hardware wallet');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.logs) {
      console.error('Transaction logs:', error.logs);
    }
    throw error;
  }
}

attachMetadata();

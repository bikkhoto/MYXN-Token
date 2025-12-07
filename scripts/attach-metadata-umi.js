require('dotenv').config();
const { createUmi } = require('@metaplex-foundation/umi-bundle-defaults');
const { createSignerFromKeypair, signerIdentity, publicKey } = require('@metaplex-foundation/umi');
const { createMetadataAccountV3 } = require('@metaplex-foundation/mpl-token-metadata');
const fs = require('fs');
const path = require('path');

async function attachMetadata() {
  try {
    console.log('🚀 Attaching Metadata with UMI SDK...\n');

    // Create UMI instance
    const umi = createUmi('https://api.devnet.solana.com');
    console.log('✅ UMI instance created');

    // Load keypair
    const keypairPath = process.env.TMP_KEYPAIR_PATH;
    if (!keypairPath) {
      throw new Error('TMP_KEYPAIR_PATH not set');
    }

    const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
    const keypairBytes = new Uint8Array(keypairData);
    
    // Create UMI keypair
    const umiKeypair = umi.eddsa.createKeypairFromSecretKey(keypairBytes);
    const signer = createSignerFromKeypair(umi, umiKeypair);
    umi.use(signerIdentity(signer));
    
    console.log('✅ Loaded keypair:', signer.publicKey);

    // Token mint
    const mintAddress = publicKey('DL41ms25heCSkxNuYnC2C7aXjogDnC6fk3V2hDcuU35C');
    console.log('✅ Mint address:', mintAddress);

    // Metadata
    const metadata = {
      name: 'MyXen',
      symbol: 'MYXN',
      uri: 'ipfs://bafybeiasgox3kcgxustfjfipoeu6xqlpu5io6rdpsxltuy6vbzp7d255zu',
      sellerFeeBasisPoints: 0,
      creators: [
        {
          address: signer.publicKey,
          verified: false,
          share: 100,
        },
      ],
      collection: null,
      uses: null,
    };

    console.log('\n📝 Creating metadata...');
    console.log('   Name:', metadata.name);
    console.log('   Symbol:', metadata.symbol);
    console.log('   URI:', metadata.uri);

    // Create metadata account
    const result = await createMetadataAccountV3(umi, {
      mint: mintAddress,
      mintAuthority: signer,
      payer: signer,
      updateAuthority: signer.publicKey,
      data: metadata,
      isMutable: true,
      collectionDetails: null,
    }).sendAndConfirm(umi);

    console.log('\n✅ Metadata attached successfully!');
    console.log('   Signature:', result.signature);
    console.log('   Explorer:', `https://explorer.solana.com/tx/${result.signature}?cluster=devnet`);

    // Save record
    const recordsDir = path.join(__dirname, '../deploy-records');
    if (!fs.existsSync(recordsDir)) {
      fs.mkdirSync(recordsDir, { recursive: true });
    }
    
    const record = {
      timestamp: new Date().toISOString(),
      network: 'devnet',
      tokenMint: mintAddress,
      signature: result.signature,
      metadata,
    };
    
    fs.writeFileSync(
      path.join(recordsDir, `metadata-umi-${Date.now()}.json`),
      JSON.stringify(record, null, 2)
    );

    console.log('\n✨ DEVNET METADATA COMPLETE!');
    console.log('   Token: DL41ms25heCSkxNuYnC2C7aXjogDnC6fk3V2hDcuU35C');
    console.log('   View: https://explorer.solana.com/address/DL41ms25heCSkxNuYnC2C7aXjogDnC6fk3V2hDcuU35C?cluster=devnet');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

attachMetadata();

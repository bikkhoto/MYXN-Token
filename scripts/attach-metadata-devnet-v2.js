require('dotenv').config();
const {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} = require('@solana/web3.js');
const { serialize } = require('borsh');
const fs = require('fs');
const path = require('path');

// Metaplex Token Metadata Program ID
const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

// Borsh schema for metadata
class CreateMetadataAccountArgsV3 {
  constructor(properties) {
    Object.assign(this, properties);
  }
}

class DataV2 {
  constructor(properties) {
    Object.assign(this, properties);
  }
}

class Creator {
  constructor(properties) {
    Object.assign(this, properties);
  }
}

const METADATA_SCHEMA = new Map([
  [
    CreateMetadataAccountArgsV3,
    {
      kind: 'struct',
      fields: [
        ['instruction', 'u8'],
        ['data', DataV2],
        ['isMutable', 'u8'],
        ['collectionDetails', { kind: 'option', type: 'u8' }],
      ],
    },
  ],
  [
    DataV2,
    {
      kind: 'struct',
      fields: [
        ['name', 'string'],
        ['symbol', 'string'],
        ['uri', 'string'],
        ['sellerFeeBasisPoints', 'u16'],
        ['creators', { kind: 'option', type: [Creator] }],
        ['collection', { kind: 'option', type: 'pubkey' }],
        ['uses', { kind: 'option', type: 'u8' }],
      ],
    },
  ],
  [
    Creator,
    {
      kind: 'struct',
      fields: [
        ['address', [32]],
        ['verified', 'u8'],
        ['share', 'u8'],
      ],
    },
  ],
]);

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
      console.log('⚠️  Metadata account already exists!');
      console.log('   Metadata PDA:', metadataPDA.toBase58());
      console.log('   Explorer:', `https://explorer.solana.com/address/${metadataPDA.toBase58()}?cluster=devnet`);
      return;
    }

    // Prepare creators
    const creators = metadata.properties.creators.map(c => {
      const creatorPubkey = new PublicKey(c.address);
      return new Creator({
        address: creatorPubkey.toBytes(),
        verified: 0, // false
        share: c.share,
      });
    });

    // Prepare metadata data
    const data = new DataV2({
      name: metadata.name,
      symbol: metadata.symbol,
      uri: `ipfs://bafybeiasgox3kcgxustfjfipoeu6xqlpu5io6rdpsxltuy6vbzp7d255zu`,
      sellerFeeBasisPoints: metadata.seller_fee_basis_points || 0,
      creators: creators,
      collection: null,
      uses: null,
    });

    const args = new CreateMetadataAccountArgsV3({
      instruction: 33, // CreateMetadataAccountV3
      data: data,
      isMutable: 1, // true
      collectionDetails: null,
    });

    console.log('\n📝 Creating metadata account...');
    console.log('   Name:', data.name);
    console.log('   Symbol:', data.symbol);
    console.log('   URI:', data.uri);

    // Serialize instruction data
    const serializedData = serialize(METADATA_SCHEMA, args);

    // Create instruction
    const keys = [
      { pubkey: metadataPDA, isSigner: false, isWritable: true },
      { pubkey: tokenMint, isSigner: false, isWritable: false },
      { pubkey: payer.publicKey, isSigner: true, isWritable: false },
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: payer.publicKey, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ];

    const instruction = new TransactionInstruction({
      keys,
      programId: TOKEN_METADATA_PROGRAM_ID,
      data: Buffer.from(serializedData),
    });

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
    console.log('   TX Explorer:', `https://explorer.solana.com/tx/${signature}?cluster=devnet`);

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
      metadata: {
        name: data.name,
        symbol: data.symbol,
        uri: data.uri,
      },
    };
    
    fs.writeFileSync(
      path.join(recordsDir, `metadata-${Date.now()}.json`),
      JSON.stringify(record, null, 2)
    );

    console.log('\n✨ Devnet testing complete!');
    console.log('   Next: Verify metadata, then prepare for mainnet');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.logs) {
      console.error('Transaction logs:', error.logs);
    }
    throw error;
  }
}

attachMetadata();

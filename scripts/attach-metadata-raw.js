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
const fs = require('fs');
const path = require('path');

// Metaplex Token Metadata Program ID
const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

// Encode string with 4-byte length prefix
function encodeString(str) {
  const strBuffer = Buffer.from(str, 'utf8');
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32LE(strBuffer.length, 0);
  return Buffer.concat([lengthBuffer, strBuffer]);
}

// Encode Creator
function encodeCreator(address, verified, share) {
  const addressBuffer = new PublicKey(address).toBuffer();
  const verifiedBuffer = Buffer.from([verified ? 1 : 0]);
  const shareBuffer = Buffer.from([share]);
  return Buffer.concat([addressBuffer, verifiedBuffer, shareBuffer]);
}

// Encode Data struct
function encodeData(name, symbol, uri, sellerFeeBasisPoints, creators) {
  const nameBuffer = encodeString(name);
  const symbolBuffer = encodeString(symbol);
  const uriBuffer = encodeString(uri);
  
  const feesBuffer = Buffer.alloc(2);
  feesBuffer.writeUInt16LE(sellerFeeBasisPoints, 0);
  
  // Encode creators (option)
  let creatorsBuffer;
  if (creators && creators.length > 0) {
    const hasCreatorsBuffer = Buffer.from([1]); // Some
    const creatorCountBuffer = Buffer.alloc(4);
    creatorCountBuffer.writeUInt32LE(creators.length, 0);
    const encodedCreators = creators.map(c => encodeCreator(c.address, c.verified, c.share));
    creatorsBuffer = Buffer.concat([hasCreatorsBuffer, creatorCountBuffer, ...encodedCreators]);
  } else {
    creatorsBuffer = Buffer.from([0]); // None
  }
  
  return Buffer.concat([
    nameBuffer,
    symbolBuffer,
    uriBuffer,
    feesBuffer,
    creatorsBuffer,
  ]);
}

async function attachMetadata() {
  try {
    console.log('🚀 Attaching Metadata to MYXN Token on Devnet (Raw Instruction)...\n');

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
      console.log('\n⚠️  Metadata already exists!');
      console.log('   Explorer:', `https://explorer.solana.com/address/${metadataPDA.toBase58()}?cluster=devnet`);
      return;
    }

    console.log('\n📝 Encoding metadata instruction...');
    
    // Encode metadata using CreateMetadataAccountV3 (discriminator: 33)
    const instructionDiscriminator = Buffer.from([33]); // V3 instruction
    
    const dataBuffer = encodeData(
      'MyXen',
      'MYXN',
      'ipfs://bafybeiasgox3kcgxustfjfipoeu6xqlpu5io6rdpsxltuy6vbzp7d255zu',
      0,
      [{ address: payer.publicKey.toBase58(), verified: false, share: 100 }]
    );
    
    const isMutableBuffer = Buffer.from([1]); // true
    const collectionDetailsBuffer = Buffer.from([0]); // None for V3
    
    const instructionData = Buffer.concat([
      instructionDiscriminator,
      dataBuffer,
      isMutableBuffer,
      collectionDetailsBuffer,
    ]);
    
    console.log('✅ Instruction data encoded:', instructionData.length, 'bytes');

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
      data: instructionData,
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
    console.log('   TX Explorer:', `https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    console.log('   PDA Explorer:', `https://explorer.solana.com/address/${metadataPDA.toBase58()}?cluster=devnet`);

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
        name: 'MyXen',
        symbol: 'MYXN',
        uri: 'ipfs://bafybeiasgox3kcgxustfjfipoeu6xqlpu5io6rdpsxltuy6vbzp7d255zu',
      },
    };
    
    fs.writeFileSync(
      path.join(recordsDir, `metadata-${Date.now()}.json`),
      JSON.stringify(record, null, 2)
    );

    console.log('\n✨ DEVNET TESTING COMPLETE!');
    console.log('');
    console.log('Summary:');
    console.log('  ✅ Token created: 1,000,000,000 MYXN');
    console.log('  ✅ Metadata attached with Pinata IPFS');
    console.log('  ✅ Treasury: Azvjj21uXQzHbM9VHhyDfdbj14HD8Tef7ZuC1p7sEMk9');
    console.log('');
    console.log('📋 Ready for mainnet:');
    console.log('  1. Fund treasury with ~0.5 SOL');
    console.log('  2. Use same scripts on mainnet');
    console.log('  3. Transfer authorities to hardware wallet');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.logs) {
      console.error('\nTransaction logs:');
      error.logs.forEach(log => console.error('  ', log));
    }
    throw error;
  }
}

attachMetadata();

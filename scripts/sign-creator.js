#!/usr/bin/env node
/**
 * Sign Metadata as Creator - Use verifyCreatorV1 instruction
 * This properly signs existing metadata as the creator
 */

const { createUmi } = require('@metaplex-foundation/umi-bundle-defaults');
const { createSignerFromKeypair, signerIdentity, publicKey } = require('@metaplex-foundation/umi');
const { verifyCreatorV1, fetchMetadataFromSeeds } = require('@metaplex-foundation/mpl-token-metadata');
const fs = require('fs');
const path = require('path');

// Configuration
const MINT_ADDRESS = '3NVKYBqjuhLzk5FQNBhcExkruJ7qcaZizkD7Q7veyHGH';
const NETWORK = process.env.SOLANA_NETWORK || 'https://api.mainnet-beta.solana.com';
const KEYPAIR_PATH = process.env.WALLET_KEYPAIR || './mainnet-wallet-keypair.json';

async function signCreator() {
  console.log('\n✍️  SIGN METADATA AS CREATOR\n');
  console.log('═'.repeat(50));
  
  try {
    // Load wallet keypair
    const keypairPath = path.resolve(KEYPAIR_PATH);
    if (!fs.existsSync(keypairPath)) {
      throw new Error(`Keypair not found: ${keypairPath}`);
    }
    
    const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
    
    // Initialize UMI
    const umi = createUmi(NETWORK);
    const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(keypairData));
    const signer = createSignerFromKeypair(umi, keypair);
    umi.use(signerIdentity(signer));
    
    console.log(`🔑 Wallet: ${signer.publicKey}`);
    console.log(`🪙 Mint: ${MINT_ADDRESS}`);
    console.log(`🌐 Network: ${NETWORK}`);
    console.log('');
    
    // Fetch current metadata
    const mint = publicKey(MINT_ADDRESS);
    const metadata = await fetchMetadataFromSeeds(umi, { mint });
    
    console.log('📄 Current Metadata:');
    console.log(`   Name: ${metadata.name}`);
    console.log(`   Symbol: ${metadata.symbol}`);
    console.log(`   Update Authority: ${metadata.updateAuthority}`);
    
    if (metadata.creators && metadata.creators.length > 0) {
      console.log('   Creators:');
      metadata.creators.forEach((c, i) => {
        console.log(`     ${i + 1}. ${c.address} (${c.share}%, verified: ${c.verified})`);
      });
      
      // Check if our wallet is in creators
      const ourCreator = metadata.creators.find(c => c.address.toString() === signer.publicKey.toString());
      if (!ourCreator) {
        console.log('');
        console.log('❌ ERROR: Your wallet is not listed as a creator!');
        console.log(`   Your wallet: ${signer.publicKey}`);
        console.log('   You must be in the creators array to sign.');
        console.log('');
        console.log('💡 The metadata needs to be updated first with the correct creator.');
        console.log('   The IPFS metadata has creator: Azvjj21uXQzHbM9VHhyDfdbj14HD8Tef7ZuC1p7sEMk9');
        console.log('   But your wallet is: 6S4eDdYXABgtmuk3waLM63U2KHgExcD9mco7MuyG9f5G');
        console.log('');
        console.log('📝 Solution: Update the IPFS metadata with your correct wallet address');
        return;
      }
      
      if (ourCreator.verified) {
        console.log('');
        console.log('✅ Already verified! Your creator signature is already on-chain.');
        return;
      }
    } else {
      console.log('   Creators: None');
      console.log('');
      console.log('❌ ERROR: No creators found in metadata!');
      console.log('   The metadata must have a creators array before signing.');
      console.log('');
      console.log('💡 The IPFS metadata needs to include your wallet in the creators array.');
      return;
    }
    
    console.log('');
    
    // Confirm before proceeding
    if (process.env.CONFIRM !== 'true') {
      console.log('⚠️  DRY RUN MODE');
      console.log('   Set CONFIRM=true to execute the signature');
      console.log('');
      console.log('📝 Command to execute:');
      console.log(`   CONFIRM=true node ${path.basename(__filename)}`);
      return;
    }
    
    console.log('⏳ Signing metadata as creator...');
    
    // Sign as creator
    const verifyIx = verifyCreatorV1(umi, {
      metadata: metadata.publicKey,
      authority: signer
    });
    
    const tx = await verifyIx.sendAndConfirm(umi);
    const signature = Buffer.from(tx.signature).toString('hex');
    
    console.log('✅ Transaction confirmed!');
    console.log(`   Signature: ${signature}`);
    console.log(`   Explorer: https://solscan.io/tx/${signature}`);
    console.log('');
    
    // Save record
    const record = {
      operation: 'sign_creator',
      mint: MINT_ADDRESS,
      metadataPda: metadata.publicKey.toString(),
      creator: signer.publicKey.toString(),
      txSignature: signature,
      network: NETWORK,
      timestamp: new Date().toISOString()
    };
    
    const recordPath = `./deploy-records/sign-creator-${Date.now()}.json`;
    fs.writeFileSync(recordPath, JSON.stringify(record, null, 2));
    console.log(`💾 Record saved: ${recordPath}`);
    console.log('');
    
    // Verify
    console.log('⏳ Verifying...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const updatedMetadata = await fetchMetadataFromSeeds(umi, { mint });
    const updatedCreator = updatedMetadata.creators?.find(c => c.address.toString() === signer.publicKey.toString());
    
    if (updatedCreator && updatedCreator.verified) {
      console.log('🎉 SUCCESS! Creator verified on-chain!');
    } else {
      console.log('⚠️  Signature sent but verification pending...');
    }
    
  } catch (error) {
    console.error('\n❌ Error:');
    console.error(error);
    process.exit(1);
  }
}

if (require.main === module) {
  signCreator();
}

module.exports = { signCreator };

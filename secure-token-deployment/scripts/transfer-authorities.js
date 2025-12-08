#!/usr/bin/env node

/**
 * Transfer Token Authorities to Multisig Wallet
 * 
 * This script transfers mint and freeze authorities from the treasury wallet
 * to a multisig wallet for enhanced security.
 */

require('dotenv').config();
const {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} = require('@solana/web3.js');
const {
  createSetAuthorityInstruction,
  AuthorityType,
  getMint,
} = require('@solana/spl-token');
const fs = require('fs');

// Configuration
const RPC_URL = process.env.RPC_URL || 'https://api.mainnet-beta.solana.com';
const MULTISIG_WALLET = process.env.MULTISIG_WALLET;

async function transferAuthorities() {
  console.log('\n🔐 TRANSFER AUTHORITIES TO MULTISIG WALLET');
  console.log('═══════════════════════════════════════════════════════\n');

  // Validate multisig wallet address
  if (!MULTISIG_WALLET) {
    console.error('❌ MULTISIG_WALLET not set in environment variables');
    console.error('   Set MULTISIG_WALLET=<multisig-address> in .env');
    process.exit(1);
  }

  let multisigPubkey;
  try {
    multisigPubkey = new PublicKey(MULTISIG_WALLET);
  } catch (err) {
    console.error('❌ Invalid multisig wallet address:', MULTISIG_WALLET);
    process.exit(1);
  }

  console.log(`Multisig Wallet: ${multisigPubkey.toBase58()}\n`);

  // Get mint address from deployment record
  const recordPath = './deployment-record.json';
  if (!fs.existsSync(recordPath)) {
    console.error('❌ Deployment record not found. Run deploy-secure-token.js first!');
    process.exit(1);
  }

  const deploymentRecord = JSON.parse(fs.readFileSync(recordPath, 'utf8'));
  const mintAddress = deploymentRecord.mint;

  const connection = new Connection(RPC_URL, 'confirmed');
  const mintPubkey = new PublicKey(mintAddress);

  // Load treasury keypair
  const keypairPath = process.env.TMP_KEYPAIR_PATH;
  if (!keypairPath || !fs.existsSync(keypairPath)) {
    console.error('❌ TMP_KEYPAIR_PATH not found or invalid');
    process.exit(1);
  }

  const secretKey = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
  const treasuryKeypair = Keypair.fromSecretKey(new Uint8Array(secretKey));

  console.log(`Treasury Wallet: ${treasuryKeypair.publicKey.toBase58()}`);
  console.log(`Token Mint: ${mintPubkey.toBase58()}\n`);

  // Verify current authorities
  console.log('🔍 Checking current authorities...');
  try {
    const mintInfo = await getMint(connection, mintPubkey);
    console.log(`   Mint Authority: ${mintInfo.mintAuthority?.toBase58() || 'None'}`);
    console.log(`   Freeze Authority: ${mintInfo.freezeAuthority?.toBase58() || 'None'}\n`);

    // Check if treasury is the current authority
    if (!mintInfo.mintAuthority || !mintInfo.mintAuthority.equals(treasuryKeypair.publicKey)) {
      console.error('❌ Treasury wallet is not the current mint authority');
      process.exit(1);
    }

    if (!mintInfo.freezeAuthority || !mintInfo.freezeAuthority.equals(treasuryKeypair.publicKey)) {
      console.error('❌ Treasury wallet is not the current freeze authority');
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Failed to get mint info:', err.message);
    process.exit(1);
  }

  // Confirm transfer
  console.log('⚠️  ABOUT TO TRANSFER AUTHORITIES:');
  console.log(`   Mint Authority → ${multisigPubkey.toBase58()}`);
  console.log(`   Freeze Authority → ${multisigPubkey.toBase58()}`);
  console.log('');
  console.log('This action is IRREVERSIBLE unless the multisig wallet has a recovery mechanism.');
  console.log('');

  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  readline.question('Type "TRANSFER" to confirm: ', async (answer) => {
    if (answer !== 'TRANSFER') {
      console.log('❌ Transfer cancelled');
      readline.close();
      process.exit(0);
    }

    readline.close();

    try {
      // Transfer mint authority
      console.log('\n📝 Transferring mint authority...');
      const mintAuthIx = createSetAuthorityInstruction(
        mintPubkey,
        treasuryKeypair.publicKey,
        AuthorityType.MintTokens,
        multisigPubkey
      );

      const mintAuthTx = new Transaction().add(mintAuthIx);
      const mintAuthSig = await sendAndConfirmTransaction(
        connection,
        mintAuthTx,
        [treasuryKeypair],
        { commitment: 'confirmed' }
      );

      console.log('✅ Mint authority transferred!');
      console.log(`   Signature: ${mintAuthSig}\n`);

      // Transfer freeze authority
      console.log('📝 Transferring freeze authority...');
      const freezeAuthIx = createSetAuthorityInstruction(
        mintPubkey,
        treasuryKeypair.publicKey,
        AuthorityType.FreezeAccount,
        multisigPubkey
      );

      const freezeAuthTx = new Transaction().add(freezeAuthIx);
      const freezeAuthSig = await sendAndConfirmTransaction(
        connection,
        freezeAuthTx,
        [treasuryKeypair],
        { commitment: 'confirmed' }
      );

      console.log('✅ Freeze authority transferred!');
      console.log(`   Signature: ${freezeAuthSig}\n`);

      // Verify new authorities
      console.log('🔍 Verifying new authorities...');
      const newMintInfo = await getMint(connection, mintPubkey);
      console.log(`   Mint Authority: ${newMintInfo.mintAuthority?.toBase58() || 'None'}`);
      console.log(`   Freeze Authority: ${newMintInfo.freezeAuthority?.toBase58() || 'None'}\n`);

      // Save transfer record
      const transferRecord = {
        timestamp: new Date().toISOString(),
        network: 'mainnet-beta',
        mint: mintAddress,
        previousAuthorities: {
          mint: treasuryKeypair.publicKey.toBase58(),
          freeze: treasuryKeypair.publicKey.toBase58()
        },
        newAuthorities: {
          mint: multisigPubkey.toBase58(),
          freeze: multisigPubkey.toBase58()
        },
        signatures: {
          mintAuthority: mintAuthSig,
          freezeAuthority: freezeAuthSig
        }
      };

      const recordPath = './authority-transfer-record.json';
      fs.writeFileSync(recordPath, JSON.stringify(transferRecord, null, 2));
      console.log(`💾 Authority transfer record saved: ${recordPath}\n`);

      // Final summary
      console.log('═══════════════════════════════════════════════════════');
      console.log('🎉 AUTHORITIES TRANSFERRED SUCCESSFULLY!');
      console.log('═══════════════════════════════════════════════════════');
      console.log(`Token Mint: ${mintAddress}`);
      console.log(`New Authorities: ${multisigPubkey.toBase58()}`);
      console.log('═══════════════════════════════════════════════════════\n');

      console.log('🔒 SECURITY REMINDER:');
      console.log('   - Store multisig keys securely');
      console.log('   - Test multisig transactions before relying on them');
      console.log('   - Document recovery procedures\n');

      console.log('🔗 View on Solscan:');
      console.log(`   https://solscan.io/token/${mintAddress}\n`);

    } catch (err) {
      console.error('❌ Failed to transfer authorities:', err.message);
      process.exit(1);
    }
  });
}

transferAuthorities();
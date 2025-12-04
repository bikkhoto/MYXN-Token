#!/usr/bin/env node

/**
 * Transfer Mint and Freeze Authorities to Hardware Wallet
 * Uses mnemonic to derive hardware wallet address
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
  TOKEN_PROGRAM_ID,
} = require('@solana/spl-token');
const bip39 = require('bip39');
const { derivePath } = require('ed25519-hd-key');
const fs = require('fs');
const path = require('path');

// Configuration
const NETWORK = process.env.NETWORK || 'devnet';
const RPC_URL = NETWORK === 'mainnet-beta' 
  ? 'https://api.mainnet-beta.solana.com'
  : 'https://api.devnet.solana.com';

function deriveKeypairFromMnemonic(mnemonic, accountIndex = 0) {
  const seed = bip39.mnemonicToSeedSync(mnemonic, '');
  const derivationPath = `m/44'/501'/${accountIndex}'/0'`;
  const derivedSeed = derivePath(derivationPath, seed.toString('hex')).key;
  return Keypair.fromSeed(derivedSeed);
}

async function transferAuthorities() {
  console.log('\n🔐 Transfer Mint & Freeze Authorities to Hardware Wallet');
  console.log('═══════════════════════════════════════════════════════\n');

  // Get mint address
  const mintAddress = process.env.TOKEN_MINT;
  if (!mintAddress) {
    console.error('❌ TOKEN_MINT not set in environment');
    process.exit(1);
  }

  const mint = new PublicKey(mintAddress);
  console.log(`🪙 Mint: ${mint.toBase58()}\n`);

  // Load current authority (temp keypair)
  const tempKeypairPath = process.env.TMP_KEYPAIR_PATH;
  if (!tempKeypairPath || !fs.existsSync(tempKeypairPath)) {
    console.error('❌ TMP_KEYPAIR_PATH not found');
    process.exit(1);
  }

  const secretKey = JSON.parse(fs.readFileSync(tempKeypairPath, 'utf8'));
  const currentAuthority = Keypair.fromSecretKey(new Uint8Array(secretKey));
  console.log(`🔑 Current Authority: ${currentAuthority.publicKey.toBase58()}`);

  // Derive hardware wallet address from mnemonic
  const mnemonic = process.env.HARDWARE_AUTH_MNEMONIC;
  if (!mnemonic) {
    console.error('❌ HARDWARE_AUTH_MNEMONIC not set in environment');
    console.error('   This is the 12-word seed phrase for your hardware wallet');
    process.exit(1);
  }

  if (!bip39.validateMnemonic(mnemonic)) {
    console.error('❌ Invalid mnemonic phrase');
    process.exit(1);
  }

  const hardwareWallet = deriveKeypairFromMnemonic(mnemonic, 0);
  const newAuthority = hardwareWallet.publicKey;
  console.log(`🔐 Hardware Wallet: ${newAuthority.toBase58()}\n`);

  // Confirmation
  console.log('⚠️  WARNING: This action transfers control to the hardware wallet!');
  console.log('   After this, only the hardware wallet can:');
  console.log('   - Mint new tokens');
  console.log('   - Freeze/unfreeze accounts');
  console.log('   - Revoke authorities\n');

  if (NETWORK === 'mainnet-beta' && process.env.CONFIRM_MAINNET !== 'true') {
    console.error('❌ MAINNET operation requires CONFIRM_MAINNET=true');
    process.exit(1);
  }

  const connection = new Connection(RPC_URL, 'confirmed');

  // Check balance
  const balance = await connection.getBalance(currentAuthority.publicKey);
  console.log(`💰 Current authority balance: ${(balance / 1e9).toFixed(4)} SOL\n`);

  if (balance < 0.01e9) {
    console.error('❌ Insufficient balance for transaction');
    process.exit(1);
  }

  console.log('📝 Transferring Mint Authority...');
  
  // Transfer mint authority
  const transferMintAuthorityIx = createSetAuthorityInstruction(
    mint,
    currentAuthority.publicKey,
    AuthorityType.MintTokens,
    newAuthority,
    [],
    TOKEN_PROGRAM_ID
  );

  const mintTx = new Transaction().add(transferMintAuthorityIx);

  try {
    const mintSig = await sendAndConfirmTransaction(connection, mintTx, [currentAuthority], {
      commitment: 'confirmed',
    });
    console.log(`✅ Mint authority transferred: ${mintSig}\n`);
  } catch (err) {
    console.error('❌ Failed to transfer mint authority:', err.message);
    process.exit(1);
  }

  console.log('📝 Transferring Freeze Authority...');

  // Transfer freeze authority
  const transferFreezeAuthorityIx = createSetAuthorityInstruction(
    mint,
    currentAuthority.publicKey,
    AuthorityType.FreezeAccount,
    newAuthority,
    [],
    TOKEN_PROGRAM_ID
  );

  const freezeTx = new Transaction().add(transferFreezeAuthorityIx);

  try {
    const freezeSig = await sendAndConfirmTransaction(connection, freezeTx, [currentAuthority], {
      commitment: 'confirmed',
    });
    console.log(`✅ Freeze authority transferred: ${freezeSig}\n`);
  } catch (err) {
    console.error('❌ Failed to transfer freeze authority:', err.message);
    process.exit(1);
  }

  // Save record
  const recordsDir = './deploy-records';
  if (!fs.existsSync(recordsDir)) {
    fs.mkdirSync(recordsDir, { recursive: true });
  }

  const record = {
    timestamp: new Date().toISOString(),
    network: NETWORK,
    mint: mint.toBase58(),
    previous_authority: currentAuthority.publicKey.toBase58(),
    new_authority: newAuthority.toBase58(),
    hardware_wallet: true,
    mint_authority_signature: mintSig,
    freeze_authority_signature: freezeSig,
  };

  const recordPath = path.join(recordsDir, `authority-transfer-${Date.now()}.json`);
  fs.writeFileSync(recordPath, JSON.stringify(record, null, 2));
  console.log(`💾 Record saved: ${recordPath}\n`);

  console.log('═══════════════════════════════════════════════════════');
  console.log('✅ AUTHORITIES TRANSFERRED SUCCESSFULLY');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`Mint:              ${mint.toBase58()}`);
  console.log(`New Authority:     ${newAuthority.toBase58()}`);
  console.log(`Hardware Wallet:   Yes`);
  console.log('═══════════════════════════════════════════════════════');
  console.log('\n🔍 Verify with:');
  console.log(`   spl-token display ${mint.toBase58()}\n`);
  console.log('⚠️  NEXT STEPS:');
  console.log('   1. Verify authorities using spl-token display');
  console.log('   2. Test signing with hardware wallet');
  console.log('   3. After presale, follow revoke-authorities-guide.md\n');
}

if (require.main === module) {
  transferAuthorities()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('❌ Error:', err);
      process.exit(1);
    });
}

module.exports = { transferAuthorities };

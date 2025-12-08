#!/usr/bin/env node

/**
 * Import Treasury Keypair from Private Key or Seed Phrase
 */

const { Keypair } = require('@solana/web3.js');
const bip39 = require('bip39');
const { derivePath } = require('ed25519-hd-key');
const fs = require('fs');
const bs58 = require('bs58').default || require('bs58');
const readline = require('readline');

const EXPECTED_TREASURY = 'HDaSHPBdE61agHAgajStypwu639E5N7TEBGiqLjfEoMu';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n🔐 TREASURY KEYPAIR IMPORT');
console.log('═══════════════════════════════════════════════════════\n');
console.log('Expected Treasury: ' + EXPECTED_TREASURY + '\n');
console.log('Choose import method:');
console.log('1. From seed phrase (12 or 24 words)');
console.log('2. From base58 private key');
console.log('3. Exit\n');

rl.question('Enter your choice (1-3): ', async (choice) => {
  if (choice === '1') {
    rl.question('\nEnter your seed phrase: ', async (seedPhrase) => {
      try {
        const words = seedPhrase.trim().split(/\s+/);
        if (words.length !== 12 && words.length !== 24) {
          console.error('❌ Invalid seed phrase. Must be 12 or 24 words.');
          rl.close();
          return;
        }

        if (!bip39.validateMnemonic(seedPhrase)) {
          console.error('❌ Invalid seed phrase.');
          rl.close();
          return;
        }

        const seed = bip39.mnemonicToSeedSync(seedPhrase, '');
        const derivedSeed = derivePath("m/44'/501'/0'/0'", seed.toString('hex')).key;
        const keypair = Keypair.fromSeed(derivedSeed);

        console.log('\n✅ Keypair derived from seed phrase');
        console.log('   Public Key: ' + keypair.publicKey.toBase58());

        if (keypair.publicKey.toBase58() === EXPECTED_TREASURY) {
          fs.writeFileSync(
            './keypairs/treasury-keypair.json',
            JSON.stringify(Array.from(keypair.secretKey))
          );
          console.log('\n✅ Treasury keypair saved to: ./keypairs/treasury-keypair.json\n');
          console.log('🚀 You can now run: npm run deploy-token\n');
        } else {
          console.log('\n⚠️  Warning: This keypair does not match the expected treasury address.');
          console.log('   Expected: ' + EXPECTED_TREASURY);
          console.log('   Got: ' + keypair.publicKey.toBase58());
          console.log('\n   The keypair was NOT saved.');
        }

        rl.close();
      } catch (error) {
        console.error('❌ Error:', error.message);
        rl.close();
      }
    });
  } else if (choice === '2') {
    rl.question('\nEnter your base58 private key: ', async (privateKey) => {
      try {
        const secretKey = bs58.decode(privateKey.trim());
        const keypair = Keypair.fromSecretKey(secretKey);

        console.log('\n✅ Keypair imported from private key');
        console.log('   Public Key: ' + keypair.publicKey.toBase58());

        if (keypair.publicKey.toBase58() === EXPECTED_TREASURY) {
          fs.writeFileSync(
            './keypairs/treasury-keypair.json',
            JSON.stringify(Array.from(keypair.secretKey))
          );
          console.log('\n✅ Treasury keypair saved to: ./keypairs/treasury-keypair.json\n');
          console.log('🚀 You can now run: npm run deploy-token\n');
        } else {
          console.log('\n⚠️  Warning: This keypair does not match the expected treasury address.');
          console.log('   Expected: ' + EXPECTED_TREASURY);
          console.log('   Got: ' + keypair.publicKey.toBase58());
          console.log('\n   The keypair was NOT saved.');
        }

        rl.close();
      } catch (error) {
        console.error('❌ Error:', error.message);
        rl.close();
      }
    });
  } else {
    console.log('\nExiting...\n');
    rl.close();
  }
});
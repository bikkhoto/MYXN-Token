#!/usr/bin/env node

/**
 * Helper: Convert private key to keypair JSON format
 * Usage: node scripts/convert-key-to-keypair.js <base58-private-key>
 */

const bs58 = require('bs58');
const fs = require('fs');
const path = require('path');

if (process.argv.length < 3) {
  console.log('Usage: node scripts/convert-key-to-keypair.js <base58-private-key>');
  console.log('\nExample:');
  console.log('  node scripts/convert-key-to-keypair.js bau8JpBBw5uNch81dJq6Q2rwoMjWukjWUjqJjTrSDS7kTXrcw2RpVzJt2shDCzW1QHLy94G5ENXDxGYHvoLfGFQ');
  process.exit(1);
}

const base58Key = process.argv[2];

try {
  // Decode base58 to bytes
  const secretKey = bs58.decode(base58Key);
  
  // Convert to array format for Solana CLI
  const keypairArray = Array.from(secretKey);
  
  // Derive public key (last 32 bytes of secret key is the actual private key)
  const { Keypair } = require('@solana/web3.js');
  const keypair = Keypair.fromSecretKey(secretKey);
  
  console.log('\n✅ Keypair successfully parsed!');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`Public Key:  ${keypair.publicKey.toBase58()}`);
  console.log('═══════════════════════════════════════════════════════\n');
  
  // Save to file
  const filename = `keypair-${keypair.publicKey.toBase58().substring(0, 8)}.json`;
  const filepath = path.join(process.cwd(), filename);
  
  fs.writeFileSync(filepath, JSON.stringify(keypairArray));
  
  console.log(`💾 Keypair saved to: ${filepath}`);
  console.log('\n⚠️  SECURITY WARNING:');
  console.log('   - This file contains your PRIVATE KEY');
  console.log('   - NEVER commit it to git');
  console.log('   - Store securely and delete after use');
  console.log('   - Add to .gitignore\n');
  
  console.log('📝 Usage:');
  console.log(`   export TMP_KEYPAIR_PATH="${filepath}"`);
  console.log('   node scripts/create-mint-and-supply.js\n');
  
} catch (err) {
  console.error('❌ Error parsing private key:', err.message);
  console.error('\nMake sure the private key is in base58 format.');
  process.exit(1);
}

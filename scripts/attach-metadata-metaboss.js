#!/usr/bin/env node

/**
 * Simplified Metadata Attachment using Metaboss CLI
 * This version uses metaboss which handles all the complexity
 */

require('dotenv').config();
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

const execAsync = promisify(exec);

// Configuration
const NETWORK = process.env.NETWORK || 'devnet';
const RPC_URL = NETWORK === 'mainnet-beta' 
  ? 'https://api.mainnet-beta.solana.com'
  : 'https://api.devnet.solana.com';

async function attachMetadata() {
  console.log('\n🎨 MYXN Token Metadata Attachment (via Metaboss)');
  console.log('═══════════════════════════════════════════════════════\n');

  // Get mint address
  const mintAddress = process.env.TOKEN_MINT;
  if (!mintAddress) {
    console.error('❌ TOKEN_MINT not set in environment');
    process.exit(1);
  }

  console.log(`🪙 Mint: ${mintAddress}\n`);

  // Load metadata
  const metadataPath = process.env.METADATA_FILE || './metadata/metadata.json';
  if (!fs.existsSync(metadataPath)) {
    console.error(`❌ Metadata file not found: ${metadataPath}`);
    process.exit(1);
  }

  const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  console.log(`📄 Loaded metadata:`);
  console.log(`   Name: ${metadata.name}`);
  console.log(`   Symbol: ${metadata.symbol}`);
  console.log(`   URI: ${metadata.image}\n`);

  // Get keypair path
  const keypairPath = process.env.TMP_KEYPAIR_PATH;
  if (!keypairPath || !fs.existsSync(keypairPath)) {
    console.error('❌ TMP_KEYPAIR_PATH not found or invalid');
    process.exit(1);
  }

  console.log('🔑 Using creator keypair to sign (verified=true)\n');

  // Confirm mainnet
  if (NETWORK === 'mainnet-beta' && process.env.CONFIRM_MAINNET !== 'true') {
    console.error('❌ MAINNET operation requires CONFIRM_MAINNET=true');
    process.exit(1);
  }

  console.log('📝 Creating metadata account with metaboss...\n');

  // Create metadata using metaboss
  try {
    const metabossCmd = `metaboss create metadata \\
      --keypair "${keypairPath}" \\
      --mint ${mintAddress} \\
      --metadata "${metadataPath}" \\
      --url ${RPC_URL}`;

    console.log('Running metaboss command...');
    const { stdout, stderr } = await execAsync(metabossCmd);
    
    if (stdout) console.log(stdout);
    if (stderr) console.error('stderr:', stderr);

    console.log('\n✅ Metadata created successfully!\n');

    // Save record
    const recordsDir = './deploy-records';
    if (!fs.existsSync(recordsDir)) {
      fs.mkdirSync(recordsDir, { recursive: true });
    }

    const record = {
      timestamp: new Date().toISOString(),
      network: NETWORK,
      mint: mintAddress,
      metadata_file: metadataPath,
      creator_verified: true,
      method: 'metaboss-cli',
    };

    const recordPath = path.join(recordsDir, `metadata-${Date.now()}.json`);
    fs.writeFileSync(recordPath, JSON.stringify(record, null, 2));
    console.log(`💾 Record saved: ${recordPath}\n`);

    // Print summary
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ METADATA ATTACHED SUCCESSFULLY');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Mint:             ${mintAddress}`);
    console.log(`Creator Verified: true`);
    console.log('═══════════════════════════════════════════════════════');

    const explorerUrl = NETWORK === 'mainnet-beta' 
      ? `https://solscan.io/token/${mintAddress}`
      : `https://solscan.io/token/${mintAddress}?cluster=devnet`;
    console.log(`\n🔗 View on Solscan: ${explorerUrl}\n`);

  } catch (err) {
    if (err.message.includes('command not found: metaboss')) {
      console.error('\n❌ Metaboss not installed!');
      console.error('\nInstall with:');
      console.error('   cargo install metaboss');
      console.error('\nOr use Solana CLI:');
      console.error(`   spl-token create-account ${mintAddress}`);
      console.error(`   # Then manually call Metaplex program\n`);
    } else {
      console.error('❌ Failed to create metadata:', err.message);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  attachMetadata()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('❌ Error:', err);
      process.exit(1);
    });
}

module.exports = { attachMetadata };

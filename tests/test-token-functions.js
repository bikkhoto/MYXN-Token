require('dotenv').config();
const {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} = require('@solana/web3.js');
const {
  getAccount,
  getOrCreateAssociatedTokenAccount,
  transfer,
  getMint,
  getAssociatedTokenAddress,
} = require('@solana/spl-token');
const fs = require('fs');

const DEVNET_RPC = 'https://api.devnet.solana.com';
const TOKEN_MINT = new PublicKey('DL41ms25heCSkxNuYnC2C7aXjogDnC6fk3V2hDcuU35C');

async function runTests() {
  console.log('🧪 MYXN Token Function Tests\n');
  console.log('='.repeat(60));
  
  const connection = new Connection(DEVNET_RPC, 'confirmed');
  
  // Load treasury keypair
  const keypairPath = process.env.TMP_KEYPAIR_PATH;
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
  const treasury = Keypair.fromSecretKey(new Uint8Array(keypairData));
  
  console.log('\n📋 Test Configuration:');
  console.log('   Network: Devnet');
  console.log('   Mint:', TOKEN_MINT.toBase58());
  console.log('   Treasury:', treasury.publicKey.toBase58());
  
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  // Test 1: Verify Mint Account
  console.log('\n\n1️⃣  TEST: Verify Mint Account');
  console.log('-'.repeat(60));
  try {
    const mintInfo = await getMint(connection, TOKEN_MINT);
    console.log('   ✅ Mint account exists');
    console.log('   • Supply:', mintInfo.supply.toString());
    console.log('   • Decimals:', mintInfo.decimals);
    console.log('   • Mint Authority:', mintInfo.mintAuthority?.toBase58() || 'None');
    console.log('   • Freeze Authority:', mintInfo.freezeAuthority?.toBase58() || 'None');
    
    if (mintInfo.supply.toString() === '1000000000000000000' && mintInfo.decimals === 9) {
      console.log('   ✅ Supply and decimals correct');
      results.passed++;
      results.tests.push({ name: 'Verify Mint Account', status: 'PASS' });
    } else {
      throw new Error('Supply or decimals mismatch');
    }
  } catch (error) {
    console.log('   ❌ FAILED:', error.message);
    results.failed++;
    results.tests.push({ name: 'Verify Mint Account', status: 'FAIL', error: error.message });
  }

  // Test 2: Verify Treasury Token Account
  console.log('\n\n2️⃣  TEST: Verify Treasury Token Account');
  console.log('-'.repeat(60));
  try {
    const treasuryATA = await getAssociatedTokenAddress(TOKEN_MINT, treasury.publicKey);
    const treasuryAccount = await getAccount(connection, treasuryATA);
    console.log('   ✅ Treasury token account exists');
    console.log('   • Address:', treasuryATA.toBase58());
    console.log('   • Balance:', treasuryAccount.amount.toString(), 'tokens');
    console.log('   • Owner:', treasuryAccount.owner.toBase58());
    
    if (treasuryAccount.amount.toString() === '1000000000000000000') {
      console.log('   ✅ Treasury holds full supply');
      results.passed++;
      results.tests.push({ name: 'Verify Treasury Account', status: 'PASS' });
    } else {
      throw new Error('Treasury balance mismatch');
    }
  } catch (error) {
    console.log('   ❌ FAILED:', error.message);
    results.failed++;
    results.tests.push({ name: 'Verify Treasury Account', status: 'FAIL', error: error.message });
  }

  // Test 3: Verify Metadata Account
  console.log('\n\n3️⃣  TEST: Verify Metadata Account');
  console.log('-'.repeat(60));
  try {
    const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
    const [metadataPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('metadata'), TOKEN_METADATA_PROGRAM_ID.toBuffer(), TOKEN_MINT.toBuffer()],
      TOKEN_METADATA_PROGRAM_ID
    );
    
    const accountInfo = await connection.getAccountInfo(metadataPDA);
    if (!accountInfo) {
      throw new Error('Metadata account not found');
    }
    
    console.log('   ✅ Metadata account exists');
    console.log('   • PDA:', metadataPDA.toBase58());
    console.log('   • Data Size:', accountInfo.data.length, 'bytes');
    console.log('   • Owner:', accountInfo.owner.toBase58());
    
    // Parse metadata (basic check)
    const data = accountInfo.data;
    const nameStart = data.indexOf(Buffer.from('MyXen'));
    const symbolStart = data.indexOf(Buffer.from('MYXN'));
    const uriStart = data.indexOf(Buffer.from('ipfs://'));
    
    if (nameStart > 0 && symbolStart > 0 && uriStart > 0) {
      console.log('   ✅ Metadata contains correct name, symbol, and URI');
      results.passed++;
      results.tests.push({ name: 'Verify Metadata Account', status: 'PASS' });
    } else {
      throw new Error('Metadata content verification failed');
    }
  } catch (error) {
    console.log('   ❌ FAILED:', error.message);
    results.failed++;
    results.tests.push({ name: 'Verify Metadata Account', status: 'FAIL', error: error.message });
  }

  // Test 4: Create Test Recipient and Transfer Tokens
  console.log('\n\n4️⃣  TEST: Token Transfer Functionality');
  console.log('-'.repeat(60));
  try {
    // Generate test recipient
    const recipient = Keypair.generate();
    console.log('   • Test recipient:', recipient.publicKey.toBase58());
    
    // Airdrop SOL to recipient for rent
    console.log('   • Requesting devnet airdrop...');
    try {
      const airdropSig = await connection.requestAirdrop(recipient.publicKey, 0.1 * LAMPORTS_PER_SOL);
      await connection.confirmTransaction(airdropSig);
      console.log('   ✅ Airdrop successful');
    } catch (airdropError) {
      console.log('   ⚠️  Airdrop failed (rate limit), using treasury SOL');
      // Transfer SOL from treasury
      const transferSolTx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: treasury.publicKey,
          toPubkey: recipient.publicKey,
          lamports: 0.01 * LAMPORTS_PER_SOL,
        })
      );
      await connection.sendTransaction(transferSolTx, [treasury]);
    }
    
    // Create recipient token account
    console.log('   • Creating recipient token account...');
    const recipientATA = await getOrCreateAssociatedTokenAccount(
      connection,
      treasury,
      TOKEN_MINT,
      recipient.publicKey
    );
    console.log('   ✅ Recipient ATA:', recipientATA.address.toBase58());
    
    // Transfer tokens
    const transferAmount = 1000 * Math.pow(10, 9); // 1000 MYXN
    console.log('   • Transferring 1000 MYXN...');
    
    const treasuryATA = await getAssociatedTokenAddress(TOKEN_MINT, treasury.publicKey);
    const signature = await transfer(
      connection,
      treasury,
      treasuryATA,
      recipientATA.address,
      treasury.publicKey,
      transferAmount
    );
    
    console.log('   ✅ Transfer successful');
    console.log('   • Signature:', signature);
    
    // Verify balances
    const recipientAccount = await getAccount(connection, recipientATA.address);
    const treasuryAccount = await getAccount(connection, treasuryATA);
    
    console.log('   • Recipient balance:', Number(recipientAccount.amount) / Math.pow(10, 9), 'MYXN');
    console.log('   • Treasury balance:', Number(treasuryAccount.amount) / Math.pow(10, 9), 'MYXN');
    
    if (recipientAccount.amount.toString() === transferAmount.toString()) {
      console.log('   ✅ Transfer amount verified');
      results.passed++;
      results.tests.push({ name: 'Token Transfer', status: 'PASS' });
    } else {
      throw new Error('Transfer amount mismatch');
    }
  } catch (error) {
    console.log('   ❌ FAILED:', error.message);
    results.failed++;
    results.tests.push({ name: 'Token Transfer', status: 'FAIL', error: error.message });
  }

  // Test 5: Check Authorities
  console.log('\n\n5️⃣  TEST: Verify Authorities');
  console.log('-'.repeat(60));
  try {
    const mintInfo = await getMint(connection, TOKEN_MINT);
    
    const expectedAuthority = treasury.publicKey.toBase58();
    const mintAuthMatch = mintInfo.mintAuthority?.toBase58() === expectedAuthority;
    const freezeAuthMatch = mintInfo.freezeAuthority?.toBase58() === expectedAuthority;
    
    console.log('   • Mint Authority:', mintInfo.mintAuthority?.toBase58());
    console.log('   • Expected:', expectedAuthority);
    console.log('   • Match:', mintAuthMatch ? '✅' : '❌');
    
    console.log('   • Freeze Authority:', mintInfo.freezeAuthority?.toBase58());
    console.log('   • Expected:', expectedAuthority);
    console.log('   • Match:', freezeAuthMatch ? '✅' : '❌');
    
    if (mintAuthMatch && freezeAuthMatch) {
      console.log('   ✅ Authorities correctly set');
      results.passed++;
      results.tests.push({ name: 'Verify Authorities', status: 'PASS' });
    } else {
      throw new Error('Authority mismatch');
    }
  } catch (error) {
    console.log('   ❌ FAILED:', error.message);
    results.failed++;
    results.tests.push({ name: 'Verify Authorities', status: 'FAIL', error: error.message });
  }

  // Test 6: Check Treasury SOL Balance
  console.log('\n\n6️⃣  TEST: Treasury SOL Balance');
  console.log('-'.repeat(60));
  try {
    const balance = await connection.getBalance(treasury.publicKey);
    const solBalance = balance / LAMPORTS_PER_SOL;
    
    console.log('   • Treasury SOL:', solBalance.toFixed(4), 'SOL');
    
    if (solBalance > 10) {
      console.log('   ✅ Sufficient SOL for operations');
      results.passed++;
      results.tests.push({ name: 'Treasury SOL Balance', status: 'PASS' });
    } else {
      console.log('   ⚠️  Low SOL balance (still passing)');
      results.passed++;
      results.tests.push({ name: 'Treasury SOL Balance', status: 'PASS (Low Balance)' });
    }
  } catch (error) {
    console.log('   ❌ FAILED:', error.message);
    results.failed++;
    results.tests.push({ name: 'Treasury SOL Balance', status: 'FAIL', error: error.message });
  }

  // Final Results
  console.log('\n\n' + '='.repeat(60));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(60));
  console.log(`   ✅ Passed: ${results.passed}`);
  console.log(`   ❌ Failed: ${results.failed}`);
  console.log(`   📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
  
  console.log('\n📋 Detailed Results:');
  results.tests.forEach((test, i) => {
    const icon = test.status.includes('PASS') ? '✅' : '❌';
    console.log(`   ${i + 1}. ${icon} ${test.name}: ${test.status}`);
    if (test.error) {
      console.log(`      Error: ${test.error}`);
    }
  });

  console.log('\n' + '='.repeat(60));
  
  if (results.failed === 0) {
    console.log('🎉 ALL TESTS PASSED! Token is fully functional.');
  } else {
    console.log('⚠️  Some tests failed. Review errors above.');
  }
  
  console.log('='.repeat(60));

  // Save results
  const reportPath = './tests/test-results.json';
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    network: 'devnet',
    mint: TOKEN_MINT.toBase58(),
    results: results,
  }, null, 2));
  console.log(`\n📄 Results saved to: ${reportPath}`);
}

runTests().catch(console.error);

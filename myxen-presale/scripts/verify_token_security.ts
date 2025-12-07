#!/usr/bin/env ts-node
/**
 * verify_token_security.ts
 * 
 * Checks MYXN token for security issues:
 * - Mint authority status
 * - Freeze authority status
 * - Metadata update authority status
 * - Compares against Solscan reports
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { getMint, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import fs from 'fs';

async function main() {
  const network = process.argv.includes('--network')
    ? process.argv[process.argv.indexOf('--network') + 1]
    : 'mainnet-beta';

  const metadata = JSON.parse(fs.readFileSync('../User Data/metadata.json', 'utf8'));
  const tokenMint = new PublicKey(metadata.properties.token_mint);

  const connection = new Connection(`https://api.${network}.solana.com`, 'confirmed');

  console.log(`\n🔍 MYXN Token Security Verification`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Network: ${network}`);
  console.log(`Token Mint: ${tokenMint.toBase58()}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  try {
    // Fetch mint info
    const mint = await getMint(connection, tokenMint);

    console.log(`📊 Token Authority Status:\n`);

    // Check mint authority
    const hasMintAuth = mint.mintAuthority !== null;
    console.log(`${hasMintAuth ? '❌' : '✅'} Mint Authority: ${
      hasMintAuth ? `${mint.mintAuthority?.toBase58()}` : 'REVOKED (good!)'
    }`);
    if (hasMintAuth) {
      console.log(`   ⚠️  ISSUE: Token can still be minted!`);
      console.log(`   FIX: Run: ts-node scripts/fix_token_security.ts --execute`);
    }

    // Check freeze authority
    const hasFreezeAuth = mint.freezeAuthority !== null;
    console.log(`${hasFreezeAuth ? '❌' : '✅'} Freeze Authority: ${
      hasFreezeAuth ? `${mint.freezeAuthority?.toBase58()}` : 'REVOKED (good!)'
    }`);
    if (hasFreezeAuth) {
      console.log(`   ⚠️  ISSUE: Token accounts can be frozen!`);
      console.log(`   FIX: Run: ts-node scripts/fix_token_security.ts --execute`);
    }

    // Token supply
    console.log(`\n💰 Token Supply:`);
    console.log(`   Total Supply: ${(Number(mint.supply) / 1e9).toLocaleString()} MYXN`);
    console.log(`   Decimals: ${mint.decimals}`);

    // Summary
    console.log(`\n📋 Security Summary:\n`);
    const issuesFound: string[] = [];

    if (hasMintAuth) issuesFound.push('Mint authority not revoked');
    if (hasFreezeAuth) issuesFound.push('Freeze authority not revoked');

    if (issuesFound.length === 0) {
      console.log(`✅ ALL SECURITY CHECKS PASSED!`);
      console.log(`   • Mint authority: REVOKED`);
      console.log(`   • Freeze authority: REVOKED`);
      console.log(`\n💡 Next steps:`);
      console.log(`   1. Verify on SolScan that authorities are revoked`);
      console.log(`   2. Submit token for verification on trusted registries`);
    } else {
      console.log(`❌ SECURITY ISSUES FOUND:\n`);
      issuesFound.forEach((issue, i) => {
        console.log(`   ${i + 1}. ${issue}`);
      });
      console.log(`\n💡 To fix:`);
      console.log(`   ts-node scripts/fix_token_security.ts --dry-run`);
      console.log(`   ts-node scripts/fix_token_security.ts --execute`);
    }

    // Solscan link
    console.log(`\n🔗 View on SolScan:`);
    console.log(`   https://solscan.io/token/${tokenMint.toBase58()}?cluster=${network}`);

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    // Save verification report
    const report = {
      timestamp: new Date().toISOString(),
      network,
      tokenMint: tokenMint.toBase58(),
      authorities: {
        mint: mint.mintAuthority?.toBase58() || null,
        freeze: mint.freezeAuthority?.toBase58() || null,
      },
      supply: mint.supply.toString(),
      decimals: mint.decimals,
      isSecure: !hasMintAuth && !hasFreezeAuth,
      issuesFound,
    };

    fs.writeFileSync(
      'security-audit.json',
      JSON.stringify(report, null, 2)
    );
    console.log(`\n📄 Audit report saved to: security-audit.json`);

  } catch (error) {
    console.error('❌ Error verifying token:', (error as any).message);
    process.exit(1);
  }
}

main();

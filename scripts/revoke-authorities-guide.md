# Authority Revocation Guide

## ⚠️ CRITICAL WARNING

**THIS ACTION IS IRREVERSIBLE!**

Once authorities are revoked:
- **No one** can mint new tokens
- **No one** can freeze/unfreeze accounts  
- The token supply becomes **permanently fixed**
- These actions **CANNOT be undone**

**Only proceed after:**
1. ✅ Presale is complete and finalized
2. ✅ All vesting schedules are deployed
3. ✅ Liquidity pool is created and locked
4. ✅ All token distributions are complete
5. ✅ Community has been notified
6. ✅ Multiple team members have verified everything

---

## Prerequisites

1. **Hardware Wallet Access**: You must have physical access to the hardware wallet that currently holds mint and freeze authorities.

2. **Verify Current State**:
   ```bash
   # Check current authorities
   spl-token display <MINT_ADDRESS>
   
   # Expected output should show:
   # Mint Authority: <HARDWARE_WALLET_ADDRESS>
   # Freeze Authority: <HARDWARE_WALLET_ADDRESS>
   ```

3. **Set Environment**:
   ```bash
   export NETWORK=mainnet-beta
   export MINT_ADDRESS=<your-mint-address>
   ```

---

## Step 1: Revoke Mint Authority

**What this does**: Makes it impossible to create new tokens. The total supply becomes fixed forever.

### Using Solana CLI

```bash
# Using hardware wallet (Ledger)
spl-token authorize <MINT_ADDRESS> mint --disable \
  --owner <HARDWARE_WALLET_ADDRESS> \
  --url https://api.mainnet-beta.solana.com

# OR using keypair file
spl-token authorize <MINT_ADDRESS> mint --disable \
  --owner /path/to/hardware-wallet-keypair.json \
  --url https://api.mainnet-beta.solana.com
```

### Verification

```bash
spl-token display <MINT_ADDRESS>

# Should show:
# Mint Authority: (None)
```

**Take a screenshot and save the transaction signature!**

---

## Step 2: Revoke Freeze Authority (Optional)

**What this does**: Makes it impossible to freeze token accounts. Enhances decentralization but removes safety controls.

⚠️ **Consider carefully**: Revoking freeze authority means you cannot stop malicious actors or recover from security incidents.

### Using Solana CLI

```bash
# Using hardware wallet (Ledger)
spl-token authorize <MINT_ADDRESS> freeze --disable \
  --owner <HARDWARE_WALLET_ADDRESS> \
  --url https://api.mainnet-beta.solana.com

# OR using keypair file  
spl-token authorize <MINT_ADDRESS> freeze --disable \
  --owner /path/to/hardware-wallet-keypair.json \
  --url https://api.mainnet-beta.solana.com
```

### Verification

```bash
spl-token display <MINT_ADDRESS>

# Should show:
# Mint Authority: (None)
# Freeze Authority: (None)
```

**Take a screenshot and save the transaction signature!**

---

## Step 3: Verify on Block Explorer

1. Go to Solscan:
   ```
   https://solscan.io/token/<MINT_ADDRESS>
   ```

2. Check the "Authority" section:
   - Mint Authority: Should show `null` or "Revoked"
   - Freeze Authority: Should show `null` or "Revoked" (if you revoked it)

3. **Take screenshots for documentation**

---

## Step 4: Public Announcement

After successful revocation, announce to your community:

### Example Announcement

```
🎉 MYXN Token Authority Revoked

We are excited to announce that the MYXN token mint authority has been 
permanently revoked, making the supply fixed at 1,000,000,000 MYXN.

✅ Mint Authority: REVOKED
✅ Total Supply: 1,000,000,000 MYXN (Fixed Forever)
✅ [Optional] Freeze Authority: REVOKED

Transaction Signatures:
- Mint Revoke: <signature>
- Freeze Revoke: <signature>

Verify on Solscan:
https://solscan.io/token/<MINT_ADDRESS>

This milestone demonstrates our commitment to decentralization and 
ensures that no additional tokens can ever be created.

#MYXN #Decentralization #TrustlessFinance
```

---

## Emergency Checklist

Before executing, confirm ALL of these:

- [ ] Presale is finalized and all purchases are recorded
- [ ] Vesting contracts are deployed and tested
- [ ] Liquidity pool is created and LP tokens are locked
- [ ] Treasury allocation is complete
- [ ] Marketing allocation is distributed
- [ ] Team allocation is in vesting
- [ ] Burn wallet has correct amount
- [ ] All token accounts are created and funded
- [ ] Smart contracts are audited and deployed
- [ ] Community has been notified 48 hours in advance
- [ ] At least 3 team members have reviewed this checklist
- [ ] Backup plan exists for any edge cases
- [ ] You have saved all transaction signatures
- [ ] You understand this is irreversible

---

## Troubleshooting

### "Error: Account not found"
- Verify the mint address is correct
- Ensure you're connected to the right network (mainnet-beta)

### "Error: Invalid authority"
- Confirm you're signing with the hardware wallet that owns the authorities
- Check `spl-token display` to see current authority addresses

### "Error: Insufficient funds"
- Ensure the hardware wallet has ~0.01 SOL for transaction fees

---

## Questions?

If you have any doubts or questions:
1. **STOP** - Do not proceed
2. Contact technical lead
3. Review documentation again
4. Test on devnet first if needed

---

## Script Version (Advanced)

Create `scripts/revoke-authorities.js`:

```javascript
#!/usr/bin/env node
require('dotenv').config();
const { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction } = require('@solana/web3.js');
const { createSetAuthorityInstruction, AuthorityType, TOKEN_PROGRAM_ID } = require('@solana/spl-token');

async function revokeAuthorities() {
  const RPC_URL = 'https://api.mainnet-beta.solana.com';
  const connection = new Connection(RPC_URL, 'confirmed');
  
  const mint = new PublicKey(process.env.MINT_ADDRESS);
  // Load hardware wallet keypair
  const authority = Keypair.fromSecretKey(/* ... */);
  
  // Revoke mint authority
  const revokeMintIx = createSetAuthorityInstruction(
    mint,
    authority.publicKey,
    AuthorityType.MintTokens,
    null, // null = revoke
    [],
    TOKEN_PROGRAM_ID
  );
  
  const tx = new Transaction().add(revokeMintIx);
  const sig = await sendAndConfirmTransaction(connection, tx, [authority]);
  
  console.log('✅ Mint authority revoked:', sig);
}

revokeAuthorities();
```

**Note**: This script is for reference only. Always prefer CLI commands with hardware wallet for maximum security.

---

## Record Keeping

Save these documents permanently:
1. Transaction signatures (mint revoke, freeze revoke)
2. Screenshots from Solscan
3. Output of `spl-token display` commands
4. Timestamp and witness confirmations
5. Community announcement

Store in: `deploy-records/authority-revocation-final.json`

---

**Remember: Once executed, there's no going back. Double-check everything!**

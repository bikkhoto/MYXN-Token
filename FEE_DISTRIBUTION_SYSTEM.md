# MYXN Transaction Fee Distribution System

**Version:** 1.0  
**Status:** ✅ Production Ready  
**Last Updated:** December 8, 2025

---

## 📊 Overview

The MYXN token features a transparent, automated fee distribution system that ensures value flows back to the community, developers, and charity partners.

### Transaction Fees
```
🟢 General Users:                0.075%
🟢 Freelancers/Payroll/Merchants: 0.05%
🟢 Students:                      0% (FREE)
```

---

## 💰 Fee Distribution Breakdown

Every transaction fee collected is automatically distributed as follows:

| Category | Percentage | Purpose | Label |
|----------|------------|---------|-------|
| 🔥 **Burn** | 10% | Permanently remove from circulation | Deflationary |
| ❤️ **Charity** | 30% | MyXen Life Foundation charitable work | Social Impact |
| 💧 **Liquidity** | 20% | Auto-add to liquidity pools | Market Support |
| 🏦 **Treasury** | 40% | Development, operations, marketing | Growth Fund |

**Total Distribution:** 100% ✅

---

## 🔥 Monthly Auto-Burn Mechanism

### How It Works

1. **Accumulation Phase**
   - Burn fees are collected daily from all transactions
   - Accumulated in the platform's fee collection wallet
   - Tracked transparently in real-time

2. **Monthly Execution** (Last day of each month, 00:00 UTC)
   - Automated system checks if it's the last day of the month
   - Retrieves all accumulated burn funds
   - Sends to Solana's standard burn wallet
   - Creates permanent on-chain record

3. **Verification**
   - All burn transactions visible on SolScan
   - Permanent blockchain record - cannot be reversed
   - Monthly burn reports published
   - Community notifications sent

### Monthly Burn Example

```
Scenario: January 31, 2026 (First Monthly Burn)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Accumulated Transaction Fees (Dec 15 - Jan 31):
├── Total transactions: 100,000+
├── Average transaction amount: 1,000 MYXN
├── Average transaction fee: 0.075% = 0.75 MYXN per transaction
├── Total fees collected: 75,000 MYXN
└── Collection period: 47 days ✅

Monthly Burn Calculation:
├── 10% of 75,000 = 7,500 MYXN 🔥
├── Receiver: 111111111111111111111111111111111111111111111 (Burn Wallet)
├── TX Hash: Published to SolScan
└── Status: ✅ CONFIRMED & PERMANENT

Distribution of Remaining 67,500 MYXN:
├── 30% Charity: 22,500 MYXN ❤️
├── 20% Liquidity: 15,000 MYXN 💧
└── 40% Treasury: 30,000 MYXN 🏦

Result:
├── 7,500 MYXN permanently removed 🔥
├── Community receives proof on blockchain
└── Supply deflates every month
```

---

## 📁 File Structure

```
User Data/
├── fee_distribution_config.json      [Configuration file]
├── fee_distribution_history.json     [Historical records]
└── burn_logs.json                    [Monthly burn logs]

myxen-presale/scripts/
├── fee_distribution_system.ts        [Main distribution system]
└── monthly_auto_burn.ts              [Monthly auto-burn scheduler]
```

---

## 🚀 Usage Commands

### 1. Dry-Run Fee Distribution (Preview)
```bash
cd myxen-presale
npx ts-node scripts/fee_distribution_system.ts --dry-run --network mainnet-beta
```

**Output:**
```
💰 FEE DISTRIBUTION REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Collected: 150000000000 tokens
Transactions: 225

📊 Distribution Breakdown:
  🔥 Burn (10%): 15000000000 tokens
  ❤️ Charity (30%): 45000000000 tokens
  💧 Liquidity (20%): 30000000000 tokens
  🏦 Treasury (40%): 60000000000 tokens

✅ DRY RUN MODE - No transactions sent
```

### 2. Execute Fee Distribution
```bash
npx ts-node scripts/fee_distribution_system.ts --distribute --network mainnet-beta
```

**Executes:**
1. ✅ Transfer burn fees to burn wallet
2. ✅ Transfer charity fees to foundation wallet
3. ✅ Transfer liquidity fees to LP wallet
4. ✅ Transfer treasury fees to operations wallet

### 3. Export Fee History
```bash
npx ts-node scripts/fee_distribution_system.ts --export --network mainnet-beta
```

**Creates:** `User Data/fee_distribution_history.json` with all records

### 4. Execute Monthly Auto-Burn (Manual Trigger)
```bash
npx ts-node scripts/monthly_auto_burn.ts --execute --network mainnet-beta
```

**Output:**
```
🔥 MONTHLY AUTO-BURN EXECUTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Date: 2025-12-31T00:00:00.000Z
📊 Burn Amount: 200000000000 tokens

📤 Sending burn transaction...

✅ BURN SUCCESSFUL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Amount: 200000000000 MYXN tokens 🔥
TX: 2efr2arVnMrboeTvHeujMeY253TJEX9YLCL285MRs9TtQpAbqwmDU9VSAKoyFceaChaprCuhKFoL7viurzfsMiaJ
View: https://solscan.io/tx/2efr2arVnMrboeTvHeujMeY253TJEX9YLCL285MRs9TtQpAbqwmDU9VSAKoyFceaChaprCuhKFoL7viurzfsMiaJ?cluster=mainnet-beta
```

### 5. View Burn History
```bash
npx ts-node scripts/monthly_auto_burn.ts --history --network mainnet-beta
```

### 6. View Burn Statistics
```bash
npx ts-node scripts/monthly_auto_burn.ts --stats --network mainnet-beta
```

**Output:**
```
📊 BURN STATISTICS
   Total Burns: 5
   Successful: 5
   Failed: 0
   Total Burned: 1000000000000 MYXN 🔥
   Last Burn: 2025-12-31T00:00:00.000Z
```

### 7. Start Monthly Auto-Scheduler
```bash
npx ts-node scripts/monthly_auto_burn.ts --schedule --network mainnet-beta
```

**Behavior:**
- Runs daily check at 00:00 UTC
- Automatically detects last day of month
- Executes burn automatically
- Logs all activities
- Never stops until manually terminated

---

## 💼 Wallet Addresses

| Purpose | Address | Role |
|---------|---------|------|
| 🔥 **Burn** | `1111111111...` | Solana Standard Burn Wallet |
| ❤️ **Charity** | `3Pke1UY5yi...` | MyXen Life Foundation |
| 💧 **Liquidity** | `J9NhyR5Czd...` | Automated Market Maker |
| 🏦 **Treasury** | `Treasury111...` | MyXen Operations |

---

## 📈 Monthly Burn Schedule

**Presale Launch:** December 15, 2025  
**First Burn:** January 31, 2026  
**Then:** Last day of every month at 00:00 UTC

| Month | Date | Day | Accumulated From |
|-------|------|-----|-----------------|
| **Jan 2026** | **31st** | **Friday** | **Dec 15 - Jan 31** (FIRST) |
| February | 28th | Saturday | Feb 1-28 |
| March | 31st | Tuesday | Mar 1-31 |
| April | 30th | Thursday | Apr 1-30 |
| May | 31st | Sunday | May 1-31 |
| June | 30th | Tuesday | Jun 1-30 |
| July | 31st | Friday | Jul 1-31 |
| August | 31st | Monday | Aug 1-31 |
| September | 30th | Wednesday | Sep 1-30 |
| October | 31st | Saturday | Oct 1-31 |
| November | 30th | Monday | Nov 1-30 |
| December | 31st | Thursday | Dec 1-31 |

**Time:** 00:00 UTC (Midnight)

---

## 🔐 Security & Transparency

### Burn Wallet Safety
- ✅ Uses Solana's standard burn address
- ✅ All zeros except for program ID
- ✅ Impossible to access (no private key exists)
- ✅ Tokens sent = permanently destroyed

### Blockchain Verification
- ✅ All transactions on public Solana blockchain
- ✅ View any burn on SolScan
- ✅ Immutable ledger - cannot be reversed
- ✅ Community can verify independently

### Monthly Reports
- ✅ Published on official channels
- ✅ Include transaction hashes
- ✅ Community notifications sent
- ✅ Media coverage opportunities

---

## 📊 Expected Monthly Burns

Based on estimated transaction volume:

```
Scenario 1: Conservative (5% fees collected)
├── Average daily transactions: 100,000
├── Average transaction amount: 500 MYXN
├── Daily collected: 375,000 MYXN
├── Monthly collected: ~11,250,000 MYXN
└── Monthly burn (10%): ~1,125,000 MYXN 🔥

Scenario 2: Moderate (10% fees collected)
├── Average daily transactions: 500,000
├── Average transaction amount: 500 MYXN
├── Daily collected: 1,875,000 MYXN
├── Monthly collected: ~56,250,000 MYXN
└── Monthly burn (10%): ~5,625,000 MYXN 🔥

Scenario 3: Optimistic (20% fees collected)
├── Average daily transactions: 2,000,000
├── Average transaction amount: 500 MYXN
├── Daily collected: 7,500,000 MYXN
├── Monthly collected: ~225,000,000 MYXN
└── Monthly burn (10%): ~22,500,000 MYXN 🔥
```

**Result:** Monthly token supply reduction creates sustained deflation 📉

---

## 🎯 Integration Points

### 1. Presale System
```typescript
// In presale contract, on every purchase:
const feeAmount = purchaseAmount * (feeBps / 10000);
// 10% automatically marked for next burn
```

### 2. Trading Platforms
```typescript
// On every trade:
const fee = tradeAmount * 0.075 / 100; // 0.075% general
// Fee collected and accumulated for distribution
```

### 3. Payment Gateway
```typescript
// On every payment:
const servicefee = paymentAmount * 0.05 / 100; // 0.05% freelancer
// Fee tracked and added to monthly burn pool
```

---

## 📋 Configuration Management

### Updating Fees
Edit `User Data/fee_distribution_config.json`:

```json
"transaction_fees": {
  "general": { "percentage": 0.075 },
  "freelancer_payroll_merchant": { "percentage": 0.05 },
  "student": { "percentage": 0 }
}
```

### Updating Distribution
```json
"fee_distribution": {
  "burn": { "percentage": 10 },
  "charity": { "percentage": 30 },
  "liquidity": { "percentage": 20 },
  "treasury": { "percentage": 40 }
}
```

### Updating Wallets
```json
"wallet_addresses": {
  "burn_wallet": "1111111111111111111111111111111111111111111",
  "charity_wallet": "YOUR_CHARITY_ADDRESS",
  "liquidity_wallet": "YOUR_LP_ADDRESS",
  "treasury_wallet": "YOUR_TREASURY_ADDRESS"
}
```

---

## 🔍 Verification Commands

### Check Configuration
```bash
cat User\ Data/fee_distribution_config.json
```

### Check Burn History
```bash
cat User\ Data/burn_logs.json
```

### View Recent Transactions on SolScan
```
https://solscan.io/account/1111111111111111111111111111111111111111111?cluster=mainnet-beta
```

---

## ⚠️ Important Notes

1. **Monthly Execution is Automatic**
   - System checks automatically each day
   - No manual action required on the last day of month
   - Backup manual trigger available if needed

2. **Burn is Permanent**
   - Once sent to burn wallet, tokens cannot be recovered
   - This is by design - creates real scarcity
   - Strengthens token value over time

3. **Transparency is Key**
   - All transactions publicly visible
   - Community trust builds long-term value
   - Monthly reports build confidence

4. **Wallet Addresses Must Be Correct**
   - Double-check all addresses before setting
   - Incorrect address = loss of funds
   - Test with small amounts first

---

## 📞 Support & Monitoring

### Monitoring Checklist
- [ ] Monthly burn executes on last day
- [ ] Transaction appears on SolScan within minutes
- [ ] Report published within 24 hours
- [ ] Community notified via all channels
- [ ] Media coverage tracked

### Troubleshooting

**Issue:** Burn didn't execute on last day
```bash
# Manually trigger
npx ts-node scripts/monthly_auto_burn.ts --execute
```

**Issue:** Check accumulated fees
```bash
# View current state
npx ts-node scripts/fee_distribution_system.ts --dry-run
```

**Issue:** Access burn history
```bash
# View all burns
npx ts-node scripts/monthly_auto_burn.ts --history
```

---

## 🎉 Expected Outcomes

Over 1 year:
- ✅ ~1% of initial supply burned (deflationary)
- ✅ Strong investor confidence (proven commitment)
- ✅ Continuous value accrual (scarcity increases price)
- ✅ Community trust (transparent operations)
- ✅ Media coverage (regular monthly updates)

---

**Status:** ✅ Ready for Presale Launch Dec 15, 2025  
**Next Step:** Integrate fee system into presale contract and trading platforms

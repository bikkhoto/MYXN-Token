# 🔗 Fee Distribution - Integration Guide

**Purpose:** How to integrate the fee system into your presale and trading platforms  
**Status:** ✅ Ready for Implementation

---

## 📋 Integration Points

### 1. Presale Contract Integration

In your Anchor presale program, add fee tracking:

```rust
// In presale/src/lib.rs

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

#[derive(Accounts)]
pub struct BuyWithFee<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    #[account(mut)]
    pub buyer_ata: Account<'info, TokenAccount>,
    #[account(mut)]
    pub treasury_ata: Account<'info, TokenAccount>,
    #[account(mut)]
    pub fee_accumulator: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

pub fn buy_tokens_with_fee(
    ctx: Context<BuyWithFee>,
    amount: u64,
    fee_bps: u16, // basis points (e.g., 75 = 0.075%)
) -> Result<()> {
    // Calculate fee
    let fee_amount = (amount as u128)
        .checked_mul(fee_bps as u128)
        .unwrap()
        .checked_div(100_000)
        .unwrap() as u64;

    // Transfer tokens to buyer
    let net_amount = amount.checked_sub(fee_amount).unwrap();
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.treasury_ata.to_account_info(),
                to: ctx.accounts.buyer_ata.to_account_info(),
                authority: ctx.accounts.treasury_ata.owner.to_account_info(),
            },
        ),
        net_amount,
    )?;

    // Accumulate fee
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.treasury_ata.to_account_info(),
                to: ctx.accounts.fee_accumulator.to_account_info(),
                authority: ctx.accounts.treasury_ata.owner.to_account_info(),
            },
        ),
        fee_amount,
    )?;

    // Log fee event
    emit!(FeeCollected {
        amount: fee_amount,
        buyer: ctx.accounts.buyer.key(),
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

#[event]
pub struct FeeCollected {
    pub amount: u64,
    pub buyer: Pubkey,
    pub timestamp: i64,
}
```

### 2. JavaScript/TypeScript Integration

```typescript
// In your transaction processor

import { FeeDistributionSystem } from './fee_distribution_system';

class PresaleHandler {
  private feeSystem: FeeDistributionSystem;

  async processPurchase(
    buyerAddress: string,
    amount: bigint,
    userType: 'general' | 'freelancer' | 'student'
  ) {
    // Get fee rate based on user type
    const feeRate = this.getFeeRate(userType);
    const feeAmount = (amount * BigInt(Math.round(feeRate * 10000))) / BigInt(1_000_000);

    // Record fee collection
    this.feeSystem.recordFeeCollection(feeAmount);

    // Process transfer
    const netAmount = amount - feeAmount;
    await this.transferTokens(buyerAddress, netAmount);
  }

  private getFeeRate(userType: 'general' | 'freelancer' | 'student'): number {
    const rates = {
      general: 0.00075,      // 0.075%
      freelancer: 0.0005,    // 0.05%
      student: 0,            // FREE
    };
    return rates[userType];
  }
}
```

### 3. Trading Platform Integration

```typescript
// In your DEX/trading logic

async function executeSwap(
  inputAmount: bigint,
  fromToken: PublicKey,
  toToken: PublicKey,
  trader: PublicKey
) {
  // Determine fee based on account type
  const userAccount = await getUserAccountType(trader);
  const feeRate = getFeeRate(userAccount.type);

  // Calculate fee
  const feeAmount = (inputAmount * BigInt(Math.round(feeRate * 100000))) / BigInt(10_000_000);

  // Accumulate fee
  await feeSystem.recordFeeCollection(feeAmount);

  // Execute swap with net amount
  const netAmount = inputAmount - feeAmount;
  return await performSwap(netAmount, fromToken, toToken);
}
```

### 4. Payment Gateway Integration

```typescript
// In your off-chain payment processor

interface PaymentRequest {
  userId: string;
  amount: bigint;
  paymentType: 'freelancer' | 'payroll' | 'merchant' | 'general';
  timestamp: number;
}

async function processPayment(request: PaymentRequest) {
  // Get fee configuration
  const feeConfig = loadFeeConfig();
  const feeRate = feeConfig.transaction_fees[request.paymentType || 'general'];

  // Calculate fee
  const feeAmount = calculateFee(request.amount, feeRate);

  // Log fee
  logFeeCollection({
    amount: feeAmount,
    rate: feeRate,
    type: request.paymentType,
    timestamp: request.timestamp,
  });

  // Process payment
  const netAmount = request.amount - feeAmount;
  return transferFunds(request.userId, netAmount, feeAmount);
}
```

---

## 🔧 Setup Instructions

### Step 1: Update Presale Config

File: `config/default.json`

```json
{
  "FEES_ENABLED": true,
  "FEE_ACCUMULATOR_WALLET": "Fee1111111111111111111111111111111111111111",
  "FEE_BPS_GENERAL": 75,           // 0.075%
  "FEE_BPS_FREELANCER": 50,        // 0.05%
  "FEE_BPS_STUDENT": 0,            // FREE
  "AUTO_DISTRIBUTE_THRESHOLD": 10_000_000_000, // 10B tokens
  "DISTRIBUTION_CONFIG": "../User Data/fee_distribution_config.json"
}
```

### Step 2: Initialize Fee Accumulator Account

```bash
cd myxen-presale

# Create account for fee accumulation
npx ts-node -e "
  const { Keypair, PublicKey, clusterApiUrl, Connection } = require('@solana/web3.js');
  const { Token, TOKEN_PROGRAM_ID } = require('@solana/spl-token');
  
  // Your code to create accumulator account
"
```

### Step 3: Deploy Updated Presale Contract

```bash
anchor build
anchor deploy --provider.cluster mainnet-beta
```

### Step 4: Start Fee Distribution System

```bash
# Terminal 1: Start monthly auto-burn scheduler
npx ts-node scripts/monthly_auto_burn.ts --schedule --network mainnet-beta

# Terminal 2: Monitor fee collections
npx ts-node scripts/fee_distribution_system.ts --monitor
```

---

## 📊 Data Models

### Fee Collection Record

```typescript
interface FeeRecord {
  id: string;              // Unique transaction ID
  timestamp: number;       // Unix timestamp
  amount: bigint;          // Fee amount in smallest units
  rate: number;            // Fee rate applied
  userType: string;        // Type of user ('general', 'freelancer', etc.)
  userId: string;          // User identifier (if applicable)
  transactionHash?: string; // On-chain tx hash if applicable
  status: 'pending' | 'recorded' | 'distributed';
}
```

### Monthly Distribution Record

```typescript
interface MonthlyDistribution {
  month: string;           // YYYY-MM format
  totalCollected: bigint;
  distributions: {
    burn: { amount: bigint; txHash: string; };
    charity: { amount: bigint; txHash: string; };
    liquidity: { amount: bigint; txHash: string; };
    treasury: { amount: bigint; txHash: string; };
  };
  executedAt: number;      // Timestamp of execution
  status: 'pending' | 'completed' | 'failed';
}
```

---

## 🗄️ Database Schema (Optional)

If using a database, create these tables:

```sql
-- Fee Collections
CREATE TABLE fee_collections (
  id BIGSERIAL PRIMARY KEY,
  transaction_hash VARCHAR(256) UNIQUE,
  fee_amount NUMERIC NOT NULL,
  rate NUMERIC NOT NULL,
  user_type VARCHAR(50),
  user_id VARCHAR(256),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Monthly Burns
CREATE TABLE monthly_burns (
  id BIGSERIAL PRIMARY KEY,
  month VARCHAR(7) NOT NULL, -- YYYY-MM
  total_collected NUMERIC NOT NULL,
  burn_amount NUMERIC NOT NULL,
  burn_tx_hash VARCHAR(256),
  charity_amount NUMERIC NOT NULL,
  charity_tx_hash VARCHAR(256),
  liquidity_amount NUMERIC NOT NULL,
  liquidity_tx_hash VARCHAR(256),
  treasury_amount NUMERIC NOT NULL,
  treasury_tx_hash VARCHAR(256),
  executed_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_fee_collections_created ON fee_collections(created_at);
CREATE INDEX idx_monthly_burns_month ON monthly_burns(month);
CREATE INDEX idx_monthly_burns_status ON monthly_burns(status);
```

---

## 📱 API Endpoints (Optional REST API)

```typescript
// Get current accumulated fees
GET /api/fees/accumulated
Response: {
  total: string;
  burn: string;
  charity: string;
  liquidity: string;
  treasury: string;
}

// Get fee statistics
GET /api/fees/stats
Response: {
  totalCollected: string;
  transactionCount: number;
  averageFee: string;
  monthlyTrend: []
}

// Get burn history
GET /api/burns/history
Response: {
  burns: BurnRecord[]
}

// Get specific month details
GET /api/burns/monthly/:month
Response: {
  month: string;
  burn_amount: string;
  tx_hash: string;
  // ... more details
}

// Trigger distribution (admin only)
POST /api/fees/distribute
Body: { dryRun: boolean }
Response: { tx_hashes: string[] }
```

---

## 🧪 Testing Integration

### Unit Tests

```typescript
// test/fee_distribution.test.ts

describe('Fee Distribution', () => {
  it('should calculate correct fees', () => {
    const amount = BigInt(1_000_000);
    const fee = (amount * BigInt(75)) / BigInt(100_000);
    expect(fee).toBe(BigInt(750));
  });

  it('should distribute fees correctly', () => {
    const fee = BigInt(1_000);
    const distribution = {
      burn: fee / BigInt(10),      // 100
      charity: (fee * BigInt(3)) / BigInt(10), // 300
      liquidity: (fee * BigInt(2)) / BigInt(10), // 200
      treasury: (fee * BigInt(4)) / BigInt(10),  // 400
    };
    expect(distribution.burn + distribution.charity + 
           distribution.liquidity + distribution.treasury).toBe(fee);
  });
});
```

### Integration Tests

```typescript
// test/integration.test.ts

describe('Presale with Fees', () => {
  it('should collect and distribute fees correctly', async () => {
    // Setup
    const buyAmount = BigInt(1_000_000_000);
    const expectedFee = calculateFee(buyAmount, 0.00075);

    // Execute purchase
    const tx = await presale.buyTokens(buyer, buyAmount);

    // Verify
    const accumulatedFees = await feeSystem.getAccumulatedFees();
    expect(accumulatedFees.total).toBe(expectedFee);
  });
});
```

---

## 📈 Monitoring & Reporting

### Daily Report Template

```
Daily Fee Report - [DATE]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Transactions: [COUNT]
Total Fees Collected: [AMOUNT] MYXN

Distribution (next month):
  🔥 Burn (10%): [AMOUNT] MYXN
  ❤️ Charity (30%): [AMOUNT] MYXN
  💧 Liquidity (20%): [AMOUNT] MYXN
  🏦 Treasury (40%): [AMOUNT] MYXN

Accumulated YTD: [TOTAL] MYXN
```

### Monthly Report Template

```
Monthly Burn Report - [MONTH]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Fees Collected: [AMOUNT] MYXN
Monthly Burn Executed: ✅

Distribution Details:
  🔥 Burn: [AMOUNT] → [TX_HASH]
  ❤️ Charity: [AMOUNT] → [TX_HASH]
  💧 Liquidity: [AMOUNT] → [TX_HASH]
  🏦 Treasury: [AMOUNT] → [TX_HASH]

SolScan Verification: [LINK]
Community Announcement: [LINK]
```

---

## ✅ Deployment Checklist

- [ ] Install dependencies (`npm install`)
- [ ] Update configuration file with real wallet addresses
- [ ] Test with dry-run mode
- [ ] Deploy presale contract with fee logic
- [ ] Initialize fee accumulator account
- [ ] Test small purchase to verify fee collection
- [ ] Start monthly auto-burn scheduler
- [ ] Set up monitoring/reporting
- [ ] Create community communication plan
- [ ] Go live on mainnet

---

## 🚀 Launch Timeline

**Dec 8-10:** Final integration & testing  
**Dec 11-14:** Pre-launch verification  
**Dec 15:** 🚀 Presale launch with fee system active  
**Dec 31:** 🔥 First monthly auto-burn execution  

---

**Ready? Let's integrate! 🎯**

# Burn Mechanism

This document explains the automated token burn mechanism that contributes to the deflationary model of $MYXN.

## Overview

The burn mechanism is a key component of the $MYXN tokenomics, permanently removing tokens from circulation to create deflationary pressure.

## Burn Address

| Property | Value |
| :--- | :--- |
| **Burn Address** | `13m6FRnMKjcyuX53ryBW7AJkXG4Dt9SR5y1qPjBxSQhc` |
| **Type** | Permanent destruction address |
| **Access** | No private key exists for this address |

## Fee Distribution

Every transaction fee collected by the MyXen platform is distributed as follows:

| Allocation | Percentage | Destination |
| :--- | :--- | :--- |
| 🔥 **Burn** | 10% | Burn Wallet |
| ❤️ **Charity** | 30% | MyXen Life Foundation |
| 💧 **Liquidity** | 20% | Liquidity Pool |
| 🏦 **Treasury** | 40% | Treasury Multisig |

## Technical Implementation

### Fee Calculation Process

1. **Transaction Initiation**
   - User initiates a transaction on the MyXen platform
   - Applicable fee rate is determined based on service type:
     - General transactions: 0.075%
     - Freelancer/Payroll: 0.05%
     - Education: 0%

2. **Fee Collection**
   - Laravel backend calculates the total fee amount
   - Fee is deducted from the transaction

3. **Distribution Logic**
   - Backend triggers separate transfers for each allocation
   - 10% of collected fees sent to Burn Address
   - Remaining allocations distributed to respective wallets

### Automated Burn Process

```
Total Fee Collected → Calculate 10% → Transfer to Burn Wallet
```

The burn is executed automatically with each qualifying transaction, ensuring consistent deflationary pressure.

## Burn Verification

### How to Verify Burns

1. Visit [Solana Explorer](https://explorer.solana.com/)
2. Enter the Burn Address: `13m6FRnMKjcyuX53ryBW7AJkXG4Dt9SR5y1qPjBxSQhc`
3. Review incoming transactions to see all burned tokens
4. Calculate total burned by summing all incoming transfers

### Burn Transparency

All burn transactions are:
- Publicly visible on-chain
- Immutable and permanent
- Verifiable by any community member

## Historical Burns

*This section will be populated with actual burn transaction data once the token is live on mainnet. All burn transactions will be publicly verifiable on the Solana blockchain.*

To view the current burn history, visit the [Burn Wallet on Solana Explorer](https://explorer.solana.com/address/13m6FRnMKjcyuX53ryBW7AJkXG4Dt9SR5y1qPjBxSQhc).

## Impact on Supply

### Deflationary Effects

- **Reduced Circulating Supply:** Each burn permanently reduces available tokens
- **Increased Scarcity:** Over time, the total supply decreases
- **Value Preservation:** Deflationary mechanics support token value

### Projected Burn Rate

The burn rate depends on platform transaction volume. As the MyXen ecosystem grows:
- Higher transaction volume → More fees collected → More tokens burned
- Compounding deflationary effect over time

## Related Documentation

- [Token Architecture](Token-Architecture.md)
- [Multisig Treasury Setup](Multisig-Treasury-Setup.md)
- [Home](Home.md)

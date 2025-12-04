# Multisig Treasury Setup

This document explains the multisignature (multisig) configuration used to secure the MyXen Treasury.

## Overview

The Treasury Wallet is protected by a 5-of-7 multisignature scheme, requiring at least 5 out of 7 designated signers to approve any transaction.

## Treasury Address

| Property | Value |
| :--- | :--- |
| **Address** | `6S4eDdYXABgtmuk3waLM63U2KHgExcD9mco7MuyG9f5G` |
| **Required Signatures** | 5 of 7 |
| **Purpose** | Development, operations, and marketing funds |

## Signer Roles

The 7 designated signers represent key stakeholders in the MyXen ecosystem:

| Role | Responsibility |
| :--- | :--- |
| **CEO** | Strategic direction and executive decisions |
| **CTO** | Technical oversight and development priorities |
| **CFO** | Financial management and budget allocation |
| **Community Representative** | Community interests and transparency |
| **Legal Counsel** | Regulatory compliance and legal review |
| **Operations Lead** | Day-to-day operational requirements |
| **Security Officer** | Security considerations and risk assessment |

## Verification Process

To verify the Treasury address on Solana Explorer:

1. Visit [Solana Explorer](https://explorer.solana.com/)
2. Enter the Treasury address: `6S4eDdYXABgtmuk3waLM63U2KHgExcD9mco7MuyG9f5G`
3. Review the account information and transaction history
4. Verify the multisig configuration matches this documentation

## Transaction Approval Process

### 1. Proposal Initiation
- Any signer can initiate a transaction proposal
- Proposal includes destination, amount, and purpose

### 2. Review Period
- All signers receive notification of pending proposal
- Minimum 24-hour review period for standard transactions
- Emergency procedures available for critical security issues

### 3. Signature Collection
- Each approving signer submits their signature
- Transaction proceeds only when 5 signatures are collected

### 4. Execution
- Once threshold is met, transaction is automatically executed
- All transactions are recorded on-chain for transparency

## Security Considerations

### Key Storage
- Hardware wallets recommended for all signers
- Cold storage for inactive signing keys
- Regular key rotation procedures

### Operational Security
- Signers distributed across multiple geographic locations
- Independent verification channels for high-value transactions
- Regular security audits of multisig procedures

### Emergency Procedures
- Documented key recovery processes
- Succession planning for signer unavailability
- Incident response procedures

## Transparency

All Treasury transactions are publicly visible on the Solana blockchain. Community members can:

- Monitor incoming and outgoing transactions
- Verify fee distributions match documented allocations
- Track burn transactions sent to the Burn Wallet

## Related Documentation

- [Token Architecture](Token-Architecture.md)
- [Burn Mechanism](Burn-Mechanism.md)
- [Home](Home.md)

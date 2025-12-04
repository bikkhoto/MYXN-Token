# Devnet Testing

This guide helps developers set up a testing environment for $MYXN token integration on Solana Devnet.

## Prerequisites

Before you begin, ensure you have the following installed:

- [Rust](https://www.rust-lang.org/tools/install)
- [Solana CLI](https://docs.solanalabs.com/cli/install)
- [Anchor](https://www.anchor-lang.com/docs/installation) (if working with Anchor programs)
- Node.js (v16+) & Yarn

## Initial Setup

### 1. Configure Solana CLI for Devnet

```bash
# Set the network to devnet
solana config set --url devnet

# Verify configuration
solana config get
```

### 2. Create a Development Wallet

```bash
# Generate a new keypair for testing
solana-keygen new --outfile ~/.config/solana/devnet-wallet.json

# Set as default keypair
solana config set --keypair ~/.config/solana/devnet-wallet.json

# Check your wallet address
solana address
```

### 3. Airdrop Devnet SOL

```bash
# Request free devnet SOL (2 SOL per request)
solana airdrop 2

# Check your balance
solana balance
```

**Note:** Devnet SOL has no real value and is used only for testing.

## Minting Test $MYXN Tokens

### Using the Repository Scripts

1. **Clone the repository**
   ```bash
   git clone https://github.com/bikkhoto/MYXN-Token.git
   cd MYXN-Token
   ```

2. **Install dependencies**
   ```bash
   yarn install
   ```

3. **Run the mint script (Devnet only)**
   ```bash
   yarn mint
   ```

### Manual Token Minting

If you need to manually mint test tokens:

```bash
# Create a new token mint (for testing purposes)
spl-token create-token --decimals 9

# Create an associated token account
spl-token create-account <MINT_ADDRESS>

# Mint tokens to your account
spl-token mint <MINT_ADDRESS> <AMOUNT>
```

## Simulating Transactions

### Basic Transfer Test

```bash
# Transfer tokens to another address
spl-token transfer <MINT_ADDRESS> <AMOUNT> <RECIPIENT_ADDRESS>
```

### Testing Fee Logic

To test the fee distribution mechanism:

1. **Set up test wallets**
   - Create wallets for Treasury, Burn, Charity, and Liquidity
   - Fund each with minimal SOL for rent

2. **Execute test transaction**
   ```bash
   # Your test script should:
   # 1. Calculate fee (e.g., 0.075% of transaction)
   # 2. Distribute to appropriate wallets:
   #    - 10% to Burn wallet
   #    - 30% to Charity wallet
   #    - 20% to Liquidity wallet
   #    - 40% to Treasury wallet
   ```

3. **Verify distribution**
   ```bash
   # Check balances of all wallets
   spl-token balance <TOKEN_ADDRESS> --owner <WALLET_ADDRESS>
   ```

## Integration Testing

### Testing with Backend

When integrating with the Laravel backend:

1. Configure backend to use Devnet RPC endpoint
2. Update environment variables with test wallet addresses
3. Execute transactions through the API
4. Verify on-chain state matches expected results

### Common Test Scenarios

| Scenario | Description | Expected Result |
| :--- | :--- | :--- |
| Basic Transfer | Transfer tokens between accounts | Successful transfer, fee deducted |
| Fee Distribution | Verify fee allocation | Correct percentages to each wallet |
| Insufficient Balance | Transfer more than available | Transaction rejected |
| Zero Fee Service | Education transaction | No fee charged |

## Debugging Tools

### View Transaction Details

```bash
# Get detailed transaction information
solana confirm -v <TRANSACTION_SIGNATURE>
```

### Check Token Accounts

```bash
# List all token accounts for a wallet
spl-token accounts
```

### Solana Explorer

- Visit [Solana Explorer (Devnet)](https://explorer.solana.com/?cluster=devnet)
- Search for addresses or transaction signatures
- View detailed account and transaction information

## Troubleshooting

### Common Issues

| Issue | Solution |
| :--- | :--- |
| "Insufficient funds" | Airdrop more devnet SOL |
| "Account not found" | Create token account first |
| RPC rate limiting | Wait and retry, or use dedicated RPC |
| Transaction timeout | Retry with higher priority fee |

### Getting Help

- Open a GitHub Issue for bugs
- Check existing issues for solutions
- Review Solana documentation for general Solana questions

## Next Steps

After successful Devnet testing:

1. Review [Token Architecture](Token-Architecture.md) for mainnet deployment considerations
2. Understand [Multisig Treasury Setup](Multisig-Treasury-Setup.md) for production security
3. Review [Burn Mechanism](Burn-Mechanism.md) for fee distribution verification

## Related Documentation

- [Token Architecture](Token-Architecture.md)
- [Burn Mechanism](Burn-Mechanism.md)
- [Home](Home.md)

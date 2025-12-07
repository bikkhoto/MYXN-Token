# MyXen Foundation - MYXN Token Integration Configuration

## Environment Variables Template

Copy this to your MyXen Foundation `backend/.env`:

```env
# ==================================
# APPLICATION
# ==================================
APP_NAME="MyXenPay"
APP_ENV=production
APP_KEY=
APP_DEBUG=false
APP_URL=http://localhost:8000

# ==================================
# SOLANA BLOCKCHAIN CONFIGURATION
# ==================================

# Network selection: devnet, testnet, mainnet-beta
SOLANA_NETWORK=mainnet-beta

# RPC Endpoints
SOLANA_RPC_ENDPOINT=https://api.mainnet-beta.solana.com
SOLANA_WS_ENDPOINT=wss://api.mainnet-beta.solana.com

# Alternative RPC providers (optional):
# SOLANA_RPC_ENDPOINT=https://mainnet.helius-rpc.com/
# SOLANA_RPC_ENDPOINT=https://api.metaplex.solana.com/

# ==================================
# MYXN TOKEN CONFIGURATION
# ==================================

# Your MYXN Token mint address
MYXN_TOKEN_MINT=<INSERT_YOUR_MYXN_MINT_ADDRESS>

# Token decimals (MYXN uses 8 decimals)
MYXN_DECIMALS=8

# Token symbol
MYXN_SYMBOL=MYXN

# ==================================
# PRESALE CONFIGURATION
# ==================================

# Presale Program ID (Anchor program)
PRESALE_PROGRAM_ID=<INSERT_YOUR_PRESALE_PROGRAM_ID>

# Presale wallet (for collecting funds)
PRESALE_WALLET_ADDRESS=<INSERT_PRESALE_WALLET_ADDRESS>

# Presale status (enable/disable presale)
PRESALE_ACTIVE=true

# Presale timeline
PRESALE_START_DATE=2024-12-15T00:00:00Z
PRESALE_END_DATE=2024-12-31T23:59:59Z

# Presale caps (in USD)
PRESALE_SOFT_CAP=100000
PRESALE_HARD_CAP=500000

# Contribution limits per wallet (in USD)
PRESALE_MIN_CONTRIBUTION=100
PRESALE_MAX_CONTRIBUTION=50000

# Token price during presale
PRESALE_PRICE_PER_TOKEN=0.5

# Vesting configuration (months, percentage)
PRESALE_VESTING_SCHEDULE=[
  {"months": 0, "percentage": 25},
  {"months": 1, "percentage": 25},
  {"months": 2, "percentage": 25},
  {"months": 3, "percentage": 25}
]

# ==================================
# FEE & BURN CONFIGURATION
# ==================================

# Fee collection wallet
FEE_COLLECTION_WALLET=<INSERT_FEE_WALLET_ADDRESS>

# Monthly burn wallet
BURN_WALLET_ADDRESS=<INSERT_BURN_WALLET_ADDRESS>

# Fee percentages
FEE_TRANSFER_PERCENTAGE=1
FEE_TRADING_PERCENTAGE=2
FEE_DISTRIBUTION_PERCENTAGE=0.5

# ==================================
# SIGNER SERVICE CONFIGURATION
# ==================================

# Signer service endpoint (Docker internal)
SIGNER_HOST=http://signer:8080

# Signer service authentication token
SIGNER_AUTH_TOKEN=<GENERATE_SECURE_TOKEN>

# Signer log level
SIGNER_LOG_LEVEL=info

# ==================================
# DATABASE CONFIGURATION
# ==================================

DB_CONNECTION=mysql
DB_HOST=mysql
DB_PORT=3306
DB_DATABASE=myxenpay
DB_USERNAME=myxenpay
DB_PASSWORD=<GENERATE_SECURE_PASSWORD>

# Optional: PostgreSQL configuration
# DB_CONNECTION=pgsql
# DB_HOST=postgres
# DB_PORT=5432
# DB_DATABASE=myxenpay
# DB_USERNAME=myxenpay
# DB_PASSWORD=<GENERATE_SECURE_PASSWORD>

# ==================================
# REDIS CACHE & QUEUE
# ==================================

CACHE_DRIVER=redis
QUEUE_CONNECTION=redis
SESSION_DRIVER=cookie

REDIS_HOST=redis
REDIS_PASSWORD=<GENERATE_SECURE_PASSWORD>
REDIS_PORT=6379
REDIS_DB=0

# ==================================
# LOGGING
# ==================================

LOG_CHANNEL=stack
LOG_LEVEL=info
LOG_DAILY_DAYS=14

# ==================================
# API KEYS & EXTERNAL SERVICES
# ==================================

# CoinGecko API (for token price data)
API_KEY_COINGECKO=<OPTIONAL_COINGECKO_API_KEY>

# SendGrid (for emails)
SENDGRID_API_KEY=<OPTIONAL_SENDGRID_API_KEY>

# AWS S3 (for file storage)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_DEFAULT_REGION=us-east-1
AWS_BUCKET=

# ==================================
# SESSION & SECURITY
# ==================================

COOKIE_SECURE=true
COOKIE_HTTP_ONLY=true
COOKIE_SAME_SITE=lax

SESSION_LIFETIME=120

# ==================================
# RATE LIMITING
# ==================================

# Rate limit: requests per minute
RATE_LIMIT_PER_MINUTE=60

# ==================================
# MAIL CONFIGURATION
# ==================================

MAIL_MAILER=smtp
MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=
MAIL_PASSWORD=
MAIL_FROM_ADDRESS="noreply@myxenpay.com"
MAIL_FROM_NAME="MyXenPay"

# ==================================
# MOBILE APP CONFIGURATION
# ==================================

# CORS settings for mobile app
CORS_ALLOWED_ORIGINS=https://app.myxenpay.com

# ==================================
# MONITORING & OBSERVABILITY
# ==================================

# Sentry (error tracking)
SENTRY_LARAVEL_DSN=

# New Relic (APM)
NEW_RELIC_APP_NAME=MyXenPay
NEW_RELIC_LICENSE_KEY=

# ==================================
# DEVELOPMENT ONLY
# ==================================

# Uncomment for local development:
# APP_DEBUG=true
# LOG_LEVEL=debug
```

## Important Notes

### 1. **Security**
- Never commit `.env` to version control
- Use strong, unique passwords for database and Redis
- Rotate `SIGNER_AUTH_TOKEN` regularly
- Store private keys in secure vaults (AWS KMS, HashiCorp Vault)

### 2. **Token Addresses**
Replace these with your actual values:
- `MYXN_TOKEN_MINT`: Your SPL token mint address
- `PRESALE_PROGRAM_ID`: Your deployed Anchor program ID
- `PRESALE_WALLET_ADDRESS`: Wallet for collecting presale funds
- `FEE_COLLECTION_WALLET`: Wallet for fee distribution
- `BURN_WALLET_ADDRESS`: Wallet for monthly burns

### 3. **Network Selection**

**Development (Devnet):**
```env
SOLANA_NETWORK=devnet
SOLANA_RPC_ENDPOINT=https://api.devnet.solana.com
```

**Testing (Testnet):**
```env
SOLANA_NETWORK=testnet
SOLANA_RPC_ENDPOINT=https://api.testnet.solana.com
```

**Production (Mainnet):**
```env
SOLANA_NETWORK=mainnet-beta
SOLANA_RPC_ENDPOINT=https://api.mainnet-beta.solana.com
```

### 4. **RPC Provider Options**

**Free Tier:**
- Solana Foundation: https://api.mainnet-beta.solana.com

**Premium Providers:**
- Helius RPC: https://mainnet.helius-rpc.com/
- Metaplex: https://api.metaplex.solana.com/
- QuickNode: https://quicknode.com/

### 5. **Generate Secure Tokens**

```bash
# Generate random APP_KEY (Laravel)
docker-compose exec workspace php artisan key:generate

# Generate secure SIGNER_AUTH_TOKEN
docker-compose exec workspace php artisan tinker
>>> \Illuminate\Support\Str::random(32)

# Generate secure passwords
openssl rand -base64 32
```

### 6. **Vesting Schedule Format**

```json
[
  {
    "months": 0,
    "percentage": 25
  },
  {
    "months": 1,
    "percentage": 25
  },
  {
    "months": 2,
    "percentage": 25
  },
  {
    "months": 3,
    "percentage": 25
  }
]
```

Each object defines:
- `months`: Months after TGE (Token Generation Event)
- `percentage`: Percentage of allocation to unlock

### 7. **Presale Timeline Example**

```env
# Start: December 15, 2024, 00:00 UTC
PRESALE_START_DATE=2024-12-15T00:00:00Z

# End: December 31, 2024, 23:59 UTC
PRESALE_END_DATE=2024-12-31T23:59:59Z
```

### 8. **Rate Limiting**

```env
# Default: 60 requests per minute per IP
RATE_LIMIT_PER_MINUTE=60

# For public APIs, consider:
# RATE_LIMIT_PER_MINUTE=100

# For authenticated endpoints:
# RATE_LIMIT_AUTHENTICATED=200
```

## Setup Steps

1. **Copy template to `.env`:**
   ```bash
   cp MYXEN_FOUNDATION_CONFIG.env backend/.env
   ```

2. **Update with your values:**
   ```bash
   nano backend/.env
   ```

3. **Verify configuration:**
   ```bash
   docker-compose exec workspace php artisan config:show services
   ```

4. **Test connectivity:**
   ```bash
   docker-compose exec workspace php artisan tinker
   >>> Illuminate\Support\Facades\Http::get(env('SOLANA_RPC_ENDPOINT'))
   ```

---

**Last Updated**: December 8, 2025
**Status**: Production Ready

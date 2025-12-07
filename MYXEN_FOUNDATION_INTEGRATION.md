# MyXen Foundation Integration Guide

## 📋 Overview

This document outlines the integration between **MYXN Token** (Solana smart contracts) and **MyXen Foundation** (production web/mobile ecosystem).

**Repository**: https://github.com/bikkhoto/MyXen-Foundation.git

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    MyXen Foundation Stack                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐      ┌──────────────────┐               │
│  │  Mobile (Flutter)│      │ Web Frontend     │               │
│  │  ├─ iOS          │      │ ├─ Dashboard     │               │
│  │  └─ Android      │      │ └─ Admin Panel   │               │
│  └────────┬─────────┘      └────────┬─────────┘               │
│           │                         │                          │
│           └───────────┬─────────────┘                          │
│                       │                                         │
│           ┌───────────▼───────────┐                           │
│           │  Laravel API Server   │                           │
│           │  (Backend)            │                           │
│           │  ├─ Controllers       │                           │
│           │  ├─ Models            │                           │
│           │  ├─ Services          │                           │
│           │  └─ Jobs              │                           │
│           └───────────┬───────────┘                           │
│                       │                                         │
│    ┌──────────────────┼──────────────────┐                    │
│    │                  │                  │                    │
│    ▼                  ▼                  ▼                    │
│  MySQL              Redis              Solana                 │
│  (Database)         (Cache/Queue)      Blockchain             │
│                                        MYXN Token             │
│                                        Smart Contracts        │
│                                                                │
│           ┌──────────────────────┐                            │
│           │  Signer Service      │                            │
│           │  (Rust/Node.js)      │                            │
│           │  ├─ Sign Txs         │                            │
│           │  ├─ Verify           │                            │
│           │  └─ Key Management   │                            │
│           └──────────────────────┘                            │
│                                                                │
└─────────────────────────────────────────────────────────────────┘
```

## 📁 MyXen Foundation Repository Structure

```
MyXen-Foundation/
├── backend/                      # Laravel 11+ API (Main Backend)
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/      # API Endpoints
│   │   │   └── Requests/         # Request Validation
│   │   ├── Models/               # Database Models
│   │   ├── Modules/              # Feature Modules (37+)
│   │   ├── Services/             # Business Logic
│   │   └── Jobs/                 # Queue Jobs
│   ├── config/                   # Configuration
│   ├── database/                 # Migrations & Seeds
│   ├── routes/                   # API Routes
│   ├── bootstrap/                # Bootstrap Files
│   └── package.json              # Node Dependencies
│
├── anchor-presale/               # Solana Smart Contracts
│   ├── programs/                 # Anchor Programs
│   ├── scripts/                  # Deployment Scripts
│   ├── tests/                    # Test Suite
│   ├── app/                      # App Code
│   ├── Cargo.toml                # Rust Dependencies
│   └── package.json              # Node Dependencies
│
├── mobile/                       # Flutter Mobile App
│   ├── lib/                      # Source Code
│   ├── android/                  # Android Config
│   ├── ios/                      # iOS Config
│   └── test/                     # Tests
│
├── services/                     # Microservices
│   ├── api/                      # API Service
│   ├── payments/                 # Payment Service
│   └── signer/                   # Solana Signer
│
├── infra/                        # Infrastructure
│   └── docker/                   # Docker Configs
│
├── docs/                         # Documentation
├── examples/                     # Examples & Postman
├── docker-compose.yml            # Container Orchestration
└── bootstrap.sh                  # Setup Script
```

## 🔗 Integration Points

### 1. **API Endpoints for MYXN Token**

The Laravel backend provides REST API endpoints for:

- **Token Information**
  - `GET /api/token/info` - Get token details
  - `GET /api/token/supply` - Current supply
  - `GET /api/token/holders` - Top token holders
  - `GET /api/token/price` - Current price & market data

- **User Wallet Management**
  - `POST /api/wallet/create` - Create wallet
  - `GET /api/wallet/{address}` - Get wallet details
  - `GET /api/wallet/{address}/balance` - Token balance
  - `GET /api/wallet/{address}/transactions` - Txn history

- **Presale & Token Distribution**
  - `POST /api/presale/participate` - Join presale
  - `GET /api/presale/status` - Presale status
  - `POST /api/distribution/claim` - Claim tokens
  - `GET /api/distribution/vesting` - Vesting schedule

- **Transactions**
  - `POST /api/transactions/sign` - Sign transaction
  - `POST /api/transactions/submit` - Submit to blockchain
  - `GET /api/transactions/{hash}` - Verify transaction

### 2. **Signer Service Integration**

The Solana Signer microservice handles:

```
┌─ Backend (Laravel)
│  └─ Prepares Transaction
│
└─ Signer Service (Rust/Node)
   ├─ Sign with Private Key
   ├─ Verify Signature
   └─ Return Signed Tx
│
└─ Backend submits to Solana RPC
   └─ Blockchain confirmation
```

**Endpoint**: `http://localhost:8080`

**Key Operations**:
- Sign transaction: `POST /sign`
- Verify signature: `POST /verify`
- Get public key: `GET /public-key`

### 3. **Database Integration**

**Tables for MYXN Token**:

```sql
-- Token Holders
CREATE TABLE token_holders (
  id UUID PRIMARY KEY,
  wallet_address VARCHAR(255) UNIQUE,
  balance DECIMAL(20, 8),
  created_at TIMESTAMP
);

-- Presale Participants
CREATE TABLE presale_participants (
  id UUID PRIMARY KEY,
  wallet_address VARCHAR(255),
  amount_usd DECIMAL(12, 2),
  tokens_allocated DECIMAL(20, 8),
  status ENUM('pending', 'approved', 'distributed'),
  created_at TIMESTAMP
);

-- Fee Distribution Records
CREATE TABLE fee_distributions (
  id UUID PRIMARY KEY,
  distribution_type VARCHAR(100),
  amount DECIMAL(20, 8),
  recipient_address VARCHAR(255),
  tx_hash VARCHAR(255),
  created_at TIMESTAMP
);

-- Monthly Burn Records
CREATE TABLE monthly_burns (
  id UUID PRIMARY KEY,
  burn_date DATE,
  amount DECIMAL(20, 8),
  tx_hash VARCHAR(255),
  created_at TIMESTAMP
);

-- Token Transactions
CREATE TABLE token_transactions (
  id UUID PRIMARY KEY,
  from_address VARCHAR(255),
  to_address VARCHAR(255),
  amount DECIMAL(20, 8),
  tx_hash VARCHAR(255),
  status ENUM('pending', 'confirmed', 'failed'),
  created_at TIMESTAMP
);
```

## 🚀 Setup Instructions

### Prerequisites

- Docker & Docker Compose installed
- Git with SSH keys configured
- Node.js 18+ (optional, for local development)
- PHP 8.3+ (optional, for local development)

### Step 1: Clone MyXen Foundation

```bash
cd /home/bikkhoto
git clone https://github.com/bikkhoto/MyXen-Foundation.git
cd MyXen-Foundation
```

### Step 2: Configure Environment

```bash
# Copy environment example files
cp backend/.env.example backend/.env
cp services/signer/.env.example services/signer/.env

# Configure MYXN Token settings in backend/.env
echo "SOLANA_NETWORK=mainnet-beta" >> backend/.env
echo "SOLANA_RPC_ENDPOINT=https://api.mainnet-beta.solana.com" >> backend/.env
echo "MYXN_TOKEN_MINT=<YOUR_TOKEN_MINT_ADDRESS>" >> backend/.env
echo "PRESALE_PROGRAM_ID=<YOUR_PRESALE_PROGRAM_ID>" >> backend/.env
```

### Step 3: Start Services with Docker

```bash
# Build and start all services
docker-compose up --build -d

# Run migrations
docker-compose exec workspace php artisan migrate --seed

# Build Anchor program
docker-compose exec anchor bash -c "cd anchor-presale && anchor build"
```

### Step 4: Verify Integration

```bash
# Test Backend API
curl http://localhost:8000/api/health

# Test Signer Service
curl http://localhost:8080/public-key

# View logs
docker-compose logs -f php
docker-compose logs -f signer
```

## 📚 Key Files for Integration

### From MYXN Token Repository

Copy these to MyXen Foundation:

```bash
# Copy fee distribution system
cp myxen-presale/scripts/fee_distribution_system.ts \
   MyXen-Foundation/services/api/src/

# Copy token security verification
cp myxen-presale/scripts/verify_token_security.ts \
   MyXen-Foundation/services/api/src/

# Copy monthly auto-burn logic
cp myxen-presale/scripts/monthly_auto_burn.ts \
   MyXen-Foundation/services/api/src/

# Copy presale configuration
cp User\ Data/fee_distribution_config.json \
   MyXen-Foundation/anchor-presale/config/
```

### New Files to Create in MyXen Foundation

1. **Token Service** (`backend/app/Services/TokenService.php`)
   - Handle token operations
   - Balance queries
   - Transfer management

2. **Presale Controller** (`backend/app/Http/Controllers/Api/PresaleController.php`)
   - Presale endpoints
   - Participant management
   - Token claim logic

3. **Blockchain Service** (`backend/app/Services/BlockchainService.php`)
   - RPC interactions
   - Transaction submission
   - Confirmation tracking

4. **Signer Integration** (`backend/app/Services/SignerService.php`)
   - Communication with signer service
   - Transaction signing
   - Signature verification

## 🔐 Security Considerations

### Environment Variables (in backend/.env)

```env
# Solana Network
SOLANA_NETWORK=mainnet-beta
SOLANA_RPC_ENDPOINT=https://api.mainnet-beta.solana.com

# Token Information
MYXN_TOKEN_MINT=<YOUR_MINT_ADDRESS>
MYXN_DECIMALS=8

# Presale Configuration
PRESALE_PROGRAM_ID=<YOUR_PROGRAM_ID>
PRESALE_WALLET_ADDRESS=<PRESALE_WALLET>

# Fee Configuration
FEE_WALLET_ADDRESS=<FEE_COLLECTION_WALLET>
BURN_WALLET_ADDRESS=<BURN_WALLET>

# Signer Service
SIGNER_HOST=http://signer:8080
SIGNER_AUTH_TOKEN=<SECURE_TOKEN>

# Database
DB_CONNECTION=mysql
DB_HOST=mysql
DB_DATABASE=myxenpay
DB_USERNAME=myxenpay
DB_PASSWORD=<SECURE_PASSWORD>

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# API Keys
API_KEY_SOLANA=<YOUR_KEY>
API_KEY_COINGECKO=<YOUR_KEY>
```

### Security Best Practices

1. **Never commit `.env` files**
   - Already in `.gitignore`
   - Use `.env.example` as template

2. **Private Key Management**
   - Store signer keys in secure vault
   - Use AWS KMS or HashiCorp Vault
   - Rotate keys regularly

3. **API Rate Limiting**
   - Implement rate limiting on endpoints
   - Use Redis for token bucket algorithm

4. **Transaction Verification**
   - Verify signatures on all transactions
   - Confirm on blockchain before DB update
   - Implement transaction rollback on failure

## 📊 Deployment Workflow

### Local Development

```bash
docker-compose up -d
docker-compose exec workspace php artisan tinker
```

### Staging

```bash
# Use staging RPC endpoint
SOLANA_NETWORK=devnet
SOLANA_RPC_ENDPOINT=https://api.devnet.solana.com
```

### Production

```bash
# Use mainnet
SOLANA_NETWORK=mainnet-beta
SOLANA_RPC_ENDPOINT=https://api.mainnet-beta.solana.com

# Enable monitoring
LOG_CHANNEL=stack
LOG_LEVEL=info
```

## 🔄 CI/CD Pipeline

The repository includes GitHub Actions workflows:

- **Test**: Run unit & integration tests
- **Build**: Compile Anchor programs
- **Deploy**: Push to staging/production
- **Monitor**: Health checks & alerts

See `.github/workflows/` for details.

## 📞 Support Resources

- **MyXen Foundation**: https://github.com/bikkhoto/MyXen-Foundation
- **MYXN Token**: https://github.com/bikkhoto/MYXN-Token
- **Anchor Docs**: https://www.anchor-lang.com/
- **Laravel Docs**: https://laravel.com/docs
- **Solana Docs**: https://docs.solana.com/

## ✅ Integration Checklist

- [ ] Clone MyXen Foundation repository
- [ ] Configure environment variables
- [ ] Set up Docker services
- [ ] Create database tables
- [ ] Implement token service
- [ ] Integrate presale controller
- [ ] Set up blockchain service
- [ ] Configure signer service
- [ ] Test API endpoints
- [ ] Deploy to staging
- [ ] Run security audit
- [ ] Deploy to mainnet

---

**Last Updated**: December 8, 2025
**Status**: In Development
**Maintainer**: bikkhoto

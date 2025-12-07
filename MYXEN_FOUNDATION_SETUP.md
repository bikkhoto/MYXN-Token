# MyXen Foundation Integration - Setup Guide

## 🚀 Quick Start

This guide helps you integrate the MYXN Token smart contracts with the MyXen Foundation production backend.

## 📋 Prerequisites

```bash
# Verify Docker & Docker Compose
docker --version
docker-compose --version

# Verify Git
git --version

# Verify Node.js (for Anchor)
node --version
npm --version
```

## 🔧 Installation Steps

### Step 1: Clone Both Repositories

```bash
cd /home/bikkhoto

# Clone MyXen Foundation (if not already cloned)
git clone https://github.com/bikkhoto/MyXen-Foundation.git

# Navigate to MyXen Foundation
cd MyXen-Foundation
```

### Step 2: Set Up Environment Variables

```bash
# Copy .env template for backend
cp backend/.env.example backend/.env

# Copy .env template for signer
cp services/signer/.env.example services/signer/.env

# Edit backend/.env
nano backend/.env
```

**Key Configuration for MYXN Token:**

```env
# ===== SOLANA CONFIGURATION =====
SOLANA_NETWORK=mainnet-beta
SOLANA_RPC_ENDPOINT=https://api.mainnet-beta.solana.com
SOLANA_WS_ENDPOINT=wss://api.mainnet-beta.solana.com

# ===== MYXN TOKEN CONFIGURATION =====
MYXN_TOKEN_MINT=<YOUR_TOKEN_MINT_ADDRESS>
MYXN_DECIMALS=8

# ===== PRESALE CONFIGURATION =====
PRESALE_PROGRAM_ID=<YOUR_PRESALE_PROGRAM_ID>
PRESALE_WALLET_ADDRESS=<PRESALE_COLLECTION_WALLET>
PRESALE_ACTIVE=true
PRESALE_START_DATE=2024-12-15
PRESALE_END_DATE=2024-12-31
PRESALE_SOFT_CAP=100000
PRESALE_HARD_CAP=500000
PRESALE_MIN_CONTRIBUTION=100
PRESALE_MAX_CONTRIBUTION=50000
PRESALE_PRICE_PER_TOKEN=0.5

# ===== FEE CONFIGURATION =====
FEE_COLLECTION_WALLET=<FEE_COLLECTION_ADDRESS>
BURN_WALLET_ADDRESS=<BURN_WALLET_ADDRESS>

# ===== SIGNER SERVICE =====
SIGNER_HOST=http://signer:8080
SIGNER_AUTH_TOKEN=<GENERATE_SECURE_TOKEN>

# ===== DATABASE =====
DB_CONNECTION=mysql
DB_HOST=mysql
DB_PORT=3306
DB_DATABASE=myxenpay
DB_USERNAME=myxenpay
DB_PASSWORD=<GENERATE_SECURE_PASSWORD>

# ===== REDIS =====
REDIS_HOST=redis
REDIS_PASSWORD=<GENERATE_SECURE_PASSWORD>
REDIS_PORT=6379

# ===== API KEYS =====
API_KEY_COINGECKO=<YOUR_COINGECKO_API_KEY>

# ===== LOGGING =====
LOG_CHANNEL=stack
LOG_LEVEL=info
```

### Step 3: Copy Integration Files

Copy the Laravel integration files from MYXN Token repo:

```bash
# From /home/bikkhoto/MYXN Token directory
cd /home/bikkhoto/MYXN\ Token

# Copy services
cp integration/TokenService.php \
   /home/bikkhoto/MyXen-Foundation/backend/app/Services/

cp integration/BlockchainService.php \
   /home/bikkhoto/MyXen-Foundation/backend/app/Services/

cp integration/PresaleController.php \
   /home/bikkhoto/MyXen-Foundation/backend/app/Http/Controllers/Api/

# Navigate back to MyXen Foundation
cd /home/bikkhoto/MyXen-Foundation
```

### Step 4: Start Docker Services

```bash
# Build and start all services
docker-compose up --build -d

# Verify services are running
docker-compose ps

# Check logs
docker-compose logs -f
```

**Expected services:**
- ✅ myxenpay-php (Laravel PHP-FPM)
- ✅ myxenpay-nginx (Web Server on :8000)
- ✅ myxenpay-mysql (Database on :3306)
- ✅ myxenpay-redis (Cache on :6379)
- ✅ myxenpay-signer (Signer Service on :8080)

### Step 5: Initialize Database

```bash
# Run migrations
docker-compose exec workspace php artisan migrate

# Seed database (optional)
docker-compose exec workspace php artisan db:seed

# Verify connection
docker-compose exec workspace php artisan tinker
>>> DB::table('users')->first()
```

### Step 6: Test Integration

```bash
# Test Backend Health
curl http://localhost:8000/api/health

# Test Token Info Endpoint
curl http://localhost:8000/api/token/info

# Test Signer Service
curl http://localhost:8080/public-key

# View Laravel logs
docker-compose logs -f php
```

### Step 7: Set Up Presale (Optional)

```bash
# Run presale initialization
docker-compose exec workspace php artisan presale:init

# Verify presale configuration
docker-compose exec workspace php artisan tinker
>>> \App\Models\Presale::first()
```

## 📁 File Structure After Integration

```
MyXen-Foundation/
├── backend/
│   ├── app/
│   │   ├── Http/Controllers/Api/
│   │   │   ├── PresaleController.php          (NEW - from integration)
│   │   │   └── ... (existing controllers)
│   │   └── Services/
│   │       ├── TokenService.php               (NEW - from integration)
│   │       ├── BlockchainService.php          (NEW - from integration)
│   │       └── SignerService.php              (NEW - optional)
│   ├── Models/
│   │   ├── PresaleParticipant.php            (NEW - for presale tracking)
│   │   ├── TokenTransaction.php              (NEW - for tx history)
│   │   └── ... (existing models)
│   ├── database/
│   │   └── migrations/
│   │       ├── create_presale_participants.php (NEW)
│   │       ├── create_token_transactions.php  (NEW)
│   │       └── ... (existing migrations)
│   ├── config/
│   │   ├── services.php                       (MODIFIED - add Solana config)
│   │   └── ... (existing config)
│   └── routes/
│       ├── api.php                            (MODIFIED - add presale routes)
│       └── ... (existing routes)
├── services/signer/
│   └── ... (Rust/Node signer service)
├── anchor-presale/
│   └── ... (Solana smart contracts)
└── docker-compose.yml                         (reference for services)
```

## 🔌 API Routes to Create

Add these routes to `backend/routes/api.php`:

```php
use App\Http\Controllers\Api\PresaleController;

// Token endpoints
Route::get('/token/info', 'TokenController@getInfo');
Route::get('/token/supply', 'TokenController@getSupply');
Route::get('/token/price', 'TokenController@getPrice');
Route::get('/token/holders', 'TokenController@getTopHolders');

// Wallet endpoints
Route::get('/wallet/{address}/balance', 'WalletController@getBalance');
Route::get('/wallet/{address}/transactions', 'WalletController@getTransactions');

// Presale endpoints
Route::group(['prefix' => 'presale'], function () {
    Route::get('/status', [PresaleController::class, 'getStatus']);
    Route::post('/participate', [PresaleController::class, 'participate']);
    Route::get('/vesting/{wallet}', [PresaleController::class, 'getVestingSchedule']);
    Route::post('/claim', [PresaleController::class, 'claimTokens']);
});

// Transaction endpoints
Route::post('/transactions/sign', 'TransactionController@sign');
Route::post('/transactions/submit', 'TransactionController@submit');
Route::get('/transactions/{hash}', 'TransactionController@getStatus');
```

## 📊 Database Models to Create

### PresaleParticipant Model

```bash
docker-compose exec workspace php artisan make:model PresaleParticipant -m
```

**Migration:**

```php
Schema::create('presale_participants', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->string('wallet_address', 255)->unique();
    $table->decimal('amount_usd', 12, 2);
    $table->decimal('tokens_allocated', 20, 8);
    $table->enum('status', ['pending', 'approved', 'rejected', 'distributed']);
    $table->string('signature')->nullable();
    $table->string('claim_tx_hash')->nullable();
    $table->timestamp('claimed_at')->nullable();
    $table->timestamps();
    $table->index('wallet_address');
    $table->index('status');
});
```

### TokenTransaction Model

```bash
docker-compose exec workspace php artisan make:model TokenTransaction -m
```

**Migration:**

```php
Schema::create('token_transactions', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->string('from_address', 255);
    $table->string('to_address', 255);
    $table->decimal('amount', 20, 8);
    $table->string('tx_hash', 255)->unique();
    $table->enum('status', ['pending', 'confirmed', 'failed']);
    $table->longText('error')->nullable();
    $table->timestamp('confirmed_at')->nullable();
    $table->timestamps();
    $table->index('tx_hash');
    $table->index('status');
});
```

## 🧪 Testing

### Manual API Testing

```bash
# Test presale status
curl -X GET http://localhost:8000/api/presale/status

# Test participate
curl -X POST http://localhost:8000/api/presale/participate \
  -H "Content-Type: application/json" \
  -d '{
    "wallet_address": "EH7Q4nH5....",
    "amount_usd": 500,
    "signature": "SIGNATURE_HERE"
  }'

# Test vesting schedule
curl -X GET http://localhost:8000/api/presale/vesting/EH7Q4nH5....
```

### Using Postman

1. Import `examples/postman_collection.json`
2. Set environment variables:
   - `base_url`: `http://localhost:8000`
   - `wallet_address`: Your test wallet
   - `signature`: Generated signature

3. Run collection tests

## 🐛 Troubleshooting

### Services Won't Start

```bash
# Check Docker logs
docker-compose logs php
docker-compose logs signer

# Verify port availability
lsof -i :8000
lsof -i :3306
lsof -i :8080

# Rebuild containers
docker-compose down
docker-compose up --build -d
```

### Database Connection Issues

```bash
# Check MySQL connection
docker-compose exec mysql mysql -u myxenpay -p -e "SELECT 1;"

# Check Laravel config
docker-compose exec workspace php artisan config:show database
```

### Signer Service Not Responding

```bash
# Check signer logs
docker-compose logs signer

# Test signer endpoint
curl http://localhost:8080/health

# Verify authentication token
echo $SIGNER_AUTH_TOKEN
```

## 📝 Configuration Files Reference

### `services.php` Config

Add to `backend/config/services.php`:

```php
'solana' => [
    'rpc_endpoint' => env('SOLANA_RPC_ENDPOINT'),
    'ws_endpoint' => env('SOLANA_WS_ENDPOINT'),
    'network' => env('SOLANA_NETWORK', 'mainnet-beta'),
    'myxn_token_mint' => env('MYXN_TOKEN_MINT'),
    'myxn_decimals' => env('MYXN_DECIMALS', 8),
],

'presale' => [
    'program_id' => env('PRESALE_PROGRAM_ID'),
    'wallet_address' => env('PRESALE_WALLET_ADDRESS'),
    'active' => env('PRESALE_ACTIVE', false),
    'start_date' => env('PRESALE_START_DATE'),
    'end_date' => env('PRESALE_END_DATE'),
    'soft_cap' => env('PRESALE_SOFT_CAP', 100000),
    'hard_cap' => env('PRESALE_HARD_CAP', 500000),
    'min_contribution' => env('PRESALE_MIN_CONTRIBUTION', 100),
    'max_contribution' => env('PRESALE_MAX_CONTRIBUTION', 50000),
    'price_per_token' => env('PRESALE_PRICE_PER_TOKEN', 0.5),
],

'signer' => [
    'host' => env('SIGNER_HOST', 'http://localhost:8080'),
    'auth_token' => env('SIGNER_AUTH_TOKEN'),
],
```

## 🔄 Next Steps

1. ✅ Complete integration setup
2. ✅ Run all tests
3. ✅ Deploy to staging environment
4. ✅ Conduct security audit
5. ✅ Deploy to production

## 📚 Additional Resources

- [MyXen Foundation README](./README.md)
- [Integration Guide](./MYXEN_FOUNDATION_INTEGRATION.md)
- [Presale Implementation Summary](./PRESALE_IMPLEMENTATION_SUMMARY.md)
- [Solana Documentation](https://docs.solana.com/)
- [Laravel Documentation](https://laravel.com/docs)
- [Anchor Documentation](https://www.anchor-lang.com/)

---

**Setup Date**: December 8, 2025
**Status**: Ready for Testing
**Support**: bikkhoto@protonmail.com

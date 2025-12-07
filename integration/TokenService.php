<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Exception;

// Import Laravel helper functions if not available
if (!function_exists('config')) {
    require_once __DIR__ . '/../../vendor/autoload.php';
}

/**
 * TokenService
 * 
 * Handles all MYXN Token operations including:
 * - Token information queries
 * - Balance management
 * - Supply tracking
 * - Holder management
 */
class TokenService
{
    private string $rpcEndpoint;
    private string $tokenMint;
    private int $decimals;
    private string $signerUrl;

    public function __construct()
    {
        $this->rpcEndpoint = config('services.solana.rpc_endpoint');
        $this->tokenMint = config('services.solana.myxn_token_mint');
        $this->decimals = config('services.solana.myxn_decimals', 8);
        $this->signerUrl = config('services.signer.host');
    }

    /**
     * Get token information
     * 
     * @return array
     */
    public function getTokenInfo(): array
    {
        return Cache::remember('token:info', now()->addMinutes(5), function () {
            try {
                $response = Http::post($this->rpcEndpoint, [
                    'jsonrpc' => '2.0',
                    'id' => 1,
                    'method' => 'getTokenSupply',
                    'params' => [$this->tokenMint]
                ]);

                if ($response->failed()) {
                    throw new Exception('Failed to fetch token supply from RPC');
                }

                $data = $response->json();
                $supply = $data['result']['value']['amount'] ?? 0;
                $uiAmount = $data['result']['value']['uiAmount'] ?? 0;

                return [
                    'mint' => $this->tokenMint,
                    'symbol' => 'MYXN',
                    'name' => 'MyXen Token',
                    'decimals' => $this->decimals,
                    'total_supply' => $supply,
                    'ui_amount' => $uiAmount,
                    'updated_at' => now()
                ];
            } catch (Exception $e) {
                logger()->error('TokenService::getTokenInfo failed', [
                    'error' => $e->getMessage()
                ]);
                throw $e;
            }
        });
    }

    /**
     * Get wallet token balance
     * 
     * @param string $walletAddress
     * @return array
     */
    public function getWalletBalance(string $walletAddress): array
    {
        try {
            // Get all token accounts for wallet
            $response = Http::post($this->rpcEndpoint, [
                'jsonrpc' => '2.0',
                'id' => 1,
                'method' => 'getTokenAccountsByOwner',
                'params' => [
                    $walletAddress,
                    ['mint' => $this->tokenMint],
                    ['encoding' => 'jsonParsed']
                ]
            ]);

            if ($response->failed()) {
                throw new Exception('Failed to fetch token accounts');
            }

            $data = $response->json();
            $accounts = $data['result']['value'] ?? [];

            if (empty($accounts)) {
                return [
                    'wallet_address' => $walletAddress,
                    'balance' => 0,
                    'token_account' => null,
                    'decimals' => $this->decimals
                ];
            }

            $account = $accounts[0];
            $tokenAmount = $account['account']['data']['parsed']['info']['tokenAmount'] ?? [];
            $balance = $tokenAmount['uiAmount'] ?? 0;
            $tokenAccount = $account['pubkey'];

            return [
                'wallet_address' => $walletAddress,
                'balance' => $balance,
                'token_account' => $tokenAccount,
                'decimals' => $this->decimals,
                'raw_balance' => $tokenAmount['amount'] ?? 0
            ];
        } catch (Exception $e) {
            logger()->error('TokenService::getWalletBalance failed', [
                'wallet' => $walletAddress,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Get all token holders (top N)
     * 
     * @param int $limit
     * @return array
     */
    public function getTopHolders(int $limit = 50): array
    {
        return Cache::remember('token:holders:top:' . $limit, now()->addMinutes(15), function () use ($limit) {
            try {
                // Get token accounts by balance
                $response = Http::post($this->rpcEndpoint, [
                    'jsonrpc' => '2.0',
                    'id' => 1,
                    'method' => 'getTokenLargestAccounts',
                    'params' => [$this->tokenMint]
                ]);

                if ($response->failed()) {
                    throw new Exception('Failed to fetch token holders');
                }

                $data = $response->json();
                $accounts = $data['result']['value'] ?? [];

                return array_slice(array_map(function ($account) {
                    return [
                        'address' => $account['address'],
                        'balance' => $account['uiAmount'],
                        'raw_balance' => $account['amount'],
                        'owner' => $account['owner'] ?? null
                    ];
                }, $accounts), 0, $limit);
            } catch (Exception $e) {
                logger()->error('TokenService::getTopHolders failed', [
                    'error' => $e->getMessage()
                ]);
                throw $e;
            }
        });
    }

    /**
     * Transfer tokens (via signed transaction)
     * 
     * @param string $fromWallet
     * @param string $toAddress
     * @param float $amount
     * @param string $signerKey
     * @return array
     */
    public function transferTokens(string $fromWallet, string $toAddress, float $amount, string $signerKey): array
    {
        try {
            // Prepare transfer instruction
            $instruction = $this->prepareTransferInstruction(
                $fromWallet,
                $toAddress,
                $amount
            );

            // Sign transaction with signer service
            $signedTx = $this->signTransaction($instruction, $signerKey);

            // Submit to blockchain
            $txHash = $this->submitTransaction($signedTx);

            // Log transaction
            logger()->info('Token transfer initiated', [
                'from' => $fromWallet,
                'to' => $toAddress,
                'amount' => $amount,
                'tx_hash' => $txHash
            ]);

            return [
                'success' => true,
                'tx_hash' => $txHash,
                'from' => $fromWallet,
                'to' => $toAddress,
                'amount' => $amount
            ];
        } catch (Exception $e) {
            logger()->error('TokenService::transferTokens failed', [
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Prepare transfer instruction
     * 
     * @param string $fromWallet
     * @param string $toAddress
     * @param float $amount
     * @return array
     */
    private function prepareTransferInstruction(string $fromWallet, string $toAddress, float $amount): array
    {
        return [
            'programId' => 'TokenkegQfeZyiNwAJsyFbPVwwQQfcZzcDhAMoWACE',
            'keys' => [
                ['pubkey' => $fromWallet, 'isSigner' => true, 'isWritable' => true],
                ['pubkey' => $toAddress, 'isSigner' => false, 'isWritable' => true],
            ],
            'data' => [
                'instruction' => 3, // Transfer
                'amount' => intval($amount * pow(10, $this->decimals))
            ]
        ];
    }

    /**
     * Sign transaction via signer service
     * 
     * @param array $instruction
     * @param string $signerKey
     * @return string
     */
    private function signTransaction(array $instruction, string $signerKey): string
    {
        $response = Http::post($this->signerUrl . '/sign', [
            'instruction' => $instruction,
            'signer_key' => $signerKey
        ]);

        if ($response->failed()) {
            throw new Exception('Failed to sign transaction');
        }

        return $response->json()['signed_transaction'];
    }

    /**
     * Submit signed transaction to blockchain
     * 
     * @param string $signedTx
     * @return string
     */
    private function submitTransaction(string $signedTx): string
    {
        $response = Http::post($this->rpcEndpoint, [
            'jsonrpc' => '2.0',
            'id' => 1,
            'method' => 'sendTransaction',
            'params' => [$signedTx, ['encoding' => 'base64']]
        ]);

        if ($response->failed()) {
            throw new Exception('Failed to submit transaction');
        }

        return $response->json()['result'];
    }

    /**
     * Get token price (from CoinGecko)
     * 
     * @return float
     */
    public function getTokenPrice(): float
    {
        return Cache::remember('token:price', now()->addMinutes(5), function () {
            try {
                $response = Http::get('https://api.coingecko.com/api/v3/simple/token_price/solana', [
                    'contract_addresses' => $this->tokenMint,
                    'vs_currencies' => 'usd'
                ]);

                if ($response->failed()) {
                    return 0;
                }

                return $response->json()[$this->tokenMint]['usd'] ?? 0;
            } catch (Exception $e) {
                logger()->warning('Failed to fetch token price', [
                    'error' => $e->getMessage()
                ]);
                return 0;
            }
        });
    }

    /**
     * Cache clear
     */
    public function clearCache(): void
    {
        Cache::forget('token:info');
        Cache::forget('token:price');
        Cache::tags(['token'])->flush();
    }
}

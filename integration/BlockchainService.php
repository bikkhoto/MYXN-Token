<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Exception;

/**
 * BlockchainService
 * 
 * Handles blockchain operations:
 * - Transaction submission
 * - Signature verification
 * - Confirmation tracking
 * - RPC interactions
 */
class BlockchainService
{
    private string $rpcEndpoint;
    private string $signerUrl;
    private string $signerAuthToken;

    public function __construct()
    {
        $this->rpcEndpoint = config('services.solana.rpc_endpoint');
        $this->signerUrl = config('services.signer.host');
        $this->signerAuthToken = config('services.signer.auth_token');
    }

    /**
     * Get account info from blockchain
     * 
     * @param string $address
     * @return array
     */
    public function getAccountInfo(string $address): array
    {
        try {
            $response = Http::post($this->rpcEndpoint, [
                'jsonrpc' => '2.0',
                'id' => 1,
                'method' => 'getAccountInfo',
                'params' => [
                    $address,
                    ['encoding' => 'jsonParsed']
                ]
            ]);

            if ($response->failed()) {
                throw new Exception('Failed to fetch account info');
            }

            return $response->json()['result'] ?? [];
        } catch (Exception $e) {
            logger()->error('BlockchainService::getAccountInfo failed', [
                'address' => $address,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Get transaction status
     * 
     * @param string $txHash
     * @return array
     */
    public function getTransactionStatus(string $txHash): array
    {
        try {
            $response = Http::post($this->rpcEndpoint, [
                'jsonrpc' => '2.0',
                'id' => 1,
                'method' => 'getSignatureStatus',
                'params' => [
                    [$txHash],
                    ['searchTransactionHistory' => true]
                ]
            ]);

            if ($response->failed()) {
                throw new Exception('Failed to fetch transaction status');
            }

            $result = $response->json()['result']['value'][0] ?? null;

            return [
                'tx_hash' => $txHash,
                'confirmed' => $result['confirmationStatus'] === 'confirmed',
                'status' => $result['confirmationStatus'] ?? 'unknown',
                'slot' => $result['slot'] ?? null,
                'error' => $result['err'] ?? null
            ];
        } catch (Exception $e) {
            logger()->error('BlockchainService::getTransactionStatus failed', [
                'tx_hash' => $txHash,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Get transaction details
     * 
     * @param string $txHash
     * @return array
     */
    public function getTransaction(string $txHash): array
    {
        try {
            $response = Http::post($this->rpcEndpoint, [
                'jsonrpc' => '2.0',
                'id' => 1,
                'method' => 'getTransaction',
                'params' => [
                    $txHash,
                    ['encoding' => 'jsonParsed', 'maxSupportedTransactionVersion' => 0]
                ]
            ]);

            if ($response->failed()) {
                throw new Exception('Failed to fetch transaction');
            }

            return $response->json()['result'] ?? [];
        } catch (Exception $e) {
            logger()->error('BlockchainService::getTransaction failed', [
                'tx_hash' => $txHash,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Verify signature
     * 
     * @param string $address
     * @param string $signature
     * @return bool
     */
    public function verifySignature(string $address, string $signature): bool
    {
        try {
            $response = Http::post($this->signerUrl . '/verify', [
                'address' => $address,
                'signature' => $signature,
                'auth_token' => $this->signerAuthToken
            ]);

            if ($response->failed()) {
                logger()->warning('Signature verification failed', [
                    'address' => $address,
                    'status' => $response->status()
                ]);
                return false;
            }

            return $response->json()['valid'] ?? false;
        } catch (Exception $e) {
            logger()->error('BlockchainService::verifySignature failed', [
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Transfer tokens to wallet
     * 
     * @param string $toWallet
     * @param float $amount
     * @param string|null $fromWallet
     * @return string (tx_hash)
     */
    public function transferTokens(
        string $toWallet,
        float $amount,
        string $fromWallet = null
    ): string {
        try {
            $fromWallet = $fromWallet ?? config('services.presale.wallet_address');

            // Prepare transaction
            $txData = [
                'to_wallet' => $toWallet,
                'amount' => $amount,
                'from_wallet' => $fromWallet,
                'auth_token' => $this->signerAuthToken
            ];

            $response = Http::post($this->signerUrl . '/transfer', $txData);

            if ($response->failed()) {
                throw new Exception('Failed to create transfer transaction');
            }

            $txHash = $response->json()['tx_hash'];

            logger()->info('Token transfer submitted', [
                'from' => $fromWallet,
                'to' => $toWallet,
                'amount' => $amount,
                'tx_hash' => $txHash
            ]);

            return $txHash;
        } catch (Exception $e) {
            logger()->error('BlockchainService::transferTokens failed', [
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Submit raw transaction
     * 
     * @param string $encodedTx
     * @return string (tx_hash)
     */
    public function submitTransaction(string $encodedTx): string
    {
        try {
            $response = Http::post($this->rpcEndpoint, [
                'jsonrpc' => '2.0',
                'id' => 1,
                'method' => 'sendTransaction',
                'params' => [
                    $encodedTx,
                    ['encoding' => 'base64', 'skipPreflight' => false]
                ]
            ]);

            if ($response->failed()) {
                throw new Exception('Failed to submit transaction');
            }

            return $response->json()['result'];
        } catch (Exception $e) {
            logger()->error('BlockchainService::submitTransaction failed', [
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Wait for transaction confirmation
     * 
     * @param string $txHash
     * @param int $maxAttempts
     * @param int $delaySeconds
     * @return array
     */
    public function waitForConfirmation(
        string $txHash,
        int $maxAttempts = 30,
        int $delaySeconds = 2
    ): array {
        $attempts = 0;

        while ($attempts < $maxAttempts) {
            $status = $this->getTransactionStatus($txHash);

            if ($status['confirmed']) {
                logger()->info('Transaction confirmed', [
                    'tx_hash' => $txHash,
                    'attempts' => $attempts + 1
                ]);
                return $status;
            }

            if ($status['error']) {
                logger()->error('Transaction failed', [
                    'tx_hash' => $txHash,
                    'error' => $status['error']
                ]);
                throw new Exception('Transaction failed: ' . json_encode($status['error']));
            }

            $attempts++;
            sleep($delaySeconds);
        }

        throw new Exception('Transaction confirmation timeout');
    }

    /**
     * Get recent blockhash
     * 
     * @return string
     */
    public function getRecentBlockhash(): string
    {
        try {
            $response = Http::post($this->rpcEndpoint, [
                'jsonrpc' => '2.0',
                'id' => 1,
                'method' => 'getLatestBlockhash',
                'params' => []
            ]);

            if ($response->failed()) {
                throw new Exception('Failed to fetch recent blockhash');
            }

            return $response->json()['result']['value']['blockhash'];
        } catch (Exception $e) {
            logger()->error('BlockchainService::getRecentBlockhash failed', [
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Estimate transaction fee
     * 
     * @param string $encodedTx
     * @return int (lamports)
     */
    public function estimateFee(string $encodedTx): int
    {
        try {
            $response = Http::post($this->rpcEndpoint, [
                'jsonrpc' => '2.0',
                'id' => 1,
                'method' => 'getFeeForMessage',
                'params' => [
                    $encodedTx,
                    ['commitment' => 'confirmed']
                ]
            ]);

            if ($response->failed()) {
                throw new Exception('Failed to estimate fee');
            }

            return $response->json()['result']['value'] ?? 5000;
        } catch (Exception $e) {
            logger()->warning('BlockchainService::estimateFee failed', [
                'error' => $e->getMessage(),
                'fallback' => 5000
            ]);
            return 5000; // Default fee in lamports
        }
    }

    /**
     * Get balance
     * 
     * @param string $address
     * @return float (in SOL)
     */
    public function getBalance(string $address): float
    {
        try {
            $response = Http::post($this->rpcEndpoint, [
                'jsonrpc' => '2.0',
                'id' => 1,
                'method' => 'getBalance',
                'params' => [$address]
            ]);

            if ($response->failed()) {
                throw new Exception('Failed to fetch balance');
            }

            $lamports = $response->json()['result']['value'] ?? 0;
            return $lamports / 1_000_000_000; // Convert to SOL
        } catch (Exception $e) {
            logger()->error('BlockchainService::getBalance failed', [
                'address' => $address,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }
}

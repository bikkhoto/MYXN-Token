<?php

namespace App\Http\Controllers\Api;

use App\Models\PresaleParticipant;
use App\Services\TokenService;
use App\Services\BlockchainService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Validator;
use Exception;

/**
 * PresaleController
 * 
 * Handles presale-related endpoints:
 * - Presale participation
 * - Status tracking
 * - Token claims
 * - Vesting schedules
 */
class PresaleController
{
    private TokenService $tokenService;
    private BlockchainService $blockchainService;

    public function __construct(
        TokenService $tokenService,
        BlockchainService $blockchainService
    ) {
        $this->tokenService = $tokenService;
        $this->blockchainService = $blockchainService;
    }

    /**
     * Get presale status
     * 
     * @return \Illuminate\Http\JsonResponse
     */
    public function getStatus()
    {
        try {
            $presaleConfig = config('services.presale');
            
            $status = [
                'active' => $presaleConfig['active'] ?? false,
                'start_date' => $presaleConfig['start_date'] ?? null,
                'end_date' => $presaleConfig['end_date'] ?? null,
                'soft_cap' => $presaleConfig['soft_cap'] ?? 0,
                'hard_cap' => $presaleConfig['hard_cap'] ?? 0,
                'min_contribution' => $presaleConfig['min_contribution'] ?? 0,
                'max_contribution' => $presaleConfig['max_contribution'] ?? 0,
                'price_per_token' => $presaleConfig['price_per_token'] ?? 0,
                'tokens_allocated' => PresaleParticipant::sum('tokens_allocated'),
                'usd_raised' => PresaleParticipant::where('status', 'approved')
                    ->sum('amount_usd'),
                'participants_count' => PresaleParticipant::where('status', 'approved')
                    ->count(),
                'progress_percentage' => $this->calculateProgress()
            ];

            return response()->json([
                'success' => true,
                'data' => $status
            ]);
        } catch (Exception $e) {
            logger()->error('PresaleController::getStatus failed', [
                'error' => $e->getMessage()
            ]);
            return response()->json([
                'success' => false,
                'error' => 'Failed to fetch presale status'
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Participate in presale
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function participate(Request $request)
    {
        try {
            // Validate input
            $validator = Validator::make($request->all(), [
                'wallet_address' => 'required|string|size:44', // Solana address
                'amount_usd' => 'required|numeric|min:' . config('services.presale.min_contribution'),
                'signature' => 'required|string'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors()
                ], Response::HTTP_UNPROCESSABLE_ENTITY);
            }

            // Verify signature
            if (!$this->blockchainService->verifySignature(
                $request->wallet_address,
                $request->signature
            )) {
                return response()->json([
                    'success' => false,
                    'error' => 'Invalid signature'
                ], Response::HTTP_UNAUTHORIZED);
            }

            // Check presale status
            if (!$this->isPresaleActive()) {
                return response()->json([
                    'success' => false,
                    'error' => 'Presale is not active'
                ], Response::HTTP_BAD_REQUEST);
            }

            // Check amount limits
            $amountUsd = $request->amount_usd;
            $presaleConfig = config('services.presale');

            if ($amountUsd > $presaleConfig['max_contribution']) {
                return response()->json([
                    'success' => false,
                    'error' => 'Amount exceeds maximum contribution'
                ], Response::HTTP_BAD_REQUEST);
            }

            // Check for duplicate participation
            $existing = PresaleParticipant::where('wallet_address', $request->wallet_address)
                ->where('status', '!=', 'rejected')
                ->first();

            if ($existing) {
                return response()->json([
                    'success' => false,
                    'error' => 'This wallet has already participated'
                ], Response::HTTP_CONFLICT);
            }

            // Calculate tokens
            $pricePerToken = $presaleConfig['price_per_token'];
            $tokensAllocated = $amountUsd / $pricePerToken;

            // Create presale participant record
            $participant = PresaleParticipant::create([
                'wallet_address' => $request->wallet_address,
                'amount_usd' => $amountUsd,
                'tokens_allocated' => $tokensAllocated,
                'status' => 'pending',
                'signature' => $request->signature
            ]);

            logger()->info('Presale participation created', [
                'wallet' => $request->wallet_address,
                'amount_usd' => $amountUsd,
                'tokens' => $tokensAllocated
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Presale participation recorded. Awaiting approval.',
                'data' => [
                    'id' => $participant->id,
                    'wallet_address' => $participant->wallet_address,
                    'amount_usd' => $participant->amount_usd,
                    'tokens_allocated' => $participant->tokens_allocated,
                    'status' => $participant->status
                ]
            ], Response::HTTP_CREATED);
        } catch (Exception $e) {
            logger()->error('PresaleController::participate failed', [
                'error' => $e->getMessage()
            ]);
            return response()->json([
                'success' => false,
                'error' => 'Failed to process presale participation'
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Claim allocated tokens
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function claimTokens(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'wallet_address' => 'required|string|size:44',
                'signature' => 'required|string'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors()
                ], Response::HTTP_UNPROCESSABLE_ENTITY);
            }

            // Find participant
            $participant = PresaleParticipant::where('wallet_address', $request->wallet_address)
                ->where('status', 'approved')
                ->first();

            if (!$participant) {
                return response()->json([
                    'success' => false,
                    'error' => 'No approved allocation found for this wallet'
                ], Response::HTTP_NOT_FOUND);
            }

            // Check vesting schedule
            $vestingInfo = $this->getVestingInfo($participant);
            if (!$vestingInfo['can_claim']) {
                return response()->json([
                    'success' => false,
                    'error' => 'Tokens are still in vesting period',
                    'next_claim_date' => $vestingInfo['next_claim_date']
                ], Response::HTTP_BAD_REQUEST);
            }

            // Transfer tokens
            $txHash = $this->blockchainService->transferTokens(
                $request->wallet_address,
                $participant->tokens_allocated
            );

            // Update participant status
            $participant->update([
                'status' => 'distributed',
                'claim_tx_hash' => $txHash,
                'claimed_at' => now()
            ]);

            logger()->info('Presale tokens claimed', [
                'wallet' => $request->wallet_address,
                'tokens' => $participant->tokens_allocated,
                'tx_hash' => $txHash
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Tokens claimed successfully',
                'data' => [
                    'wallet_address' => $request->wallet_address,
                    'tokens_claimed' => $participant->tokens_allocated,
                    'tx_hash' => $txHash,
                    'status' => 'distributed'
                ]
            ]);
        } catch (Exception $e) {
            logger()->error('PresaleController::claimTokens failed', [
                'error' => $e->getMessage()
            ]);
            return response()->json([
                'success' => false,
                'error' => 'Failed to claim tokens'
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get vesting schedule
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function getVestingSchedule(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'wallet_address' => 'required|string|size:44'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors()
                ], Response::HTTP_UNPROCESSABLE_ENTITY);
            }

            $participant = PresaleParticipant::where('wallet_address', $request->wallet_address)
                ->first();

            if (!$participant) {
                return response()->json([
                    'success' => false,
                    'error' => 'Participant not found'
                ], Response::HTTP_NOT_FOUND);
            }

            $vestingInfo = $this->getVestingInfo($participant);

            return response()->json([
                'success' => true,
                'data' => [
                    'wallet_address' => $participant->wallet_address,
                    'total_allocation' => $participant->tokens_allocated,
                    'already_claimed' => $vestingInfo['claimed'],
                    'remaining' => $vestingInfo['remaining'],
                    'can_claim' => $vestingInfo['can_claim'],
                    'next_claim_date' => $vestingInfo['next_claim_date'],
                    'vesting_schedule' => $vestingInfo['schedule'],
                    'status' => $participant->status
                ]
            ]);
        } catch (Exception $e) {
            logger()->error('PresaleController::getVestingSchedule failed', [
                'error' => $e->getMessage()
            ]);
            return response()->json([
                'success' => false,
                'error' => 'Failed to fetch vesting schedule'
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Calculate presale progress
     * 
     * @return float
     */
    private function calculateProgress(): float
    {
        $raised = PresaleParticipant::where('status', 'approved')
            ->sum('amount_usd');
        $hardCap = config('services.presale.hard_cap', 1);
        
        return min(100, ($raised / $hardCap) * 100);
    }

    /**
     * Check if presale is active
     * 
     * @return bool
     */
    private function isPresaleActive(): bool
    {
        $config = config('services.presale');
        $now = now();

        return $config['active'] === true &&
               $now->greaterThanOrEqualTo($config['start_date']) &&
               $now->lessThanOrEqualTo($config['end_date']);
    }

    /**
     * Get vesting information for participant
     * 
     * @param PresaleParticipant $participant
     * @return array
     */
    private function getVestingInfo(PresaleParticipant $participant): array
    {
        $vestingSchedule = config('services.presale.vesting_schedule', []);
        
        $claimed = 0;
        $nextClaimDate = null;
        $canClaim = false;
        $schedule = [];

        foreach ($vestingSchedule as $unlock) {
            $claimDate = $participant->created_at->addMonths($unlock['months'] ?? 0);
            $percentage = $unlock['percentage'] ?? 0;
            $amount = ($participant->tokens_allocated * $percentage) / 100;

            $schedule[] = [
                'unlock_date' => $claimDate,
                'percentage' => $percentage,
                'amount' => $amount
            ];

            if ($claimDate->lessThanOrEqualTo(now()) && !$participant->claimed_at) {
                $claimed += $amount;
                $canClaim = true;
            } elseif ($claimDate->greaterThan(now()) && !$nextClaimDate) {
                $nextClaimDate = $claimDate;
            }
        }

        return [
            'claimed' => $claimed,
            'remaining' => $participant->tokens_allocated - $claimed,
            'can_claim' => $canClaim,
            'next_claim_date' => $nextClaimDate,
            'schedule' => $schedule
        ];
    }
}

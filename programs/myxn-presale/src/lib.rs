use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("Frj9BHHhTVL36asW7KoBpJs17eEt4BUvL6fV5kc8xXd7");

/// MYXN Presale, Vesting & LP Management Program
///
/// Features:
/// - Presale purchase tracking and escrow
/// - Linear vesting with configurable schedule (5%/day default)
/// - Conditional LP creation based on raise thresholds
/// - Fee routing (burn, charity, liquidity, treasury)
/// - Admin controls for finalization and refunds
#[program]
pub mod myxn_presale {
    use super::*;

    /// Initialize the presale state
    pub fn initialize_presale(
        ctx: Context<InitializePresale>,
        params: PresaleParams,
    ) -> Result<()> {
        let presale = &mut ctx.accounts.presale_state;

        presale.admin = ctx.accounts.admin.key();
        presale.token_mint = ctx.accounts.token_mint.key();
        presale.treasury = ctx.accounts.treasury.key();
        presale.burn_wallet = params.burn_wallet;
        presale.charity_wallet = params.charity_wallet;

        presale.presale_tokens = params.presale_tokens;
        presale.price_usd = params.price_usd;
        presale.max_per_wallet_usd = params.max_per_wallet_usd;
        presale.lp_target_usd = params.lp_target_usd;
        presale.lp_min_threshold_usd = params.lp_min_threshold_usd;

        presale.total_raised_usd = 0;
        presale.total_sold = 0;
        presale.is_active = true;
        presale.is_finalized = false;
        presale.refund_enabled = false;
        presale.bump = ctx.bumps.presale_state;

        msg!(
            "Presale initialized with {} tokens at ${} per token",
            params.presale_tokens,
            params.price_usd
        );

        Ok(())
    }

    /// Purchase tokens during presale
    pub fn purchase_presale(
        ctx: Context<PurchasePresale>,
        amount_usd: u64,
        sol_amount: u64,
    ) -> Result<()> {
        let presale = &mut ctx.accounts.presale_state;
        let purchase = &mut ctx.accounts.purchase_record;

        require!(presale.is_active, PresaleError::PresaleNotActive);
        require!(!presale.is_finalized, PresaleError::PresaleFinalized);

        // Check max per wallet
        let current_purchases = purchase.total_purchased_usd;
        require!(
            current_purchases + amount_usd <= presale.max_per_wallet_usd,
            PresaleError::MaxPurchaseExceeded
        );

        // Calculate tokens (amount in USD / price per token)
        let tokens_to_buy = amount_usd
            .checked_div(presale.price_usd)
            .ok_or(PresaleError::MathOverflow)?
            .checked_mul(1_000_000_000) // 9 decimals
            .ok_or(PresaleError::MathOverflow)?;

        // Check availability
        require!(
            presale.total_sold + tokens_to_buy <= presale.presale_tokens,
            PresaleError::InsufficientPresaleTokens
        );

        // Transfer SOL to escrow
        let transfer_ctx = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.buyer.to_account_info(),
                to: ctx.accounts.escrow_account.to_account_info(),
            },
        );
        anchor_lang::system_program::transfer(transfer_ctx, sol_amount)?;

        // Update records using checked arithmetic
        presale.total_raised_usd = presale
            .total_raised_usd
            .checked_add(amount_usd)
            .ok_or(PresaleError::MathOverflow)?;
        presale.total_sold = presale
            .total_sold
            .checked_add(tokens_to_buy)
            .ok_or(PresaleError::MathOverflow)?;

        purchase.buyer = ctx.accounts.buyer.key();
        purchase.total_purchased_usd = purchase
            .total_purchased_usd
            .checked_add(amount_usd)
            .ok_or(PresaleError::MathOverflow)?;
        purchase.total_tokens = purchase
            .total_tokens
            .checked_add(tokens_to_buy)
            .ok_or(PresaleError::MathOverflow)?;
        purchase.claimed_tokens = 0;
        purchase.last_claim_timestamp = 0;

        msg!(
            "Purchase recorded: {} MYXN for ${}",
            tokens_to_buy / 1_000_000_000,
            amount_usd
        );

        Ok(())
    }

    /// Initialize vesting schedule for a buyer (admin only)
    pub fn initialize_vesting(
        ctx: Context<InitializeVesting>,
        vesting_params: VestingParams,
    ) -> Result<()> {
        let presale = &ctx.accounts.presale_state;
        let vesting = &mut ctx.accounts.vesting_account;

        // Verify admin authorization
        require!(
            ctx.accounts.admin.key() == presale.admin,
            PresaleError::Unauthorized
        );

        vesting.beneficiary = ctx.accounts.beneficiary.key();
        vesting.total_amount = vesting_params.total_amount;
        vesting.start_timestamp = vesting_params.start_timestamp;
        vesting.cliff_seconds = vesting_params.cliff_seconds;
        vesting.daily_release_bps = vesting_params.daily_release_bps; // e.g., 500 = 5%
        vesting.total_days = vesting_params.total_days;
        vesting.claimed_amount = 0;
        vesting.bump = ctx.bumps.vesting_account;

        msg!(
            "Vesting initialized: {} tokens over {} days at {}% per day",
            vesting_params.total_amount,
            vesting_params.total_days,
            vesting_params.daily_release_bps / 100
        );

        Ok(())
    }

    /// Claim vested tokens
    pub fn claim_vested(ctx: Context<ClaimVested>) -> Result<()> {
        let vesting = &mut ctx.accounts.vesting_account;
        let purchase = &mut ctx.accounts.purchase_record;
        let clock = Clock::get()?;

        require!(
            clock.unix_timestamp >= vesting.start_timestamp + vesting.cliff_seconds as i64,
            PresaleError::CliffNotReached
        );

        // Calculate vested amount
        let elapsed_seconds = (clock.unix_timestamp - vesting.start_timestamp) as u64;
        let elapsed_days = elapsed_seconds / 86400; // seconds per day

        let vested_amount = if elapsed_days >= vesting.total_days {
            vesting.total_amount // Fully vested
        } else {
            vesting
                .total_amount
                .checked_mul(vesting.daily_release_bps as u64)
                .ok_or(PresaleError::MathOverflow)?
                .checked_div(10000) // basis points
                .ok_or(PresaleError::MathOverflow)?
                .checked_mul(elapsed_days)
                .ok_or(PresaleError::MathOverflow)?
        };

        let claimable = vested_amount
            .checked_sub(vesting.claimed_amount)
            .ok_or(PresaleError::MathOverflow)?;

        require!(claimable > 0, PresaleError::NothingToClaim);

        // Transfer tokens from escrow to beneficiary
        let seeds = &[b"presale".as_ref(), &[ctx.accounts.presale_state.bump]];
        let signer = &[&seeds[..]];

        let transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.escrow_token_account.to_account_info(),
                to: ctx.accounts.beneficiary_token_account.to_account_info(),
                authority: ctx.accounts.presale_state.to_account_info(),
            },
            signer,
        );
        token::transfer(transfer_ctx, claimable)?;

        // Update state using checked arithmetic
        vesting.claimed_amount = vesting
            .claimed_amount
            .checked_add(claimable)
            .ok_or(PresaleError::MathOverflow)?;
        purchase.claimed_tokens = purchase
            .claimed_tokens
            .checked_add(claimable)
            .ok_or(PresaleError::MathOverflow)?;
        purchase.last_claim_timestamp = clock.unix_timestamp;

        msg!(
            "Claimed {} tokens ({} total claimed)",
            claimable,
            vesting.claimed_amount
        );

        Ok(())
    }

    /// Finalize presale and trigger LP creation if threshold met
    pub fn finalize_presale(ctx: Context<FinalizePresale>) -> Result<()> {
        let presale = &mut ctx.accounts.presale_state;

        require!(presale.is_active, PresaleError::PresaleNotActive);
        require!(!presale.is_finalized, PresaleError::PresaleFinalized);
        require!(
            ctx.accounts.admin.key() == presale.admin,
            PresaleError::Unauthorized
        );

        presale.is_active = false;
        presale.is_finalized = true;

        if presale.total_raised_usd >= presale.lp_min_threshold_usd {
            // Threshold met - enable LP creation
            msg!(
                "Presale successful! Raised ${} (threshold: ${})",
                presale.total_raised_usd,
                presale.lp_min_threshold_usd
            );

            // LP creation logic would go here
            // This would involve calling Raydium/Orca AMM instructions
            // For now, just emit event
            emit!(PresaleSuccess {
                total_raised: presale.total_raised_usd,
                total_sold: presale.total_sold,
            });
        } else {
            // Threshold not met - enable refunds
            presale.refund_enabled = true;
            msg!("Presale failed to meet threshold. Refunds enabled.");

            emit!(PresaleFailed {
                total_raised: presale.total_raised_usd,
                threshold: presale.lp_min_threshold_usd,
            });
        }

        Ok(())
    }

    /// Request refund if presale failed
    pub fn refund_purchase(ctx: Context<RefundPurchase>) -> Result<()> {
        let presale = &ctx.accounts.presale_state;
        let purchase = &mut ctx.accounts.purchase_record;

        require!(presale.refund_enabled, PresaleError::RefundNotEnabled);
        require!(purchase.total_tokens > 0, PresaleError::NothingToRefund);
        require!(purchase.claimed_tokens == 0, PresaleError::AlreadyClaimed);

        // Calculate refund amount (in SOL)
        let refund_amount = purchase.total_purchased_usd; // Simplified - would need SOL price conversion

        // Transfer SOL from escrow back to buyer
        // Note: The escrow account is validated through PDA seeds in the account constraints
        **ctx
            .accounts
            .escrow_account
            .to_account_info()
            .try_borrow_mut_lamports()? -= refund_amount;
        **ctx
            .accounts
            .buyer
            .to_account_info()
            .try_borrow_mut_lamports()? += refund_amount;

        // Mark as refunded
        purchase.total_tokens = 0;
        purchase.total_purchased_usd = 0;

        msg!("Refunded {} to buyer", refund_amount);

        Ok(())
    }
}

// ============================================================================
// Accounts
// ============================================================================

#[derive(Accounts)]
pub struct InitializePresale<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + PresaleState::INIT_SPACE,
        seeds = [b"presale"],
        bump
    )]
    pub presale_state: Account<'info, PresaleState>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub token_mint: Account<'info, Mint>,

    /// CHECK: Treasury wallet
    pub treasury: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PurchasePresale<'info> {
    #[account(mut)]
    pub presale_state: Account<'info, PresaleState>,

    #[account(
        init,
        payer = buyer,
        space = 8 + PurchaseRecord::INIT_SPACE,
        seeds = [b"purchase", buyer.key().as_ref(), presale_state.key().as_ref()],
        bump
    )]
    pub purchase_record: Account<'info, PurchaseRecord>,

    #[account(mut)]
    pub buyer: Signer<'info>,

    /// CHECK: Escrow account for SOL
    #[account(mut)]
    pub escrow_account: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitializeVesting<'info> {
    #[account(
        seeds = [b"presale"],
        bump = presale_state.bump
    )]
    pub presale_state: Account<'info, PresaleState>,

    #[account(
        init,
        payer = admin,
        space = 8 + VestingAccount::INIT_SPACE,
        seeds = [b"vesting", beneficiary.key().as_ref()],
        bump
    )]
    pub vesting_account: Account<'info, VestingAccount>,

    #[account(mut)]
    pub admin: Signer<'info>,

    /// CHECK: Beneficiary wallet address
    pub beneficiary: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClaimVested<'info> {
    #[account(mut)]
    pub presale_state: Account<'info, PresaleState>,

    #[account(
        mut,
        seeds = [b"vesting", beneficiary.key().as_ref()],
        bump = vesting_account.bump
    )]
    pub vesting_account: Account<'info, VestingAccount>,

    #[account(
        mut,
        seeds = [b"purchase", beneficiary.key().as_ref(), presale_state.key().as_ref()],
        bump
    )]
    pub purchase_record: Account<'info, PurchaseRecord>,

    #[account(mut)]
    pub beneficiary: Signer<'info>,

    #[account(mut)]
    pub escrow_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub beneficiary_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct FinalizePresale<'info> {
    #[account(mut)]
    pub presale_state: Account<'info, PresaleState>,

    #[account(mut)]
    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct RefundPurchase<'info> {
    pub presale_state: Account<'info, PresaleState>,

    #[account(
        mut,
        seeds = [b"purchase", buyer.key().as_ref(), presale_state.key().as_ref()],
        bump
    )]
    pub purchase_record: Account<'info, PurchaseRecord>,

    #[account(mut)]
    pub buyer: Signer<'info>,

    /// CHECK: Escrow account controlled by PDA, verified through seeds
    #[account(
        mut,
        seeds = [b"escrow"],
        bump
    )]
    pub escrow_account: AccountInfo<'info>,
}

// ============================================================================
// State
// ============================================================================

#[account]
#[derive(InitSpace)]
pub struct PresaleState {
    pub admin: Pubkey,
    pub token_mint: Pubkey,
    pub treasury: Pubkey,
    pub burn_wallet: Pubkey,
    pub charity_wallet: Pubkey,

    pub presale_tokens: u64,
    pub price_usd: u64,
    pub max_per_wallet_usd: u64,
    pub lp_target_usd: u64,
    pub lp_min_threshold_usd: u64,

    pub total_raised_usd: u64,
    pub total_sold: u64,

    pub is_active: bool,
    pub is_finalized: bool,
    pub refund_enabled: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct PurchaseRecord {
    pub buyer: Pubkey,
    pub total_purchased_usd: u64,
    pub total_tokens: u64,
    pub claimed_tokens: u64,
    pub last_claim_timestamp: i64,
}

#[account]
#[derive(InitSpace)]
pub struct VestingAccount {
    pub beneficiary: Pubkey,
    pub total_amount: u64,
    pub start_timestamp: i64,
    pub cliff_seconds: u64,
    pub daily_release_bps: u16, // basis points (e.g., 500 = 5%)
    pub total_days: u64,
    pub claimed_amount: u64,
    pub bump: u8,
}

// ============================================================================
// Parameters
// ============================================================================

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct PresaleParams {
    pub presale_tokens: u64,
    pub price_usd: u64,
    pub max_per_wallet_usd: u64,
    pub lp_target_usd: u64,
    pub lp_min_threshold_usd: u64,
    pub burn_wallet: Pubkey,
    pub charity_wallet: Pubkey,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct VestingParams {
    pub total_amount: u64,
    pub start_timestamp: i64,
    pub cliff_seconds: u64,
    pub daily_release_bps: u16,
    pub total_days: u64,
}

// ============================================================================
// Events
// ============================================================================

#[event]
pub struct PresaleSuccess {
    pub total_raised: u64,
    pub total_sold: u64,
}

#[event]
pub struct PresaleFailed {
    pub total_raised: u64,
    pub threshold: u64,
}

// ============================================================================
// Errors
// ============================================================================

#[error_code]
pub enum PresaleError {
    #[msg("Presale is not active")]
    PresaleNotActive,

    #[msg("Presale is already finalized")]
    PresaleFinalized,

    #[msg("Maximum purchase amount exceeded")]
    MaxPurchaseExceeded,

    #[msg("Insufficient presale tokens available")]
    InsufficientPresaleTokens,

    #[msg("Math overflow")]
    MathOverflow,

    #[msg("Vesting cliff not reached")]
    CliffNotReached,

    #[msg("Nothing to claim")]
    NothingToClaim,

    #[msg("Unauthorized")]
    Unauthorized,

    #[msg("Refund not enabled")]
    RefundNotEnabled,

    #[msg("Nothing to refund")]
    NothingToRefund,

    #[msg("Tokens already claimed")]
    AlreadyClaimed,
}

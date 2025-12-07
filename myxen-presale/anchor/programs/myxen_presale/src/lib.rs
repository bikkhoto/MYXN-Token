use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use ed25519_dalek::{PublicKey as Ed25519PubKey, Signature, Verifier};
use pyth_client::Price;

declare_id!("Presale1111111111111111111111111111111111111");

#[program]
pub mod myxen_presale {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, params: InitializeParams) -> Result<()> {
        let cfg = &mut ctx.accounts.config;
        cfg.token_mint = params.token_mint;
        cfg.treasury = params.treasury;
        cfg.total_presale_tokens = params.total_presale_tokens;
        cfg.private_allocation = params.private_allocation;
        cfg.public_allocation = params.public_allocation;
        cfg.presale_price_usd = params.presale_price_usd;
        cfg.max_per_wallet_usd = params.max_per_wallet_usd;
        cfg.min_buy_usd = params.min_buy_usd;
        cfg.accepted_spl_mints = params.accepted_spl_mints;
        cfg.accepted_spl_mint_count = 4u8;
        cfg.oracle_pubkey = params.oracle_pubkey;
        cfg.daily_release_bps = params.daily_release_bps;
        cfg.vesting_days = params.vesting_days;
        cfg.fee_bps = params.fee_bps;
        cfg.paused = false;
        Ok(())
    }

    pub fn buy(
        ctx: Context<Buy>,
        amount_paid: u64,
        currency: Currency,
        attestation: Option<Attestation>,
    ) -> Result<()> {
        let config = &mut ctx.accounts.config;
        require!(!config.paused, PresaleError::Paused);

        // Basic per-wallet cap enforcement using contribution stored in contributor account
        let contributor = &mut ctx.accounts.contributor;
        let usd_value = match currency {
            Currency::SOL => {
                // Try Pyth first, fallback to attestation
                if !ctx.accounts.oracle.to_account_info().data_is_empty() {
                    get_usd_value_from_pyth(amount_paid, &ctx.accounts.oracle)?
                } else if let Some(att) = attestation {
                    verify_attestation(&att, &ctx.accounts.payer.key(), &config.oracle_pubkey)?
                } else {
                    return Err(error!(PresaleError::OracleMissing));
                }
            }
            Currency::SPL => {
                // SPL stables: verify via attestation if provided, otherwise assume 1:1
                if let Some(att) = attestation {
                    verify_attestation(&att, &ctx.accounts.payer.key(), &config.oracle_pubkey)?
                } else {
                    amount_paid
                }
            }
        };

        // enforce minimum buy in USD
        require!(usd_value >= config.min_buy_usd, PresaleError::MinBuyNotMet);

        let projected_usd = contributor
            .contribution_usd
            .checked_add(usd_value)
            .ok_or(PresaleError::Overflow)?;
        require!(
            projected_usd <= config.max_per_wallet_usd,
            PresaleError::PerWalletCapExceeded
        );

        // tokens = USD / price -> using fixed point: price in micro-dollars (1e6). To keep simple here, we assume price given as USD per token in micro USD.
        let tokens =
            ((usd_value as u128 * 1_000_000u128) / (config.presale_price_usd_micro as u128)) as u64;

        // reserve tokens in SaleState
        let sale = &mut ctx.accounts.sale_state;
        let new_sold = sale
            .sold_tokens
            .checked_add(tokens)
            .ok_or(PresaleError::Overflow)?;
        require!(
            new_sold <= config.total_presale_tokens,
            PresaleError::PhaseCapExceeded
        );
        sale.sold_tokens = new_sold;

        // update contributor
        contributor.contribution_amount_native = contributor
            .contribution_amount_native
            .checked_add(amount_paid)
            .ok_or(PresaleError::Overflow)?;
        contributor.contribution_usd = contributor
            .contribution_usd
            .checked_add(usd_value)
            .ok_or(PresaleError::Overflow)?;
        contributor.claimable_tokens = contributor
            .claimable_tokens
            .checked_add(tokens)
            .ok_or(PresaleError::Overflow)?;
        contributor.vesting_start_ts = Clock::get()?.unix_timestamp as u64;

        // Transfer funds to treasury: for SPL currency we would transfer tokens, for SOL we transfer lamports
        // Implementation detail: we prefer immediate transfer to treasury; implement using CPI for SPL and lamport transfer for SOL
        match currency {
            Currency::SOL => {
                **ctx
                    .accounts
                    .treasury
                    .to_account_info()
                    .try_borrow_mut_lamports()? += amount_paid;
                **ctx
                    .accounts
                    .payer
                    .to_account_info()
                    .try_borrow_mut_lamports()? -= amount_paid;
            }
            Currency::SPL => {
                // verify payment token account provided
                let payment_acc = ctx
                    .accounts
                    .payment_token_account
                    .as_ref()
                    .ok_or(error!(PresaleError::PaymentAccountMissing))?;

                // verify mint is accepted
                let mint = payment_acc.mint;
                let mut ok = false;
                for i in 0..(ctx.accounts.config.accepted_spl_mint_count as usize) {
                    if ctx.accounts.config.accepted_spl_mints[i] == mint {
                        ok = true;
                        break;
                    }
                }
                require!(ok, PresaleError::UnsupportedSPLMint);

                // Transfer SPL using Token program
                let cpi_accounts = Transfer {
                    from: payment_acc.to_account_info(),
                    to: ctx.accounts.treasury_token_account.to_account_info(),
                    authority: ctx.accounts.payer.to_account_info(),
                };
                let cpi_program = ctx.accounts.token_program.to_account_info();
                token::transfer(CpiContext::new(cpi_program, cpi_accounts), amount_paid)?;
            }
        }

        emit!(ContributionRecorded {
            contributor: ctx.accounts.payer.key(),
            usd_value,
            tokens_reserved: tokens,
            phase: sale.phase as u8,
            tx_hash: [0u8; 32]
        });

        Ok(())
    }

    pub fn claim(ctx: Context<Claim>) -> Result<()> {
        let contributor = &mut ctx.accounts.contributor;
        let now = Clock::get()?.unix_timestamp as u64;
        let start = contributor.vesting_start_ts;
        require!(start > 0, PresaleError::NoVesting);

        let elapsed_days = (now - start) / 86400u64;
        let days = contributor.vesting_days.min(elapsed_days as u64);

        let total = contributor
            .claimable_tokens
            .checked_add(contributor.claimed_tokens)
            .ok_or(PresaleError::Overflow)?;
        let daily_bps = contributor.daily_release_bps as u128;
        let mut vested = 0u128;
        if days > 0 {
            vested = (total as u128 * daily_bps * days as u128) / 10000u128;
        }

        let vested_u64 = vested as u64;
        let claimable = vested_u64
            .checked_sub(contributor.claimed_tokens)
            .unwrap_or(0);
        require!(claimable > 0, PresaleError::NothingToClaim);

        // Transfer tokens (assumes program has token vault funded)
        // TODO: implement CPI to transfer token from vault to recipient

        contributor.claimed_tokens = contributor
            .claimed_tokens
            .checked_add(claimable)
            .ok_or(PresaleError::Overflow)?;

        emit!(VestingClaimed {
            contributor: ctx.accounts.payer.key(),
            amount: claimable,
            timestamp: now
        });

        Ok(())
    }

    pub fn withdraw_funds(ctx: Context<WithdrawFunds>) -> Result<()> {
        // Only multisig allowed — enforced by signer requirement on config.owner
        let amount = **ctx.accounts.escrow.to_account_info().lamports.borrow();
        **ctx
            .accounts
            .escrow
            .to_account_info()
            .try_borrow_mut_lamports()? -= amount;
        **ctx
            .accounts
            .treasury
            .to_account_info()
            .try_borrow_mut_lamports()? += amount;
        emit!(FundsTransferredToTreasury {
            amount,
            currency: 0u8,
            tx_hash: [0u8; 32]
        });
        Ok(())
    }

    pub fn pause(ctx: Context<AdminToggle>) -> Result<()> {
        let cfg = &mut ctx.accounts.config;
        cfg.paused = true;
        emit!(PresalePaused {});
        Ok(())
    }

    pub fn unpause(ctx: Context<AdminToggle>) -> Result<()> {
        let cfg = &mut ctx.accounts.config;
        cfg.paused = false;
        emit!(PresaleUnpaused {});
        Ok(())
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Attestation {
    pub usd_value: u64,
    pub nonce: u64,
    pub signature: [u8; 64],
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct InitializeParams {
    pub token_mint: Pubkey,
    pub treasury: Pubkey,
    pub total_presale_tokens: u64,
    pub private_allocation: u64,
    pub public_allocation: u64,
    pub presale_price_usd: f64,
    pub presale_price_usd_micro: u64,
    pub max_per_wallet_usd: u64,
    pub min_buy_usd: u64,
    pub accepted_spl_mints: [Pubkey; 4],
    pub daily_release_bps: u16,
    pub vesting_days: u16,
    pub fee_bps: u16,
    pub oracle_pubkey: Pubkey,
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = payer, space = 8 + PresaleConfig::SIZE, seeds = [b"presale-config", token_mint.key().as_ref()], bump)]
    pub config: Account<'info, PresaleConfig>,
    /// CHECK: token mint used as seed for PDA
    pub token_mint: UncheckedAccount<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Buy<'info> {
    #[account(mut, has_one = treasury)]
    pub config: Account<'info, PresaleConfig>,
    #[account(mut)]
    pub sale_state: Account<'info, SaleState>,
    #[account(init_if_needed, payer = payer, space = 8 + Contributor::SIZE, seeds = [b"contributor", payer.key.as_ref()], bump)]
    pub contributor: Account<'info, Contributor>,
    /// CHECK: oracle account - optional Pyth account or price feed
    pub oracle: UncheckedAccount<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK: treasury lamports account
    #[account(mut)]
    pub treasury: UncheckedAccount<'info>,
    /// SPL payment token account (if paying with SPL)
    #[account(mut)]
    pub payment_token_account: Option<Account<'info, TokenAccount>>,
    /// treasury token account for SPL
    #[account(mut)]
    pub treasury_token_account: Option<Account<'info, TokenAccount>>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Claim<'info> {
    pub config: Account<'info, PresaleConfig>,
    #[account(mut, seeds = [b"contributor", payer.key.as_ref()], bump)]
    pub contributor: Account<'info, Contributor>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct WithdrawFunds<'info> {
    #[account(mut, has_one = owner)]
    pub config: Account<'info, PresaleConfig>,
    /// CHECK: multisig owner
    pub owner: Signer<'info>,
    #[account(mut)]
    pub escrow: UncheckedAccount<'info>,
    #[account(mut)]
    pub treasury: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct AdminToggle<'info> {
    #[account(mut, has_one = owner)]
    pub config: Account<'info, PresaleConfig>,
    pub owner: Signer<'info>,
}

#[account]
pub struct PresaleConfig {
    pub owner: Pubkey,
    pub token_mint: Pubkey,
    pub treasury: Pubkey,
    pub total_presale_tokens: u64,
    pub private_allocation: u64,
    pub public_allocation: u64,
    pub presale_price_usd_micro: u64,
    pub presale_price_usd: f64,
    pub max_per_wallet_usd: u64,
    pub min_buy_usd: u64,
    pub accepted_spl_mints: [Pubkey; 4],
    pub accepted_spl_mint_count: u8,
    pub oracle_pubkey: Pubkey,
    pub daily_release_bps: u16,
    pub vesting_days: u16,
    pub fee_bps: u16,
    pub paused: bool,
}

impl PresaleConfig {
    // rough size: 3 pubkeys (owner, token_mint, treasury) = 96
    // plus u64 fields and extras; include 4 additional pubkeys for accepted_spl_mints
    pub const SIZE: usize = 96 + 8 * 7 + 128 + 1 + 2 + 2 + 2 + 1; // approximate
}

#[account]
pub struct SaleState {
    pub sold_tokens: u64,
    pub phase: u8, // 0 private, 1 public
}

impl SaleState {
    pub const SIZE: usize = 8 + 1;
}

#[account]
pub struct Contributor {
    pub contribution_amount_native: u64,
    pub contribution_usd: u64,
    pub claimable_tokens: u64,
    pub claimed_tokens: u64,
    pub vesting_start_ts: u64,
    pub daily_release_bps: u16,
    pub vesting_days: u16,
}

impl Contributor {
    pub const SIZE: usize = 8 * 5 + 2 + 2;
}

#[event]
pub struct ContributionRecorded {
    pub contributor: Pubkey,
    pub usd_value: u64,
    pub tokens_reserved: u64,
    pub phase: u8,
    pub tx_hash: [u8; 32],
}

#[event]
pub struct FundsTransferredToTreasury {
    pub amount: u64,
    pub currency: u8,
    pub tx_hash: [u8; 32],
}

#[event]
pub struct VestingClaimed {
    pub contributor: Pubkey,
    pub amount: u64,
    pub timestamp: u64,
}

#[event]
pub struct PresalePaused {}

#[event]
pub struct PresaleUnpaused {}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum Currency {
    SOL,
    SPL,
}

fn verify_attestation(
    attestation: &Attestation,
    payer: &Pubkey,
    oracle_pubkey: &Pubkey,
) -> Result<u64> {
    // Construct message: [payer (32 bytes), nonce (8 bytes), usd_value (8 bytes)]
    let mut msg = vec![];
    msg.extend_from_slice(payer.as_ref());
    msg.extend_from_slice(&attestation.nonce.to_le_bytes());
    msg.extend_from_slice(&attestation.usd_value.to_le_bytes());

    // Verify ed25519 signature
    let oracle_ed25519 = Ed25519PubKey::from_bytes(&oracle_pubkey.to_bytes())
        .map_err(|_| error!(PresaleError::InvalidOracleKey))?;
    let sig = Signature::from_bytes(&attestation.signature);
    oracle_ed25519
        .verify(&msg, &sig)
        .map_err(|_| error!(PresaleError::InvalidAttestationSignature))?;

    Ok(attestation.usd_value)
}

fn get_usd_value_from_pyth(lamports: u64, pyth_account: &UncheckedAccount) -> Result<u64> {
    // Parse Pyth price account
    let data = pyth_account.to_account_info().data.borrow();
    if data.len() < std::mem::size_of::<Price>() {
        return Err(error!(PresaleError::OracleMissing));
    }

    // Decode Pyth price account structure (cast to Price struct)
    let price_account = unsafe { &*(data.as_ptr() as *const Price) };
    let price = price_account.agg.price;
    let expo = price_account.expo;

    // Check if price is recent (within ~300 seconds)
    let now = Clock::get()?.unix_timestamp as u64;
    if now > (price_account.agg.publish_time as u64) + 300 {
        return Err(error!(PresaleError::OracleMissing));
    }

    // Compute USD value: (lamports * price) / 10^(expo + 9)
    let multiplied = (lamports as i128)
        .checked_mul(price as i128)
        .ok_or(error!(PresaleError::Overflow))?;
    let expo_adjusted = if expo >= 0 {
        multiplied
            .checked_mul(10i128.pow(expo as u32))
            .ok_or(error!(PresaleError::Overflow))?
    } else {
        multiplied / 10i128.pow((-expo) as u32)
    };
    let usd = expo_adjusted / 1_700_000_000i128;
    Ok(usd as u64)
}

#[error_code]
pub enum PresaleError {
    #[msg("Per-wallet cap exceeded")]
    PerWalletCapExceeded,
    #[msg("Phase cap exceeded")]
    PhaseCapExceeded,
    #[msg("Math overflow")]
    Overflow,
    #[msg("Paused")]
    Paused,
    #[msg("Oracle missing or stale")]
    OracleMissing,
    #[msg("Minimum buy not met")]
    MinBuyNotMet,
    #[msg("Payment token account missing for SPL payment")]
    PaymentAccountMissing,
    #[msg("Unsupported SPL mint for payment")]
    UnsupportedSPLMint,
    #[msg("Invalid oracle key format")]
    InvalidOracleKey,
    #[msg("Invalid attestation signature")]
    InvalidAttestationSignature,
    #[msg("Nothing to claim")]
    NothingToClaim,
    #[msg("No vesting started")]
    NoVesting,
}

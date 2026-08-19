// ═══════════════════════════════════════════════════════════
// Solana Claim Program — Anchor-based token claims
// Handles SPL token distribution with Merkle verification
// ═══════════════════════════════════════════════════════════

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("CLaiM111111111111111111111111111111111111111");

#[program]
pub mod claim_platform {
    use super::*;

    // ── Initialize a new claim campaign ──
    pub fn initialize_campaign(
        ctx: Context<InitializeCampaign>,
        merkle_root: [u8; 32],
        deadline: i64,
        total_allocation: u64,
    ) -> Result<()> {
        let campaign = &mut ctx.accounts.campaign;
        campaign.authority = ctx.accounts.authority.key();
        campaign.merkle_root = merkle_root;
        campaign.deadline = deadline;
        campaign.total_allocation = total_allocation;
        campaign.total_claimed = 0;
        campaign.vault = ctx.accounts.vault.key();
        campaign.mint = ctx.accounts.mint.key();
        campaign.is_paused = false;
        campaign.bump = ctx.bumps.campaign;
        Ok(())
    }

    // ── Claim tokens with Merkle proof ──
    pub fn claim(
        ctx: Context<Claim>,
        amount: u64,
        merkle_proof: Vec<[u8; 32]>,
    ) -> Result<()> {
        let campaign = &mut ctx.accounts.campaign;
        let clock = Clock::get()?;

        // Check not paused
        require!(!campaign.is_paused, ErrorCode::CampaignPaused);

        // Check deadline
        require!(clock.unix_timestamp <= campaign.deadline, ErrorCode::DeadlinePassed);

        // Check not already claimed (claimant PDA exists only after claim)
        // The claimant account acts as the "already claimed" flag
        let claimant = &mut ctx.accounts.claimant;
        require!(!claimant.claimed, ErrorCode::AlreadyClaimed);

        // Verify Merkle proof
        let leaf = solana_program::keccak::hashv(&[
            &ctx.accounts.claimer.key().to_bytes(),
            &amount.to_le_bytes(),
        ]).0;

        let verified = verify_merkle_proof(&merkle_proof, &leaf, &campaign.merkle_root);
        require!(verified, ErrorCode::InvalidProof);

        // Mark as claimed
        claimant.claimed = true;
        claimant.amount = amount;
        claimant.claimed_at = clock.unix_timestamp;

        // Transfer SPL tokens from vault to claimer
        let transfer_cpi_accounts = Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.claimer_token_account.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        token::transfer(
            CpiContext::new(cpi_program, transfer_cpi_accounts),
            amount,
        )?;

        // Update campaign total
        campaign.total_claimed = campaign.total_claimed.checked_add(amount)
            .ok_or(ErrorCode::Overflow)?;

        emit!(ClaimedEvent {
            user: ctx.accounts.claimer.key(),
            amount,
        });

        Ok(())
    }

    // ── Pause campaign (admin only) ──
    pub fn pause(ctx: Context<AdminAction>) -> Result<()> {
        ctx.accounts.campaign.is_paused = true;
        Ok(())
    }

    // ── Unpause campaign (admin only) ──
    pub fn unpause(ctx: Context<AdminAction>) -> Result<()> {
        ctx.accounts.campaign.is_paused = false;
        Ok(())
    }

    // ── Emergency withdraw (admin only) ──
    pub fn emergency_withdraw(ctx: Context<EmergencyWithdraw>) -> Result<()> {
        let campaign = &ctx.accounts.campaign;
        require_keys_eq!(campaign.authority, ctx.accounts.authority.key());

        let balance = ctx.accounts.vault.amount;
        let transfer_cpi_accounts = Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.admin_token_account.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };
        token::transfer(
            CpiContext::new(ctx.accounts.token_program.to_account_info(), transfer_cpi_accounts),
            balance,
        )?;
        Ok(())
    }
}

// ── Accounts ──

#[account]
#[derive(Default)]
pub struct Campaign {
    pub authority: Pubkey,
    pub merkle_root: [u8; 32],
    pub deadline: i64,
    pub total_allocation: u64,
    pub total_claimed: u64,
    pub vault: Pubkey,
    pub mint: Pubkey,
    pub is_paused: bool,
    pub bump: u8,
}

#[account]
#[derive(Default)]
pub struct Claimant {
    pub claimed: bool,
    pub amount: u64,
    pub claimed_at: i64,
}

// ── Events ──

#[event]
pub struct ClaimedEvent {
    pub user: Pubkey,
    pub amount: u64,
}

// ── Instruction contexts ──

#[derive(Accounts)]
pub struct InitializeCampaign<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 32 + 8 + 8 + 8 + 32 + 32 + 1 + 1,
    )]
    pub campaign: Account<'info, Campaign>,

    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(mut)]
    pub vault: Account<'info, TokenAccount>,

    pub mint: Account<'info, Mint>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Claim<'info> {
    #[account(mut, has_one = vault, has_one = mint)]
    pub campaign: Account<'info, Campaign>,

    #[account(
        init_if_needed,
        payer = claimer,
        space = 8 + 1 + 8 + 8,
        seeds = [b"claimant", campaign.key().as_ref(), claimer.key().as_ref()],
        bump,
    )]
    pub claimant: Account<'info, Claimant>,

    #[account(mut)]
    pub claimer: Signer<'info>,

    #[account(mut)]
    pub vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub claimer_token_account: Account<'info, TokenAccount>,

    pub mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct AdminAction<'info> {
    #[account(mut, has_one = authority)]
    pub campaign: Account<'info, Campaign>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct EmergencyWithdraw<'info> {
    #[account(has_one = authority, has_one = vault)]
    pub campaign: Account<'info, Campaign>,
    pub authority: Signer<'info>,
    #[account(mut)]
    pub vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub admin_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

// ── Errors ──

#[error_code]
pub enum ErrorCode {
    #[msg("Campaign is paused")]
    CampaignPaused,
    #[msg("Claim deadline has passed")]
    DeadlinePassed,
    #[msg("Already claimed")]
    AlreadyClaimed,
    #[msg("Invalid Merkle proof")]
    InvalidProof,
    #[msg("Arithmetic overflow")]
    Overflow,
}

// ── Merkle verification ──

fn verify_merkle_proof(proof: &[[u8; 32]], leaf: &[u8; 32], root: &[u8; 32]) -> bool {
    let mut computed = *leaf;
    for sibling in proof {
        if computed < *sibling {
            computed = solana_program::keccak::hashv(&[&computed, sibling]).0;
        } else {
            computed = solana_program::keccak::hashv(&[sibling, &computed]).0;
        }
    }
    computed == *root
}

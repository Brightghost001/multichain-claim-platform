-- ═══════════════════════════════════════════════════════════
-- Multi-Chain Claim Platform — PostgreSQL Schema
-- ═══════════════════════════════════════════════════════════

-- ── Users ──
CREATE TABLE IF NOT EXISTS users (
    id              SERIAL PRIMARY KEY,
    wallet_address  VARCHAR(128),
    chain           VARCHAR(32) NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    last_seen       TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(wallet_address, chain)
);

-- ── Campaigns ──
CREATE TABLE IF NOT EXISTS campaigns (
    id              VARCHAR(64) PRIMARY KEY,
    name            VARCHAR(256) NOT NULL,
    token_name      VARCHAR(128) NOT NULL,
    token_symbol   VARCHAR(32)  NOT NULL,
    chain           VARCHAR(32) NOT NULL,
    claim_contract  VARCHAR(128),
    merkle_root     VARCHAR(128),
    start_time      TIMESTAMPTZ NOT NULL,
    end_time        TIMESTAMPTZ NOT NULL,
    status          VARCHAR(16) DEFAULT 'draft',  -- draft|active|paused|ended
    total_allocation NUMERIC(78, 0) DEFAULT 0,
    total_claimed   NUMERIC(78, 0) DEFAULT 0,
    total_eligible  INTEGER DEFAULT 0,
    description     TEXT,
    logo_url        VARCHAR(512),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Eligibility ──
CREATE TABLE IF NOT EXISTS eligibility (
    id              SERIAL PRIMARY KEY,
    campaign_id     VARCHAR(64) NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    wallet_address  VARCHAR(128) NOT NULL,
    chain           VARCHAR(32) NOT NULL,
    amount          NUMERIC(78, 0) NOT NULL,
    merkle_proof    JSONB,                      -- array of hex strings
    claimed         BOOLEAN DEFAULT FALSE,
    claimed_at      TIMESTAMPTZ,
    tx_hash         VARCHAR(128),
    UNIQUE(campaign_id, wallet_address, chain)
);

-- ── Claims ──
CREATE TABLE IF NOT EXISTS claims (
    id              SERIAL PRIMARY KEY,
    campaign_id     VARCHAR(64) NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    wallet_address  VARCHAR(128) NOT NULL,
    chain           VARCHAR(32) NOT NULL,
    amount          NUMERIC(78, 0) NOT NULL,
    tx_hash         VARCHAR(128),
    status          VARCHAR(16) DEFAULT 'pending',  -- pending|confirmed|failed
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    confirmed_at    TIMESTAMPTZ
);

-- ── Indexes ──
CREATE INDEX IF NOT EXISTS idx_eligibility_campaign ON eligibility(campaign_id);
CREATE INDEX IF NOT EXISTS idx_eligibility_wallet  ON eligibility(wallet_address);
CREATE INDEX IF NOT EXISTS idx_eligibility_claimed ON eligibility(campaign_id, claimed);
CREATE INDEX IF NOT EXISTS idx_claims_campaign     ON claims(campaign_id);
CREATE INDEX IF NOT EXISTS idx_claims_status       ON claims(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_status    ON campaigns(status);

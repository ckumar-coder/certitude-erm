-- Schema v22: Per-company email settings + self-service password reset
-- All changes are additive (IF NOT EXISTS / no destructive operations).

-- ── Per-company SMTP configuration (Task #7) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS company_email_settings (
    id                  SERIAL PRIMARY KEY,
    company_id          INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    inherit_from_parent BOOLEAN NOT NULL DEFAULT FALSE,
    smtp_host           VARCHAR(255),
    smtp_port           INTEGER DEFAULT 587,
    smtp_secure         BOOLEAN NOT NULL DEFAULT TRUE,   -- TRUE = TLS/STARTTLS
    smtp_user           VARCHAR(255),
    smtp_password_enc   TEXT,                             -- AES-256-GCM encrypted
    from_name           VARCHAR(255),
    from_email          VARCHAR(255),
    reply_to            VARCHAR(255),
    verified_at         TIMESTAMPTZ,                     -- set after successful test send
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (company_id)
);

-- ── Self-service password reset tokens (Task #34) ────────────────────────────
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(255) NOT NULL UNIQUE,  -- SHA-256 hash of the raw token
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ,                   -- set when redeemed
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prt_token_hash  ON password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_prt_user_id     ON password_reset_tokens(user_id);

-- ── PASSWORD_RESET_MODE column on companies (Task #34 feature flag) ──────────
ALTER TABLE companies
    ADD COLUMN IF NOT EXISTS password_reset_mode VARCHAR(20) NOT NULL DEFAULT 'self_service';
-- Allowed values: 'self_service' | 'it_managed'

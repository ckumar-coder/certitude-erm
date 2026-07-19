-- Schema v21: Multi-Factor Authentication (TOTP)
--
-- Adds TOTP MFA columns to the users table and a pre_auth flag to
-- sessions so that partially-authenticated (password OK, MFA pending)
-- sessions cannot access protected endpoints.

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS mfa_secret   VARCHAR(255),
    ADD COLUMN IF NOT EXISTS mfa_enabled  BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS mfa_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- pre_auth = TRUE marks a session that has passed password check but
-- has NOT yet completed TOTP verification. These sessions are only
-- valid for /api/auth/mfa/* endpoints.
ALTER TABLE sessions
    ADD COLUMN IF NOT EXISTS pre_auth BOOLEAN NOT NULL DEFAULT FALSE;

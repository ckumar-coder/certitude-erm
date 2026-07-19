-- schema_v25_disclaimer.sql
-- Adds disclaimer_accepted_at to users so the first-use legal
-- acknowledgement is stored once per user and never shown again.

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS disclaimer_accepted_at TIMESTAMPTZ;

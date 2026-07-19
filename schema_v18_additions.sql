-- schema_v18_additions.sql
-- V18: Add industry field to companies for first-time setup wizard.

ALTER TABLE companies
    ADD COLUMN IF NOT EXISTS industry VARCHAR(100);

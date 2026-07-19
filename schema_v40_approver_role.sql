-- schema_v40_approver_role.sql
-- Adds the 'Approver' role to user_companies and updates related constraints.
-- The departments TEXT[] column already exists (added in v19).
-- This migration only widens the role check constraint and updates
-- the training_videos role_level check to include 'Approver'.

-- ── 1. Extend the role check constraint on user_companies ─────────────────────
ALTER TABLE user_companies DROP CONSTRAINT IF EXISTS user_companies_role_check;
ALTER TABLE user_companies ADD CONSTRAINT user_companies_role_check
    CHECK (role IN ('Admin', 'Submitter', 'Approver', 'Manager', 'CRO', 'Viewer', 'Consultant CRO'));

-- ── 2. Add Approver workflow columns to risks ─────────────────────────────────
--    approver_email: who approved at the Approver layer
--    approved_at_approver: timestamp of that approval
ALTER TABLE risks
    ADD COLUMN IF NOT EXISTS approver_email       VARCHAR(255),
    ADD COLUMN IF NOT EXISTS approved_at_approver TIMESTAMPTZ;

-- ── 3. Extend the role_level check on training_videos ────────────────────────
--    Approver sits between Submitter and Manager in the content hierarchy.
ALTER TABLE training_videos DROP CONSTRAINT IF EXISTS training_videos_role_level_check;
ALTER TABLE training_videos ADD CONSTRAINT training_videos_role_level_check
    CHECK (role_level IN ('Submitter', 'Approver', 'Viewer', 'Manager', 'CRO', 'Admin'));

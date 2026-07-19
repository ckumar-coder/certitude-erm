-- schema_v12_additions.sql
-- CSO role + risk acceptance workflow
-- Safe to re-run (IF NOT EXISTS / OR REPLACE guards throughout).

-- 1. Extend the role check constraint on user_companies to include 'CSO'.
--    PostgreSQL requires dropping the old constraint and recreating it.
ALTER TABLE user_companies DROP CONSTRAINT IF EXISTS user_companies_role_check;
ALTER TABLE user_companies ADD CONSTRAINT user_companies_role_check
    CHECK (role IN ('Admin', 'Manager', 'Viewer', 'CSO'));

-- 2. Risk acceptance tracking columns.
--    cso_acceptance_status: NULL = not applicable, 'pending_cso' = awaiting CSO,
--                           'accepted' = CSO has formally accepted (board approval confirmed).
ALTER TABLE risks ADD COLUMN IF NOT EXISTS cso_acceptance_status VARCHAR(20) DEFAULT NULL;
ALTER TABLE risks ADD COLUMN IF NOT EXISTS cso_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE risks ADD COLUMN IF NOT EXISTS cso_actioned_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE risks ADD COLUMN IF NOT EXISTS cso_notes TEXT DEFAULT NULL;

-- 3. Back-fill: any existing 'Accept' risks that pre-date this workflow get
--    marked as pending so the CSO can review them.
UPDATE risks
SET cso_acceptance_status = 'pending_cso'
WHERE treatment_strategy = 'Accept'
  AND cso_acceptance_status IS NULL;

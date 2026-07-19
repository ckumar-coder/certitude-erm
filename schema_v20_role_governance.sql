-- ============================================================
-- Schema v20 — Role Governance Redesign
-- ============================================================
-- Replaces the 4-role model (Admin, Manager, Viewer, CSO) with a
-- 5-role model (Admin, Submitter, Manager, CRO, Viewer).
--
-- Key changes:
--   1. CSO role eliminated — absorbed into CRO
--   2. New roles: Submitter (create only) and CRO (approve all)
--   3. cso_* columns on `risks` renamed to cro_*
--   4. Existing CSO users migrated to CRO
--
-- Non-destructive: no data is deleted.
-- Idempotent: safe to run multiple times.
-- NOTE: no explicit BEGIN/COMMIT — migrate-all.js wraps each file
-- in its own transaction.
-- ============================================================

-- ── 1. Drop the old role CHECK constraint ────────────────────
ALTER TABLE user_companies
    DROP CONSTRAINT IF EXISTS user_companies_role_check;

-- ── 2. Migrate existing CSO users → CRO FIRST ────────────────
--   Must happen before adding the new constraint, otherwise
--   existing CSO rows would violate the new CHECK immediately.
UPDATE user_companies
   SET role = 'CRO'
 WHERE role = 'CSO';

-- ── 3. Add the new CHECK constraint with all 5 roles ─────────
--   Now safe — no CSO rows remain.
ALTER TABLE user_companies
    ADD CONSTRAINT user_companies_role_check
    CHECK (role IN ('Admin', 'Submitter', 'Manager', 'CRO', 'Viewer'));

-- ── 4. Rename cso_* columns on risks → cro_* (idempotent) ────
--   Each RENAME is wrapped in a DO block so re-running this file
--   after the columns are already renamed is a safe no-op.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'risks'
               AND column_name = 'cso_acceptance_status') THEN
        ALTER TABLE risks RENAME COLUMN cso_acceptance_status TO cro_acceptance_status;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'risks'
               AND column_name = 'cso_user_id') THEN
        ALTER TABLE risks RENAME COLUMN cso_user_id TO cro_user_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'risks'
               AND column_name = 'cso_actioned_at') THEN
        ALTER TABLE risks RENAME COLUMN cso_actioned_at TO cro_actioned_at;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'risks'
               AND column_name = 'cso_notes') THEN
        ALTER TABLE risks RENAME COLUMN cso_notes TO cro_notes;
    END IF;
END $$;

-- ── 5. Update existing 'pending_cso' values → 'pending_cro' ──
UPDATE risks
   SET cro_acceptance_status = 'pending_cro'
 WHERE cro_acceptance_status = 'pending_cso';

-- ── 6. Update existing 'accepted' label (no change needed) ───
--   'accepted' is the terminal state — label is role-agnostic.

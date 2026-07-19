-- schema_v50_map_constraints.sql
-- S-02/D-03: Add company_id to mitigations + UNIQUE(company_id, mitigation_uid)
-- S-03:      CHECK constraint — compensatory_controls_in_place required when Deferred

-- Step 0: ensure mitigation_uid/action_owner/root_cause exist (idempotent safety net
-- for instances where schema_v41_map_enhancements.sql was not in migrate-all.js)
ALTER TABLE mitigations
    ADD COLUMN IF NOT EXISTS mitigation_uid TEXT,
    ADD COLUMN IF NOT EXISTS action_owner   TEXT,
    ADD COLUMN IF NOT EXISTS root_cause     TEXT;

-- Step 1: add company_id column (nullable initially so the backfill can run)
ALTER TABLE mitigations
    ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id);

-- Step 2: backfill from the parent risk
UPDATE mitigations m
SET company_id = r.company_id
FROM risks r
WHERE r.id = m.risk_id
  AND m.company_id IS NULL;

-- Step 3: enforce NOT NULL now that data is clean
ALTER TABLE mitigations
    ALTER COLUMN company_id SET NOT NULL;

-- Step 4: UNIQUE constraint prevents duplicate MAP UIDs within a company
ALTER TABLE mitigations
    DROP CONSTRAINT IF EXISTS mitigations_uid_per_company;
ALTER TABLE mitigations
    ADD CONSTRAINT mitigations_uid_per_company
    UNIQUE (company_id, mitigation_uid);

-- Step 5: DB-level CHECK — compensatory_controls_in_place must be 'Yes' or 'No' when Deferred
-- NOT VALID skips checking existing rows (pre-fix data may have nulls); new rows are enforced.
ALTER TABLE mitigations
    DROP CONSTRAINT IF EXISTS mitigations_deferred_comp_ctrl_check;
ALTER TABLE mitigations
    ADD CONSTRAINT mitigations_deferred_comp_ctrl_check
    CHECK (status != 'Deferred' OR compensatory_controls_in_place IN ('Yes', 'No'))
    NOT VALID;

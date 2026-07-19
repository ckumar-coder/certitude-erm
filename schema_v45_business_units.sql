-- schema_v45_business_units.sql
-- Introduces multi-Business-Unit support (v2.0.0 architecture).
--
-- Three changes:
--   1. companies.has_business_units  — mode toggle (BU Mode vs Simple Mode)
--   2. business_units table          — BU records per company (BU Mode only)
--   3. departments.business_unit_id  — links a dept to its BU (BU Mode)
--   4. departments.parent_dept_id    — makes a dept a sub-department (Simple Mode)
--   5. user_companies.business_unit_ids — BU-level scope for BU Managers
--
-- All changes are idempotent (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).
-- Existing data is unaffected: all new columns default to NULL / FALSE / {}.

-- ── 1. Company mode toggle ────────────────────────────────────────────────────
ALTER TABLE companies
    ADD COLUMN IF NOT EXISTS has_business_units BOOLEAN NOT NULL DEFAULT FALSE;

-- ── 2. Business Units table ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS business_units (
    id          SERIAL PRIMARY KEY,
    company_id  INT          NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name        VARCHAR(120) NOT NULL,
    code        VARCHAR(20)  NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_business_units_company
    ON business_units (company_id);

-- ── 3. departments.business_unit_id ──────────────────────────────────────────
--    Set for BU Mode departments; NULL for Simple Mode / legacy departments.
ALTER TABLE departments
    ADD COLUMN IF NOT EXISTS business_unit_id INT
        REFERENCES business_units(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_departments_business_unit
    ON departments (business_unit_id);

-- ── 4. departments.parent_dept_id ─────────────────────────────────────────────
--    Set for sub-departments (Simple Mode); NULL for top-level departments.
ALTER TABLE departments
    ADD COLUMN IF NOT EXISTS parent_dept_id INT
        REFERENCES departments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_departments_parent
    ON departments (parent_dept_id);

-- ── 5. user_companies.business_unit_ids ──────────────────────────────────────
--    Non-empty = BU Manager; scoping resolves all depts under listed BUs.
ALTER TABLE user_companies
    ADD COLUMN IF NOT EXISTS business_unit_ids TEXT[] NOT NULL DEFAULT '{}';

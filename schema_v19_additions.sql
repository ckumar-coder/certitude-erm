-- ============================================================
-- Schema v19 — Multi-department support for Manager role
-- ============================================================
-- Replaces the single user_companies.department VARCHAR(100) with
-- a departments TEXT[] array, allowing a Manager to be scoped to
-- two or more departments simultaneously.
--
-- Migration is non-destructive: the old column is kept and its
-- value is copied into the array so existing single-dept Managers
-- continue to work unchanged.
-- ============================================================

-- 1. Add the new array column (nullable = no department restriction)
ALTER TABLE user_companies
    ADD COLUMN IF NOT EXISTS departments TEXT[] DEFAULT NULL;

-- 2. Back-fill from the old column so no existing user loses access
UPDATE user_companies
   SET departments = ARRAY[department]
 WHERE department IS NOT NULL
   AND (departments IS NULL OR array_length(departments, 1) IS NULL);

-- 3. Index for fast membership checks (GIN index on array)
CREATE INDEX IF NOT EXISTS idx_uc_departments
    ON user_companies USING GIN (departments)
    WHERE departments IS NOT NULL;

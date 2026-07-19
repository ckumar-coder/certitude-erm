-- ============================================================
-- Schema v17 — Group / Subsidiary structure
-- ============================================================
-- Activates the parent_company_id FK that has existed since v2
-- but was unused. Adds two new columns:
--   companies.max_group_access_scope  — what a subsidiary allows group users to see
--   user_companies.group_access_scope — what the parent grants this user at group level
-- Also adds is_group_view to sessions so the server knows whether
-- the user's active context is the consolidated group dashboard.
-- ============================================================

-- 1. max_group_access_scope on companies
--    Default 'full' so existing companies behave as before.
--    Allowed values: 'consolidated_only', 'view', 'full'
ALTER TABLE companies
    ADD COLUMN IF NOT EXISTS max_group_access_scope VARCHAR(20) NOT NULL DEFAULT 'full'
    CHECK (max_group_access_scope IN ('consolidated_only', 'view', 'full'));

-- 2. group_access_scope on user_companies
--    'none'             = regular single-company member (default, no group access)
--    'consolidated_only'= sees the consolidated dashboard numbers only
--    'view'             = consolidated dashboard + can read subsidiary records
--    'full'             = consolidated dashboard + full role on each subsidiary
ALTER TABLE user_companies
    ADD COLUMN IF NOT EXISTS group_access_scope VARCHAR(20) NOT NULL DEFAULT 'none'
    CHECK (group_access_scope IN ('none', 'consolidated_only', 'view', 'full'));

-- 3. is_group_view on sessions
--    True when the user's active context is the consolidated group view
--    (as opposed to being scoped to a single company).
ALTER TABLE sessions
    ADD COLUMN IF NOT EXISTS is_group_view BOOLEAN NOT NULL DEFAULT false;

-- 4. Index to help look up subsidiaries quickly
CREATE INDEX IF NOT EXISTS idx_companies_parent ON companies (parent_company_id)
    WHERE parent_company_id IS NOT NULL;

-- 5. Index on group_access_scope for fast group-user lookups
CREATE INDEX IF NOT EXISTS idx_uc_group_scope ON user_companies (group_access_scope)
    WHERE group_access_scope <> 'none';

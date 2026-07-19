-- schema_v26_departments_partial_unique.sql
--
-- Replace the full unique constraints on departments(company_id, code) and
-- departments(company_id, name) with partial unique indexes that only cover
-- active rows (active = TRUE).
--
-- This allows a deactivated department code or name to be reused by a new
-- active department, which is the correct product behaviour.

-- Drop the old full unique constraints (PostgreSQL auto-names them)
ALTER TABLE departments DROP CONSTRAINT IF EXISTS departments_company_id_code_key;
ALTER TABLE departments DROP CONSTRAINT IF EXISTS departments_company_id_name_key;

-- Partial unique index: codes must be unique across active departments only
CREATE UNIQUE INDEX IF NOT EXISTS departments_company_code_active_uidx
    ON departments (company_id, code)
    WHERE active = TRUE;

-- Partial unique index: names must be unique across active departments only
CREATE UNIQUE INDEX IF NOT EXISTS departments_company_name_active_uidx
    ON departments (company_id, name)
    WHERE active = TRUE;

-- schema_v53_company_address.sql
-- Adds address column to companies table (BUG-05)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS address TEXT;

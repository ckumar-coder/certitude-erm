-- schema_v38_company_profile.sql
-- Adds company profile fields: industry, country, regulatory body,
-- fiscal year end, company type, and a short description.

ALTER TABLE companies
    ADD COLUMN IF NOT EXISTS industry        VARCHAR(100),
    ADD COLUMN IF NOT EXISTS company_type    VARCHAR(100),
    ADD COLUMN IF NOT EXISTS country         VARCHAR(100),
    ADD COLUMN IF NOT EXISTS regulatory_body VARCHAR(200),
    ADD COLUMN IF NOT EXISTS fiscal_year_end VARCHAR(20),
    ADD COLUMN IF NOT EXISTS description     TEXT;

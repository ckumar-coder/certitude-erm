-- schema_v51_role_constraint.sql
-- S-04: Update user_companies.role CHECK constraint to include all current roles.
--
-- The base schema (schema_v2.sql) only listed ('Admin', 'Manager', 'Viewer').
-- Newer roles were added at the application layer but the DB constraint was
-- never updated — meaning the DB does not enforce the full role vocabulary.
-- This migration drops the stale constraint and adds the correct one.
--
-- Current roles: Admin, Manager, Viewer, Risk Champion, CRO, Consultant CRO, Approver

ALTER TABLE user_companies
    DROP CONSTRAINT IF EXISTS user_companies_role_check;

ALTER TABLE user_companies
    ADD CONSTRAINT user_companies_role_check
    CHECK (role IN ('Admin', 'Manager', 'Viewer', 'Risk Champion', 'CRO', 'Consultant CRO', 'Approver'))
    NOT VALID;

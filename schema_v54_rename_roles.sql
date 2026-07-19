-- schema_v54_rename_roles.sql
-- Renames 'Manager' → 'Risk Manager' and 'Approver' → 'Risk Owner'
-- across the entire database. Safe to re-run — idempotent.

-- 1. Drop any existing CHECK constraint on user_companies.role
--    (there may be one from v51 or v46 — we drop whichever exists).
DO $$
DECLARE
    v_constraint TEXT;
BEGIN
    FOR v_constraint IN
        SELECT tc.constraint_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.check_constraints cc
            ON tc.constraint_name = cc.constraint_name
         WHERE tc.table_name   = 'user_companies'
           AND tc.table_schema = 'public'
           AND tc.constraint_type = 'CHECK'
    LOOP
        EXECUTE 'ALTER TABLE user_companies DROP CONSTRAINT IF EXISTS ' || quote_ident(v_constraint);
        RAISE NOTICE 'Dropped constraint: %', v_constraint;
    END LOOP;
END $$;

-- 2. Rename existing role values.
UPDATE user_companies SET role = 'Risk Manager' WHERE role = 'Manager';
UPDATE user_companies SET role = 'Risk Owner'   WHERE role = 'Approver';

-- 3. Add new CHECK constraint with the renamed roles.
ALTER TABLE user_companies
    ADD CONSTRAINT user_companies_role_check
    CHECK (role IN (
        'Admin',
        'Risk Manager',
        'Viewer',
        'Risk Champion',
        'CRO',
        'Consultant CRO',
        'Risk Owner'
    ))
    NOT VALID;

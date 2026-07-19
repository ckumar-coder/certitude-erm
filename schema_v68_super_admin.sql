-- schema_v68_super_admin.sql
-- Adds 'Super Admin' role to the user_companies.role CHECK constraint.
-- Super Admin is a testing role with unrestricted access to all features.

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

ALTER TABLE user_companies
    ADD CONSTRAINT user_companies_role_check
    CHECK (role IN (
        'Admin',
        'Super Admin',
        'Risk Manager',
        'Viewer',
        'Risk Champion',
        'CRO',
        'Consultant CRO',
        'Risk Owner'
    ))
    NOT VALID;

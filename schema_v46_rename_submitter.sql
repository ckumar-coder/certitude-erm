-- schema_v46_rename_submitter.sql
-- Renames the 'Submitter' role to 'Risk Champion' across the entire database.
-- Safe to run on any environment — idempotent if already applied.

-- 1. Temporarily drop any CHECK constraint on user_companies.role that
--    references 'Submitter', so we can rename the data first.
DO $$
DECLARE
    v_constraint TEXT;
BEGIN
    SELECT tc.constraint_name
      INTO v_constraint
      FROM information_schema.table_constraints tc
      JOIN information_schema.check_constraints cc
        ON tc.constraint_name = cc.constraint_name
     WHERE tc.table_name   = 'user_companies'
       AND tc.table_schema = 'public'
       AND cc.check_clause LIKE '%Submitter%'
     LIMIT 1;

    IF v_constraint IS NOT NULL THEN
        EXECUTE 'ALTER TABLE user_companies DROP CONSTRAINT ' || quote_ident(v_constraint);
        RAISE NOTICE 'Dropped constraint: %', v_constraint;
    END IF;
END $$;

-- 2. Rename the role value in all existing rows.
UPDATE user_companies
   SET role = 'Risk Champion'
 WHERE role = 'Submitter';

-- 3. Add the new CHECK constraint with 'Risk Champion'.
--    Using IF NOT EXISTS pattern via DO block to stay idempotent.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
          FROM information_schema.check_constraints cc
          JOIN information_schema.table_constraints tc
            ON cc.constraint_name = tc.constraint_name
         WHERE tc.table_name   = 'user_companies'
           AND tc.table_schema = 'public'
           AND cc.check_clause LIKE '%Risk Champion%'
    ) THEN
        ALTER TABLE user_companies
            ADD CONSTRAINT user_companies_role_check
            CHECK (role IN (
                'Admin',
                'Risk Champion',
                'Approver',
                'Manager',
                'CRO',
                'Viewer',
                'Consultant CRO'
            ));
        RAISE NOTICE 'Added new role CHECK constraint with Risk Champion';
    END IF;
END $$;

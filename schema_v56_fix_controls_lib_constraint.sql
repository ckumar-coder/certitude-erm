-- schema_v56_fix_controls_lib_constraint.sql
--
-- The original controls_lib_last_test_result_check constraint (schema_v3_additions.sql)
-- only allowed 'Not Tested'. The entire application layer uses 'Not yet tested'
-- (import wizard default, test endpoint, ControlLibrary UI, etc.).
-- This migration expands the constraint to accept both values.

ALTER TABLE controls_lib DROP CONSTRAINT IF EXISTS controls_lib_last_test_result_check;

ALTER TABLE controls_lib ADD CONSTRAINT controls_lib_last_test_result_check
    CHECK (last_test_result IN (
        'Not Tested',
        'Not yet tested',
        'Effective',
        'Partially Effective',
        'Ineffective'
    ));

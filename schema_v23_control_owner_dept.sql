-- schema_v23: cross-department control ownership
-- Adds owner_department to controls_lib so a risk owner in one department
-- can assign a control to another department for execution.
-- The existing `department` column continues to record the CREATING department.
-- `owner_department` records the department RESPONSIBLE for executing the control.
-- When owner_department is NULL the creating department owns execution (default behaviour).

ALTER TABLE controls_lib ADD COLUMN IF NOT EXISTS owner_department VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_controls_lib_owner_dept ON controls_lib (owner_department);

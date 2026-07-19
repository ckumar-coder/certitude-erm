-- schema_v43_fix_cro_declined_v2.sql
-- v42 missed risks where CRO provided no decline reason (cro_notes = NULL).
-- Broadened condition: any Approved Accept/Avoid risk with no CRO acceptance
-- status is stuck and should go back to Awaiting Approval.

UPDATE risks
SET approval_status = 'Awaiting Approval'
WHERE approval_status  = 'Approved'
  AND cro_acceptance_status IS NULL
  AND treatment_strategy IN ('Accept', 'Avoid');

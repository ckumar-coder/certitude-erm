-- schema_v42_fix_cro_declined.sql
-- One-time data fix: risks that were CRO-declined before the cro-decline
-- endpoint was patched to reset approval_status were left with
--   approval_status = 'Approved', cro_acceptance_status = NULL
-- and appeared in no queue. Pushes them back to 'Awaiting Approval'
-- so they reappear on the responsible Manager's task page.

UPDATE risks
SET approval_status = 'Awaiting Approval'
WHERE approval_status = 'Approved'
  AND cro_acceptance_status IS NULL
  AND cro_notes IS NOT NULL;

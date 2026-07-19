-- schema_v66_issue_rejected_interim.sql
--
-- 1. Widen the issues.status CHECK constraint to include 'Rejected'
--    (action plan rejected — requires an interim action selection).
-- 2. Add interim_action column, required when status is 'Rejected' or 'Deferred'.

-- Drop and recreate the status CHECK (Postgres requires this to add a new value).
ALTER TABLE issues DROP CONSTRAINT IF EXISTS issues_status_check;
ALTER TABLE issues
    ADD CONSTRAINT issues_status_check
    CHECK (status IN (
        'Open', 'In Progress', 'Closed-Remediated', 'Risk Accepted',
        'Deferred', 'Rejected', 'No Longer Relevant'
    ));

-- Interim action chosen when the action plan is Rejected or Deferred.
ALTER TABLE issues
    ADD COLUMN IF NOT EXISTS interim_action TEXT NULL
    CHECK (interim_action IN (
        'Compensating controls', 'Accept', 'Scores updated', 'No interim action'
    ));

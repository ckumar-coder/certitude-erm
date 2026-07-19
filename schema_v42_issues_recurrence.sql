-- schema_v42_issues_recurrence.sql
-- ENH-16: is_recurring flag on issues

ALTER TABLE issues
    ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN NOT NULL DEFAULT FALSE;

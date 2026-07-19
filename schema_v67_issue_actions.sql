-- schema_v67_issue_actions.sql
--
-- Corrects schema_v66 (which placed Rejected/interim_action at the wrong level)
-- and introduces the issue_actions table for multi-department action plan tracking.
--
-- Changes:
--   1. Drop interim_action column from issues (it belongs on action items, not the issue).
--   2. Revert issues.status CHECK to remove 'Rejected' (Rejected/Deferred are
--      action plan statuses, not issue statuses).
--   3. Create issue_actions table — one row per department action item per issue,
--      each with its own 7-step action_plan_status lifecycle.

-- ── 1. Remove interim_action from issues ────────────────────────────────────
-- Must drop the column-level CHECK constraint first, then the column.
ALTER TABLE issues DROP CONSTRAINT IF EXISTS issues_interim_action_check;
ALTER TABLE issues DROP COLUMN IF EXISTS interim_action;

-- ── 2. Revert issues.status CHECK — remove 'Rejected' ───────────────────────
-- Rejected/Deferred belong on action_plan_status, not the issue status.
-- Preserve all original values (including Deferred which pre-dates v66).
ALTER TABLE issues DROP CONSTRAINT IF EXISTS issues_status_check;
ALTER TABLE issues
    ADD CONSTRAINT issues_status_check
    CHECK (status IN (
        'Open', 'In Progress', 'Closed-Remediated', 'Risk Accepted',
        'Deferred', 'No Longer Relevant'
    ));

-- ── 3. Create issue_actions table ───────────────────────────────────────────
-- Each row = one department's action item against a parent issue.
-- action_plan_status follows a 7-step lifecycle with SoD requirements:
--   Draft → Pending Approval → Approved → In Progress → Completed → Verified
--   At any Approved/In Progress/Completed point → Rejected or Deferred (requires interim_action)
-- SoD rules (enforced at application level):
--   approved_by  ≠ created_by
--   verified_by  ≠ created_by  AND  verified_by ≠ approved_by

CREATE TABLE IF NOT EXISTS issue_actions (
    id                  SERIAL PRIMARY KEY,
    issue_id            INTEGER     NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    company_id          INTEGER     NOT NULL REFERENCES companies(id),

    -- Action owner
    department          TEXT        NULL,   -- dept code (action-owner dept)
    business_unit_id    INTEGER     NULL REFERENCES business_units(id),

    -- Content
    description         TEXT        NOT NULL,
    due_date            DATE        NULL,
    assigned_to         INTEGER     NULL REFERENCES users(id),

    -- Lifecycle status
    action_plan_status  TEXT        NOT NULL DEFAULT 'Draft'
                        CHECK (action_plan_status IN (
                            'Draft', 'Pending Approval', 'Approved',
                            'In Progress', 'Completed', 'Verified',
                            'Rejected', 'Deferred'
                        )),

    -- Interim arrangement — required when status is Rejected or Deferred
    interim_action      TEXT        NULL
                        CHECK (interim_action IN (
                            'Compensating controls', 'Accept',
                            'Scores updated', 'No interim action'
                        )),

    -- SoD audit trail
    created_by          INTEGER     NULL REFERENCES users(id),
    submitted_at        TIMESTAMPTZ NULL,   -- when submitted for approval
    approved_by         INTEGER     NULL REFERENCES users(id),
    approved_at         TIMESTAMPTZ NULL,
    verified_by         INTEGER     NULL REFERENCES users(id),
    verified_at         TIMESTAMPTZ NULL,
    completed_at        TIMESTAMPTZ NULL,

    -- Timestamps
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_issue_actions_issue_id  ON issue_actions(issue_id);
CREATE INDEX IF NOT EXISTS idx_issue_actions_company_id ON issue_actions(company_id);

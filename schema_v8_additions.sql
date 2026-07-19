-- ============================================================
-- GRC App Schema -- Phase 7 additions (G5)
-- ============================================================
-- Applied after schema_v7_additions.sql. For fresh installs, all schema
-- files run in order (postgres applies docker-entrypoint-initdb.d/*.sql
-- alphabetically). For existing v7 databases, use migrate-v7-to-v8.js.
--
-- What this adds:
--   G5: a configurable escalation workflow, defined per company by the
--   Client Admin -- "who gets notified, after how long, and to whom it
--   escalates next" -- rather than a hardcoded chain. Each rule covers
--   one trigger type (an overdue control test, a Red KRI breach, a
--   policy review coming due, an overdue issue, or a Non-Compliant
--   obligation), a threshold in days, an initial notify target, and an
--   optional escalation target/delay.
--
--   H1/H6/H8 (bulk import, export, global search) need no schema
--   changes -- they read/write the existing tables.
--
--   The in-app side of G5 (GET /api/notifications) is computed on
--   demand from these rules plus live data, the same way the My Tasks
--   dashboard (F2) computes overdue items -- no notifications table or
--   background job required for Tier 1. Actual email delivery is a
--   follow-on once an SMTP provider is configured (see handover notes).
-- ============================================================

CREATE TABLE IF NOT EXISTS escalation_rules (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    trigger_type VARCHAR(50) NOT NULL CHECK (trigger_type IN (
        'control_test_overdue', 'kri_red_breach', 'policy_review_due', 'issue_overdue', 'obligation_non_compliant'
    )),

    -- Days before/after due date that the initial notification fires.
    -- For kri_red_breach and obligation_non_compliant this is typically
    -- 0 (notify as soon as the status occurs).
    threshold_days INT NOT NULL DEFAULT 0,

    -- Who gets the initial notification.
    notify_target VARCHAR(30) NOT NULL DEFAULT 'Owner'
        CHECK (notify_target IN ('Owner', 'Department Manager', 'Admin')),

    -- If still unresolved this many days after the initial notification,
    -- escalate to escalate_to. NULL = no escalation configured.
    escalate_after_days INT,
    escalate_to VARCHAR(30) CHECK (escalate_to IN ('Department Manager', 'Admin')),

    -- Comma-separated list, e.g. 'email,in_app'.
    channels VARCHAR(100) NOT NULL DEFAULT 'in_app',

    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (company_id, trigger_type)
);

CREATE INDEX IF NOT EXISTS idx_escalation_rules_company ON escalation_rules (company_id);

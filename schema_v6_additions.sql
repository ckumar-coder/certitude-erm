-- ============================================================
-- GRC App Schema -- Phase 4 additions (D)
-- ============================================================
-- Applied after schema_v5_additions.sql. For fresh installs, all schema
-- files run in order (postgres applies docker-entrypoint-initdb.d/*.sql
-- alphabetically). For existing v5 databases, use migrate-v5-to-v6.js.
--
-- What this adds:
--   D: Issues & Actions Tracker -- the universal "things to fix" log,
--      fed by control test failures, KRI breaches, and compliance
--      non-compliance findings (auto-created by the server), as well
--      as manually-logged audit/regulatory/whistleblower/complaint
--      issues. Supports the "Risk Accepted" disposition (with
--      higher-authority approval) and closure verification by someone
--      other than the issue owner (separation of duties).
--
--      Per spec D: "one control can spawn multiple linked issues...
--      control only returns to Effective once all linked issues for
--      that test cycle are closed/verified" -- this is surfaced via
--      an open-issues count computed at query time, not stored.
-- ============================================================

CREATE TABLE IF NOT EXISTS issues (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    issue_uid VARCHAR(50) NOT NULL,

    source_type VARCHAR(50) NOT NULL CHECK (source_type IN (
        'Self-identified (Control Test)',
        'Self-identified (KRI Breach)',
        'Self-identified (Management Review)',
        'Internal Audit',
        'External Audit',
        'Regulatory',
        'Whistleblower-Ethics',
        'Customer Complaint'
    )),
    source_detail TEXT,

    description TEXT NOT NULL,
    root_cause TEXT,
    remediation_plan TEXT,
    owner VARCHAR(255),
    due_date DATE,
    priority VARCHAR(20) NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),

    status VARCHAR(30) NOT NULL DEFAULT 'Open' CHECK (status IN (
        'Open', 'In Progress', 'Closed-Remediated', 'Risk Accepted', 'Deferred', 'No Longer Relevant'
    )),

    -- Populated only when status = 'Risk Accepted'
    disposition_rationale TEXT,
    accepted_approved_by VARCHAR(255),
    accepted_review_date DATE,

    -- For regulatory KRI/obligation breaches
    regulatory_notification_required BOOLEAN NOT NULL DEFAULT false,
    regulatory_notification_deadline DATE,

    -- Populated only when status = 'Closed-Remediated' -- must differ
    -- from `owner` (separation of duties)
    closure_verified_by VARCHAR(255),
    closed_at TIMESTAMPTZ,

    created_by VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (company_id, issue_uid)
);

CREATE INDEX IF NOT EXISTS idx_issues_company ON issues (company_id);

-- Many-to-many: "Linked Control / Linked Risk / Linked Compliance
-- Obligation / Linked KRI (whichever triggered it)".
CREATE TABLE IF NOT EXISTS issue_controls (
    issue_id INT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    control_id INT NOT NULL REFERENCES controls_lib(id) ON DELETE CASCADE,
    PRIMARY KEY (issue_id, control_id)
);

CREATE TABLE IF NOT EXISTS issue_risks (
    issue_id INT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    risk_id INT NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
    PRIMARY KEY (issue_id, risk_id)
);

CREATE TABLE IF NOT EXISTS issue_obligations (
    issue_id INT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    obligation_id INT NOT NULL REFERENCES compliance_obligations(id) ON DELETE CASCADE,
    PRIMARY KEY (issue_id, obligation_id)
);

CREATE TABLE IF NOT EXISTS issue_kris (
    issue_id INT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    kri_id INT NOT NULL REFERENCES kris(id) ON DELETE CASCADE,
    PRIMARY KEY (issue_id, kri_id)
);

CREATE INDEX IF NOT EXISTS idx_issue_controls_control ON issue_controls (control_id);
CREATE INDEX IF NOT EXISTS idx_issue_risks_risk ON issue_risks (risk_id);
CREATE INDEX IF NOT EXISTS idx_issue_obligations_obligation ON issue_obligations (obligation_id);
CREATE INDEX IF NOT EXISTS idx_issue_kris_kri ON issue_kris (kri_id);

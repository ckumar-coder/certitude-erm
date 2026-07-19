-- ============================================================
-- GRC App Schema -- Phase 3 additions (C1)
-- ============================================================
-- Applied after schema_v4_additions.sql. For fresh installs, all schema
-- files run in order (postgres applies docker-entrypoint-initdb.d/*.sql
-- alphabetically). For existing v4 databases, use migrate-v4-to-v5.js.
--
-- What this adds:
--   C1: Compliance Obligations Register -- each obligation tracks a
--       regulatory requirement (source, reference, description),
--       its compliance status, and links to the Policy Repository,
--       Control Library, KRIs, and the Risk Register -- completing
--       the Risk <-> Control <-> Compliance triangle.
--       A status-change history table supports the audit trail (G10)
--       since compliance status changes are exactly what auditors
--       and regulators ask about.
-- ============================================================

CREATE TABLE IF NOT EXISTS compliance_obligations (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    obligation_uid VARCHAR(50) NOT NULL,

    regulatory_body VARCHAR(255),
    regulation_name VARCHAR(300) NOT NULL,
    reference VARCHAR(255),
    description TEXT,
    applicable_to VARCHAR(255),

    compliance_status VARCHAR(30) NOT NULL DEFAULT 'Not Yet Assessed'
        CHECK (compliance_status IN ('Compliant', 'Partially Compliant', 'Non-Compliant', 'Not Yet Assessed')),
    obligation_owner VARCHAR(255),
    evidence_of_compliance TEXT,
    reporting_requirement TEXT,
    next_reporting_date DATE,

    last_reviewed_date DATE,
    next_review_date DATE,

    created_by VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (company_id, obligation_uid)
);

CREATE INDEX IF NOT EXISTS idx_compliance_obligations_company ON compliance_obligations (company_id);

-- Many-to-many links completing the Risk <-> Control <-> Compliance
-- triangle (and reaching into the Policy Repository / KRIs too).
CREATE TABLE IF NOT EXISTS obligation_policies (
    obligation_id INT NOT NULL REFERENCES compliance_obligations(id) ON DELETE CASCADE,
    policy_id INT NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
    PRIMARY KEY (obligation_id, policy_id)
);

CREATE TABLE IF NOT EXISTS obligation_controls (
    obligation_id INT NOT NULL REFERENCES compliance_obligations(id) ON DELETE CASCADE,
    control_id INT NOT NULL REFERENCES controls_lib(id) ON DELETE CASCADE,
    PRIMARY KEY (obligation_id, control_id)
);

CREATE TABLE IF NOT EXISTS obligation_kris (
    obligation_id INT NOT NULL REFERENCES compliance_obligations(id) ON DELETE CASCADE,
    kri_id INT NOT NULL REFERENCES kris(id) ON DELETE CASCADE,
    PRIMARY KEY (obligation_id, kri_id)
);

CREATE TABLE IF NOT EXISTS obligation_risks (
    obligation_id INT NOT NULL REFERENCES compliance_obligations(id) ON DELETE CASCADE,
    risk_id INT NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
    PRIMARY KEY (obligation_id, risk_id)
);

CREATE INDEX IF NOT EXISTS idx_obligation_policies_policy ON obligation_policies (policy_id);
CREATE INDEX IF NOT EXISTS idx_obligation_controls_control ON obligation_controls (control_id);
CREATE INDEX IF NOT EXISTS idx_obligation_kris_kri ON obligation_kris (kri_id);
CREATE INDEX IF NOT EXISTS idx_obligation_risks_risk ON obligation_risks (risk_id);

-- Compliance status change history -- "Last Reviewed" plus an audit
-- trail of how the assessment evolved (G10).
CREATE TABLE IF NOT EXISTS obligation_status_history (
    id SERIAL PRIMARY KEY,
    obligation_id INT NOT NULL REFERENCES compliance_obligations(id) ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL CHECK (status IN ('Compliant', 'Partially Compliant', 'Non-Compliant', 'Not Yet Assessed')),
    notes TEXT,
    changed_by VARCHAR(255),
    changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_obligation_status_history_obligation ON obligation_status_history (obligation_id, changed_at DESC);

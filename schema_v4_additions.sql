-- ============================================================
-- GRC App Schema -- Phase 2 additions (A1, A2)
-- ============================================================
-- Applied after schema_v3_additions.sql. For fresh installs, all schema
-- files run in order (postgres applies docker-entrypoint-initdb.d/*.sql
-- alphabetically). For existing v3 databases, use migrate-v3-to-v4.js.
--
-- What this adds:
--   A1: Policy & Procedure Repository -- versioned, with a
--       Draft -> Under Review -> Approved -> Published -> Archived
--       workflow, links to Risks/Controls, and per-user attestation
--       (read & acknowledged) tracking.
--   A2: RACI as an attribute set on Risks and Controls (not a
--       standalone module) -- Accountable/Responsible already existed
--       as risk_owner / controls_lib.owner; this adds Consulted and
--       Informed. Also adds org_roles, a simple Role -> Person ->
--       Department mapping table referenced when filling in RACI
--       fields.
-- ============================================================

-- ---- A2: RACI attribute additions ----

-- risks.risk_owner already represents "Accountable (Risk Owner)".
ALTER TABLE risks ADD COLUMN IF NOT EXISTS risk_consulted VARCHAR(500);
ALTER TABLE risks ADD COLUMN IF NOT EXISTS risk_informed VARCHAR(500);

-- controls_lib.owner already represents "Responsible (Control Owner)".
ALTER TABLE controls_lib ADD COLUMN IF NOT EXISTS accountable VARCHAR(255);
ALTER TABLE controls_lib ADD COLUMN IF NOT EXISTS consulted VARCHAR(500);
ALTER TABLE controls_lib ADD COLUMN IF NOT EXISTS informed VARCHAR(500);

-- Org chart / role mapping table (Role -> Person -> Department), used as
-- a reference when filling in RACI fields elsewhere.
CREATE TABLE IF NOT EXISTS org_roles (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    role_title VARCHAR(255) NOT NULL,
    person_name VARCHAR(255) NOT NULL,
    department VARCHAR(255),
    email VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_roles_company ON org_roles (company_id);

-- ---- A1: Policy & Procedure Repository ----

CREATE TABLE IF NOT EXISTS policies (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    policy_uid VARCHAR(50) NOT NULL,
    version INT NOT NULL DEFAULT 1,

    name VARCHAR(300) NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'Governance',
    description TEXT,

    status VARCHAR(20) NOT NULL DEFAULT 'Draft'
        CHECK (status IN ('Draft', 'Under Review', 'Approved', 'Published', 'Archived')),

    -- A3: Content Owner per policy (subject matter expert)
    content_owner VARCHAR(255),
    -- A1: Approver(s) -- workflow: Draft -> Reviewer -> Approver -> Published.
    -- Tier 1 keeps this as a single named approver; multiple approvers/
    -- sequential review steps would be a Tier 2 refinement.
    approver VARCHAR(255),

    effective_date DATE,
    review_frequency VARCHAR(20) NOT NULL DEFAULT 'Annual',
    next_review_date DATE,

    created_by VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (company_id, policy_uid, version)
);

CREATE INDEX IF NOT EXISTS idx_policies_company ON policies (company_id, policy_uid);

-- Many-to-many: a policy can reference several risks/controls and vice versa.
CREATE TABLE IF NOT EXISTS policy_risks (
    policy_id INT NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
    risk_id INT NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
    PRIMARY KEY (policy_id, risk_id)
);

CREATE TABLE IF NOT EXISTS policy_controls (
    policy_id INT NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
    control_id INT NOT NULL REFERENCES controls_lib(id) ON DELETE CASCADE,
    PRIMARY KEY (policy_id, control_id)
);

CREATE INDEX IF NOT EXISTS idx_policy_risks_risk ON policy_risks (risk_id);
CREATE INDEX IF NOT EXISTS idx_policy_controls_control ON policy_controls (control_id);

-- Attestation/acknowledgement tracking: who has read & accepted a
-- (specific version of a) policy, and when.
CREATE TABLE IF NOT EXISTS policy_attestations (
    id SERIAL PRIMARY KEY,
    policy_id INT NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
    user_email VARCHAR(255) NOT NULL,
    acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (policy_id, user_email)
);

CREATE INDEX IF NOT EXISTS idx_policy_attestations_policy ON policy_attestations (policy_id);

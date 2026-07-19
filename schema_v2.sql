-- ============================================================
-- GRC App Database Schema v2 -- Multi-tenant foundation
-- ============================================================
-- This is the schema for FRESH installs. For upgrading an
-- existing v1 database, use migrate-v1-to-v2.js instead.
--
-- Key changes from v1:
--   - companies: every record now belongs to a company (tenant)
--   - users: email-based login, security fields (lockout, password
--     history, forced rotation) per G8
--   - user_companies: many-to-many user<->company with a role
--     (Admin/Manager/Viewer) per company, supporting group-level
--     users who span multiple companies
--   - sessions: server-side session store (opaque token) so we can
--     enforce a 10-minute sliding inactivity timeout (G8) and revoke
--     sessions on lockout/logout -- a pure stateless JWT can't do this
--   - audit_log: generic append-only change log (G10), usable by
--     every module going forward
--   - risks/controls/mitigations/risk_categories/matrix_settings:
--     scoped by company_id
-- ============================================================

-- ---- Tenancy ----

CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,           -- short code, used in risk UIDs etc. e.g. "ACME"
    parent_company_id INT REFERENCES companies(id) ON DELETE SET NULL, -- for group/subsidiary structures
    branding_logo_url TEXT,
    branding_primary_color VARCHAR(7) NOT NULL DEFAULT '#2563eb',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---- Users & Auth ----

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(200) NOT NULL DEFAULT '',
    password_hash TEXT NOT NULL,

    -- Instance-level admin (the consulting firm's own staff), separate
    -- from per-company Admin role in user_companies.
    is_super_admin BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,

    -- Account lockout (G8: lock after 5 failed attempts)
    failed_login_attempts INT NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,

    -- Password rotation (G8: forced change every 90 days, configurable)
    must_change_password BOOLEAN NOT NULL DEFAULT false,
    password_changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Last N password hashes, so new passwords can be checked against
-- reuse of the last 5 (G8).
CREATE TABLE IF NOT EXISTS password_history (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_password_history_user ON password_history (user_id, created_at DESC);

-- A user's role/department is scoped PER COMPANY. A "group-level" user
-- (e.g. Group CFO) simply has a row for each company they oversee.
CREATE TABLE IF NOT EXISTS user_companies (
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'Viewer' CHECK (role IN ('Admin', 'Manager', 'Viewer')),
    functional_role VARCHAR(100),   -- descriptive label, e.g. "Risk Owner", "Compliance Officer"
    department VARCHAR(100),
    PRIMARY KEY (user_id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_user_companies_company ON user_companies (company_id);

-- Server-side sessions: enables a sliding 10-minute inactivity timeout
-- and immediate revocation (e.g. on lockout or password change), which
-- a stateless JWT alone cannot provide.
CREATE TABLE IF NOT EXISTS sessions (
    token VARCHAR(64) PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    active_company_id INT REFERENCES companies(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions (expires_at);

-- ---- Audit log (G10) ----
-- Generic, append-only. Every module logs into this table rather than
-- maintaining its own bespoke history mechanism.
CREATE TABLE IF NOT EXISTS audit_log (
    id BIGSERIAL PRIMARY KEY,
    company_id INT REFERENCES companies(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL,   -- 'risk', 'control', 'user', 'policy', ...
    entity_id INT,
    action VARCHAR(30) NOT NULL,        -- 'create', 'update', 'approve', 'status_change', 'delete', 'login', ...
    changed_by INT REFERENCES users(id) ON DELETE SET NULL,
    changed_by_email VARCHAR(255),      -- denormalized so the trail survives user deletion
    changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    details JSONB                       -- free-form: {field, old_value, new_value, ...}
);

CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_company ON audit_log (company_id, changed_at DESC);

-- ============================================================
-- Risk module (company-scoped versions of v1 tables)
-- ============================================================

CREATE TABLE IF NOT EXISTS risk_categories (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    UNIQUE (company_id, name)
);

CREATE TABLE IF NOT EXISTS matrix_settings (
    company_id INT PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
    current_dimensions VARCHAR(10) NOT NULL DEFAULT '5x5',
    fiscal_year_start_month INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS risks (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    risk_uid VARCHAR(50) NOT NULL,
    version INT NOT NULL DEFAULT 1,
    reporting_quarter VARCHAR(20),
    department VARCHAR(100) NOT NULL,
    risk_category VARCHAR(100) NOT NULL DEFAULT 'Operational Risk',
    sub_category VARCHAR(200) NOT NULL DEFAULT 'Process Risk',
    risk_detail TEXT NOT NULL,
    treatment_strategy VARCHAR(200) NOT NULL DEFAULT 'Mitigate / Treat (ISO Standard Target)',
    inherent_likelihood INT NOT NULL CHECK (inherent_likelihood BETWEEN 1 AND 5),
    inherent_impact INT NOT NULL CHECK (inherent_impact BETWEEN 1 AND 5),
    residual_likelihood INT NOT NULL CHECK (residual_likelihood BETWEEN 1 AND 5),
    residual_impact INT NOT NULL CHECK (residual_impact BETWEEN 1 AND 5),
    approval_status VARCHAR(50) NOT NULL DEFAULT 'Awaiting Approval',
    assessed_by VARCHAR(255),
    change_reason TEXT,
    directional_trend VARCHAR(20) DEFAULT 'STABLE',
    last_evaluated_timestamp BIGINT,
    escalation_justification TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (company_id, risk_uid, version)
);

CREATE INDEX IF NOT EXISTS idx_risks_company ON risks (company_id);
CREATE INDEX IF NOT EXISTS idx_risks_risk_uid ON risks (company_id, risk_uid);
CREATE INDEX IF NOT EXISTS idx_risks_department ON risks (company_id, lower(department));

CREATE TABLE IF NOT EXISTS controls (
    id SERIAL PRIMARY KEY,
    risk_id INT NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
    title VARCHAR(300) NOT NULL,
    owner VARCHAR(200) DEFAULT 'Departmental'
);

CREATE INDEX IF NOT EXISTS idx_controls_risk_id ON controls (risk_id);

CREATE TABLE IF NOT EXISTS mitigations (
    id SERIAL PRIMARY KEY,
    risk_id INT NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    start_date DATE,
    end_date DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending'
);

CREATE INDEX IF NOT EXISTS idx_mitigations_risk_id ON mitigations (risk_id);

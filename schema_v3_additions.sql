-- ============================================================
-- GRC App Schema -- Phase 1 additions (B1-B3)
-- ============================================================
-- Applied after schema_v2.sql. For fresh installs, both files run
-- (postgres applies docker-entrypoint-initdb.d/*.sql alphabetically).
-- For existing v2 databases, use migrate-v2-to-v3.js.
--
-- What this adds:
--   B1: full Risk Register field set -- cause/consequence, risk
--       owner, treatment plan rationale (for "Accept"), tolerance
--       threshold, review cadence, framework reference
--   B2: Control Library as a standalone entity (was embedded JSON
--       per-risk in v1/v2), many-to-many to risks via risk_controls,
--       with a control_tests history table supporting separate
--       self-test vs internal-audit testing lines
--   B3: KRIs as a standalone entity, many-to-many to risks and
--       controls, with kri_measurements for trend history
-- ============================================================

-- ---- B1: Risk Register field additions ----

ALTER TABLE risks ADD COLUMN IF NOT EXISTS risk_cause TEXT;
ALTER TABLE risks ADD COLUMN IF NOT EXISTS risk_consequence TEXT;
ALTER TABLE risks ADD COLUMN IF NOT EXISTS risk_owner VARCHAR(255);
ALTER TABLE risks ADD COLUMN IF NOT EXISTS tolerance_threshold TEXT;
-- Required when treatment_strategy = 'Accept'
ALTER TABLE risks ADD COLUMN IF NOT EXISTS treatment_plan_rationale TEXT;
ALTER TABLE risks ADD COLUMN IF NOT EXISTS accept_approved_by VARCHAR(255);
ALTER TABLE risks ADD COLUMN IF NOT EXISTS review_frequency VARCHAR(50) DEFAULT 'Annual';
ALTER TABLE risks ADD COLUMN IF NOT EXISTS next_review_date DATE;
ALTER TABLE risks ADD COLUMN IF NOT EXISTS framework_reference VARCHAR(255);

-- ---- B2: Control Library (standalone entity) ----

CREATE TABLE IF NOT EXISTS controls_lib (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    control_uid VARCHAR(50) NOT NULL,
    name VARCHAR(300) NOT NULL,
    description TEXT,
    control_type VARCHAR(20) NOT NULL DEFAULT 'Preventive' CHECK (control_type IN ('Preventive', 'Detective')),
    automation VARCHAR(20) NOT NULL DEFAULT 'Manual' CHECK (automation IN ('Manual', 'Automated')),
    owner VARCHAR(255),
    testing_frequency VARCHAR(20) NOT NULL DEFAULT 'Quarterly' CHECK (testing_frequency IN ('Monthly', 'Quarterly', 'Annual')),
    evidence_required TEXT,
    last_test_date DATE,
    last_test_result VARCHAR(30) NOT NULL DEFAULT 'Not Tested'
        CHECK (last_test_result IN ('Not Tested', 'Effective', 'Partially Effective', 'Ineffective')),
    test_notes TEXT,
    framework_reference VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (company_id, control_uid)
);

CREATE INDEX IF NOT EXISTS idx_controls_lib_company ON controls_lib (company_id);

-- Many-to-many: a control can mitigate several risks, a risk can have several controls.
CREATE TABLE IF NOT EXISTS risk_controls (
    risk_id INT NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
    control_id INT NOT NULL REFERENCES controls_lib(id) ON DELETE CASCADE,
    PRIMARY KEY (risk_id, control_id)
);

CREATE INDEX IF NOT EXISTS idx_risk_controls_control ON risk_controls (control_id);

-- Testing workflow: each test (self-test or independent audit test) is its
-- own record. The control's last_test_* summary fields reflect the most
-- recent test of EITHER type -- per spec, control status changes only via
-- test results, never automatically.
CREATE TABLE IF NOT EXISTS control_tests (
    id SERIAL PRIMARY KEY,
    control_id INT NOT NULL REFERENCES controls_lib(id) ON DELETE CASCADE,
    test_type VARCHAR(20) NOT NULL DEFAULT 'Self-Test' CHECK (test_type IN ('Self-Test', 'Internal Audit')),
    test_date DATE NOT NULL,
    result VARCHAR(30) NOT NULL CHECK (result IN ('Effective', 'Partially Effective', 'Ineffective')),
    notes TEXT,
    tested_by VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_control_tests_control ON control_tests (control_id, test_date DESC);

-- ---- B3: Key Risk Indicators ----

CREATE TABLE IF NOT EXISTS kris (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    kri_uid VARCHAR(50) NOT NULL,
    name VARCHAR(300) NOT NULL,
    definition TEXT,
    owner VARCHAR(255),
    measurement_frequency VARCHAR(20) NOT NULL DEFAULT 'Monthly' CHECK (measurement_frequency IN ('Monthly', 'Quarterly', 'Annual')),

    -- Threshold Source: not every KRI needs a threshold -- some are
    -- tracked for trend/visibility only.
    threshold_source VARCHAR(20) NOT NULL DEFAULT 'None' CHECK (threshold_source IN ('None', 'Internal', 'Regulatory', 'Both')),
    internal_tolerance NUMERIC,
    regulatory_limit NUMERIC,
    regulatory_reference VARCHAR(255),

    -- Whether breaching a threshold means the value going 'above' it
    -- (e.g. error rate) or 'below' it (e.g. capital ratio).
    breach_direction VARCHAR(10) NOT NULL DEFAULT 'above' CHECK (breach_direction IN ('above', 'below')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (company_id, kri_uid)
);

CREATE INDEX IF NOT EXISTS idx_kris_company ON kris (company_id);

CREATE TABLE IF NOT EXISTS kri_measurements (
    id SERIAL PRIMARY KEY,
    kri_id INT NOT NULL REFERENCES kris(id) ON DELETE CASCADE,
    measurement_date DATE NOT NULL,
    value NUMERIC NOT NULL,
    recorded_by VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kri_measurements_kri ON kri_measurements (kri_id, measurement_date DESC);

-- Many-to-many: KRIs <-> Risks and KRIs <-> Controls (both optional)
CREATE TABLE IF NOT EXISTS risk_kris (
    risk_id INT NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
    kri_id INT NOT NULL REFERENCES kris(id) ON DELETE CASCADE,
    PRIMARY KEY (risk_id, kri_id)
);

CREATE TABLE IF NOT EXISTS control_kris (
    control_id INT NOT NULL REFERENCES controls_lib(id) ON DELETE CASCADE,
    kri_id INT NOT NULL REFERENCES kris(id) ON DELETE CASCADE,
    PRIMARY KEY (control_id, kri_id)
);

CREATE INDEX IF NOT EXISTS idx_risk_kris_kri ON risk_kris (kri_id);
CREATE INDEX IF NOT EXISTS idx_control_kris_kri ON control_kris (kri_id);

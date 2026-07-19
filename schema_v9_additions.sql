-- ============================================================
-- GRC App Schema -- v9 additions (Risk Register Enhancements)
-- ============================================================
-- Applied after schema_v8_additions.sql. For fresh installs, all schema
-- files run in order. For existing v8 databases, use migrate-v8-to-v9.js.
--
-- What this adds:
--   1. "Corrective" as a third control type alongside Preventive/Detective.
--   2. Risk lifecycle: risks can now be formally Closed (with a reason),
--      not just left in the register indefinitely. Closing creates a new
--      version, same as any other edit (G10).
--   3. Risk appetite: tolerance_threshold_score is a numeric ceiling
--      (1-25, matching the likelihood x impact product) the risk owner
--      can set; the API flags a risk as "appetite_breach" when the
--      residual score exceeds it.
--   4. Risk velocity (speed of onset) -- a qualitative B1 field.
--   5. Risk interdependencies (risk_links) -- simple cross-references
--      between related risks, no scoring logic.
--   6. Controlled vocabularies for risk_cause / risk_consequence
--      (risk_taxonomy_terms), so registers don't fragment into dozens of
--      near-duplicate free-text phrases over time.
--
-- (Two related items from the same discussion -- the control-test
-- remediation-plan requirement, and the control-effectiveness "reassess
-- this risk" nudge -- are pure application logic against existing columns
-- and need no schema change.)

-- ---- 1. Corrective controls ----

ALTER TABLE controls_lib DROP CONSTRAINT IF EXISTS controls_lib_control_type_check;
ALTER TABLE controls_lib ADD CONSTRAINT controls_lib_control_type_check
    CHECK (control_type IN ('Preventive', 'Detective', 'Corrective'));

-- ---- 2. Risk lifecycle (Active / Closed) ----

ALTER TABLE risks ADD COLUMN IF NOT EXISTS risk_status VARCHAR(20) NOT NULL DEFAULT 'Active';
ALTER TABLE risks DROP CONSTRAINT IF EXISTS risks_risk_status_check;
ALTER TABLE risks ADD CONSTRAINT risks_risk_status_check CHECK (risk_status IN ('Active', 'Closed'));
ALTER TABLE risks ADD COLUMN IF NOT EXISTS closure_reason TEXT;

-- ---- 3. Risk appetite / tolerance ----

ALTER TABLE risks ADD COLUMN IF NOT EXISTS tolerance_threshold_score INT;
ALTER TABLE risks DROP CONSTRAINT IF EXISTS risks_tolerance_threshold_score_check;
ALTER TABLE risks ADD CONSTRAINT risks_tolerance_threshold_score_check
    CHECK (tolerance_threshold_score IS NULL OR tolerance_threshold_score BETWEEN 1 AND 25);

-- ---- 4. Risk velocity (speed of onset) ----

ALTER TABLE risks ADD COLUMN IF NOT EXISTS risk_velocity VARCHAR(30);
ALTER TABLE risks DROP CONSTRAINT IF EXISTS risks_risk_velocity_check;
ALTER TABLE risks ADD CONSTRAINT risks_risk_velocity_check
    CHECK (risk_velocity IS NULL OR risk_velocity IN ('Immediate (<1 month)', 'Short-term (1-6 months)', 'Medium-term (6-12 months)', 'Long-term (>12 months)'));

-- ---- 5. Risk interdependencies ----
-- Symmetric, undirected links between two risks (by risk_uid) in the same
-- company. risk_uid_a < risk_uid_b is enforced so each pair is stored
-- once regardless of which risk the link was created from.

CREATE TABLE IF NOT EXISTS risk_links (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    risk_uid_a VARCHAR(50) NOT NULL,
    risk_uid_b VARCHAR(50) NOT NULL,
    note TEXT,
    created_by VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (risk_uid_a < risk_uid_b),
    UNIQUE (company_id, risk_uid_a, risk_uid_b)
);

CREATE INDEX IF NOT EXISTS idx_risk_links_a ON risk_links (company_id, risk_uid_a);
CREATE INDEX IF NOT EXISTS idx_risk_links_b ON risk_links (company_id, risk_uid_b);

-- ---- 6. Controlled vocabularies for cause / consequence ----

CREATE TABLE IF NOT EXISTS risk_taxonomy_terms (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    term_type VARCHAR(20) NOT NULL CHECK (term_type IN ('cause', 'consequence')),
    name VARCHAR(300) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    UNIQUE (company_id, term_type, name)
);

-- schema_v65_ra_il_enhancements.sql
-- Two sets of changes applied together:
--   A) Risk Appetite Module — data model fidelity gaps
--   B) Incident Log — risk register linking workflow

-- ─────────────────────────────────────────────────────────────────────────────
-- A. RISK APPETITE MODULE
-- ─────────────────────────────────────────────────────────────────────────────

-- A1. Make max_residual_score optional (qualitative-only statements).
--     Spec: NULL = no numeric boundary set.
ALTER TABLE risk_appetite_statements
    ALTER COLUMN max_residual_score DROP NOT NULL;

-- A2. Add notes column for per-version release notes.
ALTER TABLE risk_appetite_statements
    ADD COLUMN IF NOT EXISTS notes TEXT NULL;

-- A3. Split approved_by (free text) into role enum + optional name.
--     Keep approved_by for legacy data; new rows write to the split columns.
ALTER TABLE risk_appetite_statements
    ADD COLUMN IF NOT EXISTS approved_by_role TEXT NULL
        CHECK (approved_by_role IN ('Board of Directors','CEO','CFO','CRO','Other')),
    ADD COLUMN IF NOT EXISTS approved_by_name TEXT NULL;

-- A4. Add approval_date as a proper DATE column alongside the existing approved_at TIMESTAMPTZ.
ALTER TABLE risk_appetite_statements
    ADD COLUMN IF NOT EXISTS approval_date DATE NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- B. INCIDENT LOG — RISK REGISTER LINKING
-- ─────────────────────────────────────────────────────────────────────────────

-- B1. Register decision outcome (tracks which option the user chose).
ALTER TABLE incident_log
    ADD COLUMN IF NOT EXISTS register_decision TEXT NOT NULL DEFAULT 'Pending'
        CHECK (register_decision IN ('Pending', 'Linked', 'Risk Created', 'Dismissed'));

-- B2. Link to a risk row.  ON DELETE SET NULL so deleting a risk doesn't
--     cascade-delete the incident.
ALTER TABLE incident_log
    ADD COLUMN IF NOT EXISTS linked_risk_id INTEGER NULL
        REFERENCES risks(id) ON DELETE SET NULL;

-- B3. Dismiss note (required when register_decision = 'Dismissed').
ALTER TABLE incident_log
    ADD COLUMN IF NOT EXISTS dismiss_note TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_incident_log_linked_risk
    ON incident_log (linked_risk_id)
    WHERE linked_risk_id IS NOT NULL;

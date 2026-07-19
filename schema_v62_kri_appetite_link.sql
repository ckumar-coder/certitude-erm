-- v62: KRI ↔ Risk Appetite link
-- Adds appetite_statement_id (nullable FK) to the kris table so each KRI
-- can be associated with a board-level Risk Appetite category.
-- This enables:
--   • Appetite context when setting KRI thresholds (G3)
--   • Appetite category surfaced on Risk Register KRI card (G5)
--   • Auto-created Issues on Red breach reference appetite category (G4)

ALTER TABLE kris
    ADD COLUMN IF NOT EXISTS appetite_statement_id INTEGER
        REFERENCES risk_appetite_statements(id) ON DELETE SET NULL;

-- Index for JOIN lookups from the KRI list/register queries
CREATE INDEX IF NOT EXISTS idx_kris_appetite_statement
    ON kris (appetite_statement_id)
    WHERE appetite_statement_id IS NOT NULL;

COMMENT ON COLUMN kris.appetite_statement_id IS
    'Optional link to a board-level risk appetite statement (risk_appetite_statements.id). '
    'When set, the KRI thresholds should be calibrated against the appetite ceiling '
    '(max_residual_score) and Red breaches include the appetite category in auto-created Issues.';

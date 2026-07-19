-- v60: Risk Appetite Module
-- Adds board-level category appetite statements alongside the existing
-- per-risk tolerance_threshold_score (which is the operational expression
-- of appetite). The appetite_breach computed field in JS is renamed to
-- tolerance_breach to distinguish per-risk tolerance from category appetite.

-- ── New table: risk_appetite_statements ──────────────────────────────────────
-- One current row per (company_id, risk_category). Versioned append-only:
-- editing creates a new row (version + 1) and flips is_current on the old one.

CREATE TABLE IF NOT EXISTS risk_appetite_statements (
    id                      SERIAL PRIMARY KEY,
    company_id              INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    risk_category           TEXT    NOT NULL,
    version                 INTEGER NOT NULL DEFAULT 1,
    is_current              BOOLEAN NOT NULL DEFAULT TRUE,

    -- Qualitative governance layer
    appetite_level          TEXT    NOT NULL
                                CHECK (appetite_level IN ('Zero Tolerance', 'Low', 'Moderate', 'High')),
    qualitative_statement   TEXT    NOT NULL,

    -- Quantitative boundary
    max_residual_score      INTEGER NOT NULL CHECK (max_residual_score BETWEEN 1 AND 25),
    tolerance_band_min      INTEGER          CHECK (tolerance_band_min BETWEEN 1 AND 25),
    tolerance_band_max      INTEGER          CHECK (tolerance_band_max BETWEEN 1 AND 25),
    required_breach_action  TEXT,

    -- Approval / governance metadata
    approved_by             TEXT,
    approved_at             TIMESTAMPTZ,
    effective_date          DATE,
    next_review_date        DATE,

    created_by              TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enforce at most one current row per category per company
CREATE UNIQUE INDEX IF NOT EXISTS idx_appetite_current
    ON risk_appetite_statements (company_id, risk_category)
    WHERE is_current = TRUE;

CREATE INDEX IF NOT EXISTS idx_appetite_company
    ON risk_appetite_statements (company_id, risk_category);

-- ── New column: risks.appetite_category_breach ───────────────────────────────
-- Cached boolean: TRUE when this risk's residual score exceeds its category's
-- current max_residual_score. Recalculated on every risk save and every
-- appetite statement save. Keeps the Management Summary query fast.

ALTER TABLE risks
    ADD COLUMN IF NOT EXISTS appetite_category_breach BOOLEAN NOT NULL DEFAULT FALSE;

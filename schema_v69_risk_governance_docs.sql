-- schema_v69_risk_governance_docs.sql
-- Risk Governance Documents module.
-- Two tables:
--   risk_gov_categories  — per-company document categories (code + name)
--   risk_gov_documents   — versioned document records with GCS file storage
--
-- Document ID format: [CODE]-[YEAR]-[SEQ]  e.g. BOA-2026-001
-- All versions of a document share the same doc_id; version increments on each upload.
-- is_latest = TRUE on the most recent version only.

-- ── Categories ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS risk_gov_categories (
    id            SERIAL PRIMARY KEY,
    company_id    INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code          VARCHAR(10)  NOT NULL,
    name          VARCHAR(100) NOT NULL,
    display_order INTEGER      NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_risk_gov_categories_company
    ON risk_gov_categories (company_id);

-- ── Documents ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS risk_gov_documents (
    id            SERIAL PRIMARY KEY,
    company_id    INTEGER      NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    category_id   INTEGER      NOT NULL REFERENCES risk_gov_categories(id),
    doc_id        VARCHAR(30)  NOT NULL,   -- e.g. BOA-2026-001 (shared across versions)
    version       INTEGER      NOT NULL DEFAULT 1,
    title         VARCHAR(255) NOT NULL,
    description   TEXT,
    file_name     VARCHAR(255) NOT NULL,
    file_size     BIGINT,                  -- bytes
    gcs_path      VARCHAR(500) NOT NULL,
    uploaded_by   INTEGER      REFERENCES users(id) ON DELETE SET NULL,
    uploaded_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    is_latest     BOOLEAN      NOT NULL DEFAULT TRUE,
    UNIQUE (company_id, doc_id, version)
);

CREATE INDEX IF NOT EXISTS idx_risk_gov_documents_company
    ON risk_gov_documents (company_id);
CREATE INDEX IF NOT EXISTS idx_risk_gov_documents_category
    ON risk_gov_documents (category_id);
CREATE INDEX IF NOT EXISTS idx_risk_gov_documents_doc_id
    ON risk_gov_documents (company_id, doc_id);

-- ── Seed default categories for all existing companies ────────────────────────

INSERT INTO risk_gov_categories (company_id, code, name, display_order)
SELECT c.id, cats.code, cats.name, cats.ord
FROM companies c
CROSS JOIN (VALUES
    ('BOA', 'Board & Governance',       1),
    ('POL', 'Policies & Frameworks',    2),
    ('RPT', 'Risk Reports',             3),
    ('AUD', 'Audit & Assurance',        4),
    ('REG', 'Regulatory',               5),
    ('TPR', 'Third-Party Risk',         6),
    ('INS', 'Insurance & Risk Transfer',7),
    ('INC', 'Incidents & Losses',       8)
) AS cats(code, name, ord)
ON CONFLICT (company_id, code) DO NOTHING;

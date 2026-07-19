-- V1.7: Glossary, company settings, and evidence attachments

-- Company-level key/value settings (used for scoring methodology, etc.)
CREATE TABLE IF NOT EXISTS company_settings (
    id          SERIAL PRIMARY KEY,
    company_id  INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    setting_key TEXT    NOT NULL,
    setting_value TEXT  NOT NULL DEFAULT '{}',
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (company_id, setting_key)
);

-- Custom glossary terms per company (built-in terms live in the frontend)
CREATE TABLE IF NOT EXISTS glossary_terms (
    id          SERIAL PRIMARY KEY,
    company_id  INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    term        TEXT    NOT NULL,
    definition  TEXT    NOT NULL,
    created_by  TEXT    NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_glossary_company ON glossary_terms(company_id);

-- Evidence file attachments (base64, capped at 2MB per file)
CREATE TABLE IF NOT EXISTS evidence_attachments (
    id              SERIAL PRIMARY KEY,
    company_id      INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    entity_type     TEXT    NOT NULL CHECK (entity_type IN ('risk','control','issue','obligation','kri')),
    entity_id       TEXT    NOT NULL,
    filename        TEXT    NOT NULL,
    mime_type       TEXT    NOT NULL,
    file_data       TEXT    NOT NULL,  -- base64-encoded
    file_size_bytes INTEGER NOT NULL,
    uploaded_by     TEXT    NOT NULL,
    uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_evidence_entity ON evidence_attachments(company_id, entity_type, entity_id);

-- v59: Standalone Incident Log module
-- Separate from BCM activations — tracks operational/risk incidents for the company.

CREATE TABLE IF NOT EXISTS incident_log (
    id              SERIAL PRIMARY KEY,
    company_id      INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    incident_uid    TEXT NOT NULL,
    title           TEXT NOT NULL,
    incident_date   DATE NOT NULL,
    description     TEXT,
    severity        TEXT NOT NULL DEFAULT 'Medium'
                        CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')),
    status          TEXT NOT NULL DEFAULT 'Open'
                        CHECK (status IN ('Open', 'Under Investigation', 'Resolved', 'Closed')),
    affected_dept   TEXT,
    root_cause      TEXT,
    action_taken    TEXT,
    reported_by     TEXT,
    created_by      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_deleted      BOOLEAN NOT NULL DEFAULT false,
    UNIQUE (company_id, incident_uid)
);

CREATE INDEX IF NOT EXISTS idx_incident_log_company ON incident_log (company_id);
CREATE INDEX IF NOT EXISTS idx_incident_log_date    ON incident_log (company_id, incident_date DESC);

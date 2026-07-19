-- v61: Horizon Scanning — signal registry for strategic intelligence

CREATE TABLE IF NOT EXISTS horizon_scans (
    id                  SERIAL PRIMARY KEY,
    company_id          INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    scan_uid            TEXT    NOT NULL UNIQUE,
    title               TEXT    NOT NULL,
    category            TEXT    NOT NULL CHECK (category IN ('Regulatory','Geopolitical','Technology','Economic','Environmental','Social')),
    description         TEXT    NOT NULL,
    source_name         TEXT    DEFAULT NULL,
    source_url          TEXT    DEFAULT NULL,
    time_horizon        TEXT    NOT NULL CHECK (time_horizon IN ('Near-term (<1yr)','Medium-term (1-3yr)','Long-term (3yr+)')),
    potential_impact    TEXT    NOT NULL CHECK (potential_impact IN ('Low','Medium','High','Critical')),
    likelihood          TEXT    NOT NULL CHECK (likelihood IN ('Unlikely','Possible','Likely')),
    status              TEXT    NOT NULL DEFAULT 'Monitoring'
                                CHECK (status IN ('Draft','Monitoring','Escalated','Converted','Dismissed')),
    owner               TEXT    DEFAULT NULL,
    department          TEXT    DEFAULT NULL,
    notes               TEXT    DEFAULT NULL,
    added_by            TEXT    DEFAULT NULL,   -- user email or 'ai-assistant'
    converted_risk_uid  TEXT    DEFAULT NULL,   -- populated when status → Converted
    escalated_at        TIMESTAMPTZ DEFAULT NULL,
    converted_at        TIMESTAMPTZ DEFAULT NULL,
    dismissed_at        TIMESTAMPTZ DEFAULT NULL,
    is_deleted          BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_horizon_scans_company    ON horizon_scans(company_id);
CREATE INDEX IF NOT EXISTS idx_horizon_scans_status     ON horizon_scans(company_id, status);
CREATE INDEX IF NOT EXISTS idx_horizon_scans_category   ON horizon_scans(company_id, category);

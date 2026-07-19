-- schema_v28_bcm_bcps.sql
--
-- BCM Module — Component 2: BCP Document Library
--
-- Metadata layer for Business Continuity Plans. Documents themselves
-- live in the Policy Repository (category = 'BCM'). This table holds
-- the BCM-specific scheduling, testing, and linkage metadata.
--
-- last_tested_date and last_test_result are populated automatically
-- by the BCP Testing Log (Component 3, Phase 3).

CREATE TABLE IF NOT EXISTS bcm_bcps (
    id                 SERIAL PRIMARY KEY,
    company_id         INTEGER      NOT NULL REFERENCES companies(id),
    bcp_uid            VARCHAR(20)  NOT NULL,
    name               VARCHAR(200) NOT NULL,
    bcp_owner          VARCHAR(200),
    version            VARCHAR(20),
    effective_date     DATE,
    document_link      TEXT,
    testing_frequency  VARCHAR(20)  DEFAULT 'Annual',
    test_type_required VARCHAR(60),
    last_tested_date   DATE,
    last_test_result   VARCHAR(30),
    next_test_due      DATE,
    status             VARCHAR(20)  DEFAULT 'Active',
    notes              TEXT,
    active             BOOLEAN      DEFAULT TRUE,
    created_by         INTEGER      REFERENCES users(id),
    created_at         TIMESTAMPTZ  DEFAULT now(),
    updated_at         TIMESTAMPTZ  DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS bcm_bcps_uid_uidx
    ON bcm_bcps (company_id, bcp_uid);

-- Many-to-many: BCP <-> critical processes
CREATE TABLE IF NOT EXISTS bcm_bcp_processes (
    bcp_id     INTEGER NOT NULL REFERENCES bcm_bcps(id)      ON DELETE CASCADE,
    process_id INTEGER NOT NULL REFERENCES bcm_processes(id) ON DELETE CASCADE,
    PRIMARY KEY (bcp_id, process_id)
);

-- Many-to-many: BCP <-> risks (wired fully in Phase 8)
CREATE TABLE IF NOT EXISTS bcm_bcp_risks (
    bcp_id  INTEGER NOT NULL REFERENCES bcm_bcps(id) ON DELETE CASCADE,
    risk_id INTEGER NOT NULL REFERENCES risks(id)    ON DELETE CASCADE,
    PRIMARY KEY (bcp_id, risk_id)
);

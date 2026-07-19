-- schema_v27_bcm_processes.sql
--
-- BCM Module — Component 1: Critical Process Register
--
-- The anchor entity for the full BCM module. All other BCM components
-- link back to bcm_processes. Each process record holds its BIA data
-- (MTPD, RTO, RPO), criticality, ownership, and SPOF flag.
--
-- Phase 5 (Dependency Register) will wire automatic SPOF flagging.
-- For now the SPOF flag is manually set by an Admin/Manager.

CREATE TABLE IF NOT EXISTS bcm_processes (
    id                   SERIAL PRIMARY KEY,
    company_id           INTEGER NOT NULL REFERENCES companies(id),
    process_uid          VARCHAR(20) NOT NULL,
    name                 VARCHAR(200) NOT NULL,
    department_id        INTEGER REFERENCES departments(id),
    owner                VARCHAR(200),
    criticality          VARCHAR(20)  NOT NULL DEFAULT 'High',
    mtpd_value           INTEGER,
    mtpd_unit            VARCHAR(10)  DEFAULT 'hours',
    rto_value            INTEGER,
    rto_unit             VARCHAR(10)  DEFAULT 'hours',
    rpo_value            INTEGER,
    rpo_unit             VARCHAR(10)  DEFAULT 'hours',
    process_dependencies TEXT,
    spof_flag            BOOLEAN      DEFAULT FALSE,
    last_bia_review      DATE,
    next_bia_review      DATE,
    status               VARCHAR(20)  DEFAULT 'Active',
    notes                TEXT,
    active               BOOLEAN      DEFAULT TRUE,
    created_by           INTEGER      REFERENCES users(id),
    created_at           TIMESTAMPTZ  DEFAULT now(),
    updated_at           TIMESTAMPTZ  DEFAULT now()
);

-- Unique process UID per company
CREATE UNIQUE INDEX IF NOT EXISTS bcm_processes_uid_uidx
    ON bcm_processes (company_id, process_uid);

-- Many-to-many: process <-> risks
-- Properly wired in Phase 8; table created now so foreign keys are valid.
CREATE TABLE IF NOT EXISTS bcm_process_risks (
    process_id  INTEGER NOT NULL REFERENCES bcm_processes(id) ON DELETE CASCADE,
    risk_id     INTEGER NOT NULL REFERENCES risks(id)         ON DELETE CASCADE,
    PRIMARY KEY (process_id, risk_id)
);

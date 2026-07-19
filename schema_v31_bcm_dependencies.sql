-- schema_v31_bcm_dependencies.sql
--
-- BCM Module — Component 5: Dependency & SPOF Register
--
-- Tracks the people, technology, suppliers, facilities, and utilities
-- that critical processes depend on. Records which dependencies are
-- Single Points of Failure (SPOFs) and what mitigations are in place.

CREATE TABLE IF NOT EXISTS bcm_dependencies (
    id                  SERIAL PRIMARY KEY,
    company_id          INTEGER      NOT NULL REFERENCES companies(id),
    dependency_uid      VARCHAR(20)  NOT NULL,
    name                VARCHAR(200) NOT NULL,
    dep_type            VARCHAR(40)  NOT NULL DEFAULT 'Other',
    description         TEXT,
    owner               VARCHAR(200),
    spof_flag           BOOLEAN      DEFAULT FALSE,
    spof_justification  TEXT,
    mitigation          TEXT,
    status              VARCHAR(20)  DEFAULT 'Active',
    notes               TEXT,
    active              BOOLEAN      DEFAULT TRUE,
    created_by          INTEGER      REFERENCES users(id),
    created_at          TIMESTAMPTZ  DEFAULT now(),
    updated_at          TIMESTAMPTZ  DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS bcm_dependencies_uid_uidx
    ON bcm_dependencies (company_id, dependency_uid);

-- Many-to-many: Dependency <-> Critical Processes
CREATE TABLE IF NOT EXISTS bcm_dependency_processes (
    dependency_id INTEGER NOT NULL REFERENCES bcm_dependencies(id) ON DELETE CASCADE,
    process_id    INTEGER NOT NULL REFERENCES bcm_processes(id)    ON DELETE CASCADE,
    PRIMARY KEY (dependency_id, process_id)
);

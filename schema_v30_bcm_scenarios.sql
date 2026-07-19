-- schema_v30_bcm_scenarios.sql
--
-- BCM Module — Component 4: Threat / Disruption Scenario Library
--
-- Catalogues threat and disruption scenarios (cyber, natural, supply-chain,
-- pandemic, etc.) and links them to the critical processes they could affect.
-- Linkage to BCPs is pre-wired here (bcm_scenario_bcps) and wired
-- fully in Phase 8.

CREATE TABLE IF NOT EXISTS bcm_scenarios (
    id                  SERIAL PRIMARY KEY,
    company_id          INTEGER      NOT NULL REFERENCES companies(id),
    scenario_uid        VARCHAR(20)  NOT NULL,
    name                VARCHAR(200) NOT NULL,
    category            VARCHAR(60)  NOT NULL DEFAULT 'Other',
    description         TEXT,
    likelihood          VARCHAR(20)  NOT NULL DEFAULT 'Medium',
    impact              VARCHAR(20)  NOT NULL DEFAULT 'Medium',
    affected_systems    TEXT,
    mitigation_measures TEXT,
    owner               VARCHAR(200),
    last_reviewed       DATE,
    next_review         DATE,
    status              VARCHAR(20)  DEFAULT 'Active',
    notes               TEXT,
    active              BOOLEAN      DEFAULT TRUE,
    created_by          INTEGER      REFERENCES users(id),
    created_at          TIMESTAMPTZ  DEFAULT now(),
    updated_at          TIMESTAMPTZ  DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS bcm_scenarios_uid_uidx
    ON bcm_scenarios (company_id, scenario_uid);

-- Many-to-many: Scenario <-> Critical Processes
CREATE TABLE IF NOT EXISTS bcm_scenario_processes (
    scenario_id INTEGER NOT NULL REFERENCES bcm_scenarios(id)  ON DELETE CASCADE,
    process_id  INTEGER NOT NULL REFERENCES bcm_processes(id)  ON DELETE CASCADE,
    PRIMARY KEY (scenario_id, process_id)
);

-- Many-to-many: Scenario <-> BCPs (wired fully in Phase 8)
CREATE TABLE IF NOT EXISTS bcm_scenario_bcps (
    scenario_id INTEGER NOT NULL REFERENCES bcm_scenarios(id) ON DELETE CASCADE,
    bcp_id      INTEGER NOT NULL REFERENCES bcm_bcps(id)      ON DELETE CASCADE,
    PRIMARY KEY (scenario_id, bcp_id)
);

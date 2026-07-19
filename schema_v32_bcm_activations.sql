-- schema_v32_bcm_activations.sql
--
-- BCM Module — Component 6: BCP Activation / Incident Log
--
-- Records every real BCP activation or business disruption incident.
-- Captures timeline (incident → activation → closure), which BCPs and
-- critical processes were involved, whether RTO/RPO targets were met,
-- response actions taken, and lessons learned.

CREATE TABLE IF NOT EXISTS bcm_activations (
    id                  SERIAL PRIMARY KEY,
    company_id          INTEGER      NOT NULL REFERENCES companies(id),
    activation_uid      VARCHAR(20)  NOT NULL,
    title               VARCHAR(200) NOT NULL,
    incident_date       DATE         NOT NULL,
    activated_date      DATE,
    closed_date         DATE,
    scenario_id         INTEGER      REFERENCES bcm_scenarios(id),
    triggered_by        TEXT,
    incident_commander  VARCHAR(200),
    status              VARCHAR(20)  DEFAULT 'Active',
    summary             TEXT,
    response_actions    TEXT,
    rto_met             BOOLEAN,
    rpo_met             BOOLEAN,
    lessons_learned     TEXT,
    notes               TEXT,
    created_by          INTEGER      REFERENCES users(id),
    created_at          TIMESTAMPTZ  DEFAULT now(),
    updated_at          TIMESTAMPTZ  DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS bcm_activations_uid_uidx
    ON bcm_activations (company_id, activation_uid);

-- Many-to-many: Activation <-> BCPs that were activated
CREATE TABLE IF NOT EXISTS bcm_activation_bcps (
    activation_id INTEGER NOT NULL REFERENCES bcm_activations(id) ON DELETE CASCADE,
    bcp_id        INTEGER NOT NULL REFERENCES bcm_bcps(id)         ON DELETE CASCADE,
    PRIMARY KEY (activation_id, bcp_id)
);

-- Many-to-many: Activation <-> Critical Processes affected
CREATE TABLE IF NOT EXISTS bcm_activation_processes (
    activation_id INTEGER NOT NULL REFERENCES bcm_activations(id)  ON DELETE CASCADE,
    process_id    INTEGER NOT NULL REFERENCES bcm_processes(id)     ON DELETE CASCADE,
    PRIMARY KEY (activation_id, process_id)
);

-- schema_v29_bcm_bcp_tests.sql
--
-- BCM Module — Component 3: BCP Testing Log
--
-- Records every BCP test exercise. On INSERT/UPDATE/DELETE the server
-- refreshes the parent bcm_bcps.last_tested_date, last_test_result,
-- and next_test_due from the most recent test entry for that BCP.

CREATE TABLE IF NOT EXISTS bcm_bcp_tests (
    id                  SERIAL PRIMARY KEY,
    company_id          INTEGER      NOT NULL REFERENCES companies(id),
    test_uid            VARCHAR(20)  NOT NULL,
    bcp_id              INTEGER      NOT NULL REFERENCES bcm_bcps(id),
    test_date           DATE         NOT NULL,
    test_type           VARCHAR(60)  NOT NULL,
    result              VARCHAR(30)  NOT NULL,
    facilitator         VARCHAR(200),
    participants        TEXT,
    observations        TEXT,
    corrective_actions  TEXT,
    follow_up_due       DATE,
    follow_up_complete  BOOLEAN      DEFAULT FALSE,
    notes               TEXT,
    created_by          INTEGER      REFERENCES users(id),
    created_at          TIMESTAMPTZ  DEFAULT now(),
    updated_at          TIMESTAMPTZ  DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS bcm_bcp_tests_uid_uidx
    ON bcm_bcp_tests (company_id, test_uid);

CREATE INDEX IF NOT EXISTS bcm_bcp_tests_bcp_idx
    ON bcm_bcp_tests (bcp_id);

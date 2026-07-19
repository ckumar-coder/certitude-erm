-- schema_v33_risk_bcps.sql
-- Links risks directly to BCP documents in the BCM module.
-- Replaces the freetext bcp_link URL field with proper foreign-key references.
-- The bcp_link column is kept for backward compatibility (legacy external URLs).

CREATE TABLE IF NOT EXISTS risk_bcps (
    risk_id INTEGER NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
    bcp_id  INTEGER NOT NULL REFERENCES bcm_bcps(id) ON DELETE CASCADE,
    PRIMARY KEY (risk_id, bcp_id)
);

CREATE INDEX IF NOT EXISTS idx_risk_bcps_risk_id ON risk_bcps(risk_id);
CREATE INDEX IF NOT EXISTS idx_risk_bcps_bcp_id  ON risk_bcps(bcp_id);

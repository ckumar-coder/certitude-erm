-- schema_v41_map_enhancements.sql
-- ENH-11: mitigation_uid (MAP-NNNN, unique per company)
-- ENH-12: action_owner (text)
-- ENH-13: root_cause (text)

ALTER TABLE mitigations
    ADD COLUMN IF NOT EXISTS mitigation_uid TEXT,
    ADD COLUMN IF NOT EXISTS action_owner    TEXT,
    ADD COLUMN IF NOT EXISTS root_cause      TEXT;

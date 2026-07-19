-- schema_v43_reopen_reason.sql
-- Store reopen reason on the risk row (symmetrical with closure_reason)

ALTER TABLE risks
    ADD COLUMN IF NOT EXISTS reopen_reason TEXT;

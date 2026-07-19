-- schema_v41_risk_status_backfill.sql
-- Back-fills risk_status = 'Active' for any risks where it was left NULL
-- due to the INSERT statement omitting the column.
-- Also ensures risk_status has a default so future omissions are safe.

UPDATE risks SET risk_status = 'Active' WHERE risk_status IS NULL;

ALTER TABLE risks ALTER COLUMN risk_status SET DEFAULT 'Active';

-- schema_v36_is_critical.sql
-- Adds is_critical flag to risks table.
-- A critical risk is one where a failure could cause material operational
-- disruption — typically requiring a BCP. The flag drives a simplified
-- "Is this a Critical Risk? → Is there a BCP?" workflow in the Risk Register form.

ALTER TABLE risks ADD COLUMN IF NOT EXISTS is_critical BOOLEAN NOT NULL DEFAULT FALSE;

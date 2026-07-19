-- schema_v52_bcm_activations_soft_delete.sql
-- A-03: Add is_deleted to bcm_activations for consistency with all other BCM tables.
--
-- Every other BCM table (processes, bcps, bcp_tests, scenarios, dependencies)
-- uses soft-delete. The activations DELETE endpoint was the only outlier — it
-- issued a hard DELETE. This migration adds the column and an index; the
-- corresponding endpoint now does UPDATE SET is_deleted = true instead.

ALTER TABLE bcm_activations
    ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS bcm_activations_company_active_idx
    ON bcm_activations (company_id)
    WHERE is_deleted = false;

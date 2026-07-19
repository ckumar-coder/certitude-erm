-- schema_v13_additions.sql
-- KRI description field + RAG status on measurements
-- Safe to re-run (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS throughout).

-- 1. KRI description (separate from definition/formula).
ALTER TABLE kris ADD COLUMN IF NOT EXISTS description TEXT DEFAULT NULL;

-- 2. RAG status and notes on each measurement period.
--    rag_status: manually set by the risk owner when recording a value.
--    notes: free-form commentary for that period.
--    reporting_period: human-readable label e.g. "2026-06", "2026-Q2".
ALTER TABLE kri_measurements ADD COLUMN IF NOT EXISTS rag_status VARCHAR(10) DEFAULT NULL
    CHECK (rag_status IS NULL OR rag_status IN ('Green', 'Amber', 'Red'));
ALTER TABLE kri_measurements ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT NULL;
ALTER TABLE kri_measurements ADD COLUMN IF NOT EXISTS reporting_period VARCHAR(20) DEFAULT NULL;

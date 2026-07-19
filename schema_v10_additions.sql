-- ============================================================
-- GRC App Schema -- Phase 8 additions (Beta V1.1)
-- ============================================================
-- Applied after schema_v9_additions.sql. For fresh installs, all schema
-- files run in order (postgres applies docker-entrypoint-initdb.d/*.sql
-- alphabetically). For existing v9 databases, use migrate-v9-to-v10.js.
--
-- What this adds:
--   B3 extension: data_source column on kris -- captures where the KRI
--   value comes from (e.g. "Core banking system extract", "Treasury feed",
--   "Manual entry by Finance team"). This was in the original spec but
--   omitted from the initial Beta build.
-- ============================================================

ALTER TABLE kris ADD COLUMN IF NOT EXISTS data_source VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_kris_data_source ON kris (company_id, data_source) WHERE data_source IS NOT NULL;

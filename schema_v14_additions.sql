-- schema_v14_additions.sql
-- Multi-band tolerance thresholds for KRIs (V1.6)
-- Safe to re-run (ADD COLUMN IF NOT EXISTS throughout).

-- Replaces single internal_tolerance number with an array of named bands.
-- Each element: { rag: 'Green'|'Amber'|'Red', min: number|null, max: number|null, label: string }
-- Old internal_tolerance column is retained for backward-compat with legacy data.
ALTER TABLE kris ADD COLUMN IF NOT EXISTS threshold_bands JSONB DEFAULT NULL;

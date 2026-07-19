-- schema_v24_bcm_tier1.sql
-- BCM Tier 1 additions (no new tables):
--   A. Two new fields on risks: bcp_status, bcp_link
--   B. Two new source_type values on issues: 'BCP Test Finding',
--      'BCP Activation — Lessons Learned'

-- ── A. Risk Register — BCP fields ────────────────────────────────────────────
ALTER TABLE risks
    ADD COLUMN IF NOT EXISTS bcp_status VARCHAR(30)
        CHECK (bcp_status IN ('Yes', 'No', 'In Development'));

ALTER TABLE risks
    ADD COLUMN IF NOT EXISTS bcp_link TEXT;

-- ── B. Issues Tracker — expand source_type CHECK constraint ──────────────────
-- PostgreSQL requires dropping and re-adding a named CHECK constraint to
-- modify its value list.  The original constraint is unnamed (added inline
-- in the CREATE TABLE), so PostgreSQL auto-generated the name.
-- We drop it by name and recreate with the full expanded list.
ALTER TABLE issues
    DROP CONSTRAINT IF EXISTS issues_source_type_check;

ALTER TABLE issues
    ADD CONSTRAINT issues_source_type_check
        CHECK (source_type IN (
            'Self-identified (Control Test)',
            'Self-identified (KRI Breach)',
            'Self-identified (Management Review)',
            'Internal Audit',
            'External Audit',
            'Regulatory',
            'Whistleblower-Ethics',
            'Customer Complaint',
            'BCP Test Finding',
            'BCP Activation — Lessons Learned'
        ));

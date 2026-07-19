-- ============================================================
-- GRC App Schema -- Phase 5 additions (E, H2)
-- ============================================================
-- Applied after schema_v6_additions.sql. For fresh installs, all schema
-- files run in order (postgres applies docker-entrypoint-initdb.d/*.sql
-- alphabetically). For existing v6 databases, use migrate-v6-to-v7.js.
--
-- What this adds:
--   E: Department scoping for the Manager role, extended beyond the
--      Risk Register (Phase 0) to Controls, KRIs, and Issues --
--      "View/edit own risks, controls, issues, KRIs" per the access
--      control table. A NULL department means "enterprise-wide" and
--      stays visible/editable by every Manager (e.g. a company-wide
--      control or KRI that isn't any one department's alone).
--      Compliance Obligations already have an equivalent field
--      (applicable_to) from Phase 3, so no schema change is needed
--      there -- just a query-side filter.
--
--   H2: No schema change required -- users.is_active (from schema_v2)
--      already gates login and session checks; this phase adds the
--      missing admin-panel endpoint to toggle it.
-- ============================================================

ALTER TABLE controls_lib ADD COLUMN IF NOT EXISTS department VARCHAR(255);
ALTER TABLE kris ADD COLUMN IF NOT EXISTS department VARCHAR(255);
ALTER TABLE issues ADD COLUMN IF NOT EXISTS department VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_controls_lib_department ON controls_lib (department);
CREATE INDEX IF NOT EXISTS idx_kris_department ON kris (department);
CREATE INDEX IF NOT EXISTS idx_issues_department ON issues (department);

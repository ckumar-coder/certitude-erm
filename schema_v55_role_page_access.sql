-- schema_v55_role_page_access.sql
--
-- Per-company role × page access matrix.
-- Admin always has full access and is never stored here.
-- Rows are seeded on first GET /api/role-permissions call (see server.js).

CREATE TABLE IF NOT EXISTS role_page_access (
    company_id   INTEGER     NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    page_id      TEXT        NOT NULL,
    role         TEXT        NOT NULL,
    allowed      BOOLEAN     NOT NULL DEFAULT false,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (company_id, page_id, role)
);

CREATE INDEX IF NOT EXISTS idx_role_page_access_company
    ON role_page_access (company_id);

-- schema_v57_raci_matrix.sql
--
-- Creates the raci_matrix table required by the Org Roles / RACI module.
-- Previously only applied via standalone migrate-raci-matrix.js — this file
-- adds it to the standard migration chain so all environments get it.

CREATE TABLE IF NOT EXISTS raci_matrix (
    id               SERIAL PRIMARY KEY,
    company_id       INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    module           TEXT    NOT NULL,
    activity         TEXT    NOT NULL,
    sort_order       INTEGER NOT NULL DEFAULT 0,
    admin            TEXT    NOT NULL DEFAULT '',
    cro              TEXT    NOT NULL DEFAULT '',
    consultant_cro   TEXT    NOT NULL DEFAULT '',
    manager          TEXT    NOT NULL DEFAULT '',
    approver         TEXT    NOT NULL DEFAULT '',
    submitter        TEXT    NOT NULL DEFAULT '',
    viewer           TEXT    NOT NULL DEFAULT '',
    updated_at       TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (company_id, module, activity)
);

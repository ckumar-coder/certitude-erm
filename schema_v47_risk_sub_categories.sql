-- schema_v47_risk_sub_categories.sql
-- Adds per-company risk sub-category taxonomy table.
-- The standard seed data (11 categories + sub-categories) is inserted
-- for existing companies via the migrate-all.js post-migration step.

CREATE TABLE IF NOT EXISTS risk_sub_categories (
    id          SERIAL PRIMARY KEY,
    category_id INT          NOT NULL REFERENCES risk_categories(id) ON DELETE CASCADE,
    name        VARCHAR(200) NOT NULL,
    sort_order  INT          NOT NULL DEFAULT 0,
    UNIQUE (category_id, name)
);

CREATE INDEX IF NOT EXISTS idx_risk_sub_categories_category
    ON risk_sub_categories(category_id);

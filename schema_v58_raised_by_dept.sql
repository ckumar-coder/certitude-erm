-- schema_v58_raised_by_dept.sql
--
-- Adds raised_by_dept column to issues table, required by the MyTasks
-- endpoint for Risk Champion role (queries WHERE lower(raised_by_dept) = ANY(...)).
-- Previously only applied via standalone migrate-issues-raised-by-dept.js.

ALTER TABLE issues ADD COLUMN IF NOT EXISTS raised_by_dept TEXT;

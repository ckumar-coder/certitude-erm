-- schema_v48_map_status_compensatory.sql
--
-- ENH-14: Expand MAP statuses (Deferred, Cancelled) and add
-- compensatory_controls_in_place field shown when status is Deferred.
--
-- Overdue is a computed display state (not stored):
--   red badge when end_date < today AND status IN ('Pending', 'In Progress')

-- 1. Drop the existing status CHECK so we can widen it.
ALTER TABLE mitigations
    DROP CONSTRAINT IF EXISTS mitigations_status_check;

-- 2. Add Deferred and Cancelled to the allowed set.
ALTER TABLE mitigations
    ADD CONSTRAINT mitigations_status_check
    CHECK (status IN ('Pending', 'In Progress', 'Complete', 'Deferred', 'Cancelled'));

-- 3. New column: compensatory controls flag (only relevant when Deferred).
ALTER TABLE mitigations
    ADD COLUMN IF NOT EXISTS compensatory_controls_in_place TEXT
    CHECK (compensatory_controls_in_place IN ('Yes', 'No'));

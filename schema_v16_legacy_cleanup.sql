-- V1.7: Drop Phase 0 legacy tables no longer used by the application.
-- These were retained post-migration for reference only. Safe to drop now
-- that V1.3+ has been running in production without referencing them.

DROP TABLE IF EXISTS controls_v2_legacy;
DROP TABLE IF EXISTS users_v1_legacy;

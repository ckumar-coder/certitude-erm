-- schema_v71_remove_training_videos.sql
-- Removes the Training Video Library feature entirely from this
-- (Qatar Post) instance. The Training Video Library depended on Google
-- Cloud Storage for video/thumbnail assets; it has been removed from the
-- application code (server.js, frontend) for this deployment. This
-- migration drops the now-unused table and its indexes.
--
-- Safe to run multiple times (IF EXISTS guards throughout).

DROP INDEX IF EXISTS idx_training_videos_role_order;
DROP INDEX IF EXISTS idx_training_videos_page_id;
DROP TABLE IF EXISTS training_videos;

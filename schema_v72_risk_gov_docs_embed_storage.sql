-- schema_v72_risk_gov_docs_embed_storage.sql
-- Moves Risk Governance Document storage from Google Cloud Storage
-- (signed URLs) to the same in-database blob pattern already used by
-- evidence_attachments. This removes the app's last dependency on GCS,
-- which matters for an on-premises deployment with no path to Google
-- Cloud. Can be reverted to external object storage later if Qatar Post
-- prefers that once real infrastructure requirements are known.
--
-- gcs_path is kept (nullable) rather than dropped, in case any prior rows
-- reference it -- new uploads use file_data / mime_type going forward.

ALTER TABLE risk_gov_documents ALTER COLUMN gcs_path DROP NOT NULL;
ALTER TABLE risk_gov_documents ADD COLUMN IF NOT EXISTS file_data TEXT;
ALTER TABLE risk_gov_documents ADD COLUMN IF NOT EXISTS mime_type VARCHAR(150);

-- schema_v44_evidence_board_approval.sql
-- Add 'board_approval' as a valid entity_type in evidence_attachments.
-- Drops the existing CHECK constraint and recreates it with the new value.

ALTER TABLE evidence_attachments
    DROP CONSTRAINT evidence_attachments_entity_type_check;

ALTER TABLE evidence_attachments
    ADD CONSTRAINT evidence_attachments_entity_type_check
    CHECK (entity_type IN ('risk', 'control', 'issue', 'obligation', 'kri', 'board_approval'));

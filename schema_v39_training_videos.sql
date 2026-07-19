-- schema_v39_training_videos.sql
-- Training Video Library
--
-- Platform-wide table (no company_id) — Certitude produces one set of videos
-- that all GRC Workstation clients access per their role.
--
-- Role hierarchy (cumulative access, lowest → highest):
--   Submitter → Viewer → Manager → CRO → Admin
--
-- A user's role_level determines which videos they can watch:
--   Submitter:      ['Submitter']
--   Viewer:         ['Submitter', 'Viewer']
--   Manager:        ['Submitter', 'Viewer', 'Manager']
--   CRO / Consultant CRO: ['Submitter', 'Viewer', 'Manager', 'CRO']
--   Admin:          all levels
--
-- gcs_path and thumbnail_path are relative object paths within GCS_BUCKET:
--   e.g. training/videos/submitter_01_my_tasks.mp4
--        training/thumbnails/submitter_01_my_tasks.jpg
--
-- page_id matches the nav item id in Layout.jsx (e.g. 'my-tasks', 'risks')
-- so HelpPanel can surface the relevant video via deep-link.
--
-- Safe to run multiple times (IF NOT EXISTS guards throughout).

CREATE TABLE IF NOT EXISTS training_videos (
    id               SERIAL PRIMARY KEY,
    title            VARCHAR(255) NOT NULL,
    description      TEXT,
    role_level       VARCHAR(20)  NOT NULL
                         CHECK (role_level IN ('Submitter', 'Viewer', 'Manager', 'CRO', 'Admin')),
    module           VARCHAR(100),            -- display label e.g. 'My Tasks', 'Risk Register'
    page_id          VARCHAR(100),            -- nav id for HelpPanel deep-link e.g. 'my-tasks'
    gcs_path         TEXT         NOT NULL,   -- relative path in GCS_BUCKET
    thumbnail_path   TEXT,                    -- relative path in GCS_BUCKET (optional)
    duration_seconds INT,                     -- video length shown on card
    display_order    INT          NOT NULL DEFAULT 0,
    is_active        BOOLEAN      NOT NULL DEFAULT true,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_training_videos_role_order
    ON training_videos (role_level, display_order)
    WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_training_videos_page_id
    ON training_videos (page_id)
    WHERE is_active = true;

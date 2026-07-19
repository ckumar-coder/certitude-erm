-- schema_v35_consultant_benchmarking.sql
-- V35: Consultant Benchmarking Layer — Phase 2 (Database Schema)
--
-- Changes to existing tables:
--   1. users          — add is_consultant (platform-level Consultant flag)
--   2. user_companies — add is_external flag; add 'Consultant CRO' to role CHECK
--
-- New global tables (no company_id — shared reference data):
--   3. source_registry     — registered external benchmark sources
--   4. ingestion_runs      — log of each pipeline execution per source
--   5. ingestion_queue     — items awaiting consultant review (confidence 0.60–0.85)
--   6. external_benchmark  — approved benchmark data points
--   7. client_benchmark    — nightly pre-aggregated peer benchmark by sector + pillar
--
-- Safe to run multiple times (IF NOT EXISTS / IF EXISTS guards throughout).

-- ── 1. users: platform-level Consultant flag ───────────────────────────────
-- When true, the user has access to the Consultant Dashboard regardless of
-- which company they are currently viewing.
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS is_consultant BOOLEAN NOT NULL DEFAULT false;

-- ── 2. user_companies: external flag + Consultant CRO role ─────────────────
-- is_external: set automatically when a Consultant user is added to a client
-- company. Visible in the client Admin user list to distinguish internal staff
-- from external consultants.
ALTER TABLE user_companies
    ADD COLUMN IF NOT EXISTS is_external BOOLEAN NOT NULL DEFAULT false;

-- Extend the role CHECK constraint to include Consultant CRO.
-- Consultant CRO has identical permissions to CRO; the distinct role label
-- exists solely for audit trail attribution.
ALTER TABLE user_companies
    DROP CONSTRAINT IF EXISTS user_companies_role_check;
ALTER TABLE user_companies
    ADD CONSTRAINT user_companies_role_check
    CHECK (role IN ('Admin', 'Submitter', 'Manager', 'CRO', 'Viewer', 'Consultant CRO'));

-- ── 3. source_registry ─────────────────────────────────────────────────────
-- One row per registered external benchmark source.
-- is_active allows a source to be toggled off without losing history.
CREATE TABLE IF NOT EXISTS source_registry (
    id                      SERIAL PRIMARY KEY,
    name                    VARCHAR(255) NOT NULL,
    organisation            VARCHAR(255) NOT NULL,
    url                     TEXT         NOT NULL,
    format                  VARCHAR(10)  NOT NULL
                                CHECK (format IN ('PDF', 'API', 'Web')),
    publication_frequency   VARCHAR(20)  NOT NULL
                                CHECK (publication_frequency IN ('Annual', 'Quarterly', 'Monthly', 'Continuous')),
    pillar_coverage         TEXT[]       NOT NULL DEFAULT '{}',
    sector_coverage         TEXT[]       NOT NULL DEFAULT '{}',
    is_active               BOOLEAN      NOT NULL DEFAULT true,
    last_fetched_at         TIMESTAMPTZ,
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ── 4. ingestion_runs ──────────────────────────────────────────────────────
-- One row per pipeline execution per source.
-- document_hash: SHA-256 of the fetched document. If unchanged from the
-- previous run, processing is skipped (status = 'skipped') — making the
-- pipeline fully idempotent.
CREATE TABLE IF NOT EXISTS ingestion_runs (
    id                      SERIAL PRIMARY KEY,
    source_registry_id      INT          NOT NULL REFERENCES source_registry(id) ON DELETE CASCADE,
    started_at              TIMESTAMPTZ  NOT NULL DEFAULT now(),
    completed_at            TIMESTAMPTZ,
    status                  VARCHAR(20)  NOT NULL DEFAULT 'running'
                                CHECK (status IN ('running', 'completed', 'failed', 'skipped')),
    document_hash           VARCHAR(64),
    items_extracted         INT          NOT NULL DEFAULT 0,
    items_auto_approved     INT          NOT NULL DEFAULT 0,
    items_queued            INT          NOT NULL DEFAULT 0,
    items_rejected          INT          NOT NULL DEFAULT 0,
    error_message           TEXT,
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ingestion_runs_source
    ON ingestion_runs (source_registry_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_ingestion_runs_status
    ON ingestion_runs (status);

-- ── 5. ingestion_queue ─────────────────────────────────────────────────────
-- Items with confidence 0.60–0.85 awaiting consultant review.
-- raw_extract preserves the exact text Claude extracted, so the reviewer
-- can read the source passage alongside the proposed classification.
-- rejection_reason uses a fixed vocabulary (5 options from design doc).
CREATE TABLE IF NOT EXISTS ingestion_queue (
    id                      SERIAL PRIMARY KEY,
    ingestion_run_id        INT          NOT NULL REFERENCES ingestion_runs(id) ON DELETE CASCADE,
    source_registry_id      INT          NOT NULL REFERENCES source_registry(id) ON DELETE CASCADE,
    pillar                  VARCHAR(50)  NOT NULL,
    sector                  VARCHAR(100) NOT NULL,
    risk_theme              TEXT         NOT NULL,
    frequency               VARCHAR(10)  CHECK (frequency IN ('High', 'Medium', 'Low')),
    frequency_raw           TEXT,
    severity                VARCHAR(10)  CHECK (severity IN ('High', 'Medium', 'Low')),
    severity_raw            TEXT,
    confidence_score        DECIMAL(4,3) NOT NULL,
    page_reference          VARCHAR(20),
    period                  VARCHAR(10),
    raw_extract             TEXT,
    status                  VARCHAR(20)  NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by             INT          REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at             TIMESTAMPTZ,
    rejection_reason        VARCHAR(50)
                                CHECK (rejection_reason IN (
                                    'Wrong pillar',
                                    'Wrong sector',
                                    'Insufficient evidence',
                                    'Not applicable to our markets',
                                    'Duplicate'
                                )),
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ingestion_queue_status
    ON ingestion_queue (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ingestion_queue_run
    ON ingestion_queue (ingestion_run_id);

-- ── 6. external_benchmark ──────────────────────────────────────────────────
-- Approved benchmark data points — both auto-approved (approved_by IS NULL)
-- and consultant-approved (approved_by = user id).
-- is_active allows individual records to be soft-deleted if a source is
-- superseded by a newer edition.
CREATE TABLE IF NOT EXISTS external_benchmark (
    id                      SERIAL PRIMARY KEY,
    source_registry_id      INT          NOT NULL REFERENCES source_registry(id) ON DELETE CASCADE,
    pillar                  VARCHAR(50)  NOT NULL,
    sector                  VARCHAR(100) NOT NULL,
    risk_theme              TEXT         NOT NULL,
    frequency               VARCHAR(10)  CHECK (frequency IN ('High', 'Medium', 'Low')),
    frequency_raw           TEXT,
    severity                VARCHAR(10)  CHECK (severity IN ('High', 'Medium', 'Low')),
    severity_raw            TEXT,
    confidence_score        DECIMAL(4,3) NOT NULL,
    page_reference          VARCHAR(20),
    period                  VARCHAR(10),
    approved_by             INT          REFERENCES users(id) ON DELETE SET NULL,
    approved_at             TIMESTAMPTZ  NOT NULL DEFAULT now(),
    is_active               BOOLEAN      NOT NULL DEFAULT true,
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_external_benchmark_pillar
    ON external_benchmark (pillar);
CREATE INDEX IF NOT EXISTS idx_external_benchmark_sector
    ON external_benchmark (sector);
CREATE INDEX IF NOT EXISTS idx_external_benchmark_period
    ON external_benchmark (period);
CREATE INDEX IF NOT EXISTS idx_external_benchmark_source
    ON external_benchmark (source_registry_id);

-- ── 7. client_benchmark ────────────────────────────────────────────────────
-- Nightly pre-aggregated peer benchmark by sector + pillar.
-- Only populated when peer_count >= 5 (minimum threshold from design doc).
-- Stores counts rather than percentages so the display layer can recalculate
-- ratios as needed. No individual company data is stored here.
-- UNIQUE constraint ensures one row per sector/pillar pair; nightly job
-- upserts this row.
CREATE TABLE IF NOT EXISTS client_benchmark (
    id                      SERIAL PRIMARY KEY,
    sector                  VARCHAR(100) NOT NULL,
    pillar                  VARCHAR(50)  NOT NULL,
    peer_count              INT          NOT NULL,
    freq_high_count         INT          NOT NULL DEFAULT 0,
    freq_med_count          INT          NOT NULL DEFAULT 0,
    freq_low_count          INT          NOT NULL DEFAULT 0,
    sev_high_count          INT          NOT NULL DEFAULT 0,
    sev_med_count           INT          NOT NULL DEFAULT 0,
    sev_low_count           INT          NOT NULL DEFAULT 0,
    calculated_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (sector, pillar)
);
CREATE INDEX IF NOT EXISTS idx_client_benchmark_lookup
    ON client_benchmark (sector, pillar);

-- ── Seed: 9 confirmed sources ───────────────────────────────────────────────
-- Populated by migrate-v34-to-v35.js only if source_registry is empty.

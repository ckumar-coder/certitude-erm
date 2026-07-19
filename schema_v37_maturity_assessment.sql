-- schema_v37_maturity_assessment.sql
-- GRC Maturity Assessment Module
--
-- New tables:
--   1. maturity_domains    — assessment categories (e.g. Governance, Risk) with weights
--   2. maturity_questions  — Likert-scale questions (5 options) per domain
--   3. maturity_assessments — one assessment run per company
--   4. maturity_responses  — one response per question per assessment
--   5. maturity_results    — computed scores stored after assessment completion
--
-- Access: Admin (full management), CRO / Consultant CRO (run assessments + view results)
-- Visibility: hidden from all other roles (Viewer, Manager, Submitter)
--
-- Safe to run multiple times (IF NOT EXISTS / IF EXISTS guards throughout).

-- ── 1. maturity_domains ───────────────────────────────────────────────────
-- Company-scoped so each client can define their own domain set.
-- weight is stored as a percentage (e.g. 20.00 = 20%). Admin is responsible
-- for ensuring weights sum to 100 — enforced in the application layer.
-- display_order controls rendering sequence in the UI.
CREATE TABLE IF NOT EXISTS maturity_domains (
    id              SERIAL PRIMARY KEY,
    company_id      INT          NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    weight          DECIMAL(5,2) NOT NULL DEFAULT 20.00
                        CHECK (weight > 0 AND weight <= 100),
    display_order   INT          NOT NULL DEFAULT 0,
    is_active       BOOLEAN      NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_maturity_domains_company
    ON maturity_domains (company_id, display_order);

-- ── 2. maturity_questions ─────────────────────────────────────────────────
-- One row per question. Each question has 5 Likert option texts (one per
-- maturity level). display_order controls sequencing within the domain.
-- Deactivated questions (is_active = false) are excluded from new assessments
-- but retained so historical responses remain interpretable.
CREATE TABLE IF NOT EXISTS maturity_questions (
    id              SERIAL PRIMARY KEY,
    domain_id       INT          NOT NULL REFERENCES maturity_domains(id) ON DELETE CASCADE,
    company_id      INT          NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    question_text   TEXT         NOT NULL,
    option_1        TEXT         NOT NULL,  -- Level 1 (Initial / ad hoc)
    option_2        TEXT         NOT NULL,  -- Level 2 (Developing)
    option_3        TEXT         NOT NULL,  -- Level 3 (Defined)
    option_4        TEXT         NOT NULL,  -- Level 4 (Managed)
    option_5        TEXT         NOT NULL,  -- Level 5 (Optimising)
    display_order   INT          NOT NULL DEFAULT 0,
    is_active       BOOLEAN      NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_maturity_questions_domain
    ON maturity_questions (domain_id, display_order);
CREATE INDEX IF NOT EXISTS idx_maturity_questions_company
    ON maturity_questions (company_id);

-- ── 3. maturity_assessments ───────────────────────────────────────────────
-- One row per assessment run. An assessment is created when the user clicks
-- "Start New Assessment" and is marked completed once all active questions
-- have been answered and the user submits.
-- status: 'in_progress' while the user is working through questions;
--         'completed' once scores are calculated and stored.
CREATE TABLE IF NOT EXISTS maturity_assessments (
    id              SERIAL PRIMARY KEY,
    company_id      INT          NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    started_by      INT          REFERENCES users(id) ON DELETE SET NULL,
    started_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    completed_at    TIMESTAMPTZ,
    status          VARCHAR(20)  NOT NULL DEFAULT 'in_progress'
                        CHECK (status IN ('in_progress', 'completed')),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_maturity_assessments_company
    ON maturity_assessments (company_id, started_at DESC);

-- ── 4. maturity_responses ─────────────────────────────────────────────────
-- One row per question per assessment. selected_level is 1–5.
-- UNIQUE constraint prevents duplicate responses for the same question
-- within one assessment. On resume, the existing row is updated (upsert).
CREATE TABLE IF NOT EXISTS maturity_responses (
    id              SERIAL PRIMARY KEY,
    assessment_id   INT          NOT NULL REFERENCES maturity_assessments(id) ON DELETE CASCADE,
    question_id     INT          NOT NULL REFERENCES maturity_questions(id) ON DELETE CASCADE,
    domain_id       INT          NOT NULL REFERENCES maturity_domains(id) ON DELETE CASCADE,
    selected_level  INT          NOT NULL CHECK (selected_level BETWEEN 1 AND 5),
    commentary      TEXT,
    answered_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (assessment_id, question_id)
);
CREATE INDEX IF NOT EXISTS idx_maturity_responses_assessment
    ON maturity_responses (assessment_id);
CREATE INDEX IF NOT EXISTS idx_maturity_responses_domain
    ON maturity_responses (assessment_id, domain_id);

-- ── 5. maturity_results ───────────────────────────────────────────────────
-- Computed once when an assessment is completed. Stored so results can be
-- retrieved without recalculation. domain_scores is a JSONB array:
-- [{ domain_id, domain_name, weight, score, level, question_count }, ...]
-- overall_score is the weighted average of domain scores (1.00–5.00).
-- overall_level is the rounded overall_score (1–5).
CREATE TABLE IF NOT EXISTS maturity_results (
    id              SERIAL PRIMARY KEY,
    assessment_id   INT          NOT NULL UNIQUE REFERENCES maturity_assessments(id) ON DELETE CASCADE,
    company_id      INT          NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    overall_score   DECIMAL(4,2) NOT NULL,
    overall_level   INT          NOT NULL CHECK (overall_level BETWEEN 1 AND 5),
    domain_scores   JSONB        NOT NULL DEFAULT '[]',
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_maturity_results_company
    ON maturity_results (company_id, created_at DESC);

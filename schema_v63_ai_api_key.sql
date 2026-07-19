-- v63: AI Integration — company-level AI API key
-- Enables the optional AI-assisted Horizon Scanning feature.
-- The key is stored server-side only and never returned in full to the frontend.
-- ai_api_provider is a free-text display label set by the Admin (e.g. "Anthropic", "OpenAI").
-- 'Draft' is added to horizon_scans.status for AI-generated candidate signals awaiting review.

ALTER TABLE companies
    ADD COLUMN IF NOT EXISTS ai_api_key      TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS ai_api_provider TEXT DEFAULT NULL;

COMMENT ON COLUMN companies.ai_api_key IS
    'Encrypted AI provider API key. Set by Admin. Never returned in full to the frontend — '
    'masked as ••••••••XXXX on GET. Used server-side only for /api/horizon-scans/ai-draft.';

COMMENT ON COLUMN companies.ai_api_provider IS
    'Display label for the AI provider (e.g. Anthropic, OpenAI, Azure OpenAI). '
    'Shown in Admin settings for user reference only.';

-- Add Draft to horizon_scans status if the table already exists
DO $$
BEGIN
    -- Drop and recreate the status check to include Draft.
    -- Only runs if horizon_scans exists (it will be created by schema_v61 which runs first).
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'horizon_scans') THEN
        ALTER TABLE horizon_scans DROP CONSTRAINT IF EXISTS horizon_scans_status_check;
        ALTER TABLE horizon_scans
            ADD CONSTRAINT horizon_scans_status_check
            CHECK (status IN ('Draft', 'Monitoring', 'Escalated', 'Converted', 'Dismissed'));
    END IF;
END $$;

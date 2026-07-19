-- schema_v49_rate_limit_attempts.sql
-- Cross-replica rate limiting store.
-- Replaces in-memory Maps (which reset per Cloud Run instance) with a shared
-- Postgres table so limits are enforced consistently across all replicas.
--
-- Table is append-light: one row per limiter+IP, upserted on each request.
-- Background cleanup in server.js purges rows older than 1 hour.

CREATE TABLE IF NOT EXISTS rate_limit_attempts (
    key          TEXT        PRIMARY KEY,          -- '<limiter_name>:<ip>'
    count        INTEGER     NOT NULL DEFAULT 1,
    window_start TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for the periodic cleanup query (DELETE WHERE window_start < now() - interval)
CREATE INDEX IF NOT EXISTS idx_rate_limit_window_start
    ON rate_limit_attempts (window_start);

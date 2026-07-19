-- v64: Risk Appetite — breach notification severity
-- Adds an optional severity level to each appetite statement.
-- When set, a notification email is sent to CRO, risk owner, and the
-- relevant Risk Manager whenever a risk newly breaches the statement threshold.

ALTER TABLE risk_appetite_statements
    ADD COLUMN IF NOT EXISTS breach_notification_severity TEXT
        CHECK (breach_notification_severity IN ('Critical', 'High'));

COMMENT ON COLUMN risk_appetite_statements.breach_notification_severity IS
    'Email notification urgency when a risk newly breaches this appetite threshold. '
    'Critical = immediate action; High = action within 24 hours. NULL = no notifications.';

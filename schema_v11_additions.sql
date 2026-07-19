-- ============================================================
-- GRC App Schema -- Phase 9 additions (Beta V1.2)
-- ============================================================
-- Applied after schema_v10_additions.sql. For fresh installs, all schema
-- files run in order. For existing v10 databases, use migrate-v10-to-v11.js.
--
-- What this adds:
--   1. departments table -- per-company list of departments with 3-letter
--      codes used in department-based Risk IDs (RI-FIN-001 format).
--   2. policies.confidential -- boolean flag; confidential policies are
--      only visible to users explicitly granted access.
--   3. policy_access -- join table granting specific users access to
--      confidential policies.
-- ============================================================

-- 1. Departments
CREATE TABLE IF NOT EXISTS departments (
    id          SERIAL PRIMARY KEY,
    company_id  INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name        VARCHAR(100) NOT NULL,
    code        VARCHAR(10)  NOT NULL,  -- 3-letter code, e.g. FIN, HRD
    sort_order  INTEGER NOT NULL DEFAULT 0,
    active      BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (company_id, code),
    UNIQUE (company_id, name)
);

CREATE INDEX IF NOT EXISTS idx_departments_company ON departments (company_id);

-- Seed default departments for any company that has none yet.
-- This runs once per migration; idempotent because of the ON CONFLICT DO NOTHING.
INSERT INTO departments (company_id, name, code, sort_order)
SELECT c.id, d.name, d.code, d.sort_order
FROM companies c
CROSS JOIN (VALUES
    ('Finance',                    'FIN', 10),
    ('Human Resources',            'HRD', 20),
    ('Operations',                 'OPS', 30),
    ('Information Technology',     'ITS', 40),
    ('Legal & Compliance',         'LEG', 50),
    ('Sales & Marketing',          'SAL', 60),
    ('Executive / Management',     'EXC', 70),
    ('Procurement',                'PRO', 80),
    ('Audit & Internal Control',   'AUD', 90),
    ('General',                    'GEN', 100)
) AS d(name, code, sort_order)
WHERE NOT EXISTS (
    SELECT 1 FROM departments WHERE company_id = c.id
)
ON CONFLICT DO NOTHING;

-- 2. Policy confidentiality flag
ALTER TABLE policies ADD COLUMN IF NOT EXISTS confidential BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Policy access grants (for confidential policies)
CREATE TABLE IF NOT EXISTS policy_access (
    id          SERIAL PRIMARY KEY,
    policy_id   INTEGER NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
    user_id     INTEGER NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
    granted_by  INTEGER REFERENCES users(id),
    granted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (policy_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_policy_access_policy  ON policy_access (policy_id);
CREATE INDEX IF NOT EXISTS idx_policy_access_user    ON policy_access (user_id);

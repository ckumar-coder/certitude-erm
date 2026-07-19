// migrate-v1-to-v2.js
//
// Upgrades an existing v1 database (single-tenant, username/password
// auth) to the v2 multi-tenant schema (companies, email-based auth,
// sessions, audit log, per-company user roles).
//
// What it does:
//   1. Creates the new v2 tables (companies, password_history,
//      user_companies, sessions, audit_log) if they don't exist.
//   2. Creates a default company to "hold" all existing data
//      (configurable via COMPANY_NAME / COMPANY_CODE env vars).
//   3. Renames the old `users` table to `users_v1_legacy` and creates
//      a new v2 `users` table (email-based, with security fields).
//   4. Migrates each legacy user into the new `users` table (deriving
//      an email if the old username wasn't one) + a `user_companies`
//      row mapping their old role to the new Admin/Manager/Viewer model.
//   5. Adds `company_id` to risk_categories, matrix_settings, and risks,
//      backfills it to the default company, and updates constraints.
//
// Usage:
//   DATABASE_URL=postgresql://... COMPANY_NAME="Acme Holdings" COMPANY_CODE="ACM" node migrate-v1-to-v2.js
//
// Safe to re-run: every step checks for prior completion before acting.

const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const COMPANY_NAME = process.env.COMPANY_NAME || 'Default Company';
const COMPANY_CODE = (process.env.COMPANY_CODE || 'DEF').toUpperCase().slice(0, 20);

// Maps a v1 (role, governance_tier) pair to a v2 per-company role.
function mapLegacyRole(role, governanceTier) {
    if (role === 'Admin') return 'Admin';
    if (governanceTier === 'Governance') return 'Manager';
    return 'Manager'; // v1 had no read-only "Viewer" concept; default operational users to Manager
}

async function tableExists(client, name) {
    const res = await client.query(`SELECT 1 FROM information_schema.tables WHERE table_name = $1`, [name]);
    return res.rows.length > 0;
}

async function columnExists(client, table, column) {
    const res = await client.query(
        `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
        [table, column]
    );
    return res.rows.length > 0;
}

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // ---- 1. New v2-only tables ----
        await client.query(`
            CREATE TABLE IF NOT EXISTS companies (
                id SERIAL PRIMARY KEY,
                name VARCHAR(200) NOT NULL,
                code VARCHAR(20) UNIQUE NOT NULL,
                parent_company_id INT REFERENCES companies(id) ON DELETE SET NULL,
                branding_logo_url TEXT,
                branding_primary_color VARCHAR(7) NOT NULL DEFAULT '#2563eb',
                is_active BOOLEAN NOT NULL DEFAULT true,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now()
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS sessions (
                token VARCHAR(64) PRIMARY KEY,
                user_id INT NOT NULL,
                active_company_id INT REFERENCES companies(id) ON DELETE SET NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                expires_at TIMESTAMPTZ NOT NULL
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS audit_log (
                id BIGSERIAL PRIMARY KEY,
                company_id INT REFERENCES companies(id) ON DELETE CASCADE,
                entity_type VARCHAR(50) NOT NULL,
                entity_id INT,
                action VARCHAR(30) NOT NULL,
                changed_by INT,
                changed_by_email VARCHAR(255),
                changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                details JSONB
            )
        `);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log (entity_type, entity_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_audit_log_company ON audit_log (company_id, changed_at DESC)`);

        // ---- 2. Default company ----
        let companyId;
        const existingCompany = await client.query('SELECT id FROM companies WHERE code = $1', [COMPANY_CODE]);
        if (existingCompany.rows.length > 0) {
            companyId = existingCompany.rows[0].id;
            console.log(`✔ Using existing company '${COMPANY_CODE}' (id=${companyId})`);
        } else {
            const insertCompany = await client.query(
                'INSERT INTO companies (name, code) VALUES ($1, $2) RETURNING id',
                [COMPANY_NAME, COMPANY_CODE]
            );
            companyId = insertCompany.rows[0].id;
            console.log(`✔ Created default company '${COMPANY_NAME}' (${COMPANY_CODE}), id=${companyId}`);
        }

        // ---- 3 & 4. Users table migration ----
        const usersIsV1 = (await columnExists(client, 'users', 'username')) && !(await columnExists(client, 'users', 'email'));

        if (usersIsV1) {
            console.log('↻ Migrating users table (v1 -> v2)...');

            await client.query('ALTER TABLE users RENAME TO users_v1_legacy');

            await client.query(`
                CREATE TABLE users (
                    id SERIAL PRIMARY KEY,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    full_name VARCHAR(200) NOT NULL DEFAULT '',
                    password_hash TEXT NOT NULL,
                    is_super_admin BOOLEAN NOT NULL DEFAULT false,
                    is_active BOOLEAN NOT NULL DEFAULT true,
                    failed_login_attempts INT NOT NULL DEFAULT 0,
                    locked_until TIMESTAMPTZ,
                    must_change_password BOOLEAN NOT NULL DEFAULT false,
                    password_changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
                )
            `);

            await client.query(`
                CREATE TABLE IF NOT EXISTS password_history (
                    id SERIAL PRIMARY KEY,
                    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    password_hash TEXT NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
                )
            `);
            await client.query(`CREATE INDEX IF NOT EXISTS idx_password_history_user ON password_history (user_id, created_at DESC)`);

            await client.query(`
                CREATE TABLE IF NOT EXISTS user_companies (
                    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
                    role VARCHAR(20) NOT NULL DEFAULT 'Viewer' CHECK (role IN ('Admin','Manager','Viewer')),
                    functional_role VARCHAR(100),
                    department VARCHAR(100),
                    PRIMARY KEY (user_id, company_id)
                )
            `);
            await client.query(`CREATE INDEX IF NOT EXISTS idx_user_companies_company ON user_companies (company_id)`);

            const legacyUsers = await client.query('SELECT * FROM users_v1_legacy ORDER BY id');
            for (const u of legacyUsers.rows) {
                const email = u.username.includes('@')
                    ? u.username
                    : `${u.username}@${COMPANY_CODE.toLowerCase()}.local`;

                const isSuperAdmin = u.role === 'Admin';

                const insertUser = await client.query(
                    `INSERT INTO users (email, full_name, password_hash, is_super_admin, must_change_password)
                     VALUES ($1, $2, $3, $4, true)
                     ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
                     RETURNING id`,
                    [email, u.username, u.password_hash, isSuperAdmin]
                );
                const newUserId = insertUser.rows[0].id;

                await client.query(
                    `INSERT INTO user_companies (user_id, company_id, role, functional_role, department)
                     VALUES ($1, $2, $3, $4, $5)
                     ON CONFLICT (user_id, company_id) DO NOTHING`,
                    [
                        newUserId,
                        companyId,
                        mapLegacyRole(u.role, u.governance_tier),
                        u.functional_role || null,
                        u.department || null,
                    ]
                );

                console.log(`  - ${u.username} -> ${email} (role: ${mapLegacyRole(u.role, u.governance_tier)}, super_admin: ${isSuperAdmin})`);
            }
            console.log(`✔ Migrated ${legacyUsers.rows.length} users. Old table preserved as 'users_v1_legacy'.`);
            console.log('  ⚠ All migrated users have must_change_password = true (their old passwords still work until then).');
        } else {
            console.log('✔ users table already in v2 shape, skipping');
        }

        // ---- 5. company_id on risk_categories, matrix_settings, risks ----

        if (!(await columnExists(client, 'risk_categories', 'company_id'))) {
            console.log('↻ Adding company_id to risk_categories...');
            await client.query('ALTER TABLE risk_categories ADD COLUMN company_id INT REFERENCES companies(id)');
            await client.query('UPDATE risk_categories SET company_id = $1', [companyId]);
            await client.query('ALTER TABLE risk_categories ALTER COLUMN company_id SET NOT NULL');
            // Replace global-unique(name) with per-company-unique(company_id, name)
            await client.query('ALTER TABLE risk_categories DROP CONSTRAINT IF EXISTS risk_categories_name_key');
            await client.query('ALTER TABLE risk_categories ADD CONSTRAINT risk_categories_company_name_key UNIQUE (company_id, name)');
            console.log('✔ risk_categories migrated');
        } else {
            console.log('✔ risk_categories already has company_id, skipping');
        }

        if (!(await columnExists(client, 'matrix_settings', 'company_id'))) {
            console.log('↻ Migrating matrix_settings to per-company...');
            const old = await client.query('SELECT current_dimensions, fiscal_year_start_month FROM matrix_settings WHERE id = 1');
            const row = old.rows[0] || { current_dimensions: '5x5', fiscal_year_start_month: 0 };

            await client.query('ALTER TABLE matrix_settings RENAME TO matrix_settings_v1_legacy');
            await client.query(`
                CREATE TABLE matrix_settings (
                    company_id INT PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
                    current_dimensions VARCHAR(10) NOT NULL DEFAULT '5x5',
                    fiscal_year_start_month INT NOT NULL DEFAULT 0
                )
            `);
            await client.query(
                'INSERT INTO matrix_settings (company_id, current_dimensions, fiscal_year_start_month) VALUES ($1, $2, $3)',
                [companyId, row.current_dimensions, row.fiscal_year_start_month]
            );
            console.log('✔ matrix_settings migrated');
        } else {
            console.log('✔ matrix_settings already per-company, skipping');
        }

        if (!(await columnExists(client, 'risks', 'company_id'))) {
            console.log('↻ Adding company_id to risks...');
            await client.query('ALTER TABLE risks ADD COLUMN company_id INT REFERENCES companies(id)');
            await client.query('UPDATE risks SET company_id = $1', [companyId]);
            await client.query('ALTER TABLE risks ALTER COLUMN company_id SET NOT NULL');
            await client.query('ALTER TABLE risks DROP CONSTRAINT IF EXISTS risks_risk_uid_version_key');
            await client.query('ALTER TABLE risks ADD CONSTRAINT risks_company_uid_version_key UNIQUE (company_id, risk_uid, version)');
            await client.query('CREATE INDEX IF NOT EXISTS idx_risks_company ON risks (company_id)');
            console.log('✔ risks migrated');
        } else {
            console.log('✔ risks already has company_id, skipping');
        }

        await client.query('COMMIT');
        console.log('🎉 v1 -> v2 migration complete.');
        console.log(`   Default company: "${COMPANY_NAME}" (${COMPANY_CODE}), id=${companyId}`);
        console.log('   All migrated users must change their password on next login.');
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
        await pool.end();
    }
}

migrate().catch((err) => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
});

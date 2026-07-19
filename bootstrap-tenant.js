// bootstrap-tenant.js
//
// One-time setup for a brand-new client instance (G1: "one application
// instance per client"). Run this once against a fresh database, after
// migrate-all.js has applied the schema.
//
// Creates:
//   - The client's first company (e.g. the group holding company --
//     additional subsidiary companies can be added later via the
//     Admin's "Companies" management, or by inserting more rows into
//     `companies` and `user_companies`).
//   - A default risk category list (B1).
//   - Default matrix_settings (5x5, fiscal year starting January).
//   - The five default escalation rules (G5) -- same defaults as
//     migrate-v7-to-v8.js seeds for existing companies.
//   - The first Admin user, with a generated temporary password that
//     must be changed on first login.
//
// Safe to re-run: if a company with the given code already exists, it
// reuses that company and only fills in missing pieces (categories,
// matrix settings, escalation rules, admin user) -- it won't create
// duplicates.
//
// Usage:
//   DATABASE_URL=postgresql://... \
//   COMPANY_NAME="Acme Holdings" COMPANY_CODE="ACM" \
//   ADMIN_EMAIL="admin@acme.com" ADMIN_FULL_NAME="Acme Admin" \
//   node bootstrap-tenant.js
//
// ADMIN_PASSWORD is optional -- if not set, a random temporary password
// is generated and printed once (it is NOT stored anywhere in plain
// text, so save it from the console output).

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const COMPANY_NAME = process.env.COMPANY_NAME;
const COMPANY_CODE = (process.env.COMPANY_CODE || '').toUpperCase().slice(0, 20);
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
const ADMIN_FULL_NAME = process.env.ADMIN_FULL_NAME || 'Administrator';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || null;

// Optional per-instance branding applied to the company row.
// BRANDING_LOGO_URL: public GCS URL or data: URI for the client logo.
// BRANDING_PRIMARY_COLOR: hex color for the app's primary color theme.
const BRANDING_LOGO_URL = process.env.BRANDING_LOGO_URL || null;
const BRANDING_PRIMARY_COLOR = process.env.BRANDING_PRIMARY_COLOR || null;

const DEFAULT_CATEGORIES = ['Operational Risk', 'Financial Risk', 'Compliance Risk', 'Strategic Risk', 'Reputational Risk'];

// Same defaults as migrate-v8-to-v9.js.
const DEFAULT_CAUSES = [
    'People - Human Error',
    'People - Skills/Training Gap',
    'Process - Inadequate or Outdated Procedure',
    'Process - Lack of Control',
    'Technology - System Failure',
    'Technology - Cyber/Security Incident',
    'External - Third Party/Vendor',
    'External - Regulatory Change',
    'External - Market/Economic Conditions',
    'Other',
];
const DEFAULT_CONSEQUENCES = [
    'Financial Loss',
    'Regulatory Fine or Sanction',
    'Reputational Damage',
    'Operational Disruption',
    'Legal Liability',
    'Data Breach / Loss of Confidentiality',
    'Customer or Client Impact',
    'Other',
];

// Same defaults as migrate-v7-to-v8.js -- kept in sync manually since
// each is a small, deliberate Tier-1 default rather than shared code.
const DEFAULT_ESCALATION_RULES = [
    { trigger_type: 'control_test_overdue', threshold_days: 0, notify_target: 'Owner', escalate_after_days: 14, escalate_to: 'Department Manager', channels: 'in_app' },
    { trigger_type: 'kri_red_breach', threshold_days: 0, notify_target: 'Owner', escalate_after_days: 3, escalate_to: 'Department Manager', channels: 'in_app' },
    { trigger_type: 'policy_review_due', threshold_days: 30, notify_target: 'Owner', escalate_after_days: null, escalate_to: null, channels: 'in_app' },
    { trigger_type: 'issue_overdue', threshold_days: 0, notify_target: 'Owner', escalate_after_days: 30, escalate_to: 'Department Manager', channels: 'in_app' },
    { trigger_type: 'obligation_non_compliant', threshold_days: 0, notify_target: 'Department Manager', escalate_after_days: 7, escalate_to: 'Admin', channels: 'in_app' },
];

function fail(msg) {
    console.error(`❌ ${msg}`);
    process.exit(1);
}

async function bootstrap() {
    if (!COMPANY_NAME) fail('COMPANY_NAME is required');
    if (!COMPANY_CODE) fail('COMPANY_CODE is required');
    if (!ADMIN_EMAIL) fail('ADMIN_EMAIL is required');

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // ---- Company ----
        let company = await client.query('SELECT id FROM companies WHERE code = $1', [COMPANY_CODE]);
        let companyId;
        if (company.rows.length > 0) {
            companyId = company.rows[0].id;
            console.log(`✔ Company '${COMPANY_CODE}' already exists (id=${companyId}), reusing`);
        } else {
            const insert = await client.query('INSERT INTO companies (name, code) VALUES ($1, $2) RETURNING id', [COMPANY_NAME, COMPANY_CODE]);
            companyId = insert.rows[0].id;
            console.log(`✔ Created company '${COMPANY_NAME}' (${COMPANY_CODE}), id=${companyId}`);
        }

        // ---- Instance branding (logo + primary color) ----
        if (BRANDING_LOGO_URL || BRANDING_PRIMARY_COLOR) {
            const brandUpdates = [];
            const brandValues = [];
            if (BRANDING_LOGO_URL) {
                brandValues.push(BRANDING_LOGO_URL);
                brandUpdates.push(`branding_logo_url = $${brandValues.length}`);
            }
            if (BRANDING_PRIMARY_COLOR) {
                brandValues.push(BRANDING_PRIMARY_COLOR);
                brandUpdates.push(`branding_primary_color = $${brandValues.length}`);
            }
            brandValues.push(companyId);
            await client.query(
                `UPDATE companies SET ${brandUpdates.join(', ')} WHERE id = $${brandValues.length}`,
                brandValues
            );
            console.log(`✔ Branding applied (logo: ${BRANDING_LOGO_URL ? 'set' : 'unchanged'}, color: ${BRANDING_PRIMARY_COLOR || 'unchanged'})`);
        }

        // ---- Default risk categories ----
        for (let i = 0; i < DEFAULT_CATEGORIES.length; i++) {
            await client.query(
                `INSERT INTO risk_categories (company_id, name, sort_order) VALUES ($1, $2, $3) ON CONFLICT (company_id, name) DO NOTHING`,
                [companyId, DEFAULT_CATEGORIES[i], i]
            );
        }
        console.log(`✔ Default risk categories ensured`);

        // ---- Default cause/consequence taxonomy ----
        for (let i = 0; i < DEFAULT_CAUSES.length; i++) {
            await client.query(
                `INSERT INTO risk_taxonomy_terms (company_id, term_type, name, sort_order) VALUES ($1,'cause',$2,$3) ON CONFLICT (company_id, term_type, name) DO NOTHING`,
                [companyId, DEFAULT_CAUSES[i], i]
            );
        }
        for (let i = 0; i < DEFAULT_CONSEQUENCES.length; i++) {
            await client.query(
                `INSERT INTO risk_taxonomy_terms (company_id, term_type, name, sort_order) VALUES ($1,'consequence',$2,$3) ON CONFLICT (company_id, term_type, name) DO NOTHING`,
                [companyId, DEFAULT_CONSEQUENCES[i], i]
            );
        }
        console.log(`✔ Default risk cause/consequence taxonomy ensured`);

        // ---- Matrix settings (5x5, fiscal year starts January) ----
        await client.query(
            `INSERT INTO matrix_settings (company_id, current_dimensions, fiscal_year_start_month) VALUES ($1, '5x5', 0) ON CONFLICT (company_id) DO NOTHING`,
            [companyId]
        );
        console.log(`✔ Matrix settings ensured`);

        // ---- Default escalation rules (G5) ----
        for (const rule of DEFAULT_ESCALATION_RULES) {
            await client.query(
                `INSERT INTO escalation_rules (company_id, trigger_type, threshold_days, notify_target, escalate_after_days, escalate_to, channels)
                 VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (company_id, trigger_type) DO NOTHING`,
                [companyId, rule.trigger_type, rule.threshold_days, rule.notify_target, rule.escalate_after_days, rule.escalate_to, rule.channels]
            );
        }
        console.log(`✔ Default escalation rules ensured`);

        // ---- First Admin user ----
        const existingUser = await client.query('SELECT id FROM users WHERE email = $1', [ADMIN_EMAIL]);
        let adminUserId;
        let generatedPassword = null;
        if (existingUser.rows.length > 0) {
            adminUserId = existingUser.rows[0].id;
            console.log(`✔ User '${ADMIN_EMAIL}' already exists (id=${adminUserId}), reusing`);
        } else {
            const tempPassword = ADMIN_PASSWORD || crypto.randomBytes(9).toString('base64');
            const hash = await bcrypt.hash(tempPassword, 10);
            const insertUser = await client.query(
                `INSERT INTO users (email, full_name, password_hash, must_change_password) VALUES ($1,$2,$3,true) RETURNING id`,
                [ADMIN_EMAIL, ADMIN_FULL_NAME, hash]
            );
            adminUserId = insertUser.rows[0].id;
            await client.query('INSERT INTO password_history (user_id, password_hash) VALUES ($1, $2)', [adminUserId, hash]);
            generatedPassword = tempPassword;
            console.log(`✔ Created Admin user '${ADMIN_EMAIL}' (id=${adminUserId})`);
        }

        const existingMembership = await client.query('SELECT 1 FROM user_companies WHERE user_id = $1 AND company_id = $2', [adminUserId, companyId]);
        if (existingMembership.rows.length === 0) {
            await client.query(
                `INSERT INTO user_companies (user_id, company_id, role, functional_role, department) VALUES ($1,$2,'Admin','Administrator',NULL)`,
                [adminUserId, companyId]
            );
            console.log(`✔ Granted '${ADMIN_EMAIL}' Admin access to company ${companyId}`);
        }

        await client.query('COMMIT');

        console.log('');
        console.log('🎉 Tenant bootstrap complete.');
        console.log(`   Company: ${COMPANY_NAME} (${COMPANY_CODE}), id=${companyId}`);
        console.log(`   Admin login: ${ADMIN_EMAIL}`);
        if (generatedPassword) {
            console.log(`   Temporary password: ${generatedPassword}`);
            console.log('   (must be changed on first login -- this is not stored anywhere; save it now)');
        }
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
        await pool.end();
    }
}

bootstrap().catch((err) => {
    console.error('❌ Bootstrap failed:', err);
    process.exit(1);
});

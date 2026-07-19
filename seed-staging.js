// seed-staging.js
//
// Idempotent tenant seed for the staging environment.
// Run via Cloud Run Job after migrate-all.js.
//
// Creates the Certitude Advisory company and admin user if they don't exist,
// then ensures must_change_password=false so test-suite.js can log in without
// a forced password-change step.
//
// All values come from environment variables so nothing is hard-coded:
//   DATABASE_URL      — injected by Cloud Run (from Secret Manager)
//   ADMIN_EMAIL       — admin login (required)
//   ADMIN_PASSWORD    — admin password to set (required)
//   ADMIN_FULL_NAME   — display name (optional, defaults to 'Administrator')
//   COMPANY_NAME      — company display name (required)
//   COMPANY_CODE      — short code, e.g. CERT (required)

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const COMPANY_NAME    = process.env.COMPANY_NAME    || '';
const COMPANY_CODE    = (process.env.COMPANY_CODE   || '').toUpperCase().slice(0, 20);
const ADMIN_EMAIL     = (process.env.ADMIN_EMAIL    || '').toLowerCase().trim();
const ADMIN_FULL_NAME = process.env.ADMIN_FULL_NAME || 'Administrator';
const ADMIN_PASSWORD  = process.env.ADMIN_PASSWORD  || '';

const DEFAULT_CATEGORIES = [
    'Operational Risk', 'Financial Risk', 'Compliance Risk',
    'Strategic Risk', 'Reputational Risk',
];
const DEFAULT_CAUSES = [
    'People - Human Error', 'People - Skills/Training Gap',
    'Process - Inadequate or Outdated Procedure', 'Process - Lack of Control',
    'Technology - System Failure', 'Technology - Cyber/Security Incident',
    'External - Third Party/Vendor', 'External - Regulatory Change',
    'External - Market/Economic Conditions', 'Other',
];
const DEFAULT_CONSEQUENCES = [
    'Financial Loss', 'Regulatory Fine or Sanction', 'Reputational Damage',
    'Operational Disruption', 'Legal Liability',
    'Data Breach / Loss of Confidentiality', 'Customer or Client Impact', 'Other',
];
const DEFAULT_ESCALATION_RULES = [
    { trigger_type: 'control_test_overdue',    threshold_days: 0,  notify_target: 'Owner',              escalate_after_days: 14,  escalate_to: 'Department Manager', channels: 'in_app' },
    { trigger_type: 'kri_red_breach',          threshold_days: 0,  notify_target: 'Owner',              escalate_after_days: 3,   escalate_to: 'Department Manager', channels: 'in_app' },
    { trigger_type: 'policy_review_due',       threshold_days: 30, notify_target: 'Owner',              escalate_after_days: null, escalate_to: null,                channels: 'in_app' },
    { trigger_type: 'issue_overdue',           threshold_days: 0,  notify_target: 'Owner',              escalate_after_days: 30,  escalate_to: 'Department Manager', channels: 'in_app' },
    { trigger_type: 'obligation_non_compliant',threshold_days: 0,  notify_target: 'Department Manager', escalate_after_days: 7,   escalate_to: 'Admin',             channels: 'in_app' },
];

function fail(msg) { console.error(`❌ ${msg}`); process.exit(1); }

async function seed() {
    if (!COMPANY_NAME)   fail('COMPANY_NAME is required');
    if (!COMPANY_CODE)   fail('COMPANY_CODE is required');
    if (!ADMIN_EMAIL)    fail('ADMIN_EMAIL is required');
    if (!ADMIN_PASSWORD) fail('ADMIN_PASSWORD is required');

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Company
        let { rows: co } = await client.query('SELECT id FROM companies WHERE code = $1', [COMPANY_CODE]);
        let companyId;
        if (co.length > 0) {
            companyId = co[0].id;
            console.log(`✔ Company '${COMPANY_CODE}' already exists (id=${companyId})`);
        } else {
            const { rows } = await client.query(
                'INSERT INTO companies (name, code) VALUES ($1, $2) RETURNING id',
                [COMPANY_NAME, COMPANY_CODE]
            );
            companyId = rows[0].id;
            console.log(`✔ Created company '${COMPANY_NAME}' (${COMPANY_CODE}), id=${companyId}`);
        }

        // Risk categories
        for (let i = 0; i < DEFAULT_CATEGORIES.length; i++) {
            await client.query(
                `INSERT INTO risk_categories (company_id, name, sort_order)
                 VALUES ($1,$2,$3) ON CONFLICT (company_id, name) DO NOTHING`,
                [companyId, DEFAULT_CATEGORIES[i], i]
            );
        }
        console.log('✔ Risk categories ensured');

        // Taxonomy
        for (let i = 0; i < DEFAULT_CAUSES.length; i++) {
            await client.query(
                `INSERT INTO risk_taxonomy_terms (company_id, term_type, name, sort_order)
                 VALUES ($1,'cause',$2,$3) ON CONFLICT (company_id, term_type, name) DO NOTHING`,
                [companyId, DEFAULT_CAUSES[i], i]
            );
        }
        for (let i = 0; i < DEFAULT_CONSEQUENCES.length; i++) {
            await client.query(
                `INSERT INTO risk_taxonomy_terms (company_id, term_type, name, sort_order)
                 VALUES ($1,'consequence',$2,$3) ON CONFLICT (company_id, term_type, name) DO NOTHING`,
                [companyId, DEFAULT_CONSEQUENCES[i], i]
            );
        }
        console.log('✔ Risk taxonomy ensured');

        // Matrix settings
        await client.query(
            `INSERT INTO matrix_settings (company_id, current_dimensions, fiscal_year_start_month)
             VALUES ($1,'5x5',0) ON CONFLICT (company_id) DO NOTHING`,
            [companyId]
        );
        console.log('✔ Matrix settings ensured');

        // Escalation rules
        for (const rule of DEFAULT_ESCALATION_RULES) {
            await client.query(
                `INSERT INTO escalation_rules
                     (company_id, trigger_type, threshold_days, notify_target,
                      escalate_after_days, escalate_to, channels)
                 VALUES ($1,$2,$3,$4,$5,$6,$7)
                 ON CONFLICT (company_id, trigger_type) DO NOTHING`,
                [companyId, rule.trigger_type, rule.threshold_days, rule.notify_target,
                 rule.escalate_after_days, rule.escalate_to, rule.channels]
            );
        }
        console.log('✔ Escalation rules ensured');

        // Admin user
        const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
        const { rows: eu } = await client.query('SELECT id FROM users WHERE email = $1', [ADMIN_EMAIL]);
        let adminUserId;
        if (eu.length > 0) {
            adminUserId = eu[0].id;
            // Update password and clear must_change_password
            await client.query(
                'UPDATE users SET password_hash=$1, must_change_password=false WHERE id=$2',
                [hash, adminUserId]
            );
            console.log(`✔ Admin '${ADMIN_EMAIL}' already exists — password updated, must_change_password cleared`);
        } else {
            const { rows } = await client.query(
                `INSERT INTO users (email, full_name, password_hash, must_change_password)
                 VALUES ($1,$2,$3,false) RETURNING id`,
                [ADMIN_EMAIL, ADMIN_FULL_NAME, hash]
            );
            adminUserId = rows[0].id;
            await client.query(
                'INSERT INTO password_history (user_id, password_hash) VALUES ($1,$2)',
                [adminUserId, hash]
            );
            console.log(`✔ Created Admin user '${ADMIN_EMAIL}' (id=${adminUserId})`);
        }

        // Company membership
        const { rows: em } = await client.query(
            'SELECT 1 FROM user_companies WHERE user_id=$1 AND company_id=$2',
            [adminUserId, companyId]
        );
        if (em.length === 0) {
            await client.query(
                `INSERT INTO user_companies (user_id, company_id, role, functional_role, department)
                 VALUES ($1,$2,'Admin','Administrator',NULL)`,
                [adminUserId, companyId]
            );
            console.log(`✔ Granted Admin membership to company ${companyId}`);
        } else {
            console.log('✔ Admin membership already exists');
        }

        await client.query('COMMIT');
        console.log('');
        console.log('🎉 Staging seed complete.');
        console.log(`   Company: ${COMPANY_NAME} (${COMPANY_CODE})`);
        console.log(`   Admin:   ${ADMIN_EMAIL}`);
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
        await pool.end();
    }
}

seed().catch(err => { console.error('❌ Seed failed:', err); process.exit(1); });

// migrate-raci-matrix.js
// Creates raci_matrix table and seeds default values for all existing companies.
// Run: ADMIN_PASS='TestPass123!' node migrate-raci-matrix.js

require('dotenv').config({ path: './gcp-config.env' });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const DEFAULT_RACI = [
    // Risk Register
    { module: 'Risk Register',          sort_order: 10,  activity: 'Identify and submit risk',      admin: 'I',   cro: 'A',   consultant_cro: 'C', manager: 'R', approver: 'C', submitter: 'R', viewer: 'I' },
    { module: 'Risk Register',          sort_order: 20,  activity: 'Assess and score risk',          admin: 'I',   cro: 'A',   consultant_cro: 'C', manager: 'R', approver: 'R', submitter: 'C', viewer: 'I' },
    { module: 'Risk Register',          sort_order: 30,  activity: 'Approve risk rating',            admin: 'I',   cro: 'A',   consultant_cro: 'C', manager: 'C', approver: '',  submitter: '',  viewer: 'I' },
    { module: 'Risk Register',          sort_order: 40,  activity: 'Escalate critical risk',         admin: 'I',   cro: 'R/A', consultant_cro: 'C', manager: 'C', approver: '',  submitter: '',  viewer: 'I' },
    { module: 'Risk Register',          sort_order: 50,  activity: 'Review and close risk',          admin: 'I',   cro: 'A',   consultant_cro: 'C', manager: 'R', approver: '',  submitter: '',  viewer: 'I' },
    // Control Library
    { module: 'Control Library',        sort_order: 110, activity: 'Define or update control',       admin: 'I',   cro: 'A',   consultant_cro: 'C', manager: 'R', approver: 'C', submitter: '',  viewer: 'I' },
    { module: 'Control Library',        sort_order: 120, activity: 'Execute control test',           admin: 'I',   cro: 'A',   consultant_cro: 'C', manager: 'R', approver: 'R', submitter: '',  viewer: 'I' },
    { module: 'Control Library',        sort_order: 130, activity: 'Upload test evidence',           admin: 'I',   cro: 'I',   consultant_cro: 'I', manager: 'R', approver: 'R', submitter: '',  viewer: 'I' },
    { module: 'Control Library',        sort_order: 140, activity: 'Approve test result',            admin: 'I',   cro: 'A',   consultant_cro: 'C', manager: 'A', approver: '',  submitter: '',  viewer: 'I' },
    // KRI
    { module: 'KRI',                    sort_order: 210, activity: 'Define KRI and thresholds',      admin: 'I',   cro: 'A',   consultant_cro: 'C', manager: 'R', approver: 'C', submitter: '',  viewer: 'I' },
    { module: 'KRI',                    sort_order: 220, activity: 'Record KRI measurement',         admin: 'I',   cro: 'I',   consultant_cro: 'I', manager: 'R', approver: 'R', submitter: '',  viewer: 'I' },
    { module: 'KRI',                    sort_order: 230, activity: 'Review KRI breaches',            admin: 'I',   cro: 'A',   consultant_cro: 'C', manager: 'R', approver: 'C', submitter: '',  viewer: 'I' },
    // Issues and Actions
    { module: 'Issues and Actions',     sort_order: 310, activity: 'Raise issue',                    admin: 'I',   cro: 'A',   consultant_cro: 'C', manager: 'R', approver: 'C', submitter: 'R', viewer: 'I' },
    { module: 'Issues and Actions',     sort_order: 320, activity: 'Assign owner department',        admin: 'I',   cro: 'A',   consultant_cro: 'C', manager: 'R', approver: '',  submitter: '',  viewer: 'I' },
    { module: 'Issues and Actions',     sort_order: 330, activity: 'Develop remediation plan',       admin: 'I',   cro: 'A',   consultant_cro: 'C', manager: 'R', approver: 'R', submitter: '',  viewer: 'I' },
    { module: 'Issues and Actions',     sort_order: 340, activity: 'Verify issue closure',           admin: 'I',   cro: 'A',   consultant_cro: 'C', manager: 'A', approver: '',  submitter: '',  viewer: 'I' },
    // Compliance Obligations
    { module: 'Compliance Obligations', sort_order: 410, activity: 'Add or update obligation',       admin: 'I',   cro: 'A',   consultant_cro: 'R', manager: 'R', approver: 'C', submitter: '',  viewer: 'I' },
    { module: 'Compliance Obligations', sort_order: 420, activity: 'Monitor obligation status',      admin: 'I',   cro: 'A',   consultant_cro: 'C', manager: 'R', approver: 'R', submitter: '',  viewer: 'I' },
    { module: 'Compliance Obligations', sort_order: 430, activity: 'Escalate overdue obligation',    admin: 'I',   cro: 'A',   consultant_cro: 'C', manager: 'R', approver: '',  submitter: '',  viewer: 'I' },
    // Policy Repository
    { module: 'Policy Repository',      sort_order: 510, activity: 'Draft or update policy',         admin: 'I',   cro: 'A',   consultant_cro: 'C', manager: 'R', approver: 'C', submitter: '',  viewer: 'I' },
    { module: 'Policy Repository',      sort_order: 520, activity: 'Approve and publish policy',     admin: 'I',   cro: 'A',   consultant_cro: 'C', manager: 'C', approver: '',  submitter: '',  viewer: 'I' },
    { module: 'Policy Repository',      sort_order: 530, activity: 'Acknowledge policy',             admin: 'I',   cro: 'I',   consultant_cro: 'I', manager: 'I', approver: 'I', submitter: 'R', viewer: 'I' },
    // Governance
    { module: 'Governance',             sort_order: 610, activity: 'Review management summary',      admin: 'I',   cro: 'A',   consultant_cro: 'C', manager: 'R', approver: '',  submitter: '',  viewer: 'I' },
    { module: 'Governance',             sort_order: 620, activity: 'Review maturity assessment',     admin: 'I',   cro: 'A',   consultant_cro: 'C', manager: 'R', approver: 'C', submitter: '',  viewer: 'I' },
    { module: 'Governance',             sort_order: 630, activity: 'View compliance calendar',       admin: 'I',   cro: 'I',   consultant_cro: 'I', manager: 'I', approver: 'I', submitter: 'I', viewer: 'I' },
    // System Administration
    { module: 'System Administration',  sort_order: 710, activity: 'Manage users and access',       admin: 'R/A', cro: 'I',   consultant_cro: '',  manager: '',  approver: '',  submitter: '',  viewer: '' },
    { module: 'System Administration',  sort_order: 720, activity: 'Configure departments',         admin: 'R/A', cro: 'I',   consultant_cro: '',  manager: '',  approver: '',  submitter: '',  viewer: '' },
    { module: 'System Administration',  sort_order: 730, activity: 'Manage escalation rules',       admin: 'R/A', cro: 'C',   consultant_cro: '',  manager: '',  approver: '',  submitter: '',  viewer: '' },
    { module: 'System Administration',  sort_order: 740, activity: 'Import and export data',        admin: 'R/A', cro: 'C',   consultant_cro: '',  manager: '',  approver: '',  submitter: '',  viewer: '' },
];

async function seedCompany(client, companyId) {
    for (const row of DEFAULT_RACI) {
        await client.query(
            `INSERT INTO raci_matrix
                (company_id, module, activity, admin, cro, consultant_cro, manager, approver, submitter, viewer, sort_order)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
             ON CONFLICT (company_id, module, activity) DO NOTHING`,
            [companyId, row.module, row.activity, row.admin, row.cro, row.consultant_cro,
             row.manager, row.approver, row.submitter, row.viewer, row.sort_order]
        );
    }
}

async function run() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Create table
        await client.query(`
            CREATE TABLE IF NOT EXISTS raci_matrix (
                id              SERIAL PRIMARY KEY,
                company_id      INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
                module          TEXT NOT NULL,
                activity        TEXT NOT NULL,
                sort_order      INTEGER NOT NULL DEFAULT 0,
                admin           TEXT NOT NULL DEFAULT '',
                cro             TEXT NOT NULL DEFAULT '',
                consultant_cro  TEXT NOT NULL DEFAULT '',
                manager         TEXT NOT NULL DEFAULT '',
                approver        TEXT NOT NULL DEFAULT '',
                submitter       TEXT NOT NULL DEFAULT '',
                viewer          TEXT NOT NULL DEFAULT '',
                updated_at      TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE (company_id, module, activity)
            )
        `);
        console.log('Table created (or already exists).');

        // 2. Seed all existing companies
        const companies = await client.query('SELECT id FROM companies WHERE is_active = true');
        console.log(`Seeding ${companies.rows.length} company(ies)…`);
        for (const { id } of companies.rows) {
            await seedCompany(client, id);
            console.log(`  Seeded: ${id}`);
        }

        await client.query('COMMIT');
        console.log('Done.');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', e.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

run();

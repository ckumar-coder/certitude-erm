// migrate-v8-to-v9.js
//
// Upgrades a v8 database to v9 (Risk Register Enhancements):
//   - Applies schema_v9_additions.sql (Corrective control type, risk
//     lifecycle/closure, risk appetite score, risk velocity, risk_links,
//     risk_taxonomy_terms).
//   - Seeds default cause/consequence taxonomy terms for every existing
//     company, so the new controlled-vocabulary dropdowns aren't empty.
//     Admins can edit this list afterwards (no UI restriction on adding
//     more terms via the API).
//
// Usage:
//   DATABASE_URL=postgresql://... node migrate-v8-to-v9.js

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

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

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('↻ Applying schema_v9_additions.sql...');
        const sql = fs.readFileSync(path.join(__dirname, 'schema_v9_additions.sql'), 'utf8');
        await client.query(sql);
        console.log('✔ Schema additions applied');

        const companies = await client.query('SELECT id FROM companies');
        for (const company of companies.rows) {
            for (let i = 0; i < DEFAULT_CAUSES.length; i++) {
                await client.query(
                    `INSERT INTO risk_taxonomy_terms (company_id, term_type, name, sort_order) VALUES ($1,'cause',$2,$3) ON CONFLICT (company_id, term_type, name) DO NOTHING`,
                    [company.id, DEFAULT_CAUSES[i], i]
                );
            }
            for (let i = 0; i < DEFAULT_CONSEQUENCES.length; i++) {
                await client.query(
                    `INSERT INTO risk_taxonomy_terms (company_id, term_type, name, sort_order) VALUES ($1,'consequence',$2,$3) ON CONFLICT (company_id, term_type, name) DO NOTHING`,
                    [company.id, DEFAULT_CONSEQUENCES[i], i]
                );
            }
        }
        console.log(`✔ Seeded default cause/consequence taxonomy for ${companies.rows.length} company(ies)`);

        await client.query('COMMIT');
        console.log('🎉 v8 -> v9 migration complete.');
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

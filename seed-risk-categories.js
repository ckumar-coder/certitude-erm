// seed-risk-categories.js
// Adds industry-standard risk categories for all active companies.
// Existing categories are left untouched (INSERT ... ON CONFLICT DO NOTHING).
// Run: ADMIN_PASS='TestPass123!' node seed-risk-categories.js

require('dotenv').config({ path: './gcp-config.env' });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const CATEGORIES = [
    // Already likely present
    'Operational Risk',
    'Financial Risk',
    'Compliance Risk',
    'Strategic Risk',
    'Reputational Risk',
    // New additions
    'Technology / Cyber Risk',
    'Legal Risk',
    'People / HR Risk',
    'Third-Party / Vendor Risk',
    'Data Privacy Risk',
    'Business Continuity Risk',
    'Environmental / ESG Risk',
    'Geopolitical Risk',
    'Fraud Risk',
];

async function run() {
    const client = await pool.connect();
    try {
        const companies = await client.query(
            'SELECT id FROM companies WHERE is_active = true'
        );
        console.log(`Seeding ${companies.rows.length} company(ies)…`);

        for (const { id } of companies.rows) {
            let added = 0;
            for (let i = 0; i < CATEGORIES.length; i++) {
                const result = await client.query(
                    `INSERT INTO risk_categories (company_id, name, sort_order)
                     VALUES ($1, $2, $3)
                     ON CONFLICT (company_id, name) DO NOTHING`,
                    [id, CATEGORIES[i], (i + 1) * 10]
                );
                if (result.rowCount > 0) added++;
            }
            console.log(`  Company ${id}: ${added} new categories added.`);
        }
        console.log('Done.');
    } catch (e) {
        console.error('Failed:', e.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

run();

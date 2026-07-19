// migrate-v3-to-v4.js
//
// Upgrades a v3 database to v4 (Phase 2 / A1-A2):
//   - Applies schema_v4_additions.sql (RACI columns on risks/controls_lib,
//     org_roles, policies, policy_risks, policy_controls,
//     policy_attestations). All idempotent (IF NOT EXISTS), safe to re-run.
//
// Usage:
//   DATABASE_URL=postgresql://... node migrate-v3-to-v4.js

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('↻ Applying schema_v4_additions.sql...');
        const sql = fs.readFileSync(path.join(__dirname, 'schema_v4_additions.sql'), 'utf8');
        await client.query(sql);
        console.log('✔ Schema additions applied');

        await client.query('COMMIT');
        console.log('🎉 v3 -> v4 migration complete.');
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

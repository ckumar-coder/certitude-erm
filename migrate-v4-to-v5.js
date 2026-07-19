// migrate-v4-to-v5.js
//
// Upgrades a v4 database to v5 (Phase 3 / C1):
//   - Applies schema_v5_additions.sql (compliance_obligations and its
//     link tables to policies/controls/kris/risks, plus
//     obligation_status_history). All idempotent (IF NOT EXISTS),
//     safe to re-run.
//
// Usage:
//   DATABASE_URL=postgresql://... node migrate-v4-to-v5.js

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('↻ Applying schema_v5_additions.sql...');
        const sql = fs.readFileSync(path.join(__dirname, 'schema_v5_additions.sql'), 'utf8');
        await client.query(sql);
        console.log('✔ Schema additions applied');

        await client.query('COMMIT');
        console.log('🎉 v4 -> v5 migration complete.');
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

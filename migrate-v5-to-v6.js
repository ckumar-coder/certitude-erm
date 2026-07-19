// migrate-v5-to-v6.js
//
// Upgrades a v5 database to v6 (Phase 4 / D):
//   - Applies schema_v6_additions.sql (issues table and its link tables
//     to controls/risks/obligations/kris). All idempotent (IF NOT
//     EXISTS), safe to re-run.
//
// Usage:
//   DATABASE_URL=postgresql://... node migrate-v5-to-v6.js

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('↻ Applying schema_v6_additions.sql...');
        const sql = fs.readFileSync(path.join(__dirname, 'schema_v6_additions.sql'), 'utf8');
        await client.query(sql);
        console.log('✔ Schema additions applied');

        await client.query('COMMIT');
        console.log('🎉 v5 -> v6 migration complete.');
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

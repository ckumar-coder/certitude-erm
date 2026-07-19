// migrate-v6-to-v7.js
//
// Upgrades a v6 database to v7 (Phase 5 / E, H2):
//   - Applies schema_v7_additions.sql (department columns on
//     controls_lib, kris, issues). All idempotent (IF NOT EXISTS),
//     safe to re-run. No data migration needed -- existing rows get
//     department = NULL, which means "enterprise-wide" (visible to
//     every Manager).
//
// Usage:
//   DATABASE_URL=postgresql://... node migrate-v6-to-v7.js

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('↻ Applying schema_v7_additions.sql...');
        const sql = fs.readFileSync(path.join(__dirname, 'schema_v7_additions.sql'), 'utf8');
        await client.query(sql);
        console.log('✔ Schema additions applied');

        await client.query('COMMIT');
        console.log('🎉 v6 -> v7 migration complete.');
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

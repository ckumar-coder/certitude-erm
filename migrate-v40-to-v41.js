// migrate-v40-to-v41.js — ENH-11/12/13: MAP unique ID, action owner, root cause
const fs   = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const sql = fs.readFileSync(path.join(__dirname, 'schema_v41_map_enhancements.sql'), 'utf8');
        await client.query(sql);
        await client.query(
            `INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING`,
            ['schema_v41_map_enhancements.sql']
        );
        await client.query('COMMIT');
        console.log('✔ schema_v41_map_enhancements.sql applied');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', e.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();

// migrate-v35-to-v36.js
// Adds is_critical boolean column to the risks table.
// Safe to run multiple times (ADD COLUMN IF NOT EXISTS).
//
// Usage (with cloud-sql-proxy running):
//   DATABASE_URL=postgresql://... node migrate-v35-to-v36.js

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const sql = fs.readFileSync(path.join(__dirname, 'schema_v36_is_critical.sql'), 'utf8');
        await client.query(sql);
        await client.query('COMMIT');
        console.log('✔ Migration v36 complete: is_critical column added to risks table');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ Migration v36 failed:', e.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();

// migrate-v36-to-v37.js
// Creates the GRC Maturity Assessment module tables.
// Safe to run multiple times (all CREATE TABLE use IF NOT EXISTS).
//
// Usage (with cloud-sql-proxy running):
//   DATABASE_URL=postgresql://... node migrate-v36-to-v37.js

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const sql = fs.readFileSync(path.join(__dirname, 'schema_v37_maturity_assessment.sql'), 'utf8');
        await client.query(sql);
        await client.query('COMMIT');
        console.log('✔ Migration v37 complete: GRC Maturity Assessment tables created');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ Migration v37 failed:', e.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();

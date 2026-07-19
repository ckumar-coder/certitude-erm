// migrate-v16-to-v17.js
// Applies schema_v17_additions.sql (group/subsidiary structure).
// Safe to run multiple times (all DDL uses IF NOT EXISTS / IF NOT EXISTS pattern).

require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const pool = require('./db');

async function migrate() {
    const sql = fs.readFileSync(path.join(__dirname, 'schema_v17_additions.sql'), 'utf8');
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');
        console.log('Migration v17 applied successfully.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Migration v17 failed:', err.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();

// migrate-v13-to-v14.js — adds threshold_bands JSONB column to kris
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
    const client = await pool.connect();
    try {
        const sql = fs.readFileSync(path.join(__dirname, 'schema_v14_additions.sql'), 'utf8');
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');
        console.log('✔ schema_v14_additions.sql applied — threshold_bands column added to kris');
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

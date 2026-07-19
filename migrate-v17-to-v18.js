// migrate-v17-to-v18.js
// Adds the `industry` column to the companies table (V18).
// Safe to run on any database regardless of current data.
//
// Usage:
//   DATABASE_URL=postgresql://... node migrate-v17-to-v18.js

const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query(`
            ALTER TABLE companies
                ADD COLUMN IF NOT EXISTS industry VARCHAR(100);
        `);
        await client.query('COMMIT');
        console.log('✔ Migration v18 applied: industry column added to companies');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ Migration v18 failed:', e.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();

// migrate-v33-to-v34.js
// Creates global risk_library and control_library tables and seeds them
// with the GCC Industry Risk & Control Library (155 risks, 105 controls).
// These tables are NOT scoped to a company — they are shared reference data.
// Safe to run multiple times (CREATE TABLE IF NOT EXISTS; INSERT skipped if rows exist).
//
// Usage:
//   DATABASE_URL=postgresql://... node migrate-v33-to-v34.js

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Read the schema + seed SQL generated alongside this migration
        const sqlPath = path.join(__dirname, 'schema_v34_risk_library.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Only seed if tables are empty (idempotent re-run protection)
        await client.query(sql.split('-- Seed:')[0]); // DDL only first

        const { rows: riskCheck } = await client.query('SELECT COUNT(*) FROM risk_library');
        const { rows: ctrlCheck } = await client.query('SELECT COUNT(*) FROM control_library');

        if (parseInt(riskCheck[0].count) === 0 && parseInt(ctrlCheck[0].count) === 0) {
            // Extract and run both seed INSERT blocks
            const seedParts = sql.split('-- Seed:').slice(1);
            for (const part of seedParts) {
                const insertStart = part.indexOf('INSERT INTO');
                if (insertStart !== -1) {
                    await client.query(part.substring(insertStart));
                }
            }
            console.log('✔ Migration v34 applied: risk_library and control_library created and seeded');
        } else {
            console.log('✔ Migration v34 applied: tables already contain data — seed skipped');
        }

        await client.query('COMMIT');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ Migration v34 failed:', e.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();

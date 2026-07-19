/**
 * Migration: add raised_by_dept to issues table.
 * Run once against staging before deploying v1.12.15.
 *
 *   node migrate-issues-raised-by-dept.js
 *
 * Requires DATABASE_URL in environment (export from gcp-config.env or Secret Manager).
 */
require('dotenv').config({ path: 'gcp-config.env' });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Add column (safe to re-run)
        await client.query(`ALTER TABLE issues ADD COLUMN IF NOT EXISTS raised_by_dept TEXT`);

        // Backfill: best approximation — existing issues inherit the owner dept
        await client.query(
            `UPDATE issues SET raised_by_dept = department WHERE raised_by_dept IS NULL AND department IS NOT NULL`
        );

        await client.query('COMMIT');
        console.log('✓ raised_by_dept column added and backfilled.');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', e.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();

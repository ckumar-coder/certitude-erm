#!/usr/bin/env node
/**
 * migrate-v10-to-v11.js
 *
 * Applies schema_v11_additions.sql to an existing v10 database.
 * Run once per instance:
 *
 *   DATABASE_URL=postgres://... node migrate-v10-to-v11.js
 *
 * Safe to re-run: all statements use IF NOT EXISTS / ON CONFLICT DO NOTHING guards.
 */

'use strict';

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
    const sql = fs.readFileSync(path.join(__dirname, 'schema_v11_additions.sql'), 'utf8');
    const client = await pool.connect();
    try {
        console.log('Applying schema_v11_additions.sql …');
        await client.query(sql);
        console.log('Migration v10 → v11 complete.');
    } finally {
        client.release();
        await pool.end();
    }
}

migrate().catch((e) => {
    console.error('Migration failed:', e.message);
    process.exit(1);
});

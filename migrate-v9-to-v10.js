#!/usr/bin/env node
/**
 * migrate-v9-to-v10.js
 *
 * Applies schema_v10_additions.sql to an existing v9 database.
 * Run once per instance:
 *
 *   DATABASE_URL=postgres://... node migrate-v9-to-v10.js
 *
 * Safe to re-run: all statements use IF NOT EXISTS / IF NOT EXISTS guards.
 */

'use strict';

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
    const sql = fs.readFileSync(path.join(__dirname, 'schema_v10_additions.sql'), 'utf8');
    const client = await pool.connect();
    try {
        console.log('Applying schema_v10_additions.sql …');
        await client.query(sql);
        console.log('Migration v9 → v10 complete.');
    } finally {
        client.release();
        await pool.end();
    }
}

migrate().catch((e) => {
    console.error('Migration failed:', e.message);
    process.exit(1);
});

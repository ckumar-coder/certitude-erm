#!/usr/bin/env node
/**
 * migrate-v12-to-v13.js
 *
 * Applies schema_v13_additions.sql to an existing v12 database.
 * Run once per instance after deploying V1.5:
 *
 *   DATABASE_URL=postgres://... node migrate-v12-to-v13.js
 *
 * Safe to re-run: ADD COLUMN IF NOT EXISTS guards all changes.
 */

'use strict';

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
    const sql = fs.readFileSync(path.join(__dirname, 'schema_v13_additions.sql'), 'utf8');
    const client = await pool.connect();
    try {
        console.log('Applying schema_v13_additions.sql …');
        await client.query(sql);
        console.log('Migration v12 → v13 complete.');
    } finally {
        client.release();
        await pool.end();
    }
}

migrate().catch((e) => {
    console.error('Migration failed:', e.message);
    process.exit(1);
});

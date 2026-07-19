#!/usr/bin/env node
/**
 * migrate-v11-to-v12.js
 *
 * Applies schema_v12_additions.sql to an existing v11 database.
 * Run once per instance after deploying V1.4:
 *
 *   DATABASE_URL=postgres://... node migrate-v11-to-v12.js
 *
 * Safe to re-run: role constraint is dropped/recreated idempotently;
 * ADD COLUMN IF NOT EXISTS guards the new columns.
 */

'use strict';

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
    const sql = fs.readFileSync(path.join(__dirname, 'schema_v12_additions.sql'), 'utf8');
    const client = await pool.connect();
    try {
        console.log('Applying schema_v12_additions.sql …');
        await client.query(sql);
        console.log('Migration v11 → v12 complete.');
    } finally {
        client.release();
        await pool.end();
    }
}

migrate().catch((e) => {
    console.error('Migration failed:', e.message);
    process.exit(1);
});

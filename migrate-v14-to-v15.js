#!/usr/bin/env node
// Applies schema_v15_additions.sql (glossary, company_settings, evidence_attachments)
// and schema_v16_legacy_cleanup.sql (drop Phase-0 legacy tables).
'use strict';
const fs   = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
    const client = await pool.connect();
    try {
        for (const file of ['schema_v15_additions.sql', 'schema_v16_legacy_cleanup.sql']) {
            console.log(`Applying ${file}…`);
            const sql = fs.readFileSync(path.join(__dirname, file), 'utf8');
            await client.query(sql);
            console.log(`  ✔ ${file} applied`);
        }
        console.log('\nMigration v15+v16 complete.');
    } finally {
        client.release();
        await pool.end();
    }
}

run().catch((e) => { console.error(e); process.exit(1); });

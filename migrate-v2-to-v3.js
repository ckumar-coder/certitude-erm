// migrate-v2-to-v3.js
//
// Upgrades a v2 database to v3 (Phase 1 / B1-B3):
//   1. Applies schema_v3_additions.sql (new risk fields, controls_lib,
//      control_tests, kris, kri_measurements, and link tables). All
//      idempotent (IF NOT EXISTS), safe to re-run.
//   2. Migrates the old per-risk-version embedded `controls` table into
//      the new standalone `controls_lib`, deduplicating controls that
//      have the same (company, title, owner) -- which in practice means
//      "the same control re-entered on each risk version" -- into a
//      single Control Library entry linked to every risk that referenced
//      it via `risk_controls`.
//   3. Renames the old `controls` table to `controls_v2_legacy`
//      (preserved, not deleted).
//
// Usage:
//   DATABASE_URL=postgresql://... node migrate-v2-to-v3.js

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function columnExists(client, table, column) {
    const res = await client.query(
        `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
        [table, column]
    );
    return res.rows.length > 0;
}

async function tableExists(client, name) {
    const res = await client.query(`SELECT 1 FROM information_schema.tables WHERE table_name = $1`, [name]);
    return res.rows.length > 0;
}

async function nextControlUid(client, companyId) {
    const res = await client.query(
        `SELECT COUNT(*) AS cnt FROM controls_lib WHERE company_id = $1`,
        [companyId]
    );
    const next = parseInt(res.rows[0].cnt, 10) + 1;
    return `CTL-${String(next).padStart(4, '0')}`;
}

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // ---- 1. Apply schema additions ----
        console.log('↻ Applying schema_v3_additions.sql...');
        const sql = fs.readFileSync(path.join(__dirname, 'schema_v3_additions.sql'), 'utf8');
        await client.query(sql);
        console.log('✔ Schema additions applied');

        // ---- 2 & 3. Migrate embedded controls -> Control Library ----
        const oldControlsExists = await tableExists(client, 'controls') && (await columnExists(client, 'controls', 'risk_id'));

        if (oldControlsExists) {
            console.log('↻ Migrating embedded risk controls -> Control Library...');

            const oldControls = await client.query(`
                SELECT c.id, c.risk_id, c.title, c.owner, r.company_id, r.risk_uid
                FROM controls c JOIN risks r ON r.id = c.risk_id
                ORDER BY r.company_id, c.title, c.owner
            `);

            // Dedupe key: (company_id, title, owner) -> controls_lib.id
            const dedupeMap = new Map();
            let createdCount = 0;
            let linkedCount = 0;

            for (const row of oldControls.rows) {
                const key = `${row.company_id}::${(row.title || '').trim().toLowerCase()}::${(row.owner || '').trim().toLowerCase()}`;

                let controlId = dedupeMap.get(key);
                if (!controlId) {
                    const uid = await nextControlUid(client, row.company_id);
                    const insert = await client.query(
                        `INSERT INTO controls_lib (company_id, control_uid, name, owner, control_type, automation, testing_frequency, last_test_result)
                         VALUES ($1, $2, $3, $4, 'Preventive', 'Manual', 'Quarterly', 'Not Tested')
                         RETURNING id`,
                        [row.company_id, uid, row.title, row.owner]
                    );
                    controlId = insert.rows[0].id;
                    dedupeMap.set(key, controlId);
                    createdCount++;
                }

                await client.query(
                    `INSERT INTO risk_controls (risk_id, control_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                    [row.risk_id, controlId]
                );
                linkedCount++;
            }

            await client.query('ALTER TABLE controls RENAME TO controls_v2_legacy');

            console.log(`✔ Created ${createdCount} Control Library entries from ${oldControls.rows.length} embedded controls`);
            console.log(`  (${linkedCount} risk<->control links created; old table preserved as 'controls_v2_legacy')`);
        } else {
            console.log('✔ No legacy embedded controls table found, skipping');
        }

        await client.query('COMMIT');
        console.log('🎉 v2 -> v3 migration complete.');
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
        await pool.end();
    }
}

migrate().catch((err) => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
});

// migrate-v7-to-v8.js
//
// Upgrades a v7 database to v8 (Phase 7 / G5):
//   - Applies schema_v8_additions.sql (escalation_rules table).
//   - Seeds a sensible default escalation rule per trigger type for
//     every existing company, so Notifications (G5) and the
//     Escalation Rules admin screen aren't empty out of the box.
//     Client Admins can edit/disable these per company afterwards.
//
// Usage:
//   DATABASE_URL=postgresql://... node migrate-v7-to-v8.js

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Sensible Tier-1 defaults. Client Admins can tune these (or disable
// individual rules) via Settings -> Escalation Rules.
const DEFAULT_RULES = [
    { trigger_type: 'control_test_overdue', threshold_days: 0, notify_target: 'Owner', escalate_after_days: 14, escalate_to: 'Department Manager', channels: 'in_app' },
    { trigger_type: 'kri_red_breach', threshold_days: 0, notify_target: 'Owner', escalate_after_days: 3, escalate_to: 'Department Manager', channels: 'in_app' },
    { trigger_type: 'policy_review_due', threshold_days: 30, notify_target: 'Owner', escalate_after_days: null, escalate_to: null, channels: 'in_app' },
    { trigger_type: 'issue_overdue', threshold_days: 0, notify_target: 'Owner', escalate_after_days: 30, escalate_to: 'Department Manager', channels: 'in_app' },
    { trigger_type: 'obligation_non_compliant', threshold_days: 0, notify_target: 'Department Manager', escalate_after_days: 7, escalate_to: 'Admin', channels: 'in_app' },
];

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('↻ Applying schema_v8_additions.sql...');
        const sql = fs.readFileSync(path.join(__dirname, 'schema_v8_additions.sql'), 'utf8');
        await client.query(sql);
        console.log('✔ Schema additions applied');

        const companies = await client.query('SELECT id FROM companies');
        for (const company of companies.rows) {
            for (const rule of DEFAULT_RULES) {
                await client.query(
                    `INSERT INTO escalation_rules (company_id, trigger_type, threshold_days, notify_target, escalate_after_days, escalate_to, channels)
                     VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (company_id, trigger_type) DO NOTHING`,
                    [company.id, rule.trigger_type, rule.threshold_days, rule.notify_target, rule.escalate_after_days, rule.escalate_to, rule.channels]
                );
            }
        }
        console.log(`✔ Seeded default escalation rules for ${companies.rows.length} company(ies)`);

        await client.query('COMMIT');
        console.log('🎉 v7 -> v8 migration complete.');
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

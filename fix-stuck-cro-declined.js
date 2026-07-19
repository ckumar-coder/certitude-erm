// fix-stuck-cro-declined.js
// One-time fix: risks that were CRO-declined before the cro-decline endpoint
// was patched to reset approval_status. They currently have:
//   approval_status = 'Approved', cro_acceptance_status = NULL
// and appear in no queue. This script pushes them back to 'Awaiting Approval'.
//
// Usage:
//   DATABASE_URL=postgresql://... node fix-stuck-cro-declined.js

const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function fix() {
    const client = await pool.connect();
    try {
        const result = await client.query(`
            UPDATE risks
            SET approval_status = 'Awaiting Approval'
            WHERE approval_status = 'Approved'
              AND cro_acceptance_status IS NULL
              AND cro_notes IS NOT NULL
            RETURNING id, risk_uid, approval_status
        `);
        if (result.rows.length === 0) {
            console.log('No stuck risks found — nothing to fix.');
        } else {
            result.rows.forEach(r =>
                console.log(`✔ Fixed risk ${r.risk_uid} (id=${r.id}) → approval_status = '${r.approval_status}'`)
            );
        }
    } finally {
        client.release();
        await pool.end();
    }
}

fix().catch(e => { console.error('❌ Error:', e.message); process.exit(1); });

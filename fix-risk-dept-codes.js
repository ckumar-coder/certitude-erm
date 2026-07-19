// fix-risk-dept-codes.js
//
// One-off fix: normalise risks.department from display names → codes.
// The test suite submitted names ('Technology', 'Finance') instead of codes
// ('ITD', 'FIN') as the real UI does.  This script corrects existing rows.
//
// Usage:
//   DATABASE_URL=postgresql://... node fix-risk-dept-codes.js
//
// Safe to re-run.

const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Pass 1 – generic: name → code where departments table has the match
        // (catches Finance → FIN, HR → HRD, etc.)
        const pass1 = await client.query(`
            UPDATE risks r
            SET department = d.code
            FROM departments d
            WHERE d.company_id = r.company_id
              AND lower(r.department) = lower(d.name)
              AND r.department != d.code
            RETURNING r.risk_uid, d.code AS new_code
        `);
        console.log(`Pass 1 (name→code via departments table): ${pass1.rowCount} row(s)`);
        pass1.rows.forEach(row => console.log(`  ${row.risk_uid} → ${row.new_code}`));

        // Pass 2 – hardcoded: 'Technology' → 'ITD'
        // The departments table has name='IT Department' (not 'Technology'),
        // so the generic pass misses these rows.
        const pass2 = await client.query(`
            UPDATE risks
            SET department = 'ITD'
            WHERE department = 'Technology'
            RETURNING risk_uid
        `);
        console.log(`Pass 2 (Technology→ITD): ${pass2.rowCount} row(s)`);
        pass2.rows.forEach(row => console.log(`  ${row.risk_uid} → ITD`));

        await client.query('COMMIT');
        console.log('Done.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error — rolled back:', err.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

run();

// disable-mfa-test-user.js
// One-off: disable MFA for submitter.test@certitude-advisory.ca so
// headless browser can log in without a TOTP code.
// Run via Cloud Run job.

const { Pool } = require('pg');

const EMAIL = 'submitter.test@certitude-advisory.ca';
const pool  = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
    const r = await pool.query(
        `UPDATE users
            SET mfa_enabled = false,
                mfa_secret  = null
          WHERE email = $1
          RETURNING id, email, mfa_enabled`,
        [EMAIL]
    );
    if (!r.rows.length) {
        console.error('❌ User not found:', EMAIL);
        process.exit(1);
    }
    console.log('✔ MFA disabled:', r.rows[0]);
    await pool.end();
}

run().catch((e) => { console.error(e); process.exit(1); });

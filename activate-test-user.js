// activate-test-user.js
// One-off: activate submitter.test@certitude-advisory.ca and set a known password.
// Run via: DATABASE_URL=... node activate-test-user.js
// Or via Cloud Run job.

const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const EMAIL    = 'submitter.test@certitude-advisory.ca';
const PASSWORD = 'TestPass123!';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
    const hash = await bcrypt.hash(PASSWORD, 12);
    const r = await pool.query(
        `UPDATE users
            SET password_hash        = $1,
                must_change_password = false,
                is_active            = true
          WHERE email = $2
          RETURNING id, email, is_active`,
        [hash, EMAIL]
    );
    if (!r.rows.length) {
        console.error('❌ User not found:', EMAIL);
        process.exit(1);
    }
    console.log('✔ Activated:', r.rows[0]);
    await pool.end();
}

run().catch((e) => { console.error(e); process.exit(1); });

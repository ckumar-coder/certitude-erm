// migrate-apply-risk-bcps.js
// Ensures the risk_bcps junction table exists.
// This table was defined in schema_v33_risk_bcps.sql but was never applied
// via a formal migration script, causing the /bcm/bcps endpoint to fail
// silently and BCP links to never appear in the Risk Register.
//
// Safe to run multiple times (CREATE TABLE IF NOT EXISTS).
//
// Usage (with cloud-sql-proxy running on port 5432):
//   DATABASE_URL=postgresql://... node migrate-apply-risk-bcps.js

const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        await client.query(`
            CREATE TABLE IF NOT EXISTS risk_bcps (
                risk_id INTEGER NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
                bcp_id  INTEGER NOT NULL REFERENCES bcm_bcps(id) ON DELETE CASCADE,
                PRIMARY KEY (risk_id, bcp_id)
            )
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_risk_bcps_risk_id ON risk_bcps(risk_id)
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_risk_bcps_bcp_id ON risk_bcps(bcp_id)
        `);

        // Also clean up any test categories left by the test suite
        const { rowCount } = await client.query(
            `DELETE FROM risk_categories WHERE name LIKE 'ExtTestCat%'`
        );
        if (rowCount > 0) {
            console.log(`✔ Cleaned up ${rowCount} leftover test category row(s) (ExtTestCat*)`);
        }

        await client.query('COMMIT');
        console.log('✔ risk_bcps table and indexes created (or already existed)');
        console.log('✔ BCP links in Risk Register will now work correctly');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', e.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();

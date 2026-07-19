// db.js
// Central PostgreSQL connection pool used across the app.

const { Pool, types } = require('pg');

// By default, node-postgres parses SQL DATE columns into JS Date objects,
// which then get serialized with timezone shifts that can knock a date
// back/forward a day depending on the server's TZ. Since our mitigation
// start/end dates are simple "YYYY-MM-DD" values from <input type="date">,
// we keep them as plain strings end-to-end.
// OID 1082 = date
types.setTypeParser(1082, (val) => val);

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle Postgres client', err);
});

module.exports = pool;

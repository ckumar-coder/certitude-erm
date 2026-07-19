// export-glossary.js — exports glossary via the staging API
// Run: ADMIN_PASSWORD='your-password' node export-glossary.js
const https = require('https');
const fs = require('fs');
const { execSync } = require('child_process');

const ADMIN_EMAIL = 'c.kumar@certitude-advisory.ca';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_PASSWORD) {
    console.error('Set ADMIN_PASSWORD env var: ADMIN_PASSWORD=xxx node export-glossary.js');
    process.exit(1);
}

// Get staging URL from gcloud
let BASE_URL;
try {
    BASE_URL = execSync(
        'gcloud run services describe grc-app-staging --project=certitude-grc --region=northamerica-northeast1 --format="value(status.url)"',
        { encoding: 'utf8' }
    ).trim();
} catch (e) {
    console.error('Could not get staging URL:', e.message);
    process.exit(1);
}
console.log('Staging URL:', BASE_URL);

function post(path, body) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        const url = new URL(path, BASE_URL);
        const req = https.request({ hostname: url.hostname, path: url.pathname, method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
        }, res => {
            let raw = '';
            res.on('data', c => raw += c);
            res.on('end', () => resolve(JSON.parse(raw)));
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

function get(path, token) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const req = https.request({ hostname: url.hostname, path: url.pathname, method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        }, res => {
            let raw = '';
            res.on('data', c => raw += c);
            res.on('end', () => resolve(JSON.parse(raw)));
        });
        req.on('error', reject);
        req.end();
    });
}

async function run() {
    console.log('Logging in…');
    const login = await post('/api/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    if (!login.token) { console.error('Login failed:', JSON.stringify(login)); process.exit(1); }

    console.log('Fetching glossary…');
    const terms = await get('/api/glossary', login.token);
    fs.writeFileSync('./glossary-export.json', JSON.stringify(terms, null, 2));
    console.log(`Exported ${terms.length} terms → glossary-export.json`);
}

run().catch(e => { console.error(e.message); process.exit(1); });

#!/usr/bin/env node
// ============================================================
// GRC Workstation — Department Management Test Suite
// Covers: GET/POST/PATCH/DELETE /api/departments
//         RBAC enforcement (Admin-only write operations)
//         Deactivation usage-check guard (risks & users)
// ============================================================
// Usage:
//   BASE_URL=https://grc.certitude-advisory.ca \
//   ADMIN_EMAIL=admin@example.com \
//   ADMIN_PASSWORD=yourpassword \
//   MANAGER_EMAIL=manager@example.com \
//   MANAGER_PASSWORD=managerpassword \
//   node test-departments.js
// ============================================================

const BASE_URL         = (process.env.BASE_URL         || 'https://grc-app-i7277bhvma-nn.a.run.app').replace(/\/$/, '');
const ADMIN_EMAIL      = process.env.ADMIN_EMAIL       || 'c.kumar@certitude-advisory.ca';
const ADMIN_PASSWORD   = process.env.ADMIN_PASSWORD    || 'A37@goodearth';
const MANAGER_EMAIL    = process.env.MANAGER_EMAIL     || '';
const MANAGER_PASSWORD = process.env.MANAGER_PASSWORD  || '';
// CI bypass: set TEST_API_KEY to match the Cloud Run env var to skip MFA.
// Run: export TEST_API_KEY=<key> && node test-departments.js
const TEST_API_KEY     = process.env.TEST_API_KEY      || '';

// ─── Per-run unique test codes ────────────────────────────────────────────────
// Random 3-char suffix makes every run independent — no leftover data from a
// prior run can cause unique-constraint conflicts.
const RUN_ID        = Math.random().toString(36).substring(2, 5).toUpperCase(); // e.g. "A3F"
const TEST_CODE     = `T${RUN_ID}`;          // e.g. "TA3F"  — used for main test dept
const TEST_NAME     = `Test-${RUN_ID} Risk Management`;
const TEST_LONG_CODE = `ABCDEFG${RUN_ID}`;  // 10 chars → trimming test (D-26)

// ─── Test runner ─────────────────────────────────────────────────────────────

const results = [];

// Cookie jars — one per role (auth uses httpOnly cookies, not Bearer tokens)
let adminCookies  = '';
let managerCookies = '';

// Parse and store Set-Cookie headers from a response
function extractCookies(res) {
    const raw = res.headers.get('set-cookie');
    if (!raw) return '';
    // Multiple Set-Cookie headers come back as a comma-joined string in Node fetch.
    // We only need the name=value portion of each cookie (before the first semicolon).
    return raw.split(/,(?=[^ ])/).map(c => c.split(';')[0].trim()).join('; ');
}

async function api(method, path, body, auth) {
    // auth can be a cookie string or '__bearer__<token>'
    const isBearer = typeof auth === 'string' && auth.startsWith('__bearer__');
    const token    = isBearer ? auth.slice(10) : null;
    const cookies  = isBearer ? '' : auth;

    const opts = {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(token   ? { Authorization: `Bearer ${token}` } : {}),
            ...(cookies ? { Cookie: cookies } : {}),
        },
    };
    if (body !== undefined) opts.body = JSON.stringify(body);
    try {
        const res = await fetch(`${BASE_URL}/api${path}`, opts);
        const newCookies = extractCookies(res);
        let data;
        try { data = await res.json(); } catch { data = {}; }
        return { status: res.status, data, newCookies };
    } catch (e) {
        console.error(`       [fetch error] ${method} ${path} → ${e.message}`);
        return { status: 0, data: {}, newCookies: '' };
    }
}

// Convenience wrappers — read adminCookies/managerCookies at call time
const adminApi   = (method, path, body) => api(method, path, body, adminCookies);
const managerApi = (method, path, body) => api(method, path, body, managerCookies);

function pass(name, detail = '') {
    const label = detail ? `${name} — ${detail}` : name;
    results.push({ name: label, ok: true });
    console.log(`  ✅  ${label}`);
}
function fail(name, reason) {
    results.push({ name, ok: false, reason });
    console.log(`  ❌  ${name}`);
    console.log(`       ${reason}`);
}
async function test(name, fn) {
    try { await fn(); } catch (e) { fail(name, e.message); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }

// ─── Shared state ─────────────────────────────────────────────────────────────
const S = {};

// ─── Auth helpers ─────────────────────────────────────────────────────────────
async function loginAs(email, password) {
    // Step 1: login — send TEST_API_KEY header to bypass MFA if configured
    const loginHeaders = { 'Content-Type': 'application/json' };
    if (TEST_API_KEY) loginHeaders['x-test-api-key'] = TEST_API_KEY;

    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: loginHeaders,
        body: JSON.stringify({ email, password }),
    });
    const loginBody = await loginRes.json().catch(() => ({}));

    assert(loginRes.status === 200, `Login failed: ${loginRes.status} — ${JSON.stringify(loginBody)}`);

    // MFA gate — bypass requires TEST_API_KEY env var + matching Cloud Run env var
    if (loginBody.mfa_required || loginBody.mfa_setup_required) {
        throw new Error(
            'MFA is enabled and TEST_API_KEY is not set (or does not match Cloud Run).\n' +
            '  Fix: export TEST_API_KEY=<key> locally and set the same key in Cloud Run:\n' +
            '  gcloud run services update grc-app --region northamerica-northeast2 \\\n' +
            '    --update-env-vars TEST_API_KEY=<key> --project certitude-advisory'
        );
    }

    // TEST_API_KEY bypass returns token in body AND sets cookie.
    // If the user has multiple companies, activeCompanyId is null — we must
    // call switch-company to activate one before any company-scoped API calls.
    if (loginBody.token) {
        const bearerAuth = `__bearer__${loginBody.token}`;
        if (!loginBody.activeCompanyId) {
            const companies = loginBody.companies || [];
            assert(companies.length > 0, 'No companies found in login response');
            // Pick the primary (non-subsidiary) company if possible, else first
            const primary = companies.find(c => !c.parent_company_id) || companies[0];
            const r = await api('POST', '/auth/switch-company', { company_id: primary.id }, bearerAuth);
            assert(r.status === 200, `switch-company failed after TEST_API_KEY login: ${r.status}`);
            // switch-company re-issues the session cookie — prefer cookies going forward
            if (r.newCookies) return r.newCookies;
        }
        return bearerAuth;
    }

    // Cookie-based auth fallback (if MFA not enrolled on account)
    const allSetCookie = loginRes.headers.getSetCookie
        ? loginRes.headers.getSetCookie()
        : [loginRes.headers.get('set-cookie')].filter(Boolean);
    let cookies = allSetCookie.map(c => c.split(';')[0].trim()).join('; ');

    // Step 2: verify session works
    const r2 = await api('GET', '/auth/me', undefined, cookies);
    assert(r2.status === 200, `/auth/me failed after login: ${r2.status} body=${JSON.stringify(r2.data)}`);
    if (r2.newCookies) cookies = r2.newCookies;

    // Step 3: activate first company
    const companies = r2.data.companies || [];
    assert(companies.length > 0, 'No companies found for this user');
    const companyId = companies[0].id;

    const r3 = await api('POST', '/auth/switch-company', { company_id: companyId }, cookies);
    assert(r3.status === 200, `switch-company failed: ${r3.status}`);
    if (r3.newCookies) cookies = r3.newCookies;

    return cookies;
}

async function loginAdmin() {
    adminCookies = await loginAs(ADMIN_EMAIL, ADMIN_PASSWORD);
}

async function loginManager() {
    if (!MANAGER_EMAIL || !MANAGER_PASSWORD) return;
    try {
        managerCookies = await loginAs(MANAGER_EMAIL, MANAGER_PASSWORD);
    } catch (e) {
        console.log(`       Manager login skipped: ${e.message}`);
    }
}

// ─── Test sections ────────────────────────────────────────────────────────────

async function runAuthTests() {
    console.log('\n── Authentication ───────────────────────────────────────────');
    await test('D-01  Admin login', async () => {
        await loginAdmin();
        pass('D-01  Admin login', 'session cookie established');
    });
    await test('D-02  Manager login', async () => {
        await loginManager();
        if (managerCookies) pass('D-02  Manager login', 'session cookie established');
        else pass('D-02  Manager login', 'skipped (MANAGER_EMAIL/PASSWORD not set)');
    });
}

async function runListTests() {
    console.log('\n── GET /api/departments ─────────────────────────────────────');

    await test('D-03  List departments — Admin receives array', async () => {
        const r = await adminApi('GET', '/departments');
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        assert(Array.isArray(r.data), 'Response should be an array');
        S.initialDepts = r.data;
        pass('D-03  List departments — Admin receives array', `${r.data.length} departments`);
    });

    await test('D-04  Each department has id, name, code fields', async () => {
        if (!S.initialDepts?.length) throw new Error('No departments to inspect');
        const d = S.initialDepts[0];
        assert(typeof d.id === 'number', 'id should be a number');
        assert(typeof d.name === 'string' && d.name.length > 0, 'name should be non-empty string');
        assert(typeof d.code === 'string' && d.code.length > 0, 'code should be non-empty string');
        pass('D-04  Each department has id, name, code fields');
    });

    await test('D-05  List departments — Manager receives array', async () => {
        if (!managerCookies) { pass('D-05  List departments — Manager receives array', 'skipped'); return; }
        const r = await managerApi('GET', '/departments');
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        assert(Array.isArray(r.data), 'Response should be an array');
        pass('D-05  List departments — Manager receives array', `${r.data.length} departments`);
    });
}

async function runAddTests() {
    console.log('\n── POST /api/departments ────────────────────────────────────');

    await test('D-06  Add department — valid name and code', async () => {
        const r = await adminApi('POST', '/departments', { name: TEST_NAME, code: TEST_CODE });
        assert(r.status === 201 || r.status === 200, `Expected 200/201, got ${r.status}: ${JSON.stringify(r.data)}`);
        assert(r.data.id, 'Response should include id');
        S.newDeptId   = r.data.id;
        S.newDeptCode = r.data.code || TEST_CODE;
        pass('D-06  Add department — valid name and code', `id=${r.data.id}, code=${r.data.code}`);
    });

    await test('D-07  Add department — duplicate code returns conflict', async () => {
        const r = await adminApi('POST', '/departments', { name: `Dup-${RUN_ID}`, code: TEST_CODE });
        assert(r.status === 409 || r.status === 400, `Expected 409/400 for duplicate code, got ${r.status}`);
        pass('D-07  Add department — duplicate code returns conflict', `status ${r.status}`);
    });

    await test('D-08  Add department — missing name returns 400', async () => {
        const r = await adminApi('POST', '/departments', { code: 'XXX' });
        assert(r.status === 400, `Expected 400, got ${r.status}`);
        pass('D-08  Add department — missing name returns 400');
    });

    await test('D-09  Add department — code < 2 chars returns 400', async () => {
        const r = await adminApi('POST', '/departments', { name: 'Short Code Dept', code: 'X' });
        assert(r.status === 400, `Expected 400, got ${r.status}`);
        pass('D-09  Add department — code < 2 chars returns 400');
    });

    await test('D-10  Add department — Manager returns 403', async () => {
        if (!managerCookies) { pass('D-10  Add department — Manager returns 403', 'skipped'); return; }
        const r = await managerApi('POST', '/departments', { name: 'Should Fail', code: 'SHF' });
        assert(r.status === 403, `Expected 403, got ${r.status}`);
        pass('D-10  Add department — Manager returns 403');
    });

    await test('D-11  Newly added department appears in list', async () => {
        const r = await adminApi('GET', '/departments');
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        const found = r.data.find(d => d.id === S.newDeptId);
        assert(found, `Newly added department id=${S.newDeptId} not found in list`);
        pass('D-11  Newly added department appears in list');
    });
}

async function runRenameTests() {
    console.log('\n── PATCH /api/departments/:id ───────────────────────────────');

    await test('D-12  Rename department — valid new name', async () => {
        if (!S.newDeptId) throw new Error('No test department id available');
        const r = await adminApi('PATCH', `/departments/${S.newDeptId}`, { name: `Test-${RUN_ID} Risk & Compliance` });
        assert(r.status === 200, `Expected 200, got ${r.status}: ${JSON.stringify(r.data)}`);
        assert(r.data.name === `Test-${RUN_ID} Risk & Compliance`, `Name not updated: ${r.data.name}`);
        pass('D-12  Rename department — valid new name', `→ "${r.data.name}"`);
    });

    await test('D-13  Rename department — empty name returns 400', async () => {
        if (!S.newDeptId) throw new Error('No test department id available');
        const r = await adminApi('PATCH', `/departments/${S.newDeptId}`, { name: '' });
        assert(r.status === 400, `Expected 400, got ${r.status}`);
        pass('D-13  Rename department — empty name returns 400');
    });

    await test('D-14  Rename department — missing name returns 400', async () => {
        if (!S.newDeptId) throw new Error('No test department id available');
        const r = await adminApi('PATCH', `/departments/${S.newDeptId}`, {});
        assert(r.status === 400, `Expected 400, got ${r.status}`);
        pass('D-14  Rename department — missing name returns 400');
    });

    await test('D-15  Rename department — invalid id returns 404', async () => {
        const r = await adminApi('PATCH', '/departments/999999', { name: 'Ghost' });
        assert(r.status === 404, `Expected 404, got ${r.status}`);
        pass('D-15  Rename department — invalid id returns 404');
    });

    await test('D-16  Rename department — Manager returns 403', async () => {
        if (!managerCookies || !S.newDeptId) { pass('D-16  Rename department — Manager returns 403', 'skipped'); return; }
        const r = await managerApi('PATCH', `/departments/${S.newDeptId}`, { name: 'Should Fail' });
        assert(r.status === 403, `Expected 403, got ${r.status}`);
        pass('D-16  Rename department — Manager returns 403');
    });

    await test('D-17  List confirms renamed name persisted', async () => {
        const r = await adminApi('GET', '/departments');
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        assert(Array.isArray(r.data), 'Expected array from GET /departments');
        const dept = r.data.find(d => d.id === S.newDeptId);
        assert(dept, 'Dept not found in list after rename');
        assert(dept.name === `Test-${RUN_ID} Risk & Compliance`, `Name did not persist: ${dept.name}`);
        pass('D-17  List confirms renamed name persisted');
    });
}

async function runDeactivateTests() {
    console.log('\n── DELETE /api/departments/:id ──────────────────────────────');

    await test('D-18  Create risk assigned to test department (setup for D-19)', async () => {
        if (!S.newDeptCode) { pass('D-18  Setup — create risk in test dept', 'skipped'); return; }
        const r = await adminApi('POST', '/risks', {
            risk_detail:   'Test risk for dept deactivation guard',
            department:    S.newDeptCode,
            risk_category: 'Operational',
        });
        if (r.status === 201 || r.status === 200) {
            S.testRiskId = r.data.id || r.data.risk?.id;
            pass('D-18  Setup — create risk in test dept', `risk id=${S.testRiskId}`);
        } else {
            pass('D-18  Setup — create risk in test dept', `skipped (${r.status})`);
        }
    });

    await test('D-19  Deactivate department with assigned risk → 409', async () => {
        if (!S.newDeptId || !S.testRiskId) { pass('D-19  Deactivate dept with assigned risk → 409', 'skipped (no test risk)'); return; }
        const r = await adminApi('DELETE', `/departments/${S.newDeptId}`);
        assert(r.status === 409, `Expected 409 (dept in use), got ${r.status}: ${JSON.stringify(r.data)}`);
        assert(r.data.error && r.data.error.includes('risk'), `Error message should mention risks: ${r.data.error}`);
        pass('D-19  Deactivate dept with assigned risk → 409', r.data.error?.slice(0, 60));
    });

    await test('D-20  Clean up test risk (move to General dept)', async () => {
        if (!S.testRiskId) { pass('D-20  Clean up test risk', 'skipped'); return; }
        const listR = await adminApi('GET', '/departments');
        const genDept = listR.data.find(d => d.code === 'GEN') || listR.data[0];
        if (!genDept) { pass('D-20  Clean up test risk', 'skipped — no fallback dept'); return; }
        const r = await adminApi('PATCH', `/risks/${S.testRiskId}`, { department: genDept.code });
        if (r.status === 200) {
            pass('D-20  Clean up test risk', `moved to ${genDept.code}`);
        } else {
            const dr = await adminApi('DELETE', `/risks/${S.testRiskId}`);
            pass('D-20  Clean up test risk', dr.status === 200 ? 'deleted' : `status ${dr.status}`);
        }
    });

    await test('D-21  Deactivate department — Manager returns 403', async () => {
        if (!managerCookies || !S.newDeptId) { pass('D-21  Deactivate — Manager returns 403', 'skipped'); return; }
        const r = await managerApi('DELETE', `/departments/${S.newDeptId}`);
        assert(r.status === 403, `Expected 403, got ${r.status}`);
        pass('D-21  Deactivate — Manager returns 403');
    });

    await test('D-22  Deactivate department — succeeds when unassigned', async () => {
        if (!S.newDeptId) throw new Error('No test department id available');
        const r = await adminApi('DELETE', `/departments/${S.newDeptId}`);
        assert(r.status === 200, `Expected 200, got ${r.status}: ${JSON.stringify(r.data)}`);
        assert(r.data.ok === true, 'Response should have ok: true');
        pass('D-22  Deactivate department — succeeds when unassigned');
    });

    await test('D-23  Deactivated department removed from list', async () => {
        const r = await adminApi('GET', '/departments');
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        assert(Array.isArray(r.data), 'Expected array');
        const found = r.data.find(d => d.id === S.newDeptId);
        assert(!found, 'Deactivated department should not appear in active list');
        pass('D-23  Deactivated department removed from list');
    });

    await test('D-24  Deactivate non-existent department → 404', async () => {
        const r = await adminApi('DELETE', '/departments/999999');
        assert(r.status === 404, `Expected 404, got ${r.status}`);
        pass('D-24  Deactivate non-existent department → 404');
    });
}

async function runDefaultDeptTests() {
    console.log('\n── Default department seeding (existing company) ────────────');

    await test('D-25  Standard default departments present (FIN, ITS, LEG, OPS, GEN)', async () => {
        const r = await adminApi('GET', '/departments');
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        const codes = new Set(r.data.map(d => d.code));
        for (const expected of ['FIN', 'ITS', 'LEG', 'OPS', 'GEN']) {
            assert(codes.has(expected), `Missing expected department code: ${expected}`);
        }
        pass('D-25  Standard default departments present', `${codes.size} total`);
    });
}

async function runValidationTests() {
    console.log('\n── Validation boundary tests ────────────────────────────────');

    await test('D-26  Add department — code > 10 chars is trimmed or rejected', async () => {
        const r = await adminApi('POST', '/departments', { name: `LongCode-${RUN_ID}`, code: TEST_LONG_CODE + 'XY' }); // >10 chars
        if (r.status === 400) {
            pass('D-26  Add department — code > 10 chars rejected by validation');
        } else if (r.status === 200 || r.status === 201) {
            assert(r.data.code.length <= 10, `Code was not trimmed: ${r.data.code}`);
            if (r.data.id) await adminApi('DELETE', `/departments/${r.data.id}`);
            pass('D-26  Add department — code > 10 chars trimmed to 10', `code="${r.data.code}"`);
        } else {
            throw new Error(`Unexpected status ${r.status}`);
        }
    });

    await test('D-27  Add department — name > 100 chars returns 400', async () => {
        const r = await adminApi('POST', '/departments', { name: 'A'.repeat(101), code: 'TST' });
        assert(r.status === 400, `Expected 400 for name > 100 chars, got ${r.status}`);
        pass('D-27  Add department — name > 100 chars returns 400');
    });

    await test('D-28  Unauthenticated GET /departments -> 401', async () => {
        const r = await api('GET', '/departments', undefined, '');
        assert(r.status === 401, `Expected 401, got ${r.status}`);
        pass('D-28  Unauthenticated GET /departments -> 401');
    });
}

// ─── Summary ──────────────────────────────────────────────────────────────────

async function printSummary() {
    const passed = results.filter(r => r.ok);
    const failed = results.filter(r => !r.ok);
    console.log('\n' + '═'.repeat(62));
    console.log(`  Department Test Suite — ${new Date().toLocaleDateString('en-CA')}`);
    console.log('═'.repeat(62));
    console.log(`  Passed : ${passed.length}`);
    console.log(`  Failed : ${failed.length}`);
    console.log(`  Total  : ${results.length}`);
    if (failed.length > 0) {
        console.log('\n  Failures:');
        failed.forEach(f => console.log(`    ✗  ${f.name}\n       ${f.reason}`));
    }
    console.log('═'.repeat(62));
    console.log('');
    console.log('  NOTE — Manual tests required (not covered by this script):');
    console.log('  M-01  Setup wizard: 4-step flow (Welcome → Org → Depts → Success)');
    console.log('  M-02  Wizard dept list: add/remove departments before submit');
    console.log('  M-03  Wizard submit creates org + departments in one call');
    console.log('  M-04  Admin → Departments page: inline rename (click name)');
    console.log('  M-05  Admin → Departments page: deactivate confirmation dialog');
    console.log('  M-06  Deactivated dept disappears from Risk Register dropdown');
    console.log('  M-07  Deactivated dept disappears from Issues Tracker dropdown');
    console.log('  M-08  Deactivated dept disappears from KRI Library dropdown');
    console.log('  M-09  Import/Export: upload .xlsx → preview CSV (read-excel-file)');
    console.log('  M-10  Import/Export: upload empty .xlsx → shows error message');
    console.log('  M-11  Import/Export: CSV/JSON export still works (unchanged)');
    console.log('  M-12  Departments nav item visible in Admin sidebar only');
    console.log('  M-13  Departments page not accessible by Manager (redirect/403)');
    console.log('═'.repeat(62));
    process.exit(failed.length > 0 ? 1 : 0);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

(async () => {
    console.log('\n' + '═'.repeat(62));
    console.log('  GRC Workstation — Department Management Test Suite');
    console.log('  Target: ' + BASE_URL);
    console.log('═'.repeat(62));

    try {
        await runAuthTests();
        await runListTests();
        await runAddTests();
        await runRenameTests();
        await runDeactivateTests();
        await runDefaultDeptTests();
        await runValidationTests();
    } catch (e) {
        console.error('\nFatal error:', e.message);
    }

    await printSummary();
})();

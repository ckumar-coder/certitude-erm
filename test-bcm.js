#!/usr/bin/env node
// ============================================================
// GRC Workstation — BCM Module Test Suite
// ============================================================
// Covers all 7 BCM components + Dashboard + KRIs + Integration Wiring.
//
// Components tested:
//   1  Critical Process Register  (bcm_processes)
//   2  BCP Document Library       (bcm_bcps)
//   3  BCP Testing Log            (bcm_bcp_tests)
//   4  Threat / Scenario Library  (bcm_scenarios)
//   5  Dependency & SPOF Register (bcm_dependencies)
//   6  Activation / Incident Log  (bcm_activations)
//   7  BCM Dashboard + KRIs       (aggregate read)
//   8  Integration Wiring         (cross-component links)
//
// Each component is tested for:
//   • CRUD — create, read, update, delete
//   • Required-field validation (400 on missing fields)
//   • RBAC — Viewer blocked (403), Manager allowed, Admin allowed + can delete
//   • Field values roundtrip correctly
//   • Junction tables (linked_* arrays) persist and return correctly
//   • Data isolation (cross-company access denied)
//
// Usage:
//   BASE_URL=https://grc.certitude-advisory.ca \
//   ADMIN_EMAIL=you@certitude-advisory.ca \
//   ADMIN_PASSWORD=yourpassword \
//   TEST_API_KEY=<key> \
//   node test-bcm.js
//
// Requires Node 20+ (built-in fetch).
// ============================================================

const BASE_URL      = (process.env.BASE_URL      || 'https://grc.certitude-advisory.ca').replace(/\/$/, '');
const ADMIN_EMAIL   = process.env.ADMIN_EMAIL    || '';
const ADMIN_PASSWORD= process.env.ADMIN_PASSWORD || '';
const TEST_API_KEY  = process.env.TEST_API_KEY   || '';

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error('\n  Usage: ADMIN_EMAIL=... ADMIN_PASSWORD=... node test-bcm.js\n');
    process.exit(1);
}

// ─── Runner infrastructure ────────────────────────────────────────────────────

let token = null;
const results = [];

async function api(method, path, body) {
    const opts = {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    };
    if (body !== undefined) opts.body = JSON.stringify(body);
    try {
        const res = await fetch(`${BASE_URL}${path}`, opts);
        let data;
        try { data = await res.json(); } catch { data = {}; }
        return { status: res.status, data };
    } catch (e) {
        return { status: 0, data: {}, error: e.message };
    }
}

function ok(name, detail = '') {
    const label = detail ? `${name} — ${detail}` : name;
    results.push({ name: label, passed: true });
    console.log(`  ✅  ${label}`);
}

function fail(name, reason) {
    results.push({ name, passed: false, reason });
    console.log(`  ❌  ${name}`);
    console.log(`       → ${reason}`);
}

async function test(name, fn) {
    try {
        await fn();
    } catch (e) {
        fail(name, e.message);
    }
}

function assert(cond, msg) {
    if (!cond) throw new Error(msg);
}

// ─── Auth helpers ─────────────────────────────────────────────────────────────

async function loginAs(email, password) {
    const saved = token; token = null;
    const headers = { 'Content-Type': 'application/json' };
    if (TEST_API_KEY) headers['x-test-api-key'] = TEST_API_KEY;
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST', headers,
        body: JSON.stringify({ email, password }),
    });
    token = saved;
    const data = await res.json();
    if (res.status !== 200) throw new Error(`Login failed for ${email}: ${JSON.stringify(data)}`);
    if (!data.token) throw new Error(`No token returned for ${email} — is TEST_API_KEY set?`);
    return data.token;
}

async function changePasswordAs(tok, cur, next) {
    const res = await fetch(`${BASE_URL}/api/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
        body: JSON.stringify({ currentPassword: cur, newPassword: next }),
    });
    if (res.status !== 200) {
        const d = await res.json();
        throw new Error(`Password change failed: ${JSON.stringify(d)}`);
    }
}

async function switchCompanyAs(tok, companyId) {
    const res = await fetch(`${BASE_URL}/api/auth/switch-company`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
        body: JSON.stringify({ company_id: companyId }),
    });
    if (res.status !== 200) {
        const d = await res.json();
        throw new Error(`switch-company failed: ${JSON.stringify(d)}`);
    }
}

// ─── Shared state ─────────────────────────────────────────────────────────────

const S = {};  // IDs, tokens, UIDs accumulated across tests

// ============================================================
// SECTION 0 — Setup
// ============================================================

async function setup() {
    console.log('\n══ SETUP ══════════════════════════════════════════════');

    // Login as Admin
    await test('Admin login', async () => {
        token = await loginAs(ADMIN_EMAIL, ADMIN_PASSWORD);
        ok('Admin login');
    });

    // Get company ID from /auth/me
    await test('GET /api/auth/me — resolve company', async () => {
        const r = await api('GET', '/api/auth/me');
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        assert(r.data.companies?.length > 0, 'No companies on admin account');
        S.companyId = r.data.companies[0].id;
        ok('Company resolved', `id: ${S.companyId}`);
    });

    // Switch to that company
    await test('Switch to company', async () => {
        await switchCompanyAs(token, S.companyId);
        ok('Company switched');
    });

    const ts = Date.now();

    // Create a Manager test user
    S.mgrEmail   = `bcm-mgr-${ts}@testonly.invalid`;
    S.mgrPwd     = 'BcmMgr@1234!';
    S.mgrPwd2    = 'BcmMgr@5678!';

    await test('Create Manager user', async () => {
        const r = await api('POST', '/api/users', {
            email: S.mgrEmail,
            full_name: 'BCM Test Manager',
            role: 'Risk Manager',
            temporary_password: S.mgrPwd,
        });
        assert(r.status === 201, `Expected 201, got ${r.status}: ${JSON.stringify(r.data)}`);
        S.mgrUserId = r.data.id;
        ok('Manager created', `id: ${S.mgrUserId}`);
    });

    await test('Manager login + password change', async () => {
        const tok = await loginAs(S.mgrEmail, S.mgrPwd);
        await changePasswordAs(tok, S.mgrPwd, S.mgrPwd2);
        S.mgrToken = await loginAs(S.mgrEmail, S.mgrPwd2);
        await switchCompanyAs(S.mgrToken, S.companyId);
        ok('Manager logged in');
    });

    // Create a Viewer test user
    S.viewerEmail = `bcm-viewer-${ts}@testonly.invalid`;
    S.viewerPwd   = 'BcmViewer@1234!';
    S.viewerPwd2  = 'BcmViewer@5678!';

    await test('Create Viewer user', async () => {
        const r = await api('POST', '/api/users', {
            email: S.viewerEmail,
            full_name: 'BCM Test Viewer',
            role: 'Viewer',
            temporary_password: S.viewerPwd,
        });
        assert(r.status === 201, `Expected 201, got ${r.status}: ${JSON.stringify(r.data)}`);
        S.viewerUserId = r.data.id;
        ok('Viewer created', `id: ${S.viewerUserId}`);
    });

    await test('Viewer login + password change', async () => {
        const tok = await loginAs(S.viewerEmail, S.viewerPwd);
        await changePasswordAs(tok, S.viewerPwd, S.viewerPwd2);
        S.viewerToken = await loginAs(S.viewerEmail, S.viewerPwd2);
        await switchCompanyAs(S.viewerToken, S.companyId);
        ok('Viewer logged in');
    });

    // Create a CRO test user
    S.croEmail  = `bcm-cro-${ts}@testonly.invalid`;
    S.croPwd    = 'BcmCro@1234!';
    S.croPwd2   = 'BcmCro@5678!';

    await test('Create CRO user', async () => {
        const r = await api('POST', '/api/users', {
            email: S.croEmail,
            full_name: 'BCM Test CRO',
            role: 'CRO',
            temporary_password: S.croPwd,
        });
        assert(r.status === 201, `Expected 201, got ${r.status}: ${JSON.stringify(r.data)}`);
        S.croUserId = r.data.id;
        ok('CRO created', `id: ${S.croUserId}`);
    });

    await test('CRO login + password change', async () => {
        const tok = await loginAs(S.croEmail, S.croPwd);
        await changePasswordAs(tok, S.croPwd, S.croPwd2);
        S.croToken = await loginAs(S.croEmail, S.croPwd2);
        await switchCompanyAs(S.croToken, S.companyId);
        ok('CRO logged in');
    });

    // Create a Risk Champion test user (the "Staff" equivalent role)
    S.staffEmail = `bcm-submitter-${ts}@testonly.invalid`;
    S.staffPwd   = 'BcmStaff@1234!';
    S.staffPwd2  = 'BcmStaff@5678!';

    await test('Create Risk Champion user', async () => {
        const r = await api('POST', '/api/users', {
            email: S.staffEmail,
            full_name: 'BCM Test Risk Champion',
            role: 'Risk Champion',
            temporary_password: S.staffPwd,
        });
        assert(r.status === 201, `Expected 201, got ${r.status}: ${JSON.stringify(r.data)}`);
        S.staffUserId = r.data.id;
        ok('Risk Champion created', `id: ${S.staffUserId}`);
    });

    await test('Risk Champion login + password change', async () => {
        const tok = await loginAs(S.staffEmail, S.staffPwd);
        await changePasswordAs(tok, S.staffPwd, S.staffPwd2);
        S.staffToken = await loginAs(S.staffEmail, S.staffPwd2);
        await switchCompanyAs(S.staffToken, S.companyId);
        ok('Risk Champion logged in');
    });

    // Create a Consultant CRO test user (T-02: must be blocked from BCM GETs)
    S.consultantCroEmail = `bcm-ccro-${ts}@testonly.invalid`;
    S.consultantCroPwd   = 'BcmCCro@1234!';
    S.consultantCroPwd2  = 'BcmCCro@5678!';

    await test('Create Consultant CRO user', async () => {
        const r = await api('POST', '/api/users', {
            email: S.consultantCroEmail,
            full_name: 'BCM Test Consultant CRO',
            role: 'Consultant CRO',
            temporary_password: S.consultantCroPwd,
        });
        assert(r.status === 201, `Expected 201, got ${r.status}: ${JSON.stringify(r.data)}`);
        S.consultantCroUserId = r.data.id;
        ok('Consultant CRO created', `id: ${S.consultantCroUserId}`);
    });

    await test('Consultant CRO login + password change', async () => {
        const tok = await loginAs(S.consultantCroEmail, S.consultantCroPwd);
        await changePasswordAs(tok, S.consultantCroPwd, S.consultantCroPwd2);
        S.consultantCroToken = await loginAs(S.consultantCroEmail, S.consultantCroPwd2);
        await switchCompanyAs(S.consultantCroToken, S.companyId);
        ok('Consultant CRO logged in');
    });

    // Also need a risk to link to processes in Component 1
    // Create a minimal risk as Admin using the risks API
    await test('Create a test risk (for process linking)', async () => {
        // First we need a Manager token to create a risk
        const savedToken = token;
        token = S.mgrToken;
        const r = await api('POST', '/api/risks', {
            title: 'BCM Test Risk — Cyber Outage',
            category: 'Operational',
            department: '',
            description: 'Risk created by BCM test suite for integration testing',
            inherent_likelihood: 3,
            inherent_impact: 3,
            treatment: 'Mitigate',
            treatment_plan: 'Apply BCP',
        });
        token = savedToken;
        // Risk creation may fail if we don't have the right setup — gracefully skip
        if (r.status === 201) {
            S.riskId = r.data.id;
            ok('Test risk created', `id: ${S.riskId}`);
        } else {
            S.riskId = null;
            ok('Test risk skipped (will test process linking without risk)', `status: ${r.status}`);
        }
    });
}

// ============================================================
// SECTION 0b — Full RBAC matrix across all 5 roles
// ============================================================
// BCM routes: requireRole('Admin', 'Risk Manager', 'CRO') for GET (Phase 9)
//             requireRole('Admin', 'Risk Manager') for POST/PATCH
//             requireRole('Admin') for DELETE
// Expected:
//   Admin   → 200/201 on all
//   Manager → 200/201 on GET/POST/PATCH; 403 on DELETE
//   CRO     → 200 on GET; 403 on POST/PATCH/DELETE
//   Risk Champion → 403 on everything
//   Viewer    → 403 on everything

async function testRbacMatrix() {
    console.log('\n══ 0b. FULL RBAC MATRIX ════════════════════════════════');

    // GET probe: CRO now allowed (Phase 9 — Risk↔BCP wiring added CRO to all BCM GET routes)
    // POST probe: CRO, Staff, Viewer still blocked

    const roles = [
        { name: 'Risk Manager',        tok: () => S.mgrToken,           expectGet: 200, expectPost: 200 },
        { name: 'CRO',            tok: () => S.croToken,           expectGet: 200, expectPost: 403 },
        { name: 'Consultant CRO', tok: () => S.consultantCroToken, expectGet: 403, expectPost: 403 }, // T-02
        { name: 'Risk Champion',  tok: () => S.staffToken,         expectGet: 403, expectPost: 403 },
        { name: 'Viewer',         tok: () => S.viewerToken,        expectGet: 403, expectPost: 403 },
    ];

    for (const { name, tok, expectGet, expectPost } of roles) {
        await test(`${name}: GET /api/bcm/processes → ${expectGet}`, async () => {
            const saved = token; token = tok();
            const r = await api('GET', '/api/bcm/processes');
            token = saved;
            assert(r.status === expectGet, `Expected ${expectGet}, got ${r.status}`);
            ok(`${name} → GET processes ${expectGet === 200 ? 'allowed' : 'blocked (403)'}`);
        });

        await test(`${name}: GET /api/bcm/bcps → ${expectGet}`, async () => {
            const saved = token; token = tok();
            const r = await api('GET', '/api/bcm/bcps');
            token = saved;
            assert(r.status === expectGet, `Expected ${expectGet}, got ${r.status}`);
            ok(`${name} → GET bcps ${expectGet === 200 ? 'allowed' : 'blocked (403)'}`);
        });

        await test(`${name}: GET /api/bcm/scenarios → ${expectGet}`, async () => {
            const saved = token; token = tok();
            const r = await api('GET', '/api/bcm/scenarios');
            token = saved;
            assert(r.status === expectGet, `Expected ${expectGet}, got ${r.status}`);
            ok(`${name} → GET scenarios ${expectGet === 200 ? 'allowed' : 'blocked (403)'}`);
        });

        await test(`${name}: GET /api/bcm/dependencies → ${expectGet}`, async () => {
            const saved = token; token = tok();
            const r = await api('GET', '/api/bcm/dependencies');
            token = saved;
            assert(r.status === expectGet, `Expected ${expectGet}, got ${r.status}`);
            ok(`${name} → GET dependencies ${expectGet === 200 ? 'allowed' : 'blocked (403)'}`);
        });

        await test(`${name}: GET /api/bcm/activations → ${expectGet}`, async () => {
            const saved = token; token = tok();
            const r = await api('GET', '/api/bcm/activations');
            token = saved;
            assert(r.status === expectGet, `Expected ${expectGet}, got ${r.status}`);
            ok(`${name} → GET activations ${expectGet === 200 ? 'allowed' : 'blocked (403)'}`);
        });

        await test(`${name}: GET /api/bcm/tests → ${expectGet}`, async () => {
            const saved = token; token = tok();
            const r = await api('GET', '/api/bcm/tests');
            token = saved;
            assert(r.status === expectGet, `Expected ${expectGet}, got ${r.status}`);
            ok(`${name} → GET tests ${expectGet === 200 ? 'allowed' : 'blocked (403)'}`);
        });

        await test(`${name}: GET /api/bcm/dashboard → ${expectGet}`, async () => {
            const saved = token; token = tok();
            const r = await api('GET', '/api/bcm/dashboard');
            token = saved;
            assert(r.status === expectGet, `Expected ${expectGet}, got ${r.status}`);
            ok(`${name} → GET dashboard ${expectGet === 200 ? 'allowed' : 'blocked (403)'}`);
        });

        // POST probe — Manager allowed, CRO/Risk Champion/Viewer blocked
        if (expectPost === 403) {
            await test(`${name}: POST /api/bcm/processes → 403`, async () => {
                const saved = token; token = tok();
                const r = await api('POST', '/api/bcm/processes', { name: 'Should be blocked' });
                token = saved;
                assert(r.status === 403, `Expected 403, got ${r.status}`);
                ok(`${name} → POST processes blocked (403)`);
            });
        }
    }

    // Admin DELETE: tested separately in Section 9.
    // Confirm Admin gets through on a read to establish baseline.
    await test('Admin: GET /api/bcm/processes → 200', async () => {
        const r = await api('GET', '/api/bcm/processes');
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        ok('Admin → GET processes allowed (200)');
    });
}

// ============================================================
// SECTION 1 — Critical Process Register
// ============================================================

async function testProcesses() {
    console.log('\n══ 1. CRITICAL PROCESS REGISTER ═══════════════════════');

    // ── RBAC: Viewer blocked ──────────────────────────────
    await test('Viewer: GET /api/bcm/processes → 403', async () => {
        const saved = token; token = S.viewerToken;
        const r = await api('GET', '/api/bcm/processes');
        token = saved;
        assert(r.status === 403, `Expected 403, got ${r.status}`);
        ok('Viewer blocked from GET processes');
    });

    await test('Viewer: POST /api/bcm/processes → 403', async () => {
        const saved = token; token = S.viewerToken;
        const r = await api('POST', '/api/bcm/processes', { name: 'Should fail' });
        token = saved;
        assert(r.status === 403, `Expected 403, got ${r.status}`);
        ok('Viewer blocked from POST processes');
    });

    // ── Validation ────────────────────────────────────────
    await test('POST /api/bcm/processes — missing name → 400', async () => {
        const r = await api('POST', '/api/bcm/processes', { criticality: 'High' });
        assert(r.status === 400, `Expected 400, got ${r.status}`);
        ok('Missing name → 400');
    });

    await test('POST /api/bcm/processes — invalid criticality → 400', async () => {
        const r = await api('POST', '/api/bcm/processes', {
            name: 'Test', criticality: 'SuperCritical',
        });
        assert(r.status === 400, `Expected 400, got ${r.status}`);
        ok('Invalid criticality → 400');
    });

    // ── Create (Admin) ────────────────────────────────────
    await test('POST /api/bcm/processes — full payload (Admin)', async () => {
        const r = await api('POST', '/api/bcm/processes', {
            name:                 'Client Trade Settlement',
            owner:                'Head of Operations',
            criticality:          'Critical',
            mtpd_value:           24,
            mtpd_unit:            'hours',
            rto_value:            4,
            rto_unit:             'hours',
            rpo_value:            1,
            rpo_unit:             'hours',
            process_dependencies: 'SWIFT, Core Banking, FX Rates Feed',
            spof_flag:            true,
            last_bia_review:      '2025-01-15',
            next_bia_review:      '2026-01-15',
            status:               'Active',
            notes:                'Drives daily P&L; regulatory SLA of T+2',
            linked_risk_ids:      S.riskId ? [S.riskId] : [],
        });
        assert(r.status === 201, `Expected 201, got ${r.status}: ${JSON.stringify(r.data)}`);
        assert(r.data.process_uid, 'Missing process_uid');
        assert(r.data.process_uid.startsWith('BCP-PR'), `UID should start with BCP-PR, got ${r.data.process_uid}`);
        assert(r.data.criticality === 'Critical', 'Criticality not persisted');
        assert(r.data.spof_flag === true, 'spof_flag not persisted');
        assert(r.data.mtpd_value === 24, 'mtpd_value not persisted');
        assert(r.data.rto_value  === 4,  'rto_value not persisted');
        assert(r.data.rpo_value  === 1,  'rpo_value not persisted');
        S.processId  = r.data.id;
        S.processUid = r.data.process_uid;
        ok('Process created', `${S.processUid}`);
    });

    // Second process (for linking tests)
    await test('POST /api/bcm/processes — second process (Manager)', async () => {
        const saved = token; token = S.mgrToken;
        const r = await api('POST', '/api/bcm/processes', {
            name:        'Client Onboarding',
            criticality: 'High',
            status:      'Active',
        });
        token = saved;
        assert(r.status === 201, `Expected 201, got ${r.status}`);
        S.process2Id  = r.data.id;
        S.process2Uid = r.data.process_uid;
        ok('Second process created', `${S.process2Uid}`);
    });

    // ── Read list ─────────────────────────────────────────
    await test('GET /api/bcm/processes — list returns created process', async () => {
        const r = await api('GET', '/api/bcm/processes');
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        assert(Array.isArray(r.data), 'Expected array');
        const found = r.data.find(p => p.id === S.processId);
        assert(found, 'Created process not in list');
        assert(Array.isArray(found.linked_risk_ids), 'linked_risk_ids missing from list');
        if (S.riskId) {
            assert(found.linked_risk_ids.includes(S.riskId), 'Risk not in linked_risk_ids');
        }
        ok('GET list returns process', `total: ${r.data.length}`);
    });

    // ── Read single ───────────────────────────────────────
    await test('GET /api/bcm/processes/:id', async () => {
        const r = await api('GET', `/api/bcm/processes/${S.processId}`);
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        assert(r.data.id === S.processId, 'Wrong process returned');
        assert(r.data.department_name !== undefined, 'department_name missing');
        assert(Array.isArray(r.data.linked_risk_ids), 'linked_risk_ids missing');
        ok('GET single process', `uid: ${r.data.process_uid}`);
    });

    // ── Update (PATCH) ────────────────────────────────────
    await test('PATCH /api/bcm/processes/:id — update fields', async () => {
        const r = await api('PATCH', `/api/bcm/processes/${S.processId}`, {
            name:       'Client Trade Settlement & Clearing',
            criticality:'Critical',
            notes:      'Updated by BCM test suite',
            spof_flag:  true,
        });
        assert(r.status === 200, `Expected 200, got ${r.status}: ${JSON.stringify(r.data)}`);
        assert(r.data.name === 'Client Trade Settlement & Clearing', 'Name not updated');
        assert(r.data.notes === 'Updated by BCM test suite', 'Notes not updated');
        assert(Array.isArray(r.data.linked_risk_ids), 'linked_risk_ids missing from PATCH response');
        ok('PATCH process', 'name updated');
    });

    // ── Update linked risks ────────────────────────────────
    if (S.riskId) {
        await test('PATCH /api/bcm/processes/:id — clear linked risks', async () => {
            const r = await api('PATCH', `/api/bcm/processes/${S.processId}`, {
                linked_risk_ids: [],
            });
            assert(r.status === 200, `Expected 200, got ${r.status}`);
            assert(r.data.linked_risk_ids.length === 0, 'linked_risk_ids not cleared');
            ok('PATCH process: linked risks cleared');
        });

        await test('PATCH /api/bcm/processes/:id — restore linked risk', async () => {
            const r = await api('PATCH', `/api/bcm/processes/${S.processId}`, {
                linked_risk_ids: [S.riskId],
            });
            assert(r.status === 200, `Expected 200, got ${r.status}`);
            assert(r.data.linked_risk_ids.includes(S.riskId), 'Risk not restored');
            ok('PATCH process: linked risk restored');
        });
    }

    // ── Wrong ID ───────────────────────────────────────────
    await test('GET /api/bcm/processes/9999999 → 404', async () => {
        const r = await api('GET', '/api/bcm/processes/9999999');
        assert(r.status === 404, `Expected 404, got ${r.status}`);
        ok('GET unknown process → 404');
    });

    // ── Admin-only delete tested at end of section ─────────
}

// ============================================================
// SECTION 2 — BCP Document Library
// ============================================================

async function testBcps() {
    console.log('\n══ 2. BCP DOCUMENT LIBRARY ═════════════════════════════');

    // ── RBAC ──────────────────────────────────────────────
    await test('Viewer: GET /api/bcm/bcps → 403', async () => {
        const saved = token; token = S.viewerToken;
        const r = await api('GET', '/api/bcm/bcps');
        token = saved;
        assert(r.status === 403, `Expected 403, got ${r.status}`);
        ok('Viewer blocked from BCPs');
    });

    // ── Validation ────────────────────────────────────────
    await test('POST /api/bcm/bcps — missing name → 400', async () => {
        const r = await api('POST', '/api/bcm/bcps', { status: 'Active' });
        assert(r.status === 400, `Expected 400, got ${r.status}`);
        ok('Missing BCP name → 400');
    });

    await test('POST /api/bcm/bcps — invalid testing_frequency → 400', async () => {
        const r = await api('POST', '/api/bcm/bcps', {
            name: 'Test BCP', testing_frequency: 'Monthly',
        });
        assert(r.status === 400, `Expected 400, got ${r.status}`);
        ok('Invalid testing_frequency → 400');
    });

    // ── Create ────────────────────────────────────────────
    await test('POST /api/bcm/bcps — full payload', async () => {
        const r = await api('POST', '/api/bcm/bcps', {
            name:               'Trade Settlement BCP',
            bcp_owner:          'Head of Operations',
            version:            '2.1',
            effective_date:     '2025-03-01',
            document_link:      'POL-0042',
            testing_frequency:  'Annual',
            test_type_required: 'Tabletop Exercise',
            next_test_due:      '2026-03-01',
            status:             'Active',
            notes:              'Covers T+2 settlement failure scenarios',
            linked_process_ids: [S.processId, S.process2Id],
        });
        assert(r.status === 201, `Expected 201, got ${r.status}: ${JSON.stringify(r.data)}`);
        assert(r.data.bcp_uid, 'Missing bcp_uid');
        assert(r.data.bcp_uid.startsWith('BCP-'), `UID should start with BCP-, got ${r.data.bcp_uid}`);
        assert(r.data.testing_frequency === 'Annual', 'testing_frequency not persisted');
        assert(Array.isArray(r.data.linked_process_ids), 'linked_process_ids missing');
        assert(r.data.linked_process_ids.includes(S.processId), 'Process 1 not linked');
        assert(r.data.linked_process_ids.includes(S.process2Id), 'Process 2 not linked');
        S.bcpId  = r.data.id;
        S.bcpUid = r.data.bcp_uid;
        ok('BCP created', `${S.bcpUid}`);
    });

    // Second BCP (for activation linking)
    await test('POST /api/bcm/bcps — second BCP', async () => {
        const r = await api('POST', '/api/bcm/bcps', {
            name:              'Client Onboarding BCP',
            testing_frequency: 'Bi-annual',
            status:            'Draft',
        });
        assert(r.status === 201, `Expected 201, got ${r.status}`);
        S.bcp2Id  = r.data.id;
        S.bcp2Uid = r.data.bcp_uid;
        ok('Second BCP created', `${S.bcp2Uid}`);
    });

    // ── Read list ─────────────────────────────────────────
    await test('GET /api/bcm/bcps — list includes created BCPs', async () => {
        const r = await api('GET', '/api/bcm/bcps');
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        assert(Array.isArray(r.data), 'Expected array');
        const found = r.data.find(b => b.id === S.bcpId);
        assert(found, 'BCP not in list');
        assert(Array.isArray(found.linked_process_ids), 'linked_process_ids missing from list');
        assert(Array.isArray(found.linked_scenario_ids), 'linked_scenario_ids missing from list');
        ok('GET BCPs list', `total: ${r.data.length}`);
    });

    // ── Read single ───────────────────────────────────────
    await test('GET /api/bcm/bcps/:id', async () => {
        const r = await api('GET', `/api/bcm/bcps/${S.bcpId}`);
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        assert(r.data.id === S.bcpId, 'Wrong BCP returned');
        assert(Array.isArray(r.data.linked_process_ids), 'linked_process_ids missing');
        assert(Array.isArray(r.data.linked_scenario_ids), 'linked_scenario_ids missing');
        ok('GET single BCP', `uid: ${r.data.bcp_uid}`);
    });

    // ── Update ────────────────────────────────────────────
    await test('PATCH /api/bcm/bcps/:id — update version + remove one linked process', async () => {
        const saved = token; token = S.mgrToken;
        const r = await api('PATCH', `/api/bcm/bcps/${S.bcpId}`, {
            version:            '2.2',
            notes:              'Updated in test suite',
            linked_process_ids: [S.processId],   // drop process2Id
        });
        token = saved;
        assert(r.status === 200, `Expected 200, got ${r.status}: ${JSON.stringify(r.data)}`);
        assert(r.data.version === '2.2', 'Version not updated');
        assert(r.data.linked_process_ids.includes(S.processId), 'Process 1 missing after update');
        assert(!r.data.linked_process_ids.includes(S.process2Id), 'Process 2 should have been removed');
        ok('PATCH BCP — process links updated', `version: ${r.data.version}`);
    });

    // ── 404 ───────────────────────────────────────────────
    await test('GET /api/bcm/bcps/9999999 → 404', async () => {
        const r = await api('GET', '/api/bcm/bcps/9999999');
        assert(r.status === 404, `Expected 404, got ${r.status}`);
        ok('GET unknown BCP → 404');
    });
}

// ============================================================
// SECTION 3 — BCP Testing Log
// ============================================================

async function testBcpTests() {
    console.log('\n══ 3. BCP TESTING LOG ══════════════════════════════════');

    // ── RBAC ──────────────────────────────────────────────
    await test('Viewer: GET /api/bcm/tests → 403', async () => {
        const saved = token; token = S.viewerToken;
        const r = await api('GET', '/api/bcm/tests');
        token = saved;
        assert(r.status === 403, `Expected 403, got ${r.status}`);
        ok('Viewer blocked from tests');
    });

    // ── Validation ────────────────────────────────────────
    await test('POST /api/bcm/tests — missing bcp_id → 400', async () => {
        const r = await api('POST', '/api/bcm/tests', {
            test_date: '2025-06-01', test_type: 'Tabletop Exercise',
        });
        assert(r.status === 400, `Expected 400, got ${r.status}`);
        ok('Missing bcp_id → 400');
    });

    await test('POST /api/bcm/tests — missing test_date → 400', async () => {
        const r = await api('POST', '/api/bcm/tests', {
            bcp_id: S.bcpId, test_type: 'Tabletop Exercise',
        });
        assert(r.status === 400, `Expected 400, got ${r.status}`);
        ok('Missing test_date → 400');
    });

    await test('POST /api/bcm/tests — missing test_type → 400', async () => {
        const r = await api('POST', '/api/bcm/tests', {
            bcp_id: S.bcpId, test_date: '2025-06-01',
        });
        assert(r.status === 400, `Expected 400, got ${r.status}`);
        ok('Missing test_type → 400');
    });

    // ── Create ────────────────────────────────────────────
    await test('POST /api/bcm/tests — full payload', async () => {
        const r = await api('POST', '/api/bcm/tests', {
            bcp_id:           S.bcpId,
            test_date:        '2025-06-15',
            test_type:        'Tabletop Exercise',
            result:           'Pass',
            facilitator:      'Jane Smith',
            participants:     'Operations, IT, Compliance',
            observations:     'All recovery steps completed within RTO. Minor gaps in communications.',
            corrective_actions: 'Update call-tree for IT on-call roster',
            follow_up_due:    '2025-09-15',
            follow_up_complete: false,
            notes:            'Annual test as per testing schedule',
        });
        assert(r.status === 201, `Expected 201, got ${r.status}: ${JSON.stringify(r.data)}`);
        assert(r.data.test_uid, 'Missing test_uid');
        assert(r.data.test_uid.startsWith('BCT-'), `UID should start with BCT-, got ${r.data.test_uid}`);
        assert(r.data.result === 'Pass', 'Result not persisted');
        assert(r.data.follow_up_complete === false, 'follow_up_complete not persisted');
        S.testId  = r.data.id;
        S.testUid = r.data.test_uid;
        ok('BCP test record created', `${S.testUid}`);
    });

    // ── Verify BCP summary was auto-refreshed ─────────────
    await test('BCP last_tested_date auto-refreshed after test create', async () => {
        const r = await api('GET', `/api/bcm/bcps/${S.bcpId}`);
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        assert(r.data.last_tested_date, `last_tested_date should be set, got: ${r.data.last_tested_date}`);
        assert(r.data.last_test_result === 'Pass', `last_test_result should be Pass, got: ${r.data.last_test_result}`);
        ok('BCP last_tested_date auto-refreshed', `date: ${r.data.last_tested_date?.slice(0,10)}, result: ${r.data.last_test_result}`);
    });

    // ── Read list ─────────────────────────────────────────
    await test('GET /api/bcm/tests — list', async () => {
        const r = await api('GET', '/api/bcm/tests');
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        assert(Array.isArray(r.data), 'Expected array');
        const found = r.data.find(t => t.id === S.testId);
        assert(found, 'Test not in list');
        ok('GET tests list', `total: ${r.data.length}`);
    });

    // ── Filter by bcp_id ──────────────────────────────────
    await test('GET /api/bcm/tests?bcp_id= — filtered list', async () => {
        const r = await api('GET', `/api/bcm/tests?bcp_id=${S.bcpId}`);
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        assert(Array.isArray(r.data), 'Expected array');
        assert(r.data.every(t => t.bcp_id === S.bcpId), 'Filter returned tests for wrong BCP');
        ok('Filter by bcp_id works', `found: ${r.data.length}`);
    });

    // ── Read single ───────────────────────────────────────
    await test('GET /api/bcm/tests/:id', async () => {
        const r = await api('GET', `/api/bcm/tests/${S.testId}`);
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        assert(r.data.id === S.testId, 'Wrong test returned');
        assert(r.data.bcp_name, 'bcp_name should be joined');
        ok('GET single test', `uid: ${r.data.test_uid}`);
    });

    // ── Update ────────────────────────────────────────────
    await test('PATCH /api/bcm/tests/:id — mark follow-up complete', async () => {
        const r = await api('PATCH', `/api/bcm/tests/${S.testId}`, {
            follow_up_complete: true,
            notes: 'Call-tree updated; corrective action closed',
        });
        assert(r.status === 200, `Expected 200, got ${r.status}: ${JSON.stringify(r.data)}`);
        assert(r.data.follow_up_complete === true, 'follow_up_complete not updated');
        ok('PATCH test — follow-up marked complete');
    });

    // Create a second test with Fail result to verify last_test_result update
    await test('POST /api/bcm/tests — second test (Fail result, newer date)', async () => {
        const r = await api('POST', '/api/bcm/tests', {
            bcp_id:    S.bcpId,
            test_date: '2026-01-10',
            test_type: 'Simulation',
            result:    'Fail',
            facilitator: 'John Doe',
        });
        assert(r.status === 201, `Expected 201, got ${r.status}`);
        S.test2Id = r.data.id;
        ok('Second test created', `uid: ${r.data.test_uid}`);
    });

    await test('BCP last_test_result updated to Fail after newer test', async () => {
        const r = await api('GET', `/api/bcm/bcps/${S.bcpId}`);
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        assert(r.data.last_test_result === 'Fail', `Expected Fail, got: ${r.data.last_test_result}`);
        ok('BCP summary reflects most recent test result', `result: ${r.data.last_test_result}`);
    });

    // ── 404 ───────────────────────────────────────────────
    await test('GET /api/bcm/tests/9999999 → 404', async () => {
        const r = await api('GET', '/api/bcm/tests/9999999');
        assert(r.status === 404, `Expected 404, got ${r.status}`);
        ok('GET unknown test → 404');
    });
}

// ============================================================
// SECTION 4 — Threat / Disruption Scenario Library
// ============================================================

async function testScenarios() {
    console.log('\n══ 4. SCENARIO LIBRARY ═════════════════════════════════');

    // ── RBAC ──────────────────────────────────────────────
    await test('Viewer: GET /api/bcm/scenarios → 403', async () => {
        const saved = token; token = S.viewerToken;
        const r = await api('GET', '/api/bcm/scenarios');
        token = saved;
        assert(r.status === 403, `Expected 403, got ${r.status}`);
        ok('Viewer blocked from scenarios');
    });

    // ── Validation ────────────────────────────────────────
    await test('POST /api/bcm/scenarios — missing name → 400', async () => {
        const r = await api('POST', '/api/bcm/scenarios', { category: 'Cyber Attack' });
        assert(r.status === 400, `Expected 400, got ${r.status}`);
        ok('Missing scenario name → 400');
    });

    // ── Create ────────────────────────────────────────────
    await test('POST /api/bcm/scenarios — full payload', async () => {
        const r = await api('POST', '/api/bcm/scenarios', {
            name:                'Ransomware Attack on Core Banking',
            category:            'Cyber Attack',
            description:         'Ransomware encrypts core banking and settlement systems',
            likelihood:          'High',
            impact:              'Critical',
            affected_systems:    'Core Banking Platform, SWIFT Gateway, FX System',
            mitigation_measures: 'Offline backups, immutable snapshots, IR retainer, BCP-0001',
            owner:               'CISO',
            last_reviewed:       '2025-09-01',
            next_review:         '2026-09-01',
            status:              'Active',
            notes:               'Board-level scenario; annual tabletop required',
            linked_process_ids:  [S.processId],
            linked_bcp_ids:      [S.bcpId],
        });
        assert(r.status === 201, `Expected 201, got ${r.status}: ${JSON.stringify(r.data)}`);
        assert(r.data.scenario_uid, 'Missing scenario_uid');
        assert(r.data.scenario_uid.startsWith('SCN-'), `UID should start with SCN-, got ${r.data.scenario_uid}`);
        assert(r.data.likelihood === 'High', 'likelihood not persisted');
        assert(r.data.impact === 'Critical', 'impact not persisted');
        assert(r.data.category === 'Cyber Attack', 'category not persisted');
        assert(Array.isArray(r.data.linked_process_ids), 'linked_process_ids missing');
        assert(r.data.linked_process_ids.includes(S.processId), 'Process not linked to scenario');
        assert(Array.isArray(r.data.linked_bcp_ids), 'linked_bcp_ids missing');
        assert(r.data.linked_bcp_ids.includes(S.bcpId), 'BCP not linked to scenario');
        S.scenarioId  = r.data.id;
        S.scenarioUid = r.data.scenario_uid;
        ok('Scenario created', `${S.scenarioUid} — High×Critical = Critical risk`);
    });

    // Second scenario (for activation linking)
    await test('POST /api/bcm/scenarios — second scenario (Manager)', async () => {
        const saved = token; token = S.mgrToken;
        const r = await api('POST', '/api/bcm/scenarios', {
            name:       'Key Person Dependency — Head of Operations',
            category:   'Key Person Dependency',
            likelihood: 'Medium',
            impact:     'High',
            status:     'Active',
        });
        token = saved;
        assert(r.status === 201, `Expected 201, got ${r.status}`);
        S.scenario2Id  = r.data.id;
        S.scenario2Uid = r.data.scenario_uid;
        ok('Second scenario created', `${S.scenario2Uid}`);
    });

    // ── Read list ─────────────────────────────────────────
    await test('GET /api/bcm/scenarios — list', async () => {
        const r = await api('GET', '/api/bcm/scenarios');
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        assert(Array.isArray(r.data), 'Expected array');
        const found = r.data.find(s => s.id === S.scenarioId);
        assert(found, 'Scenario not in list');
        assert(Array.isArray(found.linked_process_ids), 'linked_process_ids missing from list');
        assert(Array.isArray(found.linked_bcp_ids), 'linked_bcp_ids missing from list');
        ok('GET scenarios list', `total: ${r.data.length}`);
    });

    // ── Read single ───────────────────────────────────────
    await test('GET /api/bcm/scenarios/:id', async () => {
        const r = await api('GET', `/api/bcm/scenarios/${S.scenarioId}`);
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        assert(r.data.id === S.scenarioId, 'Wrong scenario returned');
        ok('GET single scenario', `uid: ${r.data.scenario_uid}`);
    });

    // ── Update ────────────────────────────────────────────
    await test('PATCH /api/bcm/scenarios/:id — update + change BCP links', async () => {
        const r = await api('PATCH', `/api/bcm/scenarios/${S.scenarioId}`, {
            notes:           'Updated in test suite',
            linked_bcp_ids:  [S.bcpId, S.bcp2Id],
        });
        assert(r.status === 200, `Expected 200, got ${r.status}: ${JSON.stringify(r.data)}`);
        assert(r.data.notes === 'Updated in test suite', 'Notes not updated');
        assert(r.data.linked_bcp_ids.includes(S.bcpId),  'BCP 1 missing after update');
        assert(r.data.linked_bcp_ids.includes(S.bcp2Id), 'BCP 2 not added');
        ok('PATCH scenario — BCP links updated');
    });

    // ── Verify BCP now shows linked scenario ──────────────
    await test('GET /api/bcm/bcps/:id — linked_scenario_ids includes our scenario', async () => {
        const r = await api('GET', `/api/bcm/bcps/${S.bcpId}`);
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        assert(Array.isArray(r.data.linked_scenario_ids), 'linked_scenario_ids missing');
        assert(r.data.linked_scenario_ids.includes(S.scenarioId), 'Scenario not reflected on BCP');
        ok('BCP shows linked scenario (integration wiring)', `scenario_ids: ${r.data.linked_scenario_ids}`);
    });

    // ── 404 ───────────────────────────────────────────────
    await test('GET /api/bcm/scenarios/9999999 → 404', async () => {
        const r = await api('GET', '/api/bcm/scenarios/9999999');
        assert(r.status === 404, `Expected 404, got ${r.status}`);
        ok('GET unknown scenario → 404');
    });
}

// ============================================================
// SECTION 5 — Dependency & SPOF Register
// ============================================================

async function testDependencies() {
    console.log('\n══ 5. DEPENDENCY & SPOF REGISTER ══════════════════════');

    // ── RBAC ──────────────────────────────────────────────
    await test('Viewer: GET /api/bcm/dependencies → 403', async () => {
        const saved = token; token = S.viewerToken;
        const r = await api('GET', '/api/bcm/dependencies');
        token = saved;
        assert(r.status === 403, `Expected 403, got ${r.status}`);
        ok('Viewer blocked from dependencies');
    });

    // ── Validation ────────────────────────────────────────
    await test('POST /api/bcm/dependencies — missing name → 400', async () => {
        const r = await api('POST', '/api/bcm/dependencies', { dep_type: 'Vendor' });
        assert(r.status === 400, `Expected 400, got ${r.status}`);
        ok('Missing dependency name → 400');
    });

    // ── Create: non-SPOF ──────────────────────────────────
    await test('POST /api/bcm/dependencies — non-SPOF vendor', async () => {
        const r = await api('POST', '/api/bcm/dependencies', {
            name:        'SWIFT Network Gateway',
            dep_type:    'Vendor',
            description: 'International settlement messaging network',
            owner:       'Head of IT',
            spof_flag:   false,
            status:      'Active',
            notes:       'Redundant primary/backup connections',
            linked_process_ids: [S.processId],
        });
        assert(r.status === 201, `Expected 201, got ${r.status}: ${JSON.stringify(r.data)}`);
        assert(r.data.dependency_uid, 'Missing dependency_uid');
        assert(r.data.dependency_uid.startsWith('DEP-'), `UID should start with DEP-, got ${r.data.dependency_uid}`);
        assert(r.data.spof_flag === false, 'spof_flag should be false');
        assert(Array.isArray(r.data.linked_process_ids), 'linked_process_ids missing');
        assert(r.data.linked_process_ids.includes(S.processId), 'Process not linked');
        S.depId  = r.data.id;
        S.depUid = r.data.dependency_uid;
        ok('Dependency created', `${S.depUid}`);
    });

    // ── Create: SPOF ──────────────────────────────────────
    await test('POST /api/bcm/dependencies — SPOF dependency', async () => {
        const r = await api('POST', '/api/bcm/dependencies', {
            name:               'Core Banking System (Temenos T24)',
            dep_type:           'System',
            description:        'Single instance with no live failover',
            owner:              'CTO',
            spof_flag:          true,
            spof_justification: 'Only one production instance; no active-active setup',
            mitigation:         'Daily offsite backup; DR instance target 4hr RTO',
            status:             'Active',
            linked_process_ids: [S.processId, S.process2Id],
        });
        assert(r.status === 201, `Expected 201, got ${r.status}: ${JSON.stringify(r.data)}`);
        assert(r.data.spof_flag === true, 'spof_flag should be true');
        assert(r.data.spof_justification, 'spof_justification not persisted');
        assert(r.data.mitigation, 'mitigation not persisted');
        S.dep2Id  = r.data.id;
        S.dep2Uid = r.data.dependency_uid;
        ok('SPOF dependency created', `${S.dep2Uid}`);
    });

    // ── Read list ─────────────────────────────────────────
    await test('GET /api/bcm/dependencies — list sorted SPOFs first', async () => {
        const r = await api('GET', '/api/bcm/dependencies');
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        assert(Array.isArray(r.data), 'Expected array');
        const found = r.data.find(d => d.id === S.depId);
        assert(found, 'Dependency not in list');
        // Verify SPOF sorts first
        const spofIdx    = r.data.findIndex(d => d.id === S.dep2Id);
        const nonSpofIdx = r.data.findIndex(d => d.id === S.depId);
        assert(spofIdx < nonSpofIdx, 'SPOFs should sort before non-SPOFs');
        ok('GET dependencies — SPOF sorts first', `total: ${r.data.length}`);
    });

    // ── Read single ───────────────────────────────────────
    await test('GET /api/bcm/dependencies/:id', async () => {
        const r = await api('GET', `/api/bcm/dependencies/${S.dep2Id}`);
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        assert(r.data.spof_flag === true, 'spof_flag missing');
        assert(r.data.spof_justification, 'spof_justification missing');
        ok('GET single SPOF dependency', `uid: ${r.data.dependency_uid}`);
    });

    // ── Update ────────────────────────────────────────────
    await test('PATCH /api/bcm/dependencies/:id — add mitigation update', async () => {
        const r = await api('PATCH', `/api/bcm/dependencies/${S.dep2Id}`, {
            mitigation: 'DR instance provisioned; tested quarterly; RTO confirmed at 2hr',
        });
        assert(r.status === 200, `Expected 200, got ${r.status}: ${JSON.stringify(r.data)}`);
        assert(r.data.mitigation.includes('2hr'), 'Mitigation not updated');
        ok('PATCH dependency — mitigation updated');
    });

    // ── 404 ───────────────────────────────────────────────
    await test('GET /api/bcm/dependencies/9999999 → 404', async () => {
        const r = await api('GET', '/api/bcm/dependencies/9999999');
        assert(r.status === 404, `Expected 404, got ${r.status}`);
        ok('GET unknown dependency → 404');
    });
}

// ============================================================
// SECTION 6 — Activation / Incident Log
// ============================================================

async function testActivations() {
    console.log('\n══ 6. ACTIVATION / INCIDENT LOG ════════════════════════');

    // ── RBAC ──────────────────────────────────────────────
    await test('Viewer: GET /api/bcm/activations → 403', async () => {
        const saved = token; token = S.viewerToken;
        const r = await api('GET', '/api/bcm/activations');
        token = saved;
        assert(r.status === 403, `Expected 403, got ${r.status}`);
        ok('Viewer blocked from activations');
    });

    // ── Validation ────────────────────────────────────────
    await test('POST /api/bcm/activations — missing title → 400', async () => {
        const r = await api('POST', '/api/bcm/activations', {
            incident_date: '2025-11-01',
        });
        assert(r.status === 400, `Expected 400, got ${r.status}`);
        ok('Missing title → 400');
    });

    await test('POST /api/bcm/activations — missing incident_date → 400', async () => {
        const r = await api('POST', '/api/bcm/activations', {
            title: 'Test activation',
        });
        assert(r.status === 400, `Expected 400, got ${r.status}`);
        ok('Missing incident_date → 400');
    });

    // ── Create: full active incident ──────────────────────
    await test('POST /api/bcm/activations — active incident', async () => {
        const r = await api('POST', '/api/bcm/activations', {
            title:              'Ransomware Attack — November 2025',
            incident_date:      '2025-11-03',
            activated_date:     '2025-11-03',
            scenario_id:        S.scenarioId,
            triggered_by:       'IT Security team alert at 02:14',
            incident_commander: 'COO',
            status:             'Active',
            summary:            'Ransomware detected in core banking environment; BCPs activated',
            response_actions:   'Systems isolated, DR activated, regulators notified',
            rto_met:            null,
            rpo_met:            null,
            notes:              'Incident ongoing at time of record creation',
            linked_bcp_ids:     [S.bcpId],
            linked_process_ids: [S.processId],
        });
        assert(r.status === 201, `Expected 201, got ${r.status}: ${JSON.stringify(r.data)}`);
        assert(r.data.activation_uid, 'Missing activation_uid');
        assert(r.data.activation_uid.startsWith('INC-'), `UID should start with INC-, got ${r.data.activation_uid}`);
        assert(r.data.status === 'Active', 'Status not persisted');
        assert(r.data.scenario_id === S.scenarioId, 'scenario_id not persisted');
        assert(Array.isArray(r.data.linked_bcp_ids), 'linked_bcp_ids missing');
        assert(r.data.linked_bcp_ids.includes(S.bcpId), 'BCP not linked to activation');
        assert(Array.isArray(r.data.linked_process_ids), 'linked_process_ids missing');
        assert(r.data.linked_process_ids.includes(S.processId), 'Process not linked to activation');
        S.activationId  = r.data.id;
        S.activationUid = r.data.activation_uid;
        ok('Activation created', `${S.activationUid} — status: Active`);
    });

    // Second activation (closed, with RTO/RPO outcomes)
    await test('POST /api/bcm/activations — closed incident with RTO/RPO', async () => {
        const r = await api('POST', '/api/bcm/activations', {
            title:              'Utility Outage — Data Centre Power Failure',
            incident_date:      '2025-09-12',
            activated_date:     '2025-09-12',
            closed_date:        '2025-09-12',
            triggered_by:       'Facilities team',
            incident_commander: 'Head of IT',
            status:             'Closed',
            rto_met:            true,
            rpo_met:            true,
            lessons_learned:    'UPS battery replacement schedule brought forward; generator test frequency increased',
        });
        assert(r.status === 201, `Expected 201, got ${r.status}`);
        assert(r.data.rto_met === true, 'rto_met not persisted');
        assert(r.data.rpo_met === true, 'rpo_met not persisted');
        S.activation2Id  = r.data.id;
        S.activation2Uid = r.data.activation_uid;
        ok('Closed activation created', `${S.activation2Uid}`);
    });

    // ── Read list ─────────────────────────────────────────
    await test('GET /api/bcm/activations — list', async () => {
        const r = await api('GET', '/api/bcm/activations');
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        assert(Array.isArray(r.data), 'Expected array');
        const found = r.data.find(a => a.id === S.activationId);
        assert(found, 'Activation not in list');
        ok('GET activations list', `total: ${r.data.length}`);
    });

    // ── Read single ───────────────────────────────────────
    await test('GET /api/bcm/activations/:id', async () => {
        const r = await api('GET', `/api/bcm/activations/${S.activationId}`);
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        assert(r.data.id === S.activationId, 'Wrong activation returned');
        ok('GET single activation', `uid: ${r.data.activation_uid}`);
    });

    // ── Update: close the incident ────────────────────────
    await test('PATCH /api/bcm/activations/:id — close incident + set RTO/RPO outcomes', async () => {
        const r = await api('PATCH', `/api/bcm/activations/${S.activationId}`, {
            status:          'Closed',
            closed_date:     '2025-11-05',
            rto_met:         true,
            rpo_met:         false,
            lessons_learned: 'BCP activation was slow; update run-books. Comms chain worked well.',
        });
        assert(r.status === 200, `Expected 200, got ${r.status}: ${JSON.stringify(r.data)}`);
        assert(r.data.status === 'Closed', 'Status not updated to Closed');
        assert(r.data.rto_met === true,  'rto_met not updated');
        assert(r.data.rpo_met === false, 'rpo_met not updated');
        assert(r.data.lessons_learned, 'lessons_learned not persisted');
        ok('PATCH activation — closed with outcomes', `rto_met: ${r.data.rto_met}, rpo_met: ${r.data.rpo_met}`);
    });

    // ── 404 ───────────────────────────────────────────────
    await test('GET /api/bcm/activations/9999999 → 404', async () => {
        const r = await api('GET', '/api/bcm/activations/9999999');
        assert(r.status === 404, `Expected 404, got ${r.status}`);
        ok('GET unknown activation → 404');
    });
}

// ============================================================
// SECTION 7 — BCM Dashboard + KRIs
// ============================================================

async function testDashboard() {
    console.log('\n══ 7. BCM DASHBOARD + KRIs ═════════════════════════════');

    // ── RBAC ──────────────────────────────────────────────
    await test('Viewer: GET /api/bcm/dashboard → 403', async () => {
        const saved = token; token = S.viewerToken;
        const r = await api('GET', '/api/bcm/dashboard');
        token = saved;
        assert(r.status === 403, `Expected 403, got ${r.status}`);
        ok('Viewer blocked from dashboard');
    });

    // ── Admin: full dashboard ─────────────────────────────
    await test('GET /api/bcm/dashboard — response shape (Admin)', async () => {
        const r = await api('GET', '/api/bcm/dashboard');
        assert(r.status === 200, `Expected 200, got ${r.status}: ${JSON.stringify(r.data)}`);
        const { stats, recentTests, activeIncidents, overdueTests } = r.data;

        // stats object exists
        assert(stats, 'stats missing');
        assert(typeof stats.active_processes === 'number',   'stats.active_processes missing');
        assert(typeof stats.total_processes === 'number',    'stats.total_processes missing');
        assert(typeof stats.processes_with_bcp === 'number', 'stats.processes_with_bcp missing');
        assert(typeof stats.active_bcps === 'number',        'stats.active_bcps missing');
        assert(typeof stats.bcps_test_overdue === 'number',   'stats.bcps_test_overdue missing');
        assert(typeof stats.active_scenarios === 'number',   'stats.active_scenarios missing');
        assert(typeof stats.spof_count === 'number',         'stats.spof_count missing');
        assert(typeof stats.active_incidents === 'number',   'stats.active_incidents missing');

        // KRI fields (names match the dashboard SQL aliases)
        assert(typeof stats.bia_overdue === 'number',              'stats.bia_overdue missing');
        assert(typeof stats.tests_last_12m === 'number',           'stats.tests_last_12m missing');
        assert(typeof stats.tests_passed_last_12m === 'number',    'stats.tests_passed_last_12m missing');
        assert(typeof stats.spof_mitigated === 'number',           'stats.spof_mitigated missing');
        assert(typeof stats.incidents_rto_measured === 'number',   'stats.incidents_rto_measured missing');
        assert(typeof stats.incidents_rto_met === 'number',        'stats.incidents_rto_met missing');
        assert(typeof stats.incidents_rpo_measured === 'number',   'stats.incidents_rpo_measured missing');
        assert(typeof stats.incidents_rpo_met === 'number',        'stats.incidents_rpo_met missing');

        // Detail arrays
        assert(Array.isArray(recentTests),     'recentTests missing or not array');
        assert(Array.isArray(activeIncidents), 'activeIncidents missing or not array');
        assert(Array.isArray(overdueTests),    'overdueTests missing or not array');

        // Verify data we created is reflected
        assert(stats.active_processes >= 2, `Expected ≥2 active processes, got ${stats.active_processes}`);
        assert(stats.active_bcps >= 1,      `Expected ≥1 active BCP, got ${stats.active_bcps}`);
        assert(stats.active_scenarios >= 1, `Expected ≥1 scenario, got ${stats.active_scenarios}`);
        assert(stats.spof_count >= 1,       `Expected ≥1 SPOF, got ${stats.spof_count}`);
        assert(recentTests.length >= 1,     `Expected ≥1 recent test in list, got ${recentTests.length}`);

        ok('GET dashboard — all fields present', [
            `processes: ${stats.active_processes}`,
            `bcps: ${stats.active_bcps}`,
            `scenarios: ${stats.active_scenarios}`,
            `spofs: ${stats.spof_count}`,
            `incidents: ${stats.active_incidents}`,
        ].join(', '));
    });

    // ── Manager: same response ─────────────────────────────
    await test('GET /api/bcm/dashboard — Manager allowed', async () => {
        const saved = token; token = S.mgrToken;
        const r = await api('GET', '/api/bcm/dashboard');
        token = saved;
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        assert(r.data.stats, 'stats missing for Manager');
        ok('Manager can access dashboard');
    });
}

// ============================================================
// SECTION 8 — Integration Wiring
// ============================================================

async function testIntegration() {
    console.log('\n══ 8. INTEGRATION WIRING ═══════════════════════════════');

    // Process → Risk linkage
    if (S.riskId) {
        await test('Process shows linked_risk_ids in list', async () => {
            const r = await api('GET', '/api/bcm/processes');
            assert(r.status === 200, `Expected 200, got ${r.status}`);
            const proc = r.data.find(p => p.id === S.processId);
            assert(proc, 'Process not found');
            assert(Array.isArray(proc.linked_risk_ids), 'linked_risk_ids not in list response');
            assert(proc.linked_risk_ids.includes(S.riskId), 'Risk ID missing from process in list');
            ok('Process → Risk: linked_risk_ids in list response');
        });

        await test('Process shows linked_risk_ids in single GET', async () => {
            const r = await api('GET', `/api/bcm/processes/${S.processId}`);
            assert(r.status === 200, `Expected 200, got ${r.status}`);
            assert(r.data.linked_risk_ids.includes(S.riskId), 'Risk ID missing from single process GET');
            ok('Process → Risk: linked_risk_ids in single GET');
        });
    }

    // Scenario → Process linkage
    await test('Scenario shows linked_process_ids', async () => {
        const r = await api('GET', `/api/bcm/scenarios/${S.scenarioId}`);
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        assert(r.data.linked_process_ids.includes(S.processId), 'Process missing from scenario');
        ok('Scenario → Process: link persisted');
    });

    // Scenario → BCP linkage
    await test('Scenario shows linked_bcp_ids', async () => {
        const r = await api('GET', `/api/bcm/scenarios/${S.scenarioId}`);
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        assert(Array.isArray(r.data.linked_bcp_ids), 'linked_bcp_ids missing');
        assert(r.data.linked_bcp_ids.includes(S.bcpId), 'BCP missing from scenario');
        ok('Scenario → BCP: link persisted');
    });

    // BCP → Scenario reverse linkage
    await test('BCP shows linked_scenario_ids (reverse of scenario→BCP)', async () => {
        const r = await api('GET', `/api/bcm/bcps/${S.bcpId}`);
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        assert(Array.isArray(r.data.linked_scenario_ids), 'linked_scenario_ids missing from BCP');
        assert(r.data.linked_scenario_ids.includes(S.scenarioId), 'Scenario missing from BCP reverse lookup');
        ok('BCP → Scenario: reverse link works', `scenario_ids: ${r.data.linked_scenario_ids.length}`);
    });

    // BCP → Process linkage (bcm_bcp_processes)
    await test('BCP shows linked_process_ids', async () => {
        const r = await api('GET', `/api/bcm/bcps/${S.bcpId}`);
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        assert(r.data.linked_process_ids.includes(S.processId), 'Process missing from BCP');
        ok('BCP → Process: link persisted');
    });

    // Activation → BCP linkage
    await test('Activation shows linked_bcp_ids', async () => {
        const r = await api('GET', `/api/bcm/activations/${S.activationId}`);
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        assert(Array.isArray(r.data.linked_bcp_ids), 'linked_bcp_ids missing from activation');
        assert(r.data.linked_bcp_ids.includes(S.bcpId), 'BCP missing from activation');
        ok('Activation → BCP: link persisted');
    });

    // Activation → Process linkage
    await test('Activation shows linked_process_ids', async () => {
        const r = await api('GET', `/api/bcm/activations/${S.activationId}`);
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        assert(Array.isArray(r.data.linked_process_ids), 'linked_process_ids missing from activation');
        assert(r.data.linked_process_ids.includes(S.processId), 'Process missing from activation');
        ok('Activation → Process: link persisted');
    });

    // Dependency → Process linkage
    await test('Dependency shows linked_process_ids', async () => {
        const r = await api('GET', `/api/bcm/dependencies/${S.depId}`);
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        assert(r.data.linked_process_ids.includes(S.processId), 'Process missing from dependency');
        ok('Dependency → Process: link persisted');
    });

    // BCP auto-refresh after test add/delete
    await test('BCP last_tested_date updates on test DELETE', async () => {
        // Delete the newer (Fail) test; BCP should revert to Pass from the older test
        const r1 = await api('DELETE', `/api/bcm/tests/${S.test2Id}`);
        assert(r1.status === 200, `Expected 200 on DELETE, got ${r1.status}`);

        const r2 = await api('GET', `/api/bcm/bcps/${S.bcpId}`);
        assert(r2.status === 200, `Expected 200, got ${r2.status}`);
        assert(r2.data.last_test_result === 'Pass',
            `Expected Pass after deleting Fail test, got: ${r2.data.last_test_result}`);
        ok('BCP summary reverts to Pass after Fail test deleted');
    });
}

// ============================================================
// SECTION 9 — Admin-only DELETE
// ============================================================

async function testDeletes() {
    console.log('\n══ 9. DELETE OPERATIONS (RBAC + BEHAVIOUR) ════════════');

    // Manager cannot delete (processes, BCPs, scenarios, dependencies — Admin only)
    await test('Manager: DELETE /api/bcm/processes → 403', async () => {
        const saved = token; token = S.mgrToken;
        const r = await api('DELETE', `/api/bcm/processes/${S.processId}`);
        token = saved;
        assert(r.status === 403, `Expected 403, got ${r.status}`);
        ok('Manager cannot delete process');
    });

    await test('Manager: DELETE /api/bcm/bcps → 403', async () => {
        const saved = token; token = S.mgrToken;
        const r = await api('DELETE', `/api/bcm/bcps/${S.bcpId}`);
        token = saved;
        assert(r.status === 403, `Expected 403, got ${r.status}`);
        ok('Manager cannot delete BCP');
    });

    await test('Manager: DELETE /api/bcm/scenarios → 403', async () => {
        const saved = token; token = S.mgrToken;
        const r = await api('DELETE', `/api/bcm/scenarios/${S.scenarioId}`);
        token = saved;
        assert(r.status === 403, `Expected 403, got ${r.status}`);
        ok('Manager cannot delete scenario');
    });

    await test('Manager: DELETE /api/bcm/dependencies → 403', async () => {
        const saved = token; token = S.mgrToken;
        const r = await api('DELETE', `/api/bcm/dependencies/${S.depId}`);
        token = saved;
        assert(r.status === 403, `Expected 403, got ${r.status}`);
        ok('Manager cannot delete dependency');
    });

    // Manager CAN delete tests and activations (hard delete, any authorised user)
    // Actually — let's check: tests use hard delete, activations use hard delete
    // Both use requireRole('Admin') per spec. Let's verify.
    await test('Manager: DELETE /api/bcm/tests → 403', async () => {
        const saved = token; token = S.mgrToken;
        const r = await api('DELETE', `/api/bcm/tests/${S.testId}`);
        token = saved;
        assert(r.status === 403, `Expected 403, got ${r.status}`);
        ok('Manager cannot delete test record');
    });

    await test('Manager: DELETE /api/bcm/activations → 403', async () => {
        const saved = token; token = S.mgrToken;
        const r = await api('DELETE', `/api/bcm/activations/${S.activationId}`);
        token = saved;
        assert(r.status === 403, `Expected 403, got ${r.status}`);
        ok('Manager cannot delete activation');
    });

    // ── Admin soft-deletes (processes, BCPs, scenarios, dependencies) ──
    await test('Admin: DELETE /api/bcm/dependencies/:id — soft delete', async () => {
        const r = await api('DELETE', `/api/bcm/dependencies/${S.depId}`);
        assert(r.status === 200, `Expected 200, got ${r.status}: ${JSON.stringify(r.data)}`);
        ok('Admin soft-deleted dependency');
    });

    await test('Soft-deleted dependency not in list', async () => {
        const r = await api('GET', '/api/bcm/dependencies');
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        const found = r.data.find(d => d.id === S.depId);
        assert(!found, 'Soft-deleted dependency should not appear in list');
        ok('Deleted dependency absent from list');
    });

    // Hard delete tests and activations
    await test('Admin: DELETE /api/bcm/tests/:id — hard delete', async () => {
        const r = await api('DELETE', `/api/bcm/tests/${S.testId}`);
        assert(r.status === 200, `Expected 200, got ${r.status}: ${JSON.stringify(r.data)}`);
        ok('Admin hard-deleted test record');
    });

    await test('Hard-deleted test not in list', async () => {
        const r = await api('GET', '/api/bcm/tests');
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        const found = r.data.find(t => t.id === S.testId);
        assert(!found, 'Hard-deleted test should not appear in list');
        ok('Deleted test absent from list');
    });

    await test('BCP last_tested_date clears when all tests deleted', async () => {
        const r = await api('GET', `/api/bcm/bcps/${S.bcpId}`);
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        // Both tests now deleted; last_tested_date should be null
        assert(r.data.last_tested_date === null || r.data.last_tested_date === undefined,
            `Expected null last_tested_date after all tests deleted, got: ${r.data.last_tested_date}`);
        ok('BCP last_tested_date is null after all tests deleted');
    });

    await test('Admin: DELETE /api/bcm/activations/:id — hard delete', async () => {
        const r = await api('DELETE', `/api/bcm/activations/${S.activationId}`);
        assert(r.status === 200, `Expected 200, got ${r.status}: ${JSON.stringify(r.data)}`);
        ok('Admin hard-deleted activation');
    });

    await test('Admin: DELETE /api/bcm/scenarios/:id — soft delete', async () => {
        const r = await api('DELETE', `/api/bcm/scenarios/${S.scenarioId}`);
        assert(r.status === 200, `Expected 200, got ${r.status}: ${JSON.stringify(r.data)}`);
        ok('Admin soft-deleted scenario');
    });

    await test('Admin: DELETE /api/bcm/bcps/:id — soft delete', async () => {
        const r = await api('DELETE', `/api/bcm/bcps/${S.bcpId}`);
        assert(r.status === 200, `Expected 200, got ${r.status}: ${JSON.stringify(r.data)}`);
        ok('Admin soft-deleted BCP');
    });

    await test('Admin: DELETE /api/bcm/processes/:id — soft delete', async () => {
        const r = await api('DELETE', `/api/bcm/processes/${S.processId}`);
        assert(r.status === 200, `Expected 200, got ${r.status}: ${JSON.stringify(r.data)}`);
        ok('Admin soft-deleted process');
    });

    await test('Soft-deleted process not in list', async () => {
        const r = await api('GET', '/api/bcm/processes');
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        const found = r.data.find(p => p.id === S.processId);
        assert(!found, 'Soft-deleted process should not appear in list');
        ok('Deleted process absent from list');
    });

    await test('Soft-deleted BCP not in list', async () => {
        const r = await api('GET', '/api/bcm/bcps');
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        const found = r.data.find(b => b.id === S.bcpId);
        assert(!found, 'Soft-deleted BCP should not appear in list');
        ok('Deleted BCP absent from list');
    });

    await test('Soft-deleted scenario not in list', async () => {
        const r = await api('GET', '/api/bcm/scenarios');
        assert(r.status === 200, `Expected 200, got ${r.status}`);
        const found = r.data.find(s => s.id === S.scenarioId);
        assert(!found, 'Soft-deleted scenario should not appear in list');
        ok('Deleted scenario absent from list');
    });
}

// ============================================================
// SECTION 10 — UID uniqueness
// ============================================================

async function testUidUniqueness() {
    console.log('\n══ 10. UID UNIQUENESS ══════════════════════════════════');

    await test('Create 3 processes — UIDs are unique and sequential', async () => {
        const uids = [];
        for (let i = 1; i <= 3; i++) {
            const r = await api('POST', '/api/bcm/processes', {
                name: `UID Test Process ${i}`,
                criticality: 'Low',
            });
            assert(r.status === 201, `Expected 201 on create ${i}, got ${r.status}`);
            assert(!uids.includes(r.data.process_uid), `Duplicate UID: ${r.data.process_uid}`);
            uids.push(r.data.process_uid);
            // Clean up immediately
            await api('DELETE', `/api/bcm/processes/${r.data.id}`);
        }
        ok('Process UIDs unique', `UIDs: ${uids.join(', ')}`);
    });

    await test('Create 2 BCPs — UIDs unique', async () => {
        const uids = [];
        for (let i = 1; i <= 2; i++) {
            const r = await api('POST', '/api/bcm/bcps', {
                name: `UID Test BCP ${i}`,
                testing_frequency: 'Annual',
            });
            assert(r.status === 201, `Expected 201, got ${r.status}`);
            assert(!uids.includes(r.data.bcp_uid), `Duplicate UID: ${r.data.bcp_uid}`);
            uids.push(r.data.bcp_uid);
            await api('DELETE', `/api/bcm/bcps/${r.data.id}`);
        }
        ok('BCP UIDs unique', `UIDs: ${uids.join(', ')}`);
    });
}

// ============================================================
// SECTION 11 — Cleanup
// ============================================================

async function cleanup() {
    console.log('\n══ CLEANUP ═════════════════════════════════════════════');

    // Clean up remaining test records
    const cleanups = [
        ['DELETE', `/api/bcm/activations/${S.activation2Id}`],
        ['DELETE', `/api/bcm/dependencies/${S.dep2Id}`],
        ['DELETE', `/api/bcm/scenarios/${S.scenario2Id}`],
        ['DELETE', `/api/bcm/bcps/${S.bcp2Id}`],
        ['DELETE', `/api/bcm/processes/${S.process2Id}`],
    ];

    for (const [method, path] of cleanups) {
        if (!path.endsWith('/undefined') && !path.endsWith('/null')) {
            await api(method, path);
        }
    }

    // Delete test users
    const testUsers = [
        { id: S.mgrUserId,           name: 'Risk Manager'        },
        { id: S.viewerUserId,        name: 'Viewer'         },
        { id: S.croUserId,           name: 'CRO'            },
        { id: S.staffUserId,         name: 'Risk Champion'  },
        { id: S.consultantCroUserId, name: 'Consultant CRO' },
    ];
    for (const { id, name } of testUsers) {
        if (id) {
            await test(`Delete ${name} user`, async () => {
                const r = await api('DELETE', `/api/users/${id}`);
                assert([200, 204, 404].includes(r.status), `Unexpected status ${r.status}`);
                ok(`${name} user deleted`);
            });
        }
    }

    console.log('\n  Cleanup complete.');
}

// ============================================================
// MAIN
// ============================================================

async function main() {
    console.log('');
    console.log('╔══════════════════════════════════════════════════════╗');
    console.log('║   GRC Workstation — BCM Module Test Suite            ║');
    console.log('╚══════════════════════════════════════════════════════╝');
    console.log(`  Target: ${BASE_URL}`);
    console.log(`  Date:   ${new Date().toISOString()}`);
    console.log('');

    await setup();
    await testRbacMatrix();
    await testProcesses();
    await testBcps();
    await testBcpTests();
    await testScenarios();
    await testDependencies();
    await testActivations();
    await testDashboard();
    await testIntegration();
    await testDeletes();
    await testUidUniqueness();
    await cleanup();

    // ── Summary ───────────────────────────────────────────
    console.log('');
    console.log('╔══════════════════════════════════════════════════════╗');
    console.log('║   RESULTS                                            ║');
    console.log('╚══════════════════════════════════════════════════════╝');

    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const total  = results.length;

    if (failed > 0) {
        console.log('\n  FAILURES:\n');
        results.filter(r => !r.passed).forEach(r => {
            console.log(`  ❌  ${r.name}`);
            console.log(`       → ${r.reason}`);
        });
    }

    console.log('');
    console.log(`  Total:  ${total}`);
    console.log(`  Passed: ${passed} ✅`);
    console.log(`  Failed: ${failed} ${failed > 0 ? '❌' : '✅'}`);
    console.log('');

    if (failed > 0) process.exit(1);
}

main().catch(e => {
    console.error('\n  FATAL:', e.message);
    process.exit(1);
});

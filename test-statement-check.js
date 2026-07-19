/**
 * test-statement-check.js
 * Automated tests for the Risk Statement Quality Check heuristic.
 *
 * Tests the same keyword logic used in RiskRegister.jsx — no browser needed.
 * Run: node test-statement-check.js
 */

'use strict';

// ─── Mirror of the heuristic from RiskRegister.jsx ───────────────────────────

const CAUSE_WORDS = [
    'due to', 'because', 'because of', 'owing to', 'as a result of', 'caused by',
    'triggered by', 'driven by', 'stemming from', 'arising from', 'following',
    'given that', 'since ', 'lack of', 'absence of', 'failure to', 'failure of',
    'inadequate', 'insufficient', 'poor ', 'weak ', 'limited ', 'reliance on',
];
const EFFECT_WORDS = [
    'risk that', 'risk of', 'there is a risk', 'may ', 'might ', 'could ',
    'possibility', 'potential ', 'threatens', 'at risk', 'unable to', 'fails to',
    'may result', 'could result', 'might result', 'risk exists', 'exposing',
];
const IMPACT_WORDS = [
    'resulting in', 'leading to', 'which may cause', 'which could cause',
    'impacting', 'affecting', 'causing ', 'damage to', 'harm to', 'disruption',
    'financial loss', 'financial impact', 'reputational', 'regulatory',
    'penalty', 'penalties', 'fine', 'fines', 'legal', 'liability', 'breach',
    'loss of', 'failure of service', 'downtime', 'outage', 'non-compliance',
    'sanction', 'cost to', 'exposure', 'data loss',
];
// Note: 'breach' deliberately matches "data breach" (it implies an impact/consequence).
// The heuristic is permissive — it flags likely presence of an element, not absence of one.

function checkRiskStatement(text) {
    const t = (text || '').toLowerCase();
    const has = (words) => words.some((w) => t.includes(w));
    const cause  = has(CAUSE_WORDS);
    const effect = has(EFFECT_WORDS);
    const impact = has(IMPACT_WORDS);
    const missing = [
        !cause  && 'cause (why does this risk exist?)',
        !effect && 'risk event (what might happen?)',
        !impact && 'impact (what would the consequence be?)',
    ].filter(Boolean);
    return { cause, effect, impact, missing, allPresent: cause && effect && impact };
}

// ─── Minimal test harness ─────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
    try {
        fn();
        console.log(`  ✓  ${name}`);
        passed++;
    } catch (err) {
        console.log(`  ✗  ${name}`);
        console.log(`       ${err.message}`);
        failed++;
        failures.push({ name, error: err.message });
    }
}

function assert(condition, msg) {
    if (!condition) throw new Error(msg || 'Assertion failed');
}

function section(title) {
    console.log(`\n${title}`);
    console.log('─'.repeat(title.length));
}

// ─── Tests ────────────────────────────────────────────────────────────────────

section('1. Complete statements — all three elements present');

test('Classic "due to / risk that / resulting in" template', () => {
    const r = checkRiskStatement(
        'Due to inadequate patch management processes, there is a risk that a known vulnerability is exploited by an attacker, resulting in a data breach and regulatory penalties.'
    );
    assert(r.allPresent, 'Expected allPresent = true');
    assert(r.cause,  'Expected cause detected');
    assert(r.effect, 'Expected effect detected');
    assert(r.impact, 'Expected impact detected');
    assert(r.missing.length === 0, 'Expected no missing elements');
});

test('"Because of / could / leading to" phrasing', () => {
    const r = checkRiskStatement(
        'Because of our heavy reliance on a single cloud provider, key systems could become unavailable, leading to significant operational disruption and customer loss.'
    );
    assert(r.allPresent, 'Expected allPresent = true');
});

test('"Failure to / may result in / financial loss" phrasing', () => {
    const r = checkRiskStatement(
        'Failure to maintain adequate segregation of duties in the finance function may result in fraudulent transactions going undetected, causing significant financial loss.'
    );
    assert(r.allPresent, 'Expected allPresent = true');
});

test('"Lack of / might / reputational" phrasing', () => {
    const r = checkRiskStatement(
        'Lack of a formal vendor assessment process means a third-party supplier might fail to meet our security standards, resulting in reputational damage and potential regulatory breach.'
    );
    assert(r.allPresent, 'Expected allPresent = true');
});

test('"Inadequate / there is a risk / non-compliance" phrasing', () => {
    const r = checkRiskStatement(
        'Inadequate staff training on data handling practices means there is a risk that personal data is mishandled, leading to non-compliance with privacy legislation.'
    );
    assert(r.allPresent, 'Expected allPresent = true');
});

test('"Insufficient / could / penalties" phrasing', () => {
    const r = checkRiskStatement(
        'Insufficient monitoring of access logs means a malicious insider could exfiltrate sensitive data undetected, resulting in penalties and loss of client trust.'
    );
    assert(r.allPresent, 'Expected allPresent = true');
});

test('Case-insensitive detection (all caps)', () => {
    const r = checkRiskStatement(
        'DUE TO POOR CHANGE MANAGEMENT, THERE IS A RISK THAT UNAUTHORISED CHANGES ARE DEPLOYED, RESULTING IN SYSTEM DOWNTIME.'
    );
    assert(r.allPresent, 'Expected allPresent = true — check should be case-insensitive');
});

section('2. Missing cause — effect and impact present');

test('No cause keyword — flags cause only', () => {
    const r = checkRiskStatement(
        'There is a risk that our primary data centre experiences a power failure, resulting in service downtime for all clients.'
    );
    assert(!r.cause,  'Expected cause NOT detected');
    assert(r.effect,  'Expected effect detected');
    assert(r.impact,  'Expected impact detected');
    assert(!r.allPresent, 'Expected allPresent = false');
    assert(r.missing.length === 1, 'Expected exactly 1 missing element');
    assert(r.missing[0].includes('cause'), `Expected missing[0] to mention cause, got: ${r.missing[0]}`);
});

test('Statement starting with risk event only', () => {
    const r = checkRiskStatement(
        'The system could be taken offline by a ransomware attack, leading to an outage lasting several days.'
    );
    assert(!r.cause,  'Expected cause NOT detected');
    assert(r.effect,  'Expected effect detected');
    assert(r.impact,  'Expected impact detected');
});

section('3. Missing effect — cause and impact present');

test('Cause and impact present, no risk event phrasing', () => {
    const r = checkRiskStatement(
        'Due to ageing infrastructure, our disaster recovery plan is no longer fit for purpose, resulting in financial loss if a major incident occurs.'
    );
    assert(r.cause,   'Expected cause detected');
    assert(!r.effect, 'Expected effect NOT detected');
    assert(r.impact,  'Expected impact detected');
    assert(!r.allPresent, 'Expected allPresent = false');
    assert(r.missing.some((m) => m.includes('risk event')), 'Expected missing to include risk event');
});

section('4. Missing impact — cause and effect present');

test('No impact keyword — flags impact only', () => {
    const r = checkRiskStatement(
        'Due to the absence of multi-factor authentication, there is a risk that an attacker uses stolen credentials to log in to our systems.'
    );
    assert(r.cause,   'Expected cause detected');
    assert(r.effect,  'Expected effect detected');
    assert(!r.impact, 'Expected impact NOT detected');
    assert(!r.allPresent, 'Expected allPresent = false');
    assert(r.missing.some((m) => m.includes('impact')), 'Expected missing to include impact');
});

test('Statement ending abruptly with no consequence', () => {
    const r = checkRiskStatement(
        'Because of a lack of encryption on portable devices, sensitive data might be accessed if a device is lost or stolen.'
    );
    assert(r.cause,   'Expected cause detected');
    assert(r.effect,  'Expected effect detected');
    assert(!r.impact, 'Expected impact NOT detected');
});

section('5. Missing multiple elements');

test('Effect only (no cause, no impact)', () => {
    const r = checkRiskStatement(
        'Our systems could be compromised.'
    );
    assert(!r.cause,  'Expected cause NOT detected');
    assert(r.effect,  'Expected effect detected');
    assert(!r.impact, 'Expected impact NOT detected');
    assert(r.missing.length === 2, `Expected 2 missing elements, got ${r.missing.length}`);
});

test('Impact only (no cause, no effect)', () => {
    const r = checkRiskStatement(
        'This exposes the organisation to significant financial loss and regulatory penalties.'
    );
    assert(!r.cause,  'Expected cause NOT detected');
    assert(!r.effect, 'Expected effect NOT detected');
    assert(r.impact,  'Expected impact detected');
    assert(r.missing.length === 2, `Expected 2 missing elements, got ${r.missing.length}`);
});

test('All three elements missing — label-only statement', () => {
    // "breach" is in IMPACT_WORDS (intentionally — "data breach" implies a consequence),
    // so use a statement with no recognisable keywords at all.
    const r = checkRiskStatement('Vendor management.');
    assert(!r.allPresent, 'Expected allPresent = false');
    assert(r.missing.length === 3, `Expected 3 missing elements, got ${r.missing.length}`);
});

test('"Data breach" label correctly triggers impact detector (known heuristic behaviour)', () => {
    // The heuristic is permissive: "breach" is treated as an impact word even when
    // used as a noun label. A user writing only "Data breach risk" still gets flagged
    // for missing cause and effect — which is the desired coaching behaviour.
    const r = checkRiskStatement('Data breach risk.');
    assert(!r.cause,  'Expected cause NOT detected');
    assert(!r.effect, 'Expected effect NOT detected — "risk." alone does not match "risk that" or "risk of"');
    assert(r.impact,  'Expected impact detected — "breach" is in IMPACT_WORDS');
    assert(r.missing.length === 2, `Expected 2 missing (cause + effect), got ${r.missing.length}`);
});

test('Single-word description', () => {
    const r = checkRiskStatement('Cybersecurity');
    assert(!r.allPresent, 'Expected allPresent = false');
    assert(r.missing.length === 3, 'Expected all 3 elements missing');
});

section('6. Edge cases');

test('Empty string → all missing', () => {
    const r = checkRiskStatement('');
    assert(!r.allPresent, 'Expected allPresent = false for empty string');
    assert(r.missing.length === 3, 'Expected all 3 missing for empty string');
});

test('Null → all missing (no crash)', () => {
    const r = checkRiskStatement(null);
    assert(!r.allPresent, 'Expected allPresent = false for null');
    assert(r.missing.length === 3, 'Expected all 3 missing for null');
});

test('Undefined → all missing (no crash)', () => {
    const r = checkRiskStatement(undefined);
    assert(!r.allPresent, 'Expected allPresent = false for undefined');
    assert(r.missing.length === 3, 'Expected all 3 missing for undefined');
});

test('Very long statement — still detects all elements', () => {
    const longStatement = 'Due to ' + 'a'.repeat(5000) + ' there is a risk that ' + 'b'.repeat(5000) + ' resulting in financial loss.';
    const r = checkRiskStatement(longStatement);
    assert(r.allPresent, 'Expected allPresent = true for very long statement');
});

test('Multiple spaces and mixed case do not break detection', () => {
    const r = checkRiskStatement('   Due To   Lack Of   oversight ,   there is a risk that   errors   occur ,   RESULTING IN   reputational harm .   ');
    assert(r.cause,  'Expected cause detected despite mixed case and extra spaces');
    assert(r.effect, 'Expected effect detected despite mixed case and extra spaces');
    assert(r.impact, 'Expected impact detected despite mixed case and extra spaces');
});

section('7. Return value structure');

test('Result always contains cause, effect, impact, missing, allPresent', () => {
    const r = checkRiskStatement('test');
    assert('cause'      in r, 'Expected cause in result');
    assert('effect'     in r, 'Expected effect in result');
    assert('impact'     in r, 'Expected impact in result');
    assert('missing'    in r, 'Expected missing in result');
    assert('allPresent' in r, 'Expected allPresent in result');
    assert(Array.isArray(r.missing), 'Expected missing to be an array');
    assert(typeof r.allPresent === 'boolean', 'Expected allPresent to be boolean');
});

test('allPresent is the logical AND of cause, effect, impact', () => {
    const statements = [
        'Due to poor controls, there is a risk that data is lost, resulting in financial loss.',
        'Data breach.',
        'There is a risk of downtime.',
    ];
    for (const s of statements) {
        const r = checkRiskStatement(s);
        const expected = r.cause && r.effect && r.impact;
        assert(r.allPresent === expected, `allPresent (${r.allPresent}) should equal cause&&effect&&impact (${expected}) for: "${s.slice(0, 60)}"`);
    }
});

test('missing array length matches number of false flags', () => {
    const r = checkRiskStatement('Due to poor controls, there is a risk that data is lost.');
    const expectedMissing = [!r.cause, !r.effect, !r.impact].filter(Boolean).length;
    assert(r.missing.length === expectedMissing, `missing.length (${r.missing.length}) should match false flag count (${expectedMissing})`);
});

// ─── Summary ──────────────────────────────────────────────────────────────────

const total = passed + failed;
console.log(`\n${'═'.repeat(50)}`);
if (failed === 0) {
    console.log(`✅  All ${total} tests passed.`);
} else {
    console.log(`❌  ${failed} of ${total} tests FAILED:\n`);
    failures.forEach(({ name, error }) => {
        console.log(`  • ${name}`);
        console.log(`    ${error}`);
    });
    process.exit(1);
}

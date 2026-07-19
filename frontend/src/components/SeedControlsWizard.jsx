// SeedControlsWizard.jsx
// Multi-step wizard for seeding Certitude standard controls into a new company.
// Triggered from DataTools.jsx (Admin only).
//
// Steps:
//   0 — Choose: company has an existing control register, or starting fresh.
//   1 — Department mapping: map each seed-function category to a real company department.
//   2 — (existing register only) Upload CSV + duplicate review side-by-side.
//   3 — Confirm & apply.
//   4 — Done summary.

import { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import readXlsxFile from 'read-excel-file';

const OVERLAY = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000,
};
const MODAL = {
    background: 'var(--card)', borderRadius: 12, padding: 32,
    width: '92vw', maxWidth: 860, maxHeight: '90vh',
    overflowY: 'auto', boxShadow: '0 8px 40px rgba(0,0,0,0.22)',
};
const H2 = { marginTop: 0, marginBottom: 8, fontSize: 20, color: 'var(--text)' };
const SUBTITLE = { marginTop: 0, marginBottom: 24, color: 'var(--text-muted)', fontSize: 14 };
const BTN = (extra = {}) => ({
    padding: '9px 20px', borderRadius: 6, border: 'none', cursor: 'pointer',
    fontSize: 14, fontWeight: 600, ...extra,
});
const CARD = {
    border: '1px solid var(--border)', borderRadius: 8, padding: 16, marginBottom: 12,
    background: 'var(--bg)',
};

// ── Similarity helpers (mirrors backend logic) ──────────────────────────────
function tokenize(name) {
    return new Set(name.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean));
}
function jaccard(a, b) {
    const inter = [...a].filter((x) => b.has(x)).length;
    const union = new Set([...a, ...b]).size;
    return union === 0 ? 0 : inter / union;
}

// ── Convert xlsx/xls to CSV text ────────────────────────────────────────────
async function xlsxToCsv(file) {
    const rows = await readXlsxFile(file);
    if (!rows || rows.length === 0) throw new Error('Spreadsheet appears to be empty.');
    return rows
        .map((row) =>
            row
                .map((cell) => {
                    const v = cell == null ? '' : String(cell);
                    return /[,"\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
                })
                .join(',')
        )
        .join('\n');
}

// ── Step indicator ──────────────────────────────────────────────────────────
function Steps({ current, labels }) {
    return (
        <div style={{ display: 'flex', gap: 0, marginBottom: 28, borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
            {labels.map((label, i) => (
                <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{
                        width: 28, height: 28, borderRadius: '50%', margin: '0 auto 4px',
                        background: i < current ? 'var(--primary)' : i === current ? 'var(--primary)' : 'var(--border)',
                        color: i <= current ? '#fff' : 'var(--text-muted)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 700,
                        opacity: i < current ? 0.55 : 1,
                    }}>
                        {i < current ? '✓' : i + 1}
                    </div>
                    <div style={{ fontSize: 11, color: i === current ? 'var(--text)' : 'var(--text-muted)', fontWeight: i === current ? 600 : 400 }}>
                        {label}
                    </div>
                </div>
            ))}
        </div>
    );
}

// ── Score badge ─────────────────────────────────────────────────────────────
function ScoreBadge({ score }) {
    const color = score >= 70 ? '#d32f2f' : score >= 50 ? '#f57c00' : '#f9a825';
    return (
        <span style={{
            background: color, color: '#fff', borderRadius: 10, padding: '1px 7px',
            fontSize: 11, fontWeight: 700, marginLeft: 6,
        }}>
            {score}% match
        </span>
    );
}

export default function SeedControlsWizard({ onClose, onDone }) {
    const { api } = useAuth();

    // wizard state
    const [step, setStep] = useState(0);
    const [hasExisting, setHasExisting] = useState(null); // true | false
    const [departments, setDepartments] = useState([]);   // company dept list
    const [seedControls, setSeedControls] = useState([]);  // full seed list from API
    const [deptMap, setDeptMap] = useState({});           // { seedDept: companyDeptName }
    const [csvText, setCsvText] = useState('');
    const [fileName, setFileName] = useState('');
    const [clientControls, setClientControls] = useState([]);
    const [matches, setMatches] = useState([]);           // [{ seedIdx, clientIdx, score }]
    const [decisions, setDecisions] = useState({});       // { seedIdx: { action, clientIdx } }
    const [filterDept, setFilterDept] = useState('All');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);

    // Unique seed departments (for mapping step)
    const seedDepts = [...new Set(seedControls.map((c) => c.department))];

    // Fetch seed controls + company departments on mount
    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const [sc, deps] = await Promise.all([
                    api.get('/seed-controls'),
                    api.get('/departments'),
                ]);
                setSeedControls(sc.controls || []);
                setDepartments(deps || []);
            } catch (e) {
                setError(e.message || 'Failed to load data');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    // Initialise deptMap when seedControls or departments load
    useEffect(() => {
        if (!seedControls.length || !departments.length) return;
        const companyDeptNames = departments.map((d) => d.name);
        const map = {};
        for (const dept of seedDepts) {
            // Try exact match first, then case-insensitive
            const exact = companyDeptNames.find((d) => d === dept);
            const loose = companyDeptNames.find((d) => d.toLowerCase() === dept.toLowerCase());
            map[dept] = exact || loose || '';
        }
        setDeptMap(map);
    }, [seedControls, departments]);

    // Initialise decisions when matches are known
    useEffect(() => {
        const dec = {};
        // All seed controls default to 'seed'
        seedControls.forEach((_, si) => {
            dec[si] = { action: 'seed', clientIdx: null };
        });
        // For matched pairs, default is still 'seed' but record the clientIdx
        matches.forEach(({ seedIdx, clientIdx }) => {
            dec[seedIdx] = { action: 'seed', clientIdx };
        });
        setDecisions(dec);
    }, [matches, seedControls]);

    async function handleFileChange(e) {
        const file = e.target.files?.[0];
        if (!file) return;
        setFileName(file.name);
        setError('');
        try {
            const csv = /\.(xlsx|xls)$/i.test(file.name) ? await xlsxToCsv(file) : await file.text();
            setCsvText(csv);
        } catch (err) {
            setError(`Could not read file: ${err.message}`);
        }
    }

    async function handlePreview() {
        if (!csvText.trim()) { setError('Please upload or paste a control register file.'); return; }
        setLoading(true);
        setError('');
        try {
            const data = await api.post('/seed-controls/preview', { csv: csvText });
            setClientControls(data.clientControls || []);
            setMatches(data.matches || []);
            setStep(2);
        } catch (e) {
            setError(e.message || 'Preview failed');
        } finally {
            setLoading(false);
        }
    }

    async function handleApply() {
        setLoading(true);
        setError('');
        try {
            const decArr = Object.entries(decisions).map(([si, dec]) => ({
                seedIdx: parseInt(si, 10),
                action: dec.action,
                clientIdx: dec.clientIdx,
            }));
            const data = await api.post('/seed-controls/apply', {
                departmentMap: deptMap,
                decisions: decArr,
                csv: hasExisting ? csvText : undefined,
            });
            setResult(data);
            setStep(4);
        } catch (e) {
            setError(e.message || 'Apply failed');
        } finally {
            setLoading(false);
        }
    }

    // ── Step 0: Choose approach ───────────────────────────────────────────────
    function StepChoose() {
        return (
            <>
                <h2 style={H2}>Seed Standard Controls</h2>
                <p style={SUBTITLE}>Does this company have an existing control register to upload?</p>
                <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
                    {[
                        { val: false, title: 'Starting fresh', desc: 'No existing control register — seed the standard controls directly.' },
                        { val: true, title: 'Has existing register', desc: "Upload the client's register first, review duplicates, then seed." },
                    ].map(({ val, title, desc }) => (
                        <div
                            key={String(val)}
                            onClick={() => setHasExisting(val)}
                            style={{
                                ...CARD, flex: 1, cursor: 'pointer',
                                borderColor: hasExisting === val ? 'var(--primary)' : 'var(--border)',
                                borderWidth: hasExisting === val ? 2 : 1,
                            }}
                        >
                            <div style={{ fontWeight: 600, marginBottom: 4 }}>{title}</div>
                            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{desc}</div>
                        </div>
                    ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                        style={BTN({ background: 'var(--primary)', color: '#fff' })}
                        disabled={hasExisting === null}
                        onClick={() => setStep(1)}
                    >
                        Next →
                    </button>
                </div>
            </>
        );
    }

    // ── Step 1: Department mapping ────────────────────────────────────────────
    function StepDeptMap() {
        const companyDeptOptions = departments.map((d) => d.name);
        return (
            <>
                <h2 style={H2}>Map Departments</h2>
                <p style={SUBTITLE}>
                    Match each standard function to a department in this company. Controls will be created under the mapped department.
                    Leave blank to skip that function entirely.
                </p>
                <div style={{ marginBottom: 24 }}>
                    {seedDepts.map((dept) => (
                        <div key={dept} style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 10 }}>
                            <div style={{ flex: '0 0 220px', fontSize: 14, fontWeight: 600 }}>{dept}</div>
                            <select
                                className="form-control"
                                style={{ flex: 1 }}
                                value={deptMap[dept] || ''}
                                onChange={(e) => setDeptMap((m) => ({ ...m, [dept]: e.target.value }))}
                            >
                                <option value="">— Skip this function —</option>
                                {companyDeptOptions.map((d) => (
                                    <option key={d} value={d}>{d}</option>
                                ))}
                            </select>
                        </div>
                    ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <button style={BTN({ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)' })} onClick={() => setStep(0)}>← Back</button>
                    <button
                        style={BTN({ background: 'var(--primary)', color: '#fff' })}
                        onClick={() => hasExisting ? setStep(2) : setStep(3)}
                    >
                        Next →
                    </button>
                </div>
            </>
        );
    }

    // ── Step 2: Upload + duplicate review (existing register only) ────────────
    function StepReview() {
        // Group seed controls by department for display
        const matchedClientIdxs = new Set(matches.map((m) => m.clientIdx));
        const matchBySeedIdx = Object.fromEntries(matches.map((m) => [m.seedIdx, m]));

        // Dept filter options
        const activeSeedDepts = [...new Set(
            seedControls
                .map((c, i) => ({ dept: c.department, i }))
                .filter(({ dept }) => deptMap[dept])
                .map(({ dept }) => dept)
        )];
        const filteredSeedIdxs = seedControls
            .map((c, i) => ({ c, i }))
            .filter(({ c }) => deptMap[c.department] && (filterDept === 'All' || c.department === filterDept))
            .map(({ i }) => i);

        return (
            <>
                <h2 style={H2}>Review Duplicate Controls</h2>
                <p style={SUBTITLE}>
                    {!csvText ? 'Upload your existing control register, then review matches.' : `${matches.length} potential duplicate${matches.length !== 1 ? 's' : ''} found. For each pair, choose which control to keep.`}
                </p>

                {!csvText ? (
                    <div style={CARD}>
                        <div className="form-group">
                            <label>Upload existing control register (.csv or .xlsx)</label>
                            <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} />
                            {fileName && <div style={{ marginTop: 4, fontSize: 13, color: 'var(--text-muted)' }}>Selected: {fileName}</div>}
                        </div>
                        {error && <div className="alert alert-error" style={{ marginTop: 8 }}>{error}</div>}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
                            <button style={BTN({ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)' })} onClick={() => setStep(1)}>← Back</button>
                            <button style={BTN({ background: 'var(--primary)', color: '#fff' })} onClick={handlePreview} disabled={loading || !csvText}>
                                {loading ? 'Analysing…' : 'Analyse Register →'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Department filter */}
                        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                            {['All', ...activeSeedDepts].map((d) => (
                                <button
                                    key={d}
                                    onClick={() => setFilterDept(d)}
                                    style={{
                                        ...BTN({ fontSize: 12, padding: '5px 12px' }),
                                        background: filterDept === d ? 'var(--primary)' : 'var(--bg)',
                                        color: filterDept === d ? '#fff' : 'var(--text)',
                                        border: '1px solid var(--border)',
                                    }}
                                >
                                    {d}
                                </button>
                            ))}
                        </div>

                        {/* Legend */}
                        <div style={{ display: 'flex', gap: 20, marginBottom: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                            <span>🟢 Will be seeded</span>
                            <span>🔵 Will be imported from your register</span>
                            <span>⚠️ Duplicate pair — choose one</span>
                        </div>

                        {/* Side-by-side pairs */}
                        {filteredSeedIdxs.map((si) => {
                            const seed = seedControls[si];
                            const match = matchBySeedIdx[si];
                            const client = match ? clientControls[match.clientIdx] : null;
                            const dec = decisions[si] || { action: 'seed', clientIdx: match?.clientIdx ?? null };

                            if (!match) {
                                // No duplicate — show as "will be seeded"
                                return (
                                    <div key={si} style={{ ...CARD, borderLeft: '3px solid #388e3c' }}>
                                        <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 2 }}>
                                            <span style={{ fontSize: 11, color: '#388e3c', fontWeight: 700 }}>🟢 STANDARD — no conflict</span>
                                        </div>
                                        <div style={{ fontWeight: 600, fontSize: 14 }}>{seed.name}</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{seed.description}</div>
                                    </div>
                                );
                            }

                            // Duplicate pair — show side-by-side choice
                            return (
                                <div key={si} style={{ ...CARD, borderLeft: '3px solid #f57c00', padding: 0, overflow: 'hidden' }}>
                                    <div style={{ background: '#fff3e0', padding: '6px 14px', fontSize: 12, fontWeight: 700, color: '#e65100' }}>
                                        ⚠️ POSSIBLE DUPLICATE <ScoreBadge score={match.score} />
                                    </div>
                                    <div style={{ display: 'flex', gap: 0 }}>
                                        {/* Standard control */}
                                        <div
                                            onClick={() => setDecisions((d) => ({ ...d, [si]: { action: 'seed', clientIdx: match.clientIdx } }))}
                                            style={{
                                                flex: 1, padding: 14, cursor: 'pointer',
                                                background: dec.action === 'seed' ? '#e8f5e9' : 'var(--bg)',
                                                borderRight: '1px solid var(--border)',
                                                borderTop: dec.action === 'seed' ? '3px solid #388e3c' : '3px solid transparent',
                                            }}
                                        >
                                            <div style={{ fontSize: 11, fontWeight: 700, color: '#388e3c', marginBottom: 4 }}>
                                                {dec.action === 'seed' ? '✓ KEEP THIS — Standard' : 'Standard control'}
                                            </div>
                                            <div style={{ fontWeight: 600, fontSize: 13 }}>{seed.name}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{seed.description}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>Type: {seed.control_type}</div>
                                        </div>
                                        {/* Client control */}
                                        <div
                                            onClick={() => setDecisions((d) => ({ ...d, [si]: { action: 'skip', clientIdx: match.clientIdx } }))}
                                            style={{
                                                flex: 1, padding: 14, cursor: 'pointer',
                                                background: dec.action === 'skip' ? '#e3f2fd' : 'var(--bg)',
                                                borderTop: dec.action === 'skip' ? '3px solid #1565c0' : '3px solid transparent',
                                            }}
                                        >
                                            <div style={{ fontSize: 11, fontWeight: 700, color: '#1565c0', marginBottom: 4 }}>
                                                {dec.action === 'skip' ? '✓ KEEP THIS — Your register' : 'Your existing control'}
                                            </div>
                                            <div style={{ fontWeight: 600, fontSize: 13 }}>{client?.name}</div>
                                            {client?.department && (
                                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Dept: {client.department}</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Unmatched client controls (imported as-is) */}
                        {(() => {
                            const unmatchedClients = clientControls.filter((_, ci) =>
                                !matchedClientIdxs.has(ci) && (filterDept === 'All' || _.department === filterDept)
                            );
                            if (!unmatchedClients.length) return null;
                            return (
                                <div style={{ marginTop: 8 }}>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: '#1565c0', marginBottom: 6 }}>
                                        🔵 Your controls with no standard equivalent — will be imported as-is ({unmatchedClients.length})
                                    </div>
                                    {unmatchedClients.map((c) => (
                                        <div key={c.idx} style={{ ...CARD, borderLeft: '3px solid #1565c0', padding: '8px 14px' }}>
                                            <div style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</div>
                                            {c.department && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Dept: {c.department}</div>}
                                        </div>
                                    ))}
                                </div>
                            );
                        })()}

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
                            <button style={BTN({ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)' })} onClick={() => setStep(1)}>← Back</button>
                            <button style={BTN({ background: 'var(--primary)', color: '#fff' })} onClick={() => setStep(3)}>
                                Review & Confirm →
                            </button>
                        </div>
                    </>
                )}
            </>
        );
    }

    // ── Step 3: Confirm ───────────────────────────────────────────────────────
    function StepConfirm() {
        const toSeed = Object.values(decisions).filter((d) => d.action === 'seed').length;
        const toSkipSeed = Object.values(decisions).filter((d) => d.action === 'skip').length;
        const toImport = hasExisting
            ? clientControls.length - Object.values(decisions).filter((d) => d.action === 'seed' && d.clientIdx != null).length
            : 0;
        const mappedDepts = seedDepts.filter((d) => deptMap[d]);
        const skippedDepts = seedDepts.filter((d) => !deptMap[d]);

        return (
            <>
                <h2 style={H2}>Confirm & Seed</h2>
                <p style={SUBTITLE}>Review the summary below, then click Apply to proceed. This cannot be undone.</p>

                <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
                    {[
                        { label: 'Standard controls to seed', value: toSeed, color: '#388e3c' },
                        ...(hasExisting ? [{ label: 'Client controls to import', value: toImport, color: '#1565c0' }] : []),
                        ...(toSkipSeed ? [{ label: 'Standard controls skipped (client kept)', value: toSkipSeed, color: '#f57c00' }] : []),
                    ].map(({ label, value, color }) => (
                        <div key={label} style={{ ...CARD, flex: 1, textAlign: 'center', borderTop: `3px solid ${color}` }}>
                            <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{label}</div>
                        </div>
                    ))}
                </div>

                <div style={{ fontSize: 13, marginBottom: 16 }}>
                    <strong>Department mapping:</strong>
                    <ul style={{ marginTop: 6 }}>
                        {mappedDepts.map((d) => (
                            <li key={d}>{d} → <strong>{deptMap[d]}</strong></li>
                        ))}
                        {skippedDepts.map((d) => (
                            <li key={d} style={{ color: 'var(--text-muted)' }}>{d} → <em>skipped</em></li>
                        ))}
                    </ul>
                </div>

                {error && <div className="alert alert-error">{error}</div>}

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
                    <button style={BTN({ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)' })} onClick={() => setStep(hasExisting ? 2 : 1)} disabled={loading}>
                        ← Back
                    </button>
                    <button style={BTN({ background: 'var(--primary)', color: '#fff' })} onClick={handleApply} disabled={loading}>
                        {loading ? 'Applying…' : 'Apply ✓'}
                    </button>
                </div>
            </>
        );
    }

    // ── Step 4: Done ──────────────────────────────────────────────────────────
    function StepDone() {
        return (
            <>
                <div style={{ textAlign: 'center', padding: '16px 0 24px' }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
                    <h2 style={{ ...H2, textAlign: 'center' }}>Controls seeded successfully</h2>
                    <p style={SUBTITLE}>
                        {result?.seeded || 0} standard control{result?.seeded !== 1 ? 's' : ''} created
                        {result?.imported ? `, ${result.imported} existing control${result.imported !== 1 ? 's' : ''} imported` : ''}.
                        {result?.importErrors ? ` (${result.importErrors} row${result.importErrors !== 1 ? 's' : ''} had errors — check Data Tools for details.)` : ''}
                    </p>
                    {result?.importErrors > 0 && result?.importRowResults?.length > 0 && (
                        <div style={{ textAlign: 'left', maxHeight: 160, overflowY: 'auto', marginBottom: 16 }}>
                            <table style={{ width: '100%', fontSize: 12 }}>
                                <thead><tr><th>Row</th><th>Error</th></tr></thead>
                                <tbody>
                                    {result.importRowResults.filter((r) => r.status === 'error').map((r) => (
                                        <tr key={r.row}><td>{r.row}</td><td>{r.error}</td></tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    <button
                        style={BTN({ background: 'var(--primary)', color: '#fff' })}
                        onClick={() => { onDone?.(); onClose(); }}
                    >
                        Go to Control Library
                    </button>
                </div>
            </>
        );
    }

    // ── Step labels (varies by path) ─────────────────────────────────────────
    const stepLabels = hasExisting
        ? ['Approach', 'Departments', 'Review', 'Confirm', 'Done']
        : ['Approach', 'Departments', 'Confirm', 'Done'];

    // When no existing register, step 3 is really index 2 in the labels
    const displayStep = hasExisting ? step : step > 1 ? step - 1 : step;

    return (
        <div style={OVERLAY} onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div style={MODAL}>
                <Steps current={displayStep} labels={stepLabels} />

                {loading && step === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading…</div>
                ) : (
                    <>
                        {step === 0 && <StepChoose />}
                        {step === 1 && <StepDeptMap />}
                        {step === 2 && hasExisting && <StepReview />}
                        {step === 3 && <StepConfirm />}
                        {step === 4 && <StepDone />}
                    </>
                )}

                {step < 4 && (
                    <div style={{ marginTop: 8, textAlign: 'right' }}>
                        <button
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13 }}
                            onClick={onClose}
                        >
                            Cancel
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// SetupWizard.jsx
//
// First-time setup wizard: Welcome → Org Details → Departments → Success.
// Collects everything locally then submits in a single POST /api/setup/initialize.

import { useState } from 'react';
import { useAuth } from '../AuthContext';
import certitudeLogo from '../assets/certitude-logo.png';

const INDUSTRIES = [
    'Financial Services', 'Banking', 'Insurance', 'Healthcare & Life Sciences',
    'Technology & Software', 'Professional Services', 'Legal Services', 'Manufacturing',
    'Retail & E-commerce', 'Energy & Utilities', 'Government & Public Sector',
    'Education', 'Real Estate', 'Transportation & Logistics', 'Telecommunications',
    'Media & Entertainment', 'Non-Profit', 'Other',
];

const DEFAULT_DEPARTMENTS = [
    { name: 'Finance',                  code: 'FIN' },
    { name: 'Human Resources',          code: 'HRD' },
    { name: 'Operations',               code: 'OPS' },
    { name: 'Information Technology',   code: 'ITS' },
    { name: 'Legal & Compliance',       code: 'LEG' },
    { name: 'Sales & Marketing',        code: 'SAL' },
    { name: 'Executive / Management',   code: 'EXC' },
    { name: 'Procurement',              code: 'PRO' },
    { name: 'Audit & Internal Control', code: 'AUD' },
    { name: 'General',                  code: 'GEN' },
];

function suggestCode(name) {
    return name
        .toUpperCase()
        .replace(/[^A-Z0-9\s]/g, '')
        .split(/\s+/)
        .filter(Boolean)
        .map((w) => w[0])
        .join('')
        .slice(0, 6) || name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

function suggestDeptCode(name) {
    // 3-char code from first letters, uppercase
    const parts = name.toUpperCase().replace(/[^A-Z0-9\s]/g, '').split(/\s+/).filter(Boolean);
    if (parts.length >= 3) return parts.map((p) => p[0]).slice(0, 3).join('');
    if (parts.length === 2) return (parts[0].slice(0, 2) + parts[1][0]).toUpperCase();
    return parts[0]?.slice(0, 3).toUpperCase() || '';
}

// ── Step indicator ────────────────────────────────────────────────────────────
function Steps({ current, total }) {
    return (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 32 }}>
            {Array.from({ length: total }, (_, i) => (
                <div key={i} style={{
                    width: i === current ? 28 : 8, height: 8, borderRadius: 4,
                    background: i <= current ? 'var(--primary)' : '#d1d5db',
                    opacity: i < current ? 0.5 : 1, transition: 'all 0.25s',
                }} />
            ))}
        </div>
    );
}

// ── Department row in the wizard list ─────────────────────────────────────────
function DeptRow({ dept, onRemove }) {
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
            background: 'var(--bg)', borderRadius: 6, marginBottom: 6,
            border: '1px solid var(--border)',
        }}>
            <span style={{
                fontFamily: 'monospace', fontSize: 12, fontWeight: 700,
                background: 'var(--primary)', color: '#fff',
                padding: '2px 6px', borderRadius: 4, minWidth: 36, textAlign: 'center',
            }}>{dept.code}</span>
            <span style={{ flex: 1, fontSize: 14, color: 'var(--text)' }}>{dept.name}</span>
            <button
                type="button"
                onClick={onRemove}
                style={{
                    border: 'none', background: 'none', cursor: 'pointer',
                    color: 'var(--text-muted)', fontSize: 16, padding: '0 4px', lineHeight: 1,
                }}
                title="Remove"
            >×</button>
        </div>
    );
}

export default function SetupWizard() {
    const { api, refreshMe } = useAuth();

    // 0=welcome, 1=org form, 2=departments, 3=success
    const [step, setStep] = useState(0);

    const [org, setOrg] = useState({
        admin_full_name: '', org_name: '', org_code: '', industry: '',
    });
    const [codeTouched, setCodeTouched] = useState(false);

    const [departments, setDepartments] = useState(DEFAULT_DEPARTMENTS.map((d) => ({ ...d })));
    const [newDept, setNewDept] = useState({ name: '', code: '' });
    const [deptCodeTouched, setDeptCodeTouched] = useState(false);
    const [deptError, setDeptError] = useState('');

    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // ── Org form handlers ─────────────────────────────────────────────────────
    function handleOrgNameChange(e) {
        const name = e.target.value;
        setOrg((f) => ({ ...f, org_name: name, org_code: codeTouched ? f.org_code : suggestCode(name) }));
    }
    function handleCodeChange(e) {
        setCodeTouched(true);
        setOrg((f) => ({ ...f, org_code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10) }));
    }
    function validateOrg() {
        if (!org.org_name.trim()) return 'Organization name is required.';
        if (!org.org_code.trim() || org.org_code.length < 2) return 'Organization code must be at least 2 characters.';
        if (!org.industry) return 'Please select your industry.';
        return null;
    }

    // ── Department handlers ───────────────────────────────────────────────────
    function handleNewDeptNameChange(e) {
        const name = e.target.value;
        setNewDept((d) => ({ ...d, name, code: deptCodeTouched ? d.code : suggestDeptCode(name) }));
        setDeptError('');
    }
    function handleNewDeptCodeChange(e) {
        setDeptCodeTouched(true);
        setNewDept((d) => ({ ...d, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10) }));
        setDeptError('');
    }
    function addDept() {
        if (!newDept.name.trim()) { setDeptError('Department name is required.'); return; }
        if (!newDept.code.trim() || newDept.code.length < 2) { setDeptError('Code must be at least 2 characters.'); return; }
        if (departments.some((d) => d.code === newDept.code)) { setDeptError(`Code "${newDept.code}" is already used.`); return; }
        if (departments.some((d) => d.name.toLowerCase() === newDept.name.trim().toLowerCase())) {
            setDeptError('A department with that name already exists.'); return;
        }
        setDepartments((ds) => [...ds, { name: newDept.name.trim(), code: newDept.code }]);
        setNewDept({ name: '', code: '' });
        setDeptCodeTouched(false);
        setDeptError('');
    }
    function removeDept(code) {
        setDepartments((ds) => ds.filter((d) => d.code !== code));
    }

    // ── Final submit ──────────────────────────────────────────────────────────
    async function handleSubmit() {
        setError('');
        setSubmitting(true);
        try {
            await api.post('/setup/initialize', { ...org, departments });
            await refreshMe();
            setStep(3);
        } catch (e) {
            setError(e.message || 'Setup failed. Please try again.');
            setSubmitting(false);
        }
    }

    // ── Welcome ───────────────────────────────────────────────────────────────
    if (step === 0) {
        return (
            <div className="login-screen">
                <div className="login-card" style={{ maxWidth: 480 }}>
                    <div className="login-title">
                        <img src={certitudeLogo} alt="Certitude Advisory Services" className="login-logo" />
                    </div>
                    <div className="login-subtitle">GRC Workstation</div>
                    <div style={{ textAlign: 'center', margin: '32px 0 24px' }}>
                        <div style={{
                            width: 64, height: 64, borderRadius: '50%', background: 'var(--primary)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
                        }}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                <polyline points="9 22 9 12 15 12 15 22" />
                            </svg>
                        </div>
                        <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: '0 0 12px' }}>
                            Welcome to GRC Workstation
                        </h2>
                        <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
                            Your account is ready. Let's set up your organization so you can start managing risk, compliance, and governance.
                        </p>
                    </div>
                    <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '16px 20px', marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {[
                            ['🏢', 'Create your organization profile'],
                            ['🏗️', 'Set up your departments'],
                            ['🚀', 'Start working immediately'],
                        ].map(([icon, label]) => (
                            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <span style={{ fontSize: 18 }}>{icon}</span>
                                <span style={{ color: 'var(--text)', fontSize: 14 }}>{label}</span>
                            </div>
                        ))}
                    </div>
                    <button className="btn btn-primary" style={{ width: '100%', fontSize: 15, padding: '12px' }} onClick={() => setStep(1)}>
                        Get Started →
                    </button>
                </div>
            </div>
        );
    }

    // ── Success ───────────────────────────────────────────────────────────────
    if (step === 3) {
        return (
            <div className="login-screen">
                <div className="login-card" style={{ maxWidth: 480, textAlign: 'center' }}>
                    <div style={{
                        width: 72, height: 72, borderRadius: '50%', background: '#22c55e',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px',
                    }}>
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                    </div>
                    <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: '0 0 12px' }}>You're all set!</h2>
                    <p style={{ color: 'var(--text-muted)', marginBottom: 32, lineHeight: 1.6 }}>
                        <strong>{org.org_name}</strong> has been created with {departments.length} department{departments.length !== 1 ? 's' : ''}. Loading your workspace…
                    </p>
                    <div style={{
                        width: 40, height: 40, border: '4px solid var(--border)',
                        borderTopColor: 'var(--primary)', borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite', margin: '0 auto',
                    }} />
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
            </div>
        );
    }

    // ── Step 1: Org details ───────────────────────────────────────────────────
    if (step === 1) {
        return (
            <div className="login-screen">
                <div className="login-card" style={{ maxWidth: 520 }}>
                    <div className="login-title">
                        <img src={certitudeLogo} alt="Certitude Advisory Services" className="login-logo" />
                    </div>
                    <div className="login-subtitle" style={{ marginBottom: 4 }}>Organization Setup</div>
                    <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, marginBottom: 24 }}>Step 1 of 2 — About your organization</p>
                    <Steps current={0} total={2} />
                    {error && <div className="alert alert-error">{error}</div>}
                    <form onSubmit={(e) => { e.preventDefault(); const err = validateOrg(); if (err) { setError(err); } else { setError(''); setStep(2); } }}>
                        <div style={{ fontWeight: 600, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12 }}>About You</div>
                        <div className="form-group">
                            <label>Your Full Name</label>
                            <input type="text" className="form-control" placeholder="e.g. Jane Smith" value={org.admin_full_name}
                                onChange={(e) => setOrg((f) => ({ ...f, admin_full_name: e.target.value }))} autoFocus />
                        </div>
                        <div style={{ fontWeight: 600, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', margin: '20px 0 12px' }}>Your Organization</div>
                        <div className="form-group">
                            <label>Organization Name <span style={{ color: '#ef4444' }}>*</span></label>
                            <input type="text" className="form-control" placeholder="e.g. Acme Financial Group" value={org.org_name} onChange={handleOrgNameChange} required />
                        </div>
                        <div className="form-group">
                            <label>
                                Organization Code <span style={{ color: '#ef4444' }}>*</span>
                                <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6, fontSize: 12 }}>(2–10 chars, used in Risk IDs)</span>
                            </label>
                            <input type="text" className="form-control" placeholder="e.g. ACME" value={org.org_code} onChange={handleCodeChange}
                                maxLength={10} style={{ fontFamily: 'monospace', letterSpacing: 2, textTransform: 'uppercase' }} required />
                        </div>
                        <div className="form-group">
                            <label>Industry / Sector <span style={{ color: '#ef4444' }}>*</span></label>
                            <select className="form-control" value={org.industry} onChange={(e) => setOrg((f) => ({ ...f, industry: e.target.value }))} required>
                                <option value="">— Select your industry —</option>
                                {INDUSTRIES.map((ind) => <option key={ind} value={ind}>{ind}</option>)}
                            </select>
                        </div>
                        <button type="submit" className="btn btn-primary" style={{ width: '100%', fontSize: 15, padding: '12px', marginTop: 8 }}>
                            Next: Set Up Departments →
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // ── Step 2: Departments ───────────────────────────────────────────────────
    return (
        <div className="login-screen">
            <div className="login-card" style={{ maxWidth: 560 }}>
                <div className="login-title">
                    <img src={certitudeLogo} alt="Certitude Advisory Services" className="login-logo" />
                </div>
                <div className="login-subtitle" style={{ marginBottom: 4 }}>Department Setup</div>
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, marginBottom: 24 }}>
                    Step 2 of 2 — Customize your departments
                </p>
                <Steps current={1} total={2} />

                {error && <div className="alert alert-error">{error}</div>}

                <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
                    We've pre-loaded common departments. Remove any that don't apply and add your own. You can always update these later in Admin → Departments.
                </p>

                {/* Current department list */}
                <div style={{ marginBottom: 20 }}>
                    {departments.length === 0 ? (
                        <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, border: '1px dashed var(--border)', borderRadius: 6 }}>
                            No departments added yet. Add at least one below, or leave empty to use defaults.
                        </div>
                    ) : (
                        departments.map((d) => (
                            <DeptRow key={d.code} dept={d} onRemove={() => removeDept(d.code)} />
                        ))
                    )}
                </div>

                {/* Add new department */}
                <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px', marginBottom: 24 }}>
                    <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Add a Department</div>
                    {deptError && <div className="alert alert-error" style={{ marginBottom: 8 }}>{deptError}</div>}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                        <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                            <label style={{ fontSize: 12 }}>Name</label>
                            <input
                                className="form-control"
                                placeholder="e.g. Risk Management"
                                value={newDept.name}
                                onChange={handleNewDeptNameChange}
                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addDept())}
                            />
                        </div>
                        <div className="form-group" style={{ width: 100, marginBottom: 0 }}>
                            <label style={{ fontSize: 12 }}>Code</label>
                            <input
                                className="form-control"
                                placeholder="RMG"
                                value={newDept.code}
                                onChange={handleNewDeptCodeChange}
                                maxLength={10}
                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addDept())}
                                style={{ fontFamily: 'monospace', textTransform: 'uppercase' }}
                            />
                        </div>
                        <button type="button" className="btn btn-secondary" onClick={addDept} style={{ marginBottom: 0, whiteSpace: 'nowrap' }}>
                            + Add
                        </button>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                    <button type="button" className="btn btn-secondary" style={{ flex: '0 0 auto' }} onClick={() => setStep(1)}>
                        ← Back
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary"
                        style={{ flex: 1, fontSize: 15, padding: '12px' }}
                        disabled={submitting}
                        onClick={handleSubmit}
                    >
                        {submitting ? 'Creating your workspace…' : `Finish Setup (${departments.length} department${departments.length !== 1 ? 's' : ''}) →`}
                    </button>
                </div>

                <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 12, marginBottom: 0 }}>
                    Departments can be added, renamed, or deactivated any time in Admin → Departments.
                </p>
            </div>
        </div>
    );
}

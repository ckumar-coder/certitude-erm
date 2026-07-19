// Companies.jsx — V1.9 Group / Subsidiary Management
// Admin-only. Shows the current company and its direct subsidiaries.
// Allows creating subsidiaries, updating max_group_access_scope, and
// managing which users have cross-company (group) access and at what level.

import { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { useT } from '../contexts/LanguageContext';

const INDUSTRIES = [
    'Insurance', 'Reinsurance', 'Banking', 'Financial Services', 'Investment Management',
    'Healthcare', 'Pharmaceuticals', 'Energy & Utilities', 'Oil & Gas', 'Manufacturing',
    'Retail & Consumer Goods', 'Technology', 'Telecommunications', 'Real Estate',
    'Government & Public Sector', 'Education', 'Logistics & Transportation', 'Other',
];

const FISCAL_YEAR_ENDS = [
    '31 March', '30 June', '30 September', '31 December',
];

const SCOPE_LABELS = {
    none:               'No group access',
    consolidated_only:  'Consolidated only',
    view:               'View',
    full:               'Full',
};
const SCOPE_DESC = {
    none:              'Regular single-company member.',
    consolidated_only: 'Can see aggregate numbers in the Group Dashboard only. Cannot drill into subsidiary records.',
    view:              'Can see the Group Dashboard and read all subsidiary records. Cannot create, edit, or delete.',
    full:              'Full role on all subsidiaries (same role as on this company).',
};
const MAX_SCOPE_DESC = {
    consolidated_only: 'Group users can only see aggregate numbers for this subsidiary.',
    view:              'Group users can read subsidiary records but not edit them.',
    full:              'Group users operate with their full role inside this subsidiary.',
};

export default function Companies() {
    const { api, refreshMe } = useAuth();
    const t = useT();
    const [companies, setCompanies]   = useState([]);
    const [users, setUsers]           = useState([]);
    const [loading, setLoading]       = useState(true);
    const [error, setError]           = useState('');

    // Company profile
    const [profile, setProfile] = useState(null);
    const [profileForm, setProfileForm] = useState({});
    const [profileSaving, setProfileSaving] = useState(false);
    const [profileMsg, setProfileMsg] = useState('');

    // Inline rename for parent company
    const [renaming, setRenaming] = useState(false);
    const [renameVal, setRenameVal] = useState('');
    const [renameSaving, setRenameSaving] = useState(false);

    const startRename = (currentName) => { setRenameVal(currentName); setRenaming(true); };
    const cancelRename = () => setRenaming(false);
    const saveRename = async () => {
        if (!renameVal.trim()) return;
        setRenameSaving(true);
        try {
            await api.put('/companies/current/profile', { name: renameVal.trim() });
            setCompanies((prev) => prev.map((c) => !c.parent_company_id ? { ...c, name: renameVal.trim() } : c));
            setRenaming(false);
        } catch (e) {
            alert(e.message || 'Failed to rename');
        } finally {
            setRenameSaving(false);
        }
    };

    // BUG-02: auto-generate company code from name
    const suggestCode = (name) => {
        const words = name.trim().split(/\s+/).filter(Boolean);
        if (words.length === 0) return '';
        if (words.length === 1) return words[0].slice(0, 4).toUpperCase();
        return words.map((w) => w[0]).join('').toUpperCase().slice(0, 8);
    };

    // Create-subsidiary form
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newForm, setNewForm] = useState({ name: '', code: '', scope: 'full', industry: '', company_type: '', country: '', regulatory_body: '', fiscal_year_end: '', description: '', address: '' });
    const updNew = (k, v) => setNewForm((f) => ({ ...f, [k]: v }));
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState('');

    // Create standalone company form
    const emptyCompanyForm = { name: '', code: '', industry: '', company_type: '', country: '', regulatory_body: '', fiscal_year_end: '', description: '', address: '', has_business_units: false };
    const [showStandaloneForm, setShowStandaloneForm] = useState(false);
    const [saForm, setSaForm] = useState(emptyCompanyForm);
    const updSa = (k, v) => setSaForm((f) => ({ ...f, [k]: v }));
    const [saCreating, setSaCreating] = useState(false);
    const [saError, setSaError] = useState('');

    // BUG-04: edit existing subsidiary
    const [editingSub, setEditingSub] = useState(null); // sub object
    const [editSubForm, setEditSubForm] = useState({});
    const [editSubSaving, setEditSubSaving] = useState(false);
    const [editSubError, setEditSubError] = useState('');
    const startEditSub = (sub) => {
        setEditingSub(sub);
        setEditSubForm({
            name: sub.name || '', industry: sub.industry || '', company_type: sub.company_type || '',
            country: sub.country || '', regulatory_body: sub.regulatory_body || '',
            fiscal_year_end: sub.fiscal_year_end || '', description: sub.description || '',
            address: sub.address || '', max_group_access_scope: sub.max_group_access_scope || 'full',
        });
        setEditSubError('');
    };
    const saveEditSub = async (e) => {
        e.preventDefault();
        if (!editSubForm.name.trim()) return setEditSubError('Company name is required.');
        setEditSubSaving(true);
        setEditSubError('');
        try {
            const updated = await api.put(`/companies/${editingSub.id}`, editSubForm);
            setCompanies((prev) => prev.map((c) => (c.id === editingSub.id ? { ...c, ...updated } : c)));
            setEditingSub(null);
        } catch (err) {
            setEditSubError(err.message || 'Failed to save');
        } finally {
            setEditSubSaving(false);
        }
    };

    const load = async () => {
        setLoading(true);
        setError('');
        try {
            const [cos, us, prof] = await Promise.all([
                api.get('/companies'),
                api.get('/users'),
                api.get('/companies/current/profile'),
            ]);
            setCompanies(cos);
            setUsers(us);
            setProfile(prof);
            setProfileForm(prof);
        } catch (e) {
            setError(e.message || 'Failed to load');
        } finally {
            setLoading(false);
        }
    };

    const saveProfile = async (e) => {
        e.preventDefault();
        setProfileSaving(true);
        setProfileMsg('');
        try {
            const updated = await api.put('/companies/current/profile', profileForm);
            setProfile(updated);
            setProfileMsg('Saved.');
            setTimeout(() => setProfileMsg(''), 3000);
            // Refresh session so has_business_units is reflected immediately
            // across the app (e.g. BusinessUnits page, sidebar nav).
            await refreshMe();
        } catch (err) {
            setProfileMsg(err.message || 'Failed to save');
        } finally {
            setProfileSaving(false);
        }
    };

    useEffect(() => { load(); }, []);

    const parent    = companies.find((c) => !c.parent_company_id);
    const subs      = companies.filter((c) => c.parent_company_id);

    // Delete a company with confirmation
    const [deleteConfirm, setDeleteConfirm] = useState(null); // { id, name }
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async () => {
        if (!deleteConfirm) return;
        setDeleting(true);
        try {
            await api.delete(`/companies/${deleteConfirm.id}`);
            setCompanies((prev) => prev.filter((c) => c.id !== deleteConfirm.id));
            setDeleteConfirm(null);
        } catch (e) {
            alert(e.message || 'Failed to delete company');
        } finally {
            setDeleting(false);
        }
    };

    // Update max_group_access_scope on a subsidiary
    const updateMaxScope = async (companyId, scope) => {
        try {
            const updated = await api.put(`/companies/${companyId}`, { max_group_access_scope: scope });
            setCompanies((prev) => prev.map((c) => (c.id === companyId ? { ...c, ...updated } : c)));
        } catch (e) {
            alert(e.message || 'Failed to update');
        }
    };

    // Update group_access_scope on a user
    const updateGroupScope = async (userId, scope) => {
        try {
            await api.put(`/users/${userId}/group-access`, { group_access_scope: scope });
            setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, group_access_scope: scope } : u)));
        } catch (e) {
            alert(e.message || 'Failed to update');
        }
    };

    const createStandalone = async (e) => {
        e.preventDefault();
        setSaError('');
        if (!saForm.name.trim() || !saForm.code.trim()) return setSaError('Name and code are required.');
        setSaCreating(true);
        try {
            await api.post('/companies/standalone', {
                ...saForm,
                name: saForm.name.trim(),
                code: saForm.code.trim().toUpperCase(),
            });
            setSaForm(emptyCompanyForm);
            setShowStandaloneForm(false);
            // Reload the page so the user can switch to the new company
            window.location.reload();
        } catch (e) {
            setSaError(e.message || 'Failed to create company');
        } finally {
            setSaCreating(false);
        }
    };

    const createSubsidiary = async (e) => {
        e.preventDefault();
        setCreateError('');
        if (!newForm.name.trim() || !newForm.code.trim()) return setCreateError('Name and code are required.');
        setCreating(true);
        try {
            const created = await api.post('/companies', {
                ...newForm,
                name: newForm.name.trim(),
                code: newForm.code.trim().toUpperCase(),
                parent_company_id: parent?.id,
                max_group_access_scope: newForm.scope,
            });
            setCompanies((prev) => [...prev, created]);
            setNewForm({ name: '', code: '', scope: 'full', industry: '', company_type: '', country: '', regulatory_body: '', fiscal_year_end: '', description: '', address: '' });
            setShowCreateForm(false);
        } catch (e) {
            setCreateError(e.message || 'Failed to create subsidiary');
        } finally {
            setCreating(false);
        }
    };

    if (loading) return <div className="card"><p className="text-muted">{t('loading')}</p></div>;
    if (error)   return <div className="card"><p style={{ color: 'var(--color-danger)' }}>{error}</p></div>;

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">{t('companies_title')}</h1>
                    <p className="page-subtitle">{t('companies_subtitle')}</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-secondary" onClick={() => { setShowStandaloneForm(!showStandaloneForm); setShowCreateForm(false); }}>
                        + New Company
                    </button>
                    <button className="btn btn-primary" onClick={() => { setShowCreateForm(!showCreateForm); setShowStandaloneForm(false); }}>
                        + Add Subsidiary
                    </button>
                </div>
            </div>

            {/* ── Create standalone company form ── */}
            {showStandaloneForm && (
                <div className="card" style={{ marginBottom: 24, border: '1px solid var(--color-border)', borderRadius: 8 }}>
                    <h3 style={{ marginBottom: 4 }}>New Standalone Company</h3>
                    <p className="text-muted" style={{ fontSize: 13, marginBottom: 16 }}>
                        Creates an independent company not linked to the current group. You will be granted Admin access automatically.
                    </p>
                    {saError && <p style={{ color: 'var(--color-danger)', marginBottom: 12 }}>{saError}</p>}
                    <form onSubmit={createStandalone}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                            <div>
                                <label className="form-label">Company Name *</label>
                                <input className="form-control" value={saForm.name}
                                    onChange={(e) => {
                                        const name = e.target.value;
                                        setSaForm((f) => ({ ...f, name, code: suggestCode(name) }));
                                    }} placeholder="e.g. Gulf Insurance Ltd" />
                            </div>
                            <div>
                                <label className="form-label">Company Code *</label>
                                <input className="form-control" value={saForm.code}
                                    onChange={(e) => updSa('code', e.target.value.toUpperCase())}
                                    placeholder="e.g. GIL" maxLength={20} />
                                <small className="text-muted">Short uppercase code used in record IDs</small>
                            </div>
                            <div>
                                <label className="form-label">Industry</label>
                                <select className="form-control" value={saForm.industry} onChange={(e) => updSa('industry', e.target.value)}>
                                    <option value="">— Select —</option>
                                    {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="form-label">Company Type</label>
                                <input className="form-control" placeholder="e.g. Public, Private, Mutual"
                                    value={saForm.company_type} onChange={(e) => updSa('company_type', e.target.value)} />
                            </div>
                            <div>
                                <label className="form-label">Country / Jurisdiction</label>
                                <input className="form-control" placeholder="e.g. Qatar"
                                    value={saForm.country} onChange={(e) => updSa('country', e.target.value)} />
                            </div>
                            <div>
                                <label className="form-label">Regulatory Body</label>
                                <input className="form-control" placeholder="e.g. Qatar Central Bank (QCB)"
                                    value={saForm.regulatory_body} onChange={(e) => updSa('regulatory_body', e.target.value)} />
                            </div>
                            <div>
                                <label className="form-label">Fiscal Year End</label>
                                <select className="form-control" value={saForm.fiscal_year_end} onChange={(e) => updSa('fiscal_year_end', e.target.value)}>
                                    <option value="">— Select —</option>
                                    {FISCAL_YEAR_ENDS.map((d) => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                        </div>
                        <div style={{ marginBottom: 12 }}>
                            <label className="form-label">Description</label>
                            <textarea className="form-control" rows={2} placeholder="Brief description (optional)"
                                value={saForm.description} onChange={(e) => updSa('description', e.target.value)} />
                        </div>
                        <div style={{ marginBottom: 12 }}>
                            <label className="form-label">Address</label>
                            <input className="form-control" placeholder="Street, city, country"
                                value={saForm.address} onChange={(e) => updSa('address', e.target.value)} />
                        </div>
                        <div style={{ marginBottom: 16 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
                                <input type="checkbox" checked={saForm.has_business_units}
                                    onChange={(e) => updSa('has_business_units', e.target.checked)}
                                    style={{ width: 16, height: 16, cursor: 'pointer' }} />
                                <span>
                                    <strong>BU Mode</strong> — This company has Business Units
                                </span>
                            </label>
                            <small className="text-muted" style={{ display: 'block', marginTop: 4, marginLeft: 26 }}>
                                {saForm.has_business_units
                                    ? 'Departments will be organised under Business Units. Risk IDs use format PREFIX-BU-DEPT-NNNN.'
                                    : 'Simple Mode: Departments may have sub-departments. Risk IDs use format PREFIX-DEPT-DEPT-NNNN.'}
                            </small>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button type="submit" className="btn btn-primary" disabled={saCreating}>
                                {saCreating ? t('adding') : 'Create Company'}
                            </button>
                            <button type="button" className="btn btn-secondary" onClick={() => setShowStandaloneForm(false)}>
                                {t('cancel')}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* ── Create subsidiary form ── */}
            {showCreateForm && (
                <div className="card" style={{ marginBottom: 24, border: '1px solid var(--color-primary)', borderRadius: 8 }}>
                    <h3 style={{ marginBottom: 12 }}>New Subsidiary Company</h3>
                    {createError && <p style={{ color: 'var(--color-danger)', marginBottom: 12 }}>{createError}</p>}
                    <form onSubmit={createSubsidiary}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                            <div>
                                <label className="form-label">Company Name *</label>
                                <input className="form-control" value={newForm.name}
                                    onChange={(e) => {
                                        const name = e.target.value;
                                        setNewForm((f) => ({ ...f, name, code: suggestCode(name) }));
                                    }} placeholder="e.g. Certitude Gulf" />
                            </div>
                            <div>
                                <label className="form-label">Company Code *</label>
                                <input className="form-control" value={newForm.code}
                                    onChange={(e) => updNew('code', e.target.value.toUpperCase())}
                                    placeholder="e.g. CGULF" maxLength={20} />
                                <small className="text-muted">Short uppercase code used in IDs</small>
                            </div>
                            <div>
                                <label className="form-label">Parent Company Access</label>
                                <select className="form-control" value={newForm.scope}
                                    onChange={(e) => updNew('scope', e.target.value)}>
                                    <option value="consolidated_only">Consolidated View</option>
                                    <option value="view">Entity Level View</option>
                                    <option value="full">Full Access</option>
                                </select>
                                <small className="text-muted">{MAX_SCOPE_DESC[newForm.scope]}</small>
                            </div>
                            <div>
                                <label className="form-label">Industry</label>
                                <select className="form-control" value={newForm.industry} onChange={(e) => updNew('industry', e.target.value)}>
                                    <option value="">— Select —</option>
                                    {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="form-label">Company Type</label>
                                <input className="form-control" placeholder="e.g. Public, Private, Mutual"
                                    value={newForm.company_type} onChange={(e) => updNew('company_type', e.target.value)} />
                            </div>
                            <div>
                                <label className="form-label">Country / Jurisdiction</label>
                                <input className="form-control" placeholder="e.g. Qatar"
                                    value={newForm.country} onChange={(e) => updNew('country', e.target.value)} />
                            </div>
                            <div>
                                <label className="form-label">Regulatory Body</label>
                                <input className="form-control" placeholder="e.g. Qatar Central Bank (QCB)"
                                    value={newForm.regulatory_body} onChange={(e) => updNew('regulatory_body', e.target.value)} />
                            </div>
                            <div>
                                <label className="form-label">Fiscal Year End</label>
                                <select className="form-control" value={newForm.fiscal_year_end} onChange={(e) => updNew('fiscal_year_end', e.target.value)}>
                                    <option value="">— Select —</option>
                                    {FISCAL_YEAR_ENDS.map((d) => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                        </div>
                        <div style={{ marginBottom: 12 }}>
                            <label className="form-label">Description</label>
                            <textarea className="form-control" rows={2} placeholder="Brief description (optional)"
                                value={newForm.description} onChange={(e) => updNew('description', e.target.value)} />
                        </div>
                        <div style={{ marginBottom: 12 }}>
                            <label className="form-label">Address</label>
                            <input className="form-control" placeholder="Street, city, country"
                                value={newForm.address} onChange={(e) => updNew('address', e.target.value)} />
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button type="submit" className="btn btn-primary" disabled={creating}>
                                {creating ? t('adding') : 'Create Subsidiary'}
                            </button>
                            <button type="button" className="btn btn-secondary" onClick={() => setShowCreateForm(false)}>
                                {t('cancel')}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* ── Company Profile ── */}
            {profile !== null && (
                <div className="card" style={{ marginBottom: 24 }}>
                    <h2 style={{ marginBottom: 16, fontSize: 15, fontWeight: 700 }}>Company Profile</h2>
                    <form onSubmit={saveProfile}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
                            <div>
                                <label className="form-label">Company Name</label>
                                <input className="form-control" placeholder="e.g. Certitude Advisory"
                                    value={profileForm.name || ''}
                                    onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))} />
                            </div>
                            <div>
                                <label className="form-label">Company Code</label>
                                <input className="form-control" value={profileForm.code || ''} disabled
                                    style={{ background: 'var(--color-bg)', cursor: 'not-allowed' }} />
                                <small className="text-muted">Code cannot be changed — it is embedded in all record IDs</small>
                            </div>
                            <div /> {/* spacer */}
                            <div>
                                <label className="form-label">Industry</label>
                                <select className="form-control" value={profileForm.industry || ''}
                                    onChange={(e) => setProfileForm((f) => ({ ...f, industry: e.target.value }))}>
                                    <option value="">— Select —</option>
                                    {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="form-label">Company Type</label>
                                <input className="form-control" placeholder="e.g. Public, Private, Mutual"
                                    value={profileForm.company_type || ''}
                                    onChange={(e) => setProfileForm((f) => ({ ...f, company_type: e.target.value }))} />
                            </div>
                            <div>
                                <label className="form-label">Country / Jurisdiction</label>
                                <input className="form-control" placeholder="e.g. Qatar"
                                    value={profileForm.country || ''}
                                    onChange={(e) => setProfileForm((f) => ({ ...f, country: e.target.value }))} />
                            </div>
                            <div>
                                <label className="form-label">Regulatory Body</label>
                                <input className="form-control" placeholder="e.g. Qatar Central Bank (QCB)"
                                    value={profileForm.regulatory_body || ''}
                                    onChange={(e) => setProfileForm((f) => ({ ...f, regulatory_body: e.target.value }))} />
                            </div>
                            <div>
                                <label className="form-label">Fiscal Year End</label>
                                <select className="form-control" value={profileForm.fiscal_year_end || ''}
                                    onChange={(e) => setProfileForm((f) => ({ ...f, fiscal_year_end: e.target.value }))}>
                                    <option value="">— Select —</option>
                                    {FISCAL_YEAR_ENDS.map((d) => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                        </div>
                        <div style={{ marginBottom: 12 }}>
                            <label className="form-label">Description</label>
                            <textarea className="form-control" rows={2}
                                placeholder="Brief description of the company and its GRC scope"
                                value={profileForm.description || ''}
                                onChange={(e) => setProfileForm((f) => ({ ...f, description: e.target.value }))} />
                        </div>
                        <div style={{ marginBottom: 16 }}>
                            <label className="form-label">Address</label>
                            <input className="form-control" placeholder="Street, city, country"
                                value={profileForm.address || ''}
                                onChange={(e) => setProfileForm((f) => ({ ...f, address: e.target.value }))} />
                        </div>
                        <div style={{ marginBottom: 16, padding: '12px 16px', background: 'var(--color-bg)', borderRadius: 6, border: '1px solid var(--color-border)' }}>
                            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                                <input type="checkbox" style={{ marginTop: 3 }}
                                    checked={!!profileForm.has_business_units}
                                    onChange={(e) => setProfileForm((f) => ({ ...f, has_business_units: e.target.checked }))} />
                                <span>
                                    <strong>BU Mode</strong> — This company uses Business Units<br />
                                    <small className="text-muted">
                                        {profileForm.has_business_units
                                            ? 'IDs use BU code: RI-BU-DEPT-NNNN. Departments page shows BU assignment.'
                                            : 'IDs use dept code: RI-DEPT-DEPT-NNNN. Departments page shows optional sub-departments.'}
                                    </small>
                                    {profileForm.has_business_units !== (profile && profile.has_business_units) && (
                                        <><br /><small style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                                            Note: Changing this setting affects how departments are displayed going forward. Your existing departments and records will remain — you may need to reassign them to Business Units after saving.
                                        </small></>
                                    )}
                                </span>
                            </label>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <button type="submit" className="btn btn-primary" disabled={profileSaving}>
                                {profileSaving ? t('saving') : t('save')}
                            </button>
                            {profileMsg && (
                                <span style={{ fontSize: 13, color: profileMsg === 'Saved.' ? 'var(--color-success, green)' : 'var(--color-danger)' }}>
                                    {profileMsg}
                                </span>
                            )}
                        </div>
                    </form>
                </div>
            )}

            {/* ── Org tree ── */}
            <div className="card" style={{ marginBottom: 24 }}>
                <h2 style={{ marginBottom: 16, fontSize: 15, fontWeight: 700 }}>Organisation Structure</h2>

                {/* Parent company */}
                {parent && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                                  background: 'var(--color-bg-secondary)', borderRadius: 6, marginBottom: 8 }}>
                        <span style={{ fontSize: 18 }}>🏢</span>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                            {renaming ? (
                                <>
                                    <input
                                        className="form-control"
                                        style={{ width: 240, padding: '4px 10px', fontSize: 14 }}
                                        value={renameVal}
                                        onChange={(e) => setRenameVal(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') saveRename(); if (e.key === 'Escape') cancelRename(); }}
                                        autoFocus
                                    />
                                    <button className="btn btn-primary btn-sm" onClick={saveRename} disabled={renameSaving}>
                                        {renameSaving ? t('saving') : t('save')}
                                    </button>
                                    <button className="btn btn-secondary btn-sm" onClick={cancelRename} disabled={renameSaving}>
                                        {t('cancel')}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <span style={{ fontWeight: 700 }}>{parent.name}</span>
                                    <span className="badge badge-role">{parent.code}</span>
                                    <button
                                        className="btn btn-secondary btn-sm"
                                        style={{ fontSize: 11, padding: '2px 8px' }}
                                        onClick={() => startRename(parent.name)}
                                        title="Rename company"
                                    >
                                        ✎ Rename
                                    </button>
                                </>
                            )}
                        </div>
                        {!renaming && (
                            <>
                                <span className="text-muted" style={{ fontSize: 12, marginRight: 8 }}>Parent company</span>
                                <button
                                    className="btn btn-danger"
                                    style={{ fontSize: 12, padding: '3px 10px' }}
                                    onClick={() => setDeleteConfirm({ id: parent.id, name: parent.name })}
                                    title="Delete this company"
                                >
                                    {t('delete')}
                                </button>
                            </>
                        )}
                    </div>
                )}

                {/* Subsidiaries */}
                {subs.length === 0 && (
                    <p className="text-muted" style={{ paddingLeft: 32, marginTop: 8 }}>
                        No subsidiaries yet. Click <strong>+ Add Subsidiary</strong> to create one.
                    </p>
                )}
                {subs.map((sub) => (
                    <div key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: 12,
                                               padding: '10px 12px', marginLeft: 24,
                                               borderLeft: '2px solid var(--color-border)',
                                               marginTop: 4, borderRadius: '0 6px 6px 0' }}>
                        <span style={{ fontSize: 16 }}>↳</span>
                        <div style={{ flex: 1 }}>
                            <span style={{ fontWeight: 600 }}>{sub.name}</span>
                            <span className="badge badge-role" style={{ marginLeft: 8 }}>{sub.code}</span>
                            {!sub.is_active && (
                                <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--color-danger)' }}>Inactive</span>
                            )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <label style={{ fontSize: 12, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                                Parent Company Access:
                            </label>
                            <select
                                className="form-control"
                                style={{ width: 'auto', fontSize: 12, padding: '2px 6px' }}
                                value={sub.max_group_access_scope}
                                onChange={(e) => updateMaxScope(sub.id, e.target.value)}
                                title={MAX_SCOPE_DESC[sub.max_group_access_scope]}
                            >
                                <option value="consolidated_only">Consolidated View</option>
                                <option value="view">Entity Level View</option>
                                <option value="full">Full Access</option>
                            </select>
                            <button
                                className="btn btn-secondary"
                                style={{ fontSize: 12, padding: '3px 10px' }}
                                onClick={() => startEditSub(sub)}
                                title="Edit this subsidiary"
                            >
                                ✎ Edit
                            </button>
                            <button
                                className="btn btn-danger"
                                style={{ fontSize: 12, padding: '3px 10px' }}
                                onClick={() => setDeleteConfirm({ id: sub.id, name: sub.name })}
                                title="Delete this subsidiary"
                            >
                                {t('delete')}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Edit subsidiary modal (BUG-04) ── */}
            {editingSub && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="card" style={{ maxWidth: 680, width: '92%', padding: 28, maxHeight: '90vh', overflowY: 'auto' }}>
                        <h3 style={{ marginBottom: 16 }}>Edit Subsidiary — {editingSub.name}</h3>
                        {editSubError && <p style={{ color: 'var(--color-danger)', marginBottom: 12 }}>{editSubError}</p>}
                        <form onSubmit={saveEditSub}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                                <div>
                                    <label className="form-label">Company Name *</label>
                                    <input className="form-control" value={editSubForm.name}
                                        onChange={(e) => setEditSubForm((f) => ({ ...f, name: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="form-label">Parent Company Access</label>
                                    <select className="form-control" value={editSubForm.max_group_access_scope}
                                        onChange={(e) => setEditSubForm((f) => ({ ...f, max_group_access_scope: e.target.value }))}>
                                        <option value="consolidated_only">Consolidated View</option>
                                        <option value="view">Entity Level View</option>
                                        <option value="full">Full Access</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="form-label">Industry</label>
                                    <select className="form-control" value={editSubForm.industry}
                                        onChange={(e) => setEditSubForm((f) => ({ ...f, industry: e.target.value }))}>
                                        <option value="">— Select —</option>
                                        {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="form-label">Company Type</label>
                                    <input className="form-control" placeholder="e.g. Public, Private"
                                        value={editSubForm.company_type}
                                        onChange={(e) => setEditSubForm((f) => ({ ...f, company_type: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="form-label">Country / Jurisdiction</label>
                                    <input className="form-control" placeholder="e.g. Qatar"
                                        value={editSubForm.country}
                                        onChange={(e) => setEditSubForm((f) => ({ ...f, country: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="form-label">Regulatory Body</label>
                                    <input className="form-control" placeholder="e.g. QCB"
                                        value={editSubForm.regulatory_body}
                                        onChange={(e) => setEditSubForm((f) => ({ ...f, regulatory_body: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="form-label">Fiscal Year End</label>
                                    <select className="form-control" value={editSubForm.fiscal_year_end}
                                        onChange={(e) => setEditSubForm((f) => ({ ...f, fiscal_year_end: e.target.value }))}>
                                        <option value="">— Select —</option>
                                        {FISCAL_YEAR_ENDS.map((d) => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div style={{ marginBottom: 12 }}>
                                <label className="form-label">Description</label>
                                <textarea className="form-control" rows={2}
                                    value={editSubForm.description}
                                    onChange={(e) => setEditSubForm((f) => ({ ...f, description: e.target.value }))} />
                            </div>
                            <div style={{ marginBottom: 16 }}>
                                <label className="form-label">Address</label>
                                <input className="form-control" placeholder="Street, city, country"
                                    value={editSubForm.address}
                                    onChange={(e) => setEditSubForm((f) => ({ ...f, address: e.target.value }))} />
                            </div>
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setEditingSub(null)} disabled={editSubSaving}>
                                    {t('cancel')}
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={editSubSaving}>
                                    {editSubSaving ? t('saving') : 'Update Subsidiary'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Delete confirmation modal ── */}
            {deleteConfirm && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                }}>
                    <div className="card" style={{ maxWidth: 440, width: '90%', padding: 28 }}>
                        <h3 style={{ marginBottom: 8, color: 'var(--color-danger)' }}>Delete Company</h3>
                        <p style={{ marginBottom: 8 }}>
                            Are you sure you want to permanently delete <strong>{deleteConfirm.name}</strong>?
                        </p>
                        <p className="text-muted" style={{ fontSize: 13, marginBottom: 24 }}>
                            This will remove all users' memberships in this company. Any associated data
                            (risks, controls, policies, etc.) will also be deleted and cannot be recovered.
                        </p>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)} disabled={deleting}>
                                {t('cancel')}
                            </button>
                            <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
                                {deleting ? t('deleting') : 'Yes, Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Group access management ── */}
            <div className="card">
                <h2 style={{ marginBottom: 4, fontSize: 15, fontWeight: 700 }}>Group Access — Users</h2>
                <p className="text-muted" style={{ marginBottom: 16, fontSize: 13 }}>
                    Set the level of cross-subsidiary access for each user. Users with any scope other than
                    "No group access" will see a <strong>Group Dashboard</strong> option in the company picker.
                </p>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Company Role</th>
                            <th>Group Access Scope</th>
                            <th>Description</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.filter((u) => u.is_active).map((u) => (
                            <tr key={u.id}>
                                <td style={{ fontWeight: 600 }}>{u.full_name || '—'}</td>
                                <td>{u.email}</td>
                                <td><span className="badge badge-role">{u.role}</span></td>
                                <td>
                                    <select
                                        className="form-control"
                                        style={{ width: 'auto', fontSize: 12 }}
                                        value={u.group_access_scope || 'none'}
                                        onChange={(e) => updateGroupScope(u.id, e.target.value)}
                                    >
                                        {Object.entries(SCOPE_LABELS).map(([val, label]) => (
                                            <option key={val} value={val}>{label}</option>
                                        ))}
                                    </select>
                                </td>
                                <td className="text-muted" style={{ fontSize: 12 }}>
                                    {SCOPE_DESC[u.group_access_scope || 'none']}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// Departments.jsx — Admin-only department management page
//
// Supports two modes based on company.has_business_units:
//   BU Mode    — departments are assigned to a Business Unit (business_unit_id)
//   Simple Mode — departments may have a parent department (parent_dept_id = sub-dept)
//
// GET    /api/departments       → list (includes business_unit_id, parent_dept_id)
// GET    /api/business-units    → list BUs (BU Mode only)
// POST   /api/departments       → add (with optional business_unit_id / parent_dept_id)
// PATCH  /api/departments/:id   → update name / BU link / parent link
// DELETE /api/departments/:id   → soft-deactivate (with usage check)

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { useT } from '../contexts/LanguageContext';

function suggestCode(name) {
    const parts = name.toUpperCase().replace(/[^A-Z0-9\s]/g, '').split(/\s+/).filter(Boolean);
    if (parts.length >= 3) return parts.map((p) => p[0]).slice(0, 3).join('');
    if (parts.length === 2) return (parts[0].slice(0, 2) + parts[1][0]).toUpperCase();
    return parts[0]?.slice(0, 3).toUpperCase() || '';
}

function ConfirmDialog({ message, onConfirm, onCancel }) {
    const t = useT();
    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
            <div className="card" style={{ maxWidth: 420, width: '90%', padding: 28 }}>
                <p style={{ marginBottom: 20, color: 'var(--text)', lineHeight: 1.6 }}>{message}</p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button className="btn btn-secondary" onClick={onCancel}>{t('cancel')}</button>
                    <button className="btn" style={{ background: '#ef4444', color: '#fff', border: 'none' }} onClick={onConfirm}>{t('deactivate')}</button>
                </div>
            </div>
        </div>
    );
}

// Inline cell for editing name, BU link, or parent dept link
function EditableRow({ dept, bus, depts, isBuMode, onSave, onDeactivate }) {
    const t = useT();
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState(dept.name);
    const [buId, setBuId] = useState(dept.business_unit_id ? String(dept.business_unit_id) : '');
    const [parentId, setParentId] = useState(dept.parent_dept_id ? String(dept.parent_dept_id) : '');

    async function save() {
        const patch = { name: name.trim() };
        if (isBuMode) patch.business_unit_id = buId ? parseInt(buId) : null;
        else patch.parent_dept_id = parentId ? parseInt(parentId) : null;
        await onSave(dept.id, patch);
        setEditing(false);
    }

    const bu = bus.find((b) => String(b.id) === String(dept.business_unit_id));
    const parent = depts.find((d) => String(d.id) === String(dept.parent_dept_id));

    // Top-level depts for parent selector (exclude self and sub-depts that would create cycles)
    const parentOptions = depts.filter((d) => d.id !== dept.id && !d.parent_dept_id);

    if (editing) {
        return (
            <tr style={{ background: 'var(--primary-bg, #f0f7ff)' }}>
                <td style={{ padding: '10px 16px' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, background: 'var(--primary)', color: '#fff', padding: '2px 8px', borderRadius: 4 }}>{dept.code}</span>
                </td>
                <td style={{ padding: '8px 16px' }}>
                    <input className="form-control" value={name} onChange={(e) => setName(e.target.value)}
                        style={{ padding: '4px 8px', fontSize: 14, maxWidth: 220 }} />
                </td>
                <td style={{ padding: '8px 16px' }}>
                    {isBuMode ? (
                        <select className="form-control" value={buId} onChange={(e) => setBuId(e.target.value)}
                            style={{ padding: '4px 8px', fontSize: 14, maxWidth: 200 }}>
                            <option value="">— None —</option>
                            {bus.map((b) => <option key={b.id} value={b.id}>{b.name} ({b.code})</option>)}
                        </select>
                    ) : (
                        <select className="form-control" value={parentId} onChange={(e) => setParentId(e.target.value)}
                            style={{ padding: '4px 8px', fontSize: 14, maxWidth: 200 }}>
                            <option value="">— Top-level dept —</option>
                            {parentOptions.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.code})</option>)}
                        </select>
                    )}
                </td>
                <td style={{ padding: '8px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button className="btn btn-primary btn-sm" onClick={save}>{t('save')}</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => { setEditing(false); setName(dept.name); setBuId(dept.business_unit_id ? String(dept.business_unit_id) : ''); setParentId(dept.parent_dept_id ? String(dept.parent_dept_id) : ''); }}>{t('cancel')}</button>
                    </div>
                </td>
            </tr>
        );
    }

    return (
        <tr style={{ borderBottom: '1px solid var(--border)' }}>
            <td style={{ padding: '10px 16px' }}>
                <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, background: 'var(--primary)', color: '#fff', padding: '2px 8px', borderRadius: 4 }}>{dept.code}</span>
            </td>
            <td style={{ padding: '10px 16px', color: 'var(--text)' }}>
                <span style={{ cursor: 'pointer', borderBottom: '1px dashed var(--border)' }} title="Click to edit" onClick={() => setEditing(true)}>
                    {dept.parent_dept_id && !isBuMode && <span style={{ color: 'var(--text-muted)', marginRight: 6 }}>↳</span>}
                    {dept.name}
                </span>
            </td>
            <td style={{ padding: '10px 16px', color: 'var(--text-muted)', fontSize: 13 }}>
                {isBuMode
                    ? (bu ? <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{bu.name}</span> : <span style={{ color: '#aaa' }}>—</span>)
                    : (parent ? <span style={{ fontWeight: 600, color: 'var(--primary)' }}>↳ {parent.name}</span> : <span style={{ color: '#aaa' }}>Top-level</span>)
                }
            </td>
            <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>{t('edit')}</button>
                    <button className="btn btn-secondary btn-sm" style={{ color: '#ef4444', borderColor: '#ef4444' }}
                        onClick={() => onDeactivate(dept)}>
                        {t('deactivate')}
                    </button>
                </div>
            </td>
        </tr>
    );
}

export default function Departments() {
    const { api, session } = useAuth();
    const t = useT();
    const activeCompany = session?.companies?.find((c) => c.id === session.activeCompanyId);
    const isBuMode = !!activeCompany?.has_business_units;

    const [depts, setDepts] = useState([]);
    const [bus, setBus] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [addError, setAddError] = useState('');
    const [actionError, setActionError] = useState('');

    const [newName, setNewName] = useState('');
    const [newCode, setNewCode] = useState('');
    const [newBuId, setNewBuId] = useState('');
    const [newParentId, setNewParentId] = useState('');
    const [codeTouched, setCodeTouched] = useState(false);
    const [adding, setAdding] = useState(false);

    const [confirmDeactivate, setConfirmDeactivate] = useState(null);

    async function load() {
        setLoading(true); setError('');
        try {
            const [d, b] = await Promise.all([
                api.get('/departments'),
                isBuMode ? api.get('/business-units') : Promise.resolve([]),
            ]);
            setDepts(d);
            setBus(b);
        } catch (e) {
            setError(e.message || 'Failed to load.');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { load(); }, []);

    function handleNameChange(e) {
        const name = e.target.value;
        setNewName(name);
        if (!codeTouched) setNewCode(suggestCode(name));
        setAddError('');
    }

    async function handleAdd(e) {
        e.preventDefault();
        if (!newName.trim()) { setAddError('Name is required.'); return; }
        if (!newCode.trim() || newCode.length < 2) { setAddError('Code must be at least 2 characters.'); return; }
        setAdding(true); setAddError('');
        try {
            await api.post('/departments', {
                name: newName.trim(),
                code: newCode.trim().toUpperCase(),
                business_unit_id: isBuMode && newBuId ? parseInt(newBuId) : null,
                parent_dept_id: !isBuMode && newParentId ? parseInt(newParentId) : null,
            });
            setNewName(''); setNewCode(''); setNewBuId(''); setNewParentId(''); setCodeTouched(false);
            await load();
        } catch (e) {
            setAddError(e.message || 'Failed to add department.');
        } finally {
            setAdding(false);
        }
    }

    async function handleSave(id, patch) {
        setActionError('');
        try { await api.patch(`/departments/${id}`, patch); await load(); }
        catch (e) { setActionError(e.message || 'Update failed.'); }
    }

    async function handleDeactivate(dept) {
        setActionError('');
        try {
            await api.delete(`/departments/${dept.id}`);
            setConfirmDeactivate(null);
            await load();
        } catch (e) {
            setActionError(e.message || 'Could not deactivate department.');
            setConfirmDeactivate(null);
        }
    }

    // Sort: top-level first, then sub-depts grouped under their parent
    const sorted = [...depts].sort((a, b) => {
        const aParent = a.parent_dept_id ? depts.find((d) => d.id === a.parent_dept_id)?.name || '' : '';
        const bParent = b.parent_dept_id ? depts.find((d) => d.id === b.parent_dept_id)?.name || '' : '';
        const aKey = a.parent_dept_id ? `${aParent}~${a.name}` : a.name;
        const bKey = b.parent_dept_id ? `${bParent}~${b.name}` : b.name;
        return aKey.localeCompare(bKey);
    });

    const topLevelDepts = depts.filter((d) => !d.parent_dept_id);

    return (
        <div style={{ maxWidth: 860, padding: '24px 32px' }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6, color: 'var(--text)' }}>{t('depts_title')}</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: 8, fontSize: 14 }}>
                Manage departments used across Risk, Issues, KRIs, and user assignments.
                {isBuMode
                    ? ' Assign each department to a Business Unit.'
                    : ' Optionally assign a parent department to create sub-departments.'}
            </p>
            <div style={{ display: 'inline-block', padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, marginBottom: 20,
                background: isBuMode ? '#e0f2fe' : '#f0fdf4', color: isBuMode ? '#0369a1' : '#166534' }}>
                {isBuMode ? '🏢 BU Mode' : '📋 Simple Mode'}
            </div>

            {error && <div className="alert alert-error">{error}</div>}
            {actionError && <div className="alert alert-error">{actionError}</div>}

            {/* Add form */}
            <div className="card" style={{ marginBottom: 24, padding: '20px 24px' }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, color: 'var(--text)' }}>
                    Add {isBuMode ? 'Department' : 'Department / Sub-department'}
                </h3>
                {addError && <div className="alert alert-error" style={{ marginBottom: 12 }}>{addError}</div>}
                <form onSubmit={handleAdd}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        <div className="form-group" style={{ flex: '1 1 180px', minWidth: 150, marginBottom: 0 }}>
                            <label style={{ fontSize: 12 }}>Name</label>
                            <input className="form-control" value={newName} onChange={handleNameChange}
                                placeholder={isBuMode ? 'e.g. Marine Underwriting' : 'e.g. Accounts Receivable'} />
                        </div>
                        <div className="form-group" style={{ width: 120, marginBottom: 0 }}>
                            <label style={{ fontSize: 12 }}>Code (2–10)</label>
                            <input className="form-control" value={newCode}
                                onChange={(e) => { setCodeTouched(true); setNewCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10)); }}
                                placeholder="MAR" maxLength={10}
                                style={{ fontFamily: 'monospace', letterSpacing: 1 }} />
                        </div>
                        {isBuMode ? (
                            <div className="form-group" style={{ flex: '0 1 200px', marginBottom: 0 }}>
                                <label style={{ fontSize: 12 }}>Business Unit</label>
                                <select className="form-control" value={newBuId} onChange={(e) => setNewBuId(e.target.value)}>
                                    <option value="">— Select BU —</option>
                                    {bus.map((b) => <option key={b.id} value={b.id}>{b.name} ({b.code})</option>)}
                                </select>
                            </div>
                        ) : (
                            <div className="form-group" style={{ flex: '0 1 200px', marginBottom: 0 }}>
                                <label style={{ fontSize: 12 }}>Parent Dept (optional)</label>
                                <select className="form-control" value={newParentId} onChange={(e) => setNewParentId(e.target.value)}>
                                    <option value="">— Top-level dept —</option>
                                    {topLevelDepts.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.code})</option>)}
                                </select>
                            </div>
                        )}
                        <button type="submit" className="btn btn-primary" disabled={adding} style={{ marginBottom: 0, whiteSpace: 'nowrap' }}>
                            {adding ? t('adding') : '+ Add'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Dept list */}
            {loading ? (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 32 }}>{t('loading')}</div>
            ) : depts.length === 0 ? (
                <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
                    No active departments. Add one above.
                </div>
            ) : (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: 'var(--bg)', borderBottom: '2px solid var(--border)' }}>
                                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', width: 100 }}>Code</th>
                                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Name</th>
                                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', width: 200 }}>
                                    {isBuMode ? 'Business Unit' : 'Parent Dept'}
                                </th>
                                <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', width: 160 }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sorted.map((d) => (
                                <EditableRow
                                    key={d.id}
                                    dept={d}
                                    bus={bus}
                                    depts={depts}
                                    isBuMode={isBuMode}
                                    onSave={handleSave}
                                    onDeactivate={(dept) => setConfirmDeactivate(dept)}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 16 }}>
                Tip: Click Edit on any row to rename or change its {isBuMode ? 'Business Unit assignment' : 'parent department'}. Departments assigned to risks or users cannot be deactivated until reassigned.
            </p>

            {confirmDeactivate && (
                <ConfirmDialog
                    message={`Deactivate "${confirmDeactivate.name}"? It will no longer appear in dropdown lists.`}
                    onConfirm={() => handleDeactivate(confirmDeactivate)}
                    onCancel={() => setConfirmDeactivate(null)}
                />
            )}
        </div>
    );
}

// BusinessUnits.jsx — Admin-only BU management page (BU Mode companies only)
//
// GET    /api/business-units       → list BUs
// POST   /api/business-units       → add BU
// PATCH  /api/business-units/:id   → rename BU
// DELETE /api/business-units/:id   → delete (blocks if depts assigned)

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { useT } from '../contexts/LanguageContext';

function suggestCode(name) {
    const parts = name.toUpperCase().replace(/[^A-Z0-9\s]/g, '').split(/\s+/).filter(Boolean);
    if (parts.length >= 3) return parts.map((p) => p[0]).slice(0, 3).join('');
    if (parts.length === 2) return (parts[0].slice(0, 2) + parts[1][0]).toUpperCase();
    return parts[0]?.slice(0, 4).toUpperCase() || '';
}

function RenameCell({ bu, onSave }) {
    const t = useT();
    const [editing, setEditing] = useState(false);
    const [value, setValue] = useState(bu.name);
    const inputRef = useRef(null);

    function startEdit() { setValue(bu.name); setEditing(true); setTimeout(() => inputRef.current?.focus(), 0); }

    async function save() {
        const trimmed = value.trim();
        if (!trimmed || trimmed === bu.name) { setEditing(false); return; }
        await onSave(bu.id, trimmed);
        setEditing(false);
    }

    if (editing) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input ref={inputRef} value={value} onChange={(e) => setValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
                    className="form-control" style={{ padding: '4px 8px', fontSize: 14, maxWidth: 280 }} />
                <button className="btn btn-primary btn-sm" onClick={save}>{t('save')}</button>
                <button className="btn btn-secondary btn-sm" onClick={() => setEditing(false)}>✕</button>
            </div>
        );
    }
    return (
        <span style={{ cursor: 'pointer', borderBottom: '1px dashed var(--border)' }} title="Click to rename" onClick={startEdit}>
            {bu.name}
        </span>
    );
}

function ConfirmDialog({ message, onConfirm, onCancel }) {
    const t = useT();
    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
            <div className="card" style={{ maxWidth: 420, width: '90%', padding: 28 }}>
                <p style={{ marginBottom: 20, color: 'var(--text)', lineHeight: 1.6 }}>{message}</p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button className="btn btn-secondary" onClick={onCancel}>{t('cancel')}</button>
                    <button className="btn" style={{ background: '#ef4444', color: '#fff', border: 'none' }} onClick={onConfirm}>{t('delete')}</button>
                </div>
            </div>
        </div>
    );
}

export default function BusinessUnits() {
    const { api, session } = useAuth();
    const t = useT();
    const activeCompany = session?.companies?.find((c) => c.id === session.activeCompanyId);

    const [bus, setBus] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [addError, setAddError] = useState('');
    const [actionError, setActionError] = useState('');

    const [newName, setNewName] = useState('');
    const [newCode, setNewCode] = useState('');
    const [codeTouched, setCodeTouched] = useState(false);
    const [adding, setAdding] = useState(false);

    const [confirmDelete, setConfirmDelete] = useState(null); // { id, name }

    async function load() {
        setLoading(true); setError('');
        try { setBus(await api.get('/business-units')); }
        catch (e) { setError(e.message || 'Failed to load business units.'); }
        finally { setLoading(false); }
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
            await api.post('/business-units', { name: newName.trim(), code: newCode.trim().toUpperCase() });
            setNewName(''); setNewCode(''); setCodeTouched(false);
            await load();
        } catch (e) { setAddError(e.message || 'Failed to add business unit.'); }
        finally { setAdding(false); }
    }

    async function handleRename(id, name) {
        setActionError('');
        try { await api.patch(`/business-units/${id}`, { name }); await load(); }
        catch (e) { setActionError(e.message || 'Rename failed.'); }
    }

    async function handleDelete(id) {
        setActionError('');
        try { await api.delete(`/business-units/${id}`); setConfirmDelete(null); await load(); }
        catch (e) { setActionError(e.message || 'Could not delete business unit.'); setConfirmDelete(null); }
    }

    if (!activeCompany?.has_business_units) {
        return (
            <div style={{ maxWidth: 600, padding: '24px 32px' }}>
                <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12, color: 'var(--text)' }}>{t('bu_title')}</h1>
                <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
                    <p style={{ marginBottom: 8 }}>This company is configured in <strong>Simple Mode</strong> (no Business Units).</p>
                    <p style={{ fontSize: 13 }}>Business Units are only available for companies created with the BU Mode toggle enabled. To enable BU Mode, update the company configuration.</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 760, padding: '24px 32px' }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6, color: 'var(--text)' }}>{t('bu_title')}</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: 14 }}>
                {t('bu_subtitle')}
            </p>

            {error && <div className="alert alert-error">{error}</div>}
            {actionError && <div className="alert alert-error">{actionError}</div>}

            {/* Add form */}
            <div className="card" style={{ marginBottom: 24, padding: '20px 24px' }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, color: 'var(--text)' }}>Add Business Unit</h3>
                {addError && <div className="alert alert-error" style={{ marginBottom: 12 }}>{addError}</div>}
                <form onSubmit={handleAdd}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        <div className="form-group" style={{ flex: '1 1 200px', minWidth: 160, marginBottom: 0 }}>
                            <label style={{ fontSize: 12 }}>Business Unit Name</label>
                            <input className="form-control" value={newName} onChange={handleNameChange} placeholder="e.g. Underwriting" />
                        </div>
                        <div className="form-group" style={{ width: 130, marginBottom: 0 }}>
                            <label style={{ fontSize: 12 }}>Code (2–20 chars)</label>
                            <input className="form-control" value={newCode}
                                onChange={(e) => { setCodeTouched(true); setNewCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20)); }}
                                placeholder="UND" maxLength={20}
                                style={{ fontFamily: 'monospace', letterSpacing: 1 }} />
                        </div>
                        <button type="submit" className="btn btn-primary" disabled={adding} style={{ marginBottom: 0, whiteSpace: 'nowrap' }}>
                            {adding ? t('adding') : '+ Add BU'}
                        </button>
                    </div>
                </form>
            </div>

            {/* BU list */}
            {loading ? (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 32 }}>{t('loading')}</div>
            ) : bus.length === 0 ? (
                <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
                    No Business Units yet. Add one above.
                </div>
            ) : (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: 'var(--bg)', borderBottom: '2px solid var(--border)' }}>
                                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', width: 110 }}>Code</th>
                                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Name</th>
                                <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', width: 100 }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bus.map((bu, i) => (
                                <tr key={bu.id} style={{ borderBottom: i < bus.length - 1 ? '1px solid var(--border)' : 'none', background: i % 2 === 0 ? 'transparent' : 'var(--bg)' }}>
                                    <td style={{ padding: '10px 16px' }}>
                                        <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, background: 'var(--primary)', color: '#fff', padding: '2px 8px', borderRadius: 4 }}>{bu.code}</span>
                                    </td>
                                    <td style={{ padding: '10px 16px', color: 'var(--text)' }}>
                                        <RenameCell bu={bu} onSave={handleRename} />
                                    </td>
                                    <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                                        <button className="btn btn-secondary btn-sm" style={{ color: '#ef4444', borderColor: '#ef4444' }}
                                            onClick={() => setConfirmDelete({ id: bu.id, name: bu.name })}>
                                            {t('delete')}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 16 }}>
                Tip: Click any BU name to rename it. BUs with departments assigned cannot be deleted until those departments are reassigned.
            </p>

            {confirmDelete && (
                <ConfirmDialog
                    message={`Delete "${confirmDelete.name}"? This cannot be undone.`}
                    onConfirm={() => handleDelete(confirmDelete.id)}
                    onCancel={() => setConfirmDelete(null)}
                />
            )}
        </div>
    );
}

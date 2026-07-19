import { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { useT } from '../contexts/LanguageContext';

// ── Inline edit helpers ───────────────────────────────────────────────────────

function InlineEdit({ value, onSave, onCancel }) {
    const t = useT();
    const [val, setVal] = useState(value);
    return (
        <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
                className="form-control"
                style={{ padding: '2px 6px', fontSize: 13, height: 28, width: 220 }}
                value={val}
                autoFocus
                onChange={(e) => setVal(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') onSave(val); if (e.key === 'Escape') onCancel(); }}
            />
            <button className="btn btn-primary btn-sm" style={{ padding: '2px 10px' }} onClick={() => onSave(val)}>{t('save')}</button>
            <button className="btn btn-secondary btn-sm" style={{ padding: '2px 8px' }} onClick={onCancel}>✕</button>
        </span>
    );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function RiskConfig() {
    const { api } = useAuth();
    const t = useT();
    const [taxonomy, setTaxonomy] = useState([]);      // [{id, name, sub_categories:[{id,name}]}]
    const [loading, setLoading]   = useState(true);
    const [error, setError]       = useState('');

    // Inline editing state
    const [editingCat, setEditingCat]   = useState(null);   // category id being renamed
    const [editingSub, setEditingSub]   = useState(null);   // sub-category id being renamed
    const [expandedCat, setExpandedCat] = useState(null);   // category id whose subs are expanded
    const [newCatName, setNewCatName]   = useState('');
    const [addSubFor, setAddSubFor]     = useState(null);   // category id for which we're adding a sub
    const [newSubName, setNewSubName]   = useState('');
    const [saving, setSaving]           = useState(false);

    async function load() {
        try {
            const data = await api.get('/risk-taxonomy');
            setTaxonomy(data);
        } catch {
            setError('Failed to load risk taxonomy.');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { load(); }, []);

    async function act(fn) {
        setSaving(true);
        setError('');
        try {
            await fn();
            await load();
        } catch (e) {
            setError(e.message || 'An error occurred.');
        } finally {
            setSaving(false);
        }
    }

    // ── Category actions ──────────────────────────────────────────────────────

    async function addCategory() {
        const name = newCatName.trim();
        if (!name) return;
        await act(async () => {
            const r = await fetch('/api/risk-categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name }),
                credentials: 'include',
            });
            if (!r.ok) { const e = await r.json(); throw new Error(e.error); }
            setNewCatName('');
        });
    }

    async function renameCategory(id, name) {
        const trimmed = name.trim();
        if (!trimmed) { setEditingCat(null); return; }
        await act(async () => {
            const r = await fetch(`/api/risk-categories/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: trimmed }),
                credentials: 'include',
            });
            if (!r.ok) { const e = await r.json(); throw new Error(e.error); }
            setEditingCat(null);
        });
    }

    async function deleteCategory(id) {
        await act(async () => {
            const r = await fetch(`/api/risk-categories/${id}`, {
                method: 'DELETE', credentials: 'include',
            });
            if (!r.ok) { const e = await r.json(); throw new Error(e.error); }
        });
    }

    // ── Sub-category actions ──────────────────────────────────────────────────

    async function addSub(categoryId) {
        const name = newSubName.trim();
        if (!name) return;
        await act(async () => {
            const r = await fetch('/api/risk-sub-categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ category_id: categoryId, name }),
                credentials: 'include',
            });
            if (!r.ok) { const e = await r.json(); throw new Error(e.error); }
            setNewSubName('');
            setAddSubFor(null);
        });
    }

    async function renameSub(id, name) {
        const trimmed = name.trim();
        if (!trimmed) { setEditingSub(null); return; }
        await act(async () => {
            const r = await fetch(`/api/risk-sub-categories/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: trimmed }),
                credentials: 'include',
            });
            if (!r.ok) { const e = await r.json(); throw new Error(e.error); }
            setEditingSub(null);
        });
    }

    async function deleteSub(id) {
        await act(async () => {
            const r = await fetch(`/api/risk-sub-categories/${id}`, {
                method: 'DELETE', credentials: 'include',
            });
            if (!r.ok) { const e = await r.json(); throw new Error(e.error); }
        });
    }

    // ── Render ────────────────────────────────────────────────────────────────

    if (loading) return <div className="page-content"><p className="text-muted">{t('loading')}</p></div>;

    return (
        <div className="page-content" style={{ maxWidth: 760 }}>
            <h2 style={{ marginBottom: 4 }}>{t('risk_config_title')}</h2>
            <p className="text-muted" style={{ marginBottom: 24, fontSize: 13 }}>
                {t('risk_config_subtitle')}
            </p>

            {error && (
                <div className="alert alert-danger" style={{ marginBottom: 16 }}>{error}</div>
            )}

            {/* Category list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {taxonomy.map((cat) => (
                    <div key={cat.id} style={{
                        border: '1px solid var(--color-border)',
                        borderRadius: 8,
                        overflow: 'hidden',
                    }}>
                        {/* Category header row */}
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '10px 14px',
                            background: 'var(--color-card)',
                            borderBottom: expandedCat === cat.id ? '1px solid var(--color-border)' : 'none',
                        }}>
                            {/* Expand toggle */}
                            <button
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '2px 8px', fontSize: 12, minWidth: 28 }}
                                onClick={() => setExpandedCat(expandedCat === cat.id ? null : cat.id)}
                            >
                                {expandedCat === cat.id ? '▲' : '▼'}
                            </button>

                            {/* Category name / inline edit */}
                            {editingCat === cat.id ? (
                                <InlineEdit
                                    value={cat.name}
                                    onSave={(v) => renameCategory(cat.id, v)}
                                    onCancel={() => setEditingCat(null)}
                                />
                            ) : (
                                <span style={{ fontWeight: 600, flex: 1, fontSize: 14 }}>
                                    {cat.name}
                                    <span className="text-muted" style={{ fontWeight: 400, marginLeft: 8, fontSize: 12 }}>
                                        ({cat.sub_categories.length} sub-{cat.sub_categories.length === 1 ? 'category' : 'categories'})
                                    </span>
                                </span>
                            )}

                            {editingCat !== cat.id && (
                                <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
                                    <button
                                        className="btn btn-secondary btn-sm"
                                        disabled={saving}
                                        onClick={() => { setEditingCat(cat.id); setEditingSub(null); }}
                                    >
                                        Rename
                                    </button>
                                    <button
                                        className="btn btn-danger btn-sm"
                                        disabled={saving}
                                        onClick={() => deleteCategory(cat.id)}
                                    >
                                        {t('delete')}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Sub-categories (expanded) */}
                        {expandedCat === cat.id && (
                            <div style={{ padding: '8px 14px 12px 42px', background: 'var(--color-bg)' }}>
                                {cat.sub_categories.length === 0 && (
                                    <p className="text-muted" style={{ fontSize: 12, margin: '4px 0 8px' }}>
                                        No sub-categories yet.
                                    </p>
                                )}
                                {cat.sub_categories.map((sub) => (
                                    <div key={sub.id} style={{
                                        display: 'flex', alignItems: 'center', gap: 8,
                                        padding: '5px 0',
                                        borderBottom: '1px solid var(--color-border)',
                                    }}>
                                        {editingSub === sub.id ? (
                                            <InlineEdit
                                                value={sub.name}
                                                onSave={(v) => renameSub(sub.id, v)}
                                                onCancel={() => setEditingSub(null)}
                                            />
                                        ) : (
                                            <>
                                                <span style={{ flex: 1, fontSize: 13 }}>{sub.name}</span>
                                                <button
                                                    className="btn btn-secondary btn-sm"
                                                    style={{ padding: '1px 8px', fontSize: 12 }}
                                                    disabled={saving}
                                                    onClick={() => { setEditingSub(sub.id); setEditingCat(null); }}
                                                >
                                                    Rename
                                                </button>
                                                <button
                                                    className="btn btn-danger btn-sm"
                                                    style={{ padding: '1px 8px', fontSize: 12 }}
                                                    disabled={saving}
                                                    onClick={() => deleteSub(sub.id)}
                                                >
                                                    {t('delete')}
                                                </button>
                                            </>
                                        )}
                                    </div>
                                ))}

                                {/* Add sub-category */}
                                {addSubFor === cat.id ? (
                                    <div style={{ display: 'flex', gap: 6, marginTop: 10, alignItems: 'center' }}>
                                        <input
                                            className="form-control"
                                            style={{ fontSize: 13, height: 30, flex: 1 }}
                                            placeholder="Sub-category name"
                                            value={newSubName}
                                            autoFocus
                                            onChange={(e) => setNewSubName(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') addSub(cat.id); if (e.key === 'Escape') { setAddSubFor(null); setNewSubName(''); } }}
                                        />
                                        <button className="btn btn-primary btn-sm" disabled={saving} onClick={() => addSub(cat.id)}>{t('add')}</button>
                                        <button className="btn btn-secondary btn-sm" onClick={() => { setAddSubFor(null); setNewSubName(''); }}>✕</button>
                                    </div>
                                ) : (
                                    <button
                                        className="btn btn-secondary btn-sm"
                                        style={{ marginTop: 10, fontSize: 12 }}
                                        onClick={() => { setAddSubFor(cat.id); setNewSubName(''); }}
                                    >
                                        {t('add_subcategory')}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Add new category */}
            <div style={{ marginTop: 20, display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                    className="form-control"
                    style={{ fontSize: 13, height: 34, flex: 1 }}
                    placeholder="New category name"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') addCategory(); }}
                />
                <button
                    className="btn btn-primary"
                    style={{ whiteSpace: 'nowrap' }}
                    disabled={saving || !newCatName.trim()}
                    onClick={addCategory}
                >
                    {t('add_category')}
                </button>
            </div>
        </div>
    );
}

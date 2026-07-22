// RolesPermissions.jsx — Phase B of the admin-configurable permissions
// engine (see Documents/Internal/RBAC_Permissions_Engine_Scoping.docx,
// Section 9). Admin-only. Additive only — nothing here is enforced yet;
// requireRole() and every canX flag are untouched until Phase C/D. This
// screen exists purely so Qatar Post can see and edit the model live,
// ahead of any code actually consulting it.
//
// GET  /api/roles                    → role list (built-in + custom)
// POST /api/roles                    → create a custom role (name only,
//                                       starts at zero permissions)
// GET  /api/capabilities             → full capability catalogue
// GET  /api/roles/:id/permissions    → one role's grid (scope per capability)
// PUT  /api/roles/:id/permissions    → save changes (server re-validates the
//                                       lockout guardrail — see server.js)

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../AuthContext';
import { useT } from '../contexts/LanguageContext';

// Matches the module ordering in the scoping doc's Section 7, so the grid
// reads the same as the document Qatar Post already has.
const MODULE_ORDER = [
    'Risk Register', 'Control Library', 'KRI Library & Register',
    'Org Roles (RACI)', 'Policy Repository', 'Compliance Obligations & Calendar',
    'Issues & Actions', 'Incident Log', 'Evidence', 'Dashboards & Tasks',
    'Risk Appetite & Scoring', 'Import / Export / Search', 'Horizon Scanning',
    'Risk Gov. Documents & Forms', 'Users & Company Admin', 'Audit',
];

const SCOPE_LABELS = { none: 'None', own: 'Own', dept: 'Department', full: 'Full' };

function NewRoleForm({ onCreate }) {
    const [name, setName] = useState('');
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState('');

    async function submit(e) {
        e.preventDefault();
        if (!name.trim()) return;
        setCreating(true); setError('');
        try {
            await onCreate(name.trim());
            setName('');
        } catch (e) {
            setError(e.message || 'Failed to create role.');
        } finally {
            setCreating(false);
        }
    }

    return (
        <form onSubmit={submit} style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', gap: 6 }}>
                <input className="form-control" placeholder="New role name" value={name}
                    onChange={(e) => { setName(e.target.value); setError(''); }}
                    style={{ flex: 1, padding: '6px 10px', fontSize: 13 }} />
                <button type="submit" className="btn btn-primary btn-sm" disabled={creating || !name.trim()}>
                    {creating ? '…' : '+ New'}
                </button>
            </div>
            {error && <div className="alert alert-error" style={{ marginTop: 6, padding: '4px 10px', fontSize: 12 }}>{error}</div>}
        </form>
    );
}

export default function RolesPermissions() {
    const { api } = useAuth();
    const t = useT();

    const [roles, setRoles] = useState([]);
    const [selectedRoleId, setSelectedRoleId] = useState(null);
    const [permissions, setPermissions] = useState([]);
    const [draft, setDraft] = useState({}); // { capability_key: scope } — pending, unsaved edits
    const [loading, setLoading] = useState(true);
    const [loadingPerms, setLoadingPerms] = useState(false);
    const [error, setError] = useState('');
    const [saveError, setSaveError] = useState('');
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [saving, setSaving] = useState(false);

    async function loadRoles(keepSelection) {
        setLoading(true); setError('');
        try {
            const data = await api.get('/roles');
            setRoles(data);
            if (!keepSelection && data.length > 0) setSelectedRoleId(data[0].id);
        } catch (e) {
            setError(e.message || 'Failed to load roles.');
        } finally {
            setLoading(false);
        }
    }

    async function loadPermissions(roleId) {
        setLoadingPerms(true); setSaveError(''); setSaveSuccess(false);
        try {
            const data = await api.get(`/roles/${roleId}/permissions`);
            setPermissions(data.permissions);
            setDraft({});
        } catch (e) {
            setError(e.message || 'Failed to load permissions.');
        } finally {
            setLoadingPerms(false);
        }
    }

    useEffect(() => { loadRoles(false); }, []);
    useEffect(() => { if (selectedRoleId != null) loadPermissions(selectedRoleId); }, [selectedRoleId]);

    async function handleCreateRole(name) {
        const created = await api.post('/roles', { name });
        await loadRoles(true);
        setSelectedRoleId(created.id);
    }

    function setScope(key, scope) {
        setDraft((d) => ({ ...d, [key]: scope }));
        setSaveSuccess(false);
    }

    function currentScope(row) {
        return draft[row.key] !== undefined ? draft[row.key] : row.scope;
    }

    const hasChanges = Object.keys(draft).length > 0;

    async function handleSave() {
        setSaving(true); setSaveError(''); setSaveSuccess(false);
        try {
            const result = await api.put(`/roles/${selectedRoleId}/permissions`, { permissions: draft });
            setPermissions(result.permissions);
            setDraft({});
            setSaveSuccess(true);
        } catch (e) {
            setSaveError(e.message || 'Failed to save changes.');
        } finally {
            setSaving(false);
        }
    }

    // Group configurable capabilities by module, in the doc's module order.
    const grouped = useMemo(() => {
        const byModule = {};
        for (const row of permissions) {
            if (row.is_baseline) continue;
            if (!byModule[row.module]) byModule[row.module] = [];
            byModule[row.module].push(row);
        }
        const orderedModules = [
            ...MODULE_ORDER.filter((m) => byModule[m]),
            ...Object.keys(byModule).filter((m) => !MODULE_ORDER.includes(m)),
        ];
        return orderedModules.map((m) => ({ module: m, rows: byModule[m] }));
    }, [permissions]);

    const baselineRows = permissions.filter((r) => r.is_baseline);
    const selectedRole = roles.find((r) => r.id === selectedRoleId);

    return (
        <div style={{ maxWidth: 1100, padding: '24px 32px' }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6, color: 'var(--text)' }}>Roles &amp; Permissions</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: 20, fontSize: 14 }}>
                Create roles and control exactly what each one can do. Saved changes take effect immediately for
                every user holding that role — no redeploy required.
            </p>

            {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

            <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
                {/* Role list */}
                <div style={{ width: 260, flexShrink: 0 }}>
                    <div className="card" style={{ padding: 16 }}>
                        <NewRoleForm onCreate={handleCreateRole} />
                        {loading ? (
                            <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: 8 }}>{t('loading')}</div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {roles.map((r) => (
                                    <button
                                        key={r.id}
                                        onClick={() => setSelectedRoleId(r.id)}
                                        style={{
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            textAlign: 'left', padding: '8px 10px', borderRadius: 6, border: 'none',
                                            cursor: 'pointer', fontSize: 13,
                                            background: r.id === selectedRoleId ? 'var(--primary-bg, #eef2ff)' : 'transparent',
                                            color: r.id === selectedRoleId ? 'var(--primary)' : 'var(--text)',
                                            fontWeight: r.id === selectedRoleId ? 600 : 400,
                                        }}
                                    >
                                        <span>{r.name}</span>
                                        {r.is_builtin && (
                                            <span style={{ fontSize: 10, color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 4, padding: '1px 5px' }}>
                                                built-in
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Permission grid */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    {!selectedRole ? (
                        <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
                            Select a role to view its permissions.
                        </div>
                    ) : loadingPerms ? (
                        <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 32 }}>{t('loading')}</div>
                    ) : (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{selectedRole.name}</h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    {saveSuccess && <span style={{ color: '#16a34a', fontSize: 13 }}>✓ Saved</span>}
                                    <button className="btn btn-primary btn-sm" disabled={!hasChanges || saving} onClick={handleSave}>
                                        {saving ? '…' : hasChanges ? `${t('save')} (${Object.keys(draft).length})` : t('save')}
                                    </button>
                                </div>
                            </div>
                            {saveError && <div className="alert alert-error" style={{ marginBottom: 12 }}>{saveError}</div>}

                            {baselineRows.length > 0 && (
                                <div className="card" style={{ padding: '12px 16px', marginBottom: 16, background: 'var(--bg)' }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                                        Always on — safety baseline, not editable
                                    </div>
                                    {baselineRows.map((row) => (
                                        <div key={row.key} style={{ fontSize: 13, color: 'var(--text-muted)', padding: '2px 0' }}>
                                            {row.label}
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                                {grouped.map(({ module, rows }) => (
                                    <div key={module}>
                                        <div style={{ padding: '8px 16px', background: 'var(--bg)', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)' }}>
                                            {module}
                                        </div>
                                        {rows.map((row) => {
                                            const scope = currentScope(row);
                                            const changed = draft[row.key] !== undefined && draft[row.key] !== row.scope;
                                            return (
                                                <div key={row.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px', borderBottom: '1px solid var(--border)', background: changed ? 'var(--primary-bg, #f0f7ff)' : 'transparent' }}>
                                                    <span style={{ fontSize: 13, color: 'var(--text)' }}>{row.label}</span>
                                                    {row.supports_scope ? (
                                                        <select className="form-control" value={scope} onChange={(e) => setScope(row.key, e.target.value)}
                                                            style={{ width: 140, padding: '4px 8px', fontSize: 13 }}>
                                                            {Object.entries(SCOPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                                                        </select>
                                                    ) : (
                                                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                                                            <input type="checkbox" checked={scope === 'full'}
                                                                onChange={(e) => setScope(row.key, e.target.checked ? 'full' : 'none')} />
                                                            {scope === 'full' ? 'Full' : 'None'}
                                                        </label>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

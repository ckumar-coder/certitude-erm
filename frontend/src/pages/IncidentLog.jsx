import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../AuthContext';

const SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];
const STATUSES   = ['Open', 'Under Investigation', 'Resolved', 'Closed'];

const SEVERITY_CLASS = {
    Low:      'badge-low',
    Medium:   'badge-medium',
    High:     'badge-high',
    Critical: 'badge-extreme',
};

const STATUS_CLASS = {
    Open:                'badge-high',
    'Under Investigation':'badge-medium',
    Resolved:            'badge-low',
    Closed:              'badge-approved',
};

const DECISION_CLASS = {
    Pending:      'badge-medium',
    Linked:       'badge-low',
    'Risk Created':'badge-low',
    Dismissed:    'badge-role',
};

const WRITE_ROLES = ['Risk Manager', 'Risk Champion', 'Risk Owner', 'CRO', 'Consultant CRO'];

const EMPTY_FORM = {
    title: '', incident_date: '', description: '',
    severity: 'Medium', status: 'Open',
    affected_dept: '', root_cause: '', action_taken: '', reported_by: '',
};

// ── Risk Picker Modal — for Option 1: Link to existing risk ──────────────────
function RiskPickerModal({ api, onSelect, onClose }) {
    const [query, setQuery]   = useState('');
    const [risks, setRisks]   = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError]   = useState('');

    useEffect(() => {
        setLoading(true);
        api.get('/risks')
            .then((data) => setRisks(Array.isArray(data) ? data : []))
            .catch((e) => setError(e.message || 'Failed to load risks'))
            .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const filtered = risks.filter((r) => {
        if (!query.trim()) return true;
        const q = query.toLowerCase();
        return (r.risk_uid || '').toLowerCase().includes(q)
            || (r.risk_detail || '').toLowerCase().includes(q)
            || (r.department || '').toLowerCase().includes(q);
    }).slice(0, 50);

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={onClose}>
            <div style={{ background: 'var(--color-card)', borderRadius: 12, padding: 24, width: '90%', maxWidth: 640, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
                onClick={(e) => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h3 style={{ margin: 0 }}>Link to Existing Risk</h3>
                    <button className="btn btn-secondary" onClick={onClose}>✕</button>
                </div>
                <input
                    className="form-control" value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by risk ID, title, or department…"
                    autoFocus
                    style={{ marginBottom: 16 }}
                />
                {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}
                <div style={{ overflowY: 'auto', flex: 1 }}>
                    {loading ? (
                        <div style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Loading risks…</div>
                    ) : filtered.length === 0 ? (
                        <div style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>No risks found.</div>
                    ) : filtered.map((r) => (
                        <div key={r.id}
                            style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 6, cursor: 'pointer', border: '1px solid var(--color-border)', transition: 'background 0.15s' }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-bg)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = ''}
                            onClick={() => onSelect(r)}>
                            <div style={{ fontWeight: 700, fontSize: 13 }}>{r.risk_uid} — {r.risk_detail}</div>
                            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                                {r.department || '—'} · {r.approval_status}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ── Dismiss Modal — for Option 3 ─────────────────────────────────────────────
function DismissModal({ onConfirm, onClose, saving }) {
    const [note, setNote] = useState('');
    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={onClose}>
            <div style={{ background: 'var(--color-card)', borderRadius: 12, padding: 24, width: '90%', maxWidth: 480 }}
                onClick={(e) => e.stopPropagation()}>
                <h3 style={{ marginTop: 0, marginBottom: 8 }}>Dismiss — No Register Entry Required</h3>
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 16 }}>
                    Provide a brief reason why no risk register entry is warranted for this incident.
                </p>
                <div className="form-group">
                    <label>Reason * <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>(min 10 characters)</span></label>
                    <textarea className="form-control" rows={3} value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="e.g. Near-miss, controls adequate — no residual risk identified" autoFocus />
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                    <button className="btn btn-danger" disabled={note.trim().length < 10 || saving}
                        onClick={() => onConfirm(note)}>
                        {saving ? 'Saving…' : 'Confirm Dismiss'}
                    </button>
                    <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
                </div>
            </div>
        </div>
    );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function IncidentLog({ onNavigate, onCreateRisk }) {
    const { api, session } = useAuth();
    const activeCompany = session.companies.find((c) => c.id === session.activeCompanyId);
    const role = activeCompany?.role;
    const canWrite = WRITE_ROLES.includes(role);

    const [incidents, setIncidents]   = useState([]);
    const [loading, setLoading]       = useState(true);
    const [error, setError]           = useState('');
    const [showForm, setShowForm]     = useState(false);
    const [editId, setEditId]         = useState(null);
    const [form, setForm]             = useState(EMPTY_FORM);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError]   = useState('');
    const [expanded, setExpanded]     = useState(null);

    // Linking modals
    const [showLinkPicker, setShowLinkPicker] = useState(null); // incident id or null
    const [showDismiss, setShowDismiss]       = useState(null); // incident id or null
    const [linkSaving, setLinkSaving]         = useState(false);
    const [dismissSaving, setDismissSaving]   = useState(false);
    const [actionError, setActionError]       = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const data = await api.get('/incidents');
            setIncidents(data);
        } catch (e) {
            setError(e.message || 'Failed to load incidents');
        } finally {
            setLoading(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => { load(); }, [load]);

    function openNew() {
        setEditId(null);
        setForm({ ...EMPTY_FORM, incident_date: new Date().toISOString().split('T')[0] });
        setFormError('');
        setShowForm(true);
    }

    function openEdit(inc) {
        setEditId(inc.id);
        setForm({
            title:         inc.title || '',
            incident_date: inc.incident_date ? String(inc.incident_date).split('T')[0] : '',
            description:   inc.description || '',
            severity:      inc.severity || 'Medium',
            status:        inc.status || 'Open',
            affected_dept: inc.affected_dept || '',
            root_cause:    inc.root_cause || '',
            action_taken:  inc.action_taken || '',
            reported_by:   inc.reported_by || '',
        });
        setFormError('');
        setShowForm(true);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (!form.title.trim()) { setFormError('Title is required'); return; }
        if (!form.incident_date)  { setFormError('Incident date is required'); return; }
        setSubmitting(true);
        setFormError('');
        try {
            if (editId) {
                await api.put(`/incidents/${editId}`, form);
            } else {
                await api.post('/incidents', form);
            }
            setShowForm(false);
            setEditId(null);
            await load();
        } catch (e) {
            setFormError(e.message || 'Failed to save incident');
        } finally {
            setSubmitting(false);
        }
    }

    async function handleDelete(id) {
        if (!window.confirm('Delete this incident? This cannot be undone.')) return;
        try {
            await api.delete(`/incidents/${id}`);
            await load();
        } catch (e) {
            setError(e.message || 'Failed to delete incident');
        }
    }

    // Option 1: link to existing risk
    async function handleLinkRisk(incidentId, risk) {
        setLinkSaving(true);
        setActionError('');
        try {
            await api.patch(`/incidents/${incidentId}/link-risk`, { risk_id: risk.id, decision: 'Linked' });
            setShowLinkPicker(null);
            await load();
        } catch (e) {
            setActionError(e.message || 'Failed to link risk');
        } finally {
            setLinkSaving(false);
        }
    }

    // Option 2: navigate to Risk Register to create a risk
    function handleCreateRisk(incidentId) {
        onCreateRisk?.(incidentId);
    }

    // Option 3: dismiss
    async function handleDismiss(incidentId, note) {
        setDismissSaving(true);
        setActionError('');
        try {
            await api.patch(`/incidents/${incidentId}/dismiss`, { dismiss_note: note });
            setShowDismiss(null);
            await load();
        } catch (e) {
            setActionError(e.message || 'Failed to dismiss incident');
        } finally {
            setDismissSaving(false);
        }
    }

    // ── Render ──────────────────────────────────────────────────────────────
    return (
        <div>
            {/* Modals */}
            {showLinkPicker !== null && (
                <RiskPickerModal
                    api={api}
                    onSelect={(risk) => handleLinkRisk(showLinkPicker, risk)}
                    onClose={() => setShowLinkPicker(null)}
                />
            )}
            {showDismiss !== null && (
                <DismissModal
                    saving={dismissSaving}
                    onConfirm={(note) => handleDismiss(showDismiss, note)}
                    onClose={() => setShowDismiss(null)}
                />
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                    <h1 className="page-title">Incident Log</h1>
                    <p className="page-subtitle">Record and track operational incidents, near-misses, and risk events.</p>
                </div>
                {canWrite && (
                    <button className="btn btn-primary" onClick={openNew}>+ Log Incident</button>
                )}
            </div>

            {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}
            {actionError && <div className="alert alert-error" style={{ marginBottom: 16 }}>{actionError}</div>}

            {/* ── Form ──────────────────────────────────────────────────────── */}
            {showForm && (
                <div className="card" style={{ marginBottom: 24, padding: 24 }}>
                    <h3 style={{ marginTop: 0, marginBottom: 20 }}>
                        {editId ? 'Edit Incident' : 'Log New Incident'}
                    </h3>
                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                <label>Incident Title <span style={{ color: '#e53935' }}>*</span></label>
                                <input className="form-control" value={form.title}
                                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                                    placeholder="Brief description of the incident" />
                            </div>
                            <div className="form-group">
                                <label>Incident Date <span style={{ color: '#e53935' }}>*</span></label>
                                <input type="date" className="form-control" value={form.incident_date}
                                    onChange={(e) => setForm((f) => ({ ...f, incident_date: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label>Reported By</label>
                                <input className="form-control" value={form.reported_by}
                                    onChange={(e) => setForm((f) => ({ ...f, reported_by: e.target.value }))}
                                    placeholder="Name or email" />
                            </div>
                            <div className="form-group">
                                <label>Severity</label>
                                <select className="form-control" value={form.severity} onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))}>
                                    {SEVERITIES.map((s) => <option key={s}>{s}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Status</label>
                                <select className="form-control" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                                    {STATUSES.map((s) => <option key={s}>{s}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Affected Department</label>
                                <input className="form-control" value={form.affected_dept}
                                    onChange={(e) => setForm((f) => ({ ...f, affected_dept: e.target.value }))}
                                    placeholder="e.g. IT, Finance, Operations" />
                            </div>
                            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                <label>Description</label>
                                <textarea className="form-control" rows={3} value={form.description}
                                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                                    placeholder="What happened? Include timeline if known." />
                            </div>
                            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                <label>Root Cause</label>
                                <textarea className="form-control" rows={2} value={form.root_cause}
                                    onChange={(e) => setForm((f) => ({ ...f, root_cause: e.target.value }))}
                                    placeholder="Identified or suspected root cause" />
                            </div>
                            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                <label>Action Taken / Remediation</label>
                                <textarea className="form-control" rows={2} value={form.action_taken}
                                    onChange={(e) => setForm((f) => ({ ...f, action_taken: e.target.value }))}
                                    placeholder="Steps taken to address the incident" />
                            </div>
                        </div>
                        {formError && <div className="alert alert-error" style={{ marginBottom: 12 }}>{formError}</div>}
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button type="submit" className="btn btn-primary" disabled={submitting}>
                                {submitting ? 'Saving…' : (editId ? 'Save Changes' : 'Log Incident')}
                            </button>
                            <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)} disabled={submitting}>
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* ── Table ─────────────────────────────────────────────────────── */}
            {loading ? (
                <div className="card">Loading…</div>
            ) : incidents.length === 0 ? (
                <div className="card text-muted">No incidents logged yet.</div>
            ) : (
                <div className="card" style={{ padding: 0 }}>
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Date</th>
                                <th>Title</th>
                                <th>Severity</th>
                                <th>Status</th>
                                <th>Affected Dept</th>
                                <th>Register Decision</th>
                                {canWrite && <th></th>}
                            </tr>
                        </thead>
                        <tbody>
                            {incidents.map((inc) => {
                                const isDismissed = inc.register_decision === 'Dismissed';
                                return (
                                    <>
                                        <tr
                                            key={inc.id}
                                            style={{ cursor: 'pointer', opacity: isDismissed ? 0.55 : 1 }}
                                            onClick={() => setExpanded(expanded === inc.id ? null : inc.id)}
                                        >
                                            <td><strong>{inc.incident_uid}</strong></td>
                                            <td>{inc.incident_date ? String(inc.incident_date).split('T')[0] : '—'}</td>
                                            <td style={{ textDecoration: isDismissed ? 'line-through' : 'none' }}>{inc.title}</td>
                                            <td><span className={`badge ${SEVERITY_CLASS[inc.severity] || 'badge-medium'}`}>{inc.severity}</span></td>
                                            <td><span className={`badge ${STATUS_CLASS[inc.status] || 'badge-medium'}`}>{inc.status}</span></td>
                                            <td>{inc.affected_dept || '—'}</td>
                                            <td>
                                                <span className={`badge ${DECISION_CLASS[inc.register_decision] || 'badge-medium'}`}>
                                                    {inc.register_decision || 'Pending'}
                                                </span>
                                                {inc.linked_risk_uid && (
                                                    <span style={{ fontSize: 11, marginLeft: 6, color: 'var(--color-primary)', fontWeight: 600 }}>
                                                        {inc.linked_risk_uid}
                                                    </span>
                                                )}
                                            </td>
                                            {canWrite && (
                                                <td style={{ whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                                                    <button className="btn btn-sm btn-secondary" onClick={() => openEdit(inc)} style={{ marginRight: 6 }}>Edit</button>
                                                    {(role === 'Risk Manager' || role === 'CRO' || role === 'Consultant CRO') && (
                                                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(inc.id)}>Delete</button>
                                                    )}
                                                </td>
                                            )}
                                        </tr>
                                        {expanded === inc.id && (
                                            <tr key={`${inc.id}-detail`}>
                                                <td colSpan={canWrite ? 8 : 7} style={{ background: 'var(--color-bg)', padding: '16px 20px' }}>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
                                                        {inc.description && (
                                                            <div style={{ gridColumn: '1 / -1' }}>
                                                                <div className="text-muted" style={{ fontSize: 12, marginBottom: 4 }}>Description</div>
                                                                <div style={{ whiteSpace: 'pre-wrap' }}>{inc.description}</div>
                                                            </div>
                                                        )}
                                                        {inc.root_cause && (
                                                            <div>
                                                                <div className="text-muted" style={{ fontSize: 12, marginBottom: 4 }}>Root Cause</div>
                                                                <div style={{ whiteSpace: 'pre-wrap' }}>{inc.root_cause}</div>
                                                            </div>
                                                        )}
                                                        {inc.action_taken && (
                                                            <div>
                                                                <div className="text-muted" style={{ fontSize: 12, marginBottom: 4 }}>Action Taken</div>
                                                                <div style={{ whiteSpace: 'pre-wrap' }}>{inc.action_taken}</div>
                                                            </div>
                                                        )}
                                                        <div>
                                                            <div className="text-muted" style={{ fontSize: 12, marginBottom: 4 }}>Reported By / Logged</div>
                                                            <div>{inc.reported_by || '—'}</div>
                                                            <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                                                                {inc.created_at ? new Date(inc.created_at).toLocaleDateString() : ''}
                                                                {inc.created_by ? ` by ${inc.created_by}` : ''}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Linked risk info */}
                                                    {inc.linked_risk_uid && (
                                                        <div style={{ marginBottom: 16, padding: '10px 14px', background: '#ECFDF5', borderRadius: 8, border: '1px solid #6EE7B7', fontSize: 13 }}>
                                                            <span style={{ fontWeight: 700 }}>Linked Risk:</span>{' '}
                                                            <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{inc.linked_risk_uid}</span>
                                                            {inc.linked_risk_detail && <> — {inc.linked_risk_detail}</>}
                                                            {' '}
                                                            <span className={`badge ${DECISION_CLASS[inc.register_decision]}`}>{inc.register_decision}</span>
                                                        </div>
                                                    )}

                                                    {/* Dismiss note */}
                                                    {inc.dismiss_note && (
                                                        <div style={{ marginBottom: 16, padding: '10px 14px', background: 'var(--color-card)', borderRadius: 8, border: '1px solid var(--color-border)', fontSize: 13 }}>
                                                            <span style={{ fontWeight: 700, color: 'var(--color-text-muted)' }}>Dismissed — </span>
                                                            {inc.dismiss_note}
                                                        </div>
                                                    )}

                                                    {/* Register Decision action panel — only if pending and canWrite */}
                                                    {canWrite && (!inc.register_decision || inc.register_decision === 'Pending') && (
                                                        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 14 }}>
                                                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                                Register Decision
                                                            </div>
                                                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                                                <button
                                                                    className="btn btn-secondary"
                                                                    style={{ fontSize: 12 }}
                                                                    onClick={(e) => { e.stopPropagation(); setActionError(''); setShowLinkPicker(inc.id); }}
                                                                >
                                                                    🔗 Link to Existing Risk
                                                                </button>
                                                                <button
                                                                    className="btn btn-secondary"
                                                                    style={{ fontSize: 12 }}
                                                                    onClick={(e) => { e.stopPropagation(); handleCreateRisk(inc.id); }}
                                                                >
                                                                    ➕ Create Risk in Register
                                                                </button>
                                                                <button
                                                                    className="btn btn-secondary"
                                                                    style={{ fontSize: 12, color: '#6B7280' }}
                                                                    onClick={(e) => { e.stopPropagation(); setActionError(''); setShowDismiss(inc.id); }}
                                                                >
                                                                    ✕ Dismiss — No Entry Required
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        )}
                                    </>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

/**
 * ConsultantDashboard — Phase 6: Consultant Benchmarking Layer UI
 *
 * Platform-level page (gated on is_consultant, not company role).
 * Three tabs:
 *   Sources    — registered benchmark sources; toggle active/inactive
 *   Queue      — ingestion items awaiting consultant review (approve/reject)
 *   Benchmarks — approved external benchmark data with pillar/sector filters
 */
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';

// ── Shared helpers ────────────────────────────────────────────────────────────

function fmt(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-CA');
}

function confidenceBadge(score) {
    const pct = Math.round(score * 100);
    const colour = score >= 0.85 ? '#15803d'
                 : score >= 0.6  ? '#92400e'
                 : '#991b1b';
    return (
        <span style={{
            display: 'inline-block', padding: '2px 8px', borderRadius: 12,
            fontSize: 12, fontWeight: 600, background: '#f3f4f6', color: colour,
        }}>
            {pct}%
        </span>
    );
}

function FreqSevBadge({ value }) {
    if (!value) return <span style={{ color: 'var(--color-text-muted)' }}>—</span>;
    const colour = value === 'High' ? '#991b1b' : value === 'Medium' ? '#92400e' : '#15803d';
    return (
        <span style={{
            display: 'inline-block', padding: '2px 8px', borderRadius: 12,
            fontSize: 12, fontWeight: 600, background: '#f3f4f6', color: colour,
        }}>
            {value}
        </span>
    );
}

function EmptyState({ message }) {
    return (
        <div style={{
            textAlign: 'center', padding: '48px 0',
            color: 'var(--color-text-muted)', fontSize: 14,
        }}>
            {message}
        </div>
    );
}

// ── Sources tab ───────────────────────────────────────────────────────────────

function SourcesTab({ api }) {
    const [sources, setSources]   = useState([]);
    const [loading, setLoading]   = useState(true);
    const [error, setError]       = useState(null);
    const [toggling, setToggling] = useState(null); // source id currently being toggled

    const load = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const rows = await api.get('/consultant/sources');
            setSources(rows);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [api]);

    useEffect(() => { load(); }, [load]);

    async function toggleActive(src) {
        setToggling(src.id);
        try {
            await api.patch(`/consultant/sources/${src.id}`, { is_active: !src.is_active });
            setSources((prev) =>
                prev.map((s) => s.id === src.id ? { ...s, is_active: !s.is_active } : s)
            );
        } catch (e) {
            alert(`Failed to update source: ${e.message}`);
        } finally {
            setToggling(null);
        }
    }

    if (loading) return <div className="text-muted" style={{ padding: 24 }}>Loading sources…</div>;
    if (error)   return <div className="error-message" style={{ margin: 16 }}>{error}</div>;
    if (!sources.length) return <EmptyState message="No benchmark sources registered." />;

    return (
        <div>
            <p className="text-muted" style={{ marginBottom: 16, fontSize: 13 }}>
                {sources.filter((s) => s.is_active).length} of {sources.length} sources active.
                Toggle a source off to exclude it from future ingestion runs without losing history.
            </p>
            <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ minWidth: 800 }}>
                    <thead>
                        <tr>
                            <th>Source</th>
                            <th>Organisation</th>
                            <th>Format</th>
                            <th>Frequency</th>
                            <th>Pillars</th>
                            <th>Sectors</th>
                            <th>Last Fetched</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sources.map((s) => (
                            <tr key={s.id} style={{ opacity: s.is_active ? 1 : 0.55 }}>
                                <td>
                                    <a href={s.url} target="_blank" rel="noreferrer"
                                       style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>
                                        {s.name}
                                    </a>
                                </td>
                                <td>{s.organisation}</td>
                                <td>{s.format}</td>
                                <td>{s.publication_frequency}</td>
                                <td style={{ fontSize: 12 }}>{(s.pillar_coverage || []).join(', ') || '—'}</td>
                                <td style={{ fontSize: 12 }}>{(s.sector_coverage || []).join(', ') || '—'}</td>
                                <td>{fmt(s.last_fetched_at)}</td>
                                <td>
                                    <button
                                        className={`btn btn-sm ${s.is_active ? 'btn-secondary' : 'btn-primary'}`}
                                        disabled={toggling === s.id}
                                        onClick={() => toggleActive(s)}
                                        style={{ minWidth: 72 }}
                                    >
                                        {toggling === s.id ? '…' : s.is_active ? 'Disable' : 'Enable'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ── Review Queue tab ──────────────────────────────────────────────────────────

const REJECTION_REASONS = [
    'Wrong pillar',
    'Wrong sector',
    'Insufficient evidence',
    'Not applicable to our markets',
    'Duplicate',
];

function QueueTab({ api }) {
    const [items, setItems]         = useState([]);
    const [loading, setLoading]     = useState(true);
    const [error, setError]         = useState(null);
    const [statusFilter, setStatus] = useState('pending');
    const [expanded, setExpanded]   = useState(null); // item id with expanded raw extract
    const [acting, setActing]       = useState(null); // item id being actioned
    const [rejectTarget, setRejectTarget] = useState(null); // { id } awaiting reason
    const [rejectReason, setRejectReason] = useState('');

    const load = useCallback(async (status) => {
        setLoading(true); setError(null);
        try {
            const rows = await api.get(`/consultant/queue?status=${status}`);
            setItems(rows);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [api]);

    useEffect(() => { load(statusFilter); }, [load, statusFilter]);

    async function approve(id) {
        setActing(id);
        try {
            await api.patch(`/consultant/queue/${id}`, { action: 'approve' });
            setItems((prev) => prev.filter((i) => i.id !== id));
        } catch (e) {
            alert(`Approve failed: ${e.message}`);
        } finally {
            setActing(null);
        }
    }

    async function submitReject() {
        if (!rejectReason) return;
        const id = rejectTarget.id;
        setActing(id);
        try {
            await api.patch(`/consultant/queue/${id}`, { action: 'reject', rejection_reason: rejectReason });
            setItems((prev) => prev.filter((i) => i.id !== id));
            setRejectTarget(null);
            setRejectReason('');
        } catch (e) {
            alert(`Reject failed: ${e.message}`);
        } finally {
            setActing(null);
        }
    }

    return (
        <div>
            {/* Status filter */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {['pending', 'approved', 'rejected'].map((s) => (
                    <button
                        key={s}
                        className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => { setStatus(s); setExpanded(null); }}
                    >
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                ))}
            </div>

            {loading && <div className="text-muted" style={{ padding: 24 }}>Loading queue…</div>}
            {error   && <div className="error-message" style={{ margin: 16 }}>{error}</div>}

            {!loading && !error && items.length === 0 && (
                <EmptyState message={
                    statusFilter === 'pending'
                        ? 'No items awaiting review. Run the ingestion pipeline to populate the queue.'
                        : `No ${statusFilter} items.`
                } />
            )}

            {!loading && !error && items.length > 0 && (
                <>
                    {statusFilter === 'pending' && (
                        <p className="text-muted" style={{ marginBottom: 12, fontSize: 13 }}>
                            {items.length} item{items.length !== 1 ? 's' : ''} awaiting review
                            (confidence 60–85%). High-confidence items were auto-approved.
                        </p>
                    )}
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table" style={{ minWidth: 900 }}>
                            <thead>
                                <tr>
                                    <th>Source</th>
                                    <th>Pillar</th>
                                    <th>Sector</th>
                                    <th>Risk Theme</th>
                                    <th>Freq</th>
                                    <th>Sev</th>
                                    <th>Confidence</th>
                                    <th>Period</th>
                                    <th>Pg</th>
                                    {statusFilter === 'pending' && <th style={{ minWidth: 160 }}>Actions</th>}
                                    {statusFilter !== 'pending' && <th>Reviewed</th>}
                                    {statusFilter === 'rejected' && <th>Reason</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item) => (
                                    <>
                                        <tr key={item.id}
                                            style={{ cursor: item.raw_extract ? 'pointer' : 'default' }}
                                            onClick={() => item.raw_extract && setExpanded(expanded === item.id ? null : item.id)}
                                        >
                                            <td style={{ fontSize: 12 }}>
                                                <span title={item.organisation}>{item.source_name}</span>
                                            </td>
                                            <td>{item.pillar}</td>
                                            <td style={{ fontSize: 12 }}>{item.sector}</td>
                                            <td style={{ maxWidth: 260, fontSize: 13 }}>{item.risk_theme}</td>
                                            <td><FreqSevBadge value={item.frequency} /></td>
                                            <td><FreqSevBadge value={item.severity} /></td>
                                            <td>{confidenceBadge(item.confidence_score)}</td>
                                            <td style={{ fontSize: 12 }}>{item.period || '—'}</td>
                                            <td style={{ fontSize: 12 }}>{item.page_reference || '—'}</td>
                                            {statusFilter === 'pending' && (
                                                <td onClick={(e) => e.stopPropagation()}>
                                                    <div style={{ display: 'flex', gap: 6 }}>
                                                        <button
                                                            className="btn btn-sm btn-primary"
                                                            disabled={acting === item.id}
                                                            onClick={() => approve(item.id)}
                                                        >
                                                            {acting === item.id ? '…' : 'Approve'}
                                                        </button>
                                                        <button
                                                            className="btn btn-sm btn-secondary"
                                                            disabled={acting === item.id}
                                                            onClick={() => {
                                                                setRejectTarget(item);
                                                                setRejectReason('');
                                                            }}
                                                        >
                                                            Reject
                                                        </button>
                                                    </div>
                                                </td>
                                            )}
                                            {statusFilter !== 'pending' && (
                                                <td style={{ fontSize: 12 }}>{fmt(item.reviewed_at)}</td>
                                            )}
                                            {statusFilter === 'rejected' && (
                                                <td style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                                                    {item.rejection_reason || '—'}
                                                </td>
                                            )}
                                        </tr>
                                        {expanded === item.id && item.raw_extract && (
                                            <tr key={`${item.id}-extract`}>
                                                <td colSpan={statusFilter === 'pending' ? 10 : statusFilter === 'rejected' ? 11 : 10}
                                                    style={{
                                                        background: 'var(--color-bg)',
                                                        padding: '12px 16px',
                                                        fontSize: 13,
                                                        fontStyle: 'italic',
                                                        color: 'var(--color-text-muted)',
                                                        borderTop: 'none',
                                                    }}
                                                >
                                                    <strong style={{ fontStyle: 'normal', color: 'var(--color-text)' }}>
                                                        Source extract:
                                                    </strong>{' '}
                                                    {item.raw_extract}
                                                </td>
                                            </tr>
                                        )}
                                    </>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {/* Reject modal */}
            {rejectTarget && (
                <div className="modal-overlay" onClick={() => setRejectTarget(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}
                         style={{ maxWidth: 440 }}>
                        <h3 style={{ marginTop: 0 }}>Reject item</h3>
                        <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                            <em>"{rejectTarget.risk_theme}"</em>
                        </p>
                        <label className="form-label">Reason</label>
                        <select
                            className="form-control"
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                        >
                            <option value="">Select a reason…</option>
                            {REJECTION_REASONS.map((r) => (
                                <option key={r} value={r}>{r}</option>
                            ))}
                        </select>
                        <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
                            <button className="btn btn-secondary" onClick={() => setRejectTarget(null)}>
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary"
                                disabled={!rejectReason || acting === rejectTarget.id}
                                onClick={submitReject}
                            >
                                {acting === rejectTarget.id ? 'Rejecting…' : 'Confirm Reject'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Benchmarks tab ────────────────────────────────────────────────────────────

const PILLARS = ['Strategic', 'Governance', 'Finance', 'IT', 'Compliance', 'Operations', 'BCM', 'Security'];

function BenchmarksTab({ api }) {
    const [items, setItems]       = useState([]);
    const [loading, setLoading]   = useState(true);
    const [error, setError]       = useState(null);
    const [pillar, setPillar]     = useState('');
    const [sector, setSector]     = useState('');
    const [period, setPeriod]     = useState('');

    const load = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const params = new URLSearchParams();
            if (pillar) params.set('pillar', pillar);
            if (sector) params.set('sector', sector);
            if (period) params.set('period', period);
            const qs = params.toString();
            const rows = await api.get(`/consultant/benchmarks${qs ? `?${qs}` : ''}`);
            setItems(rows);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [api, pillar, sector, period]);

    useEffect(() => { load(); }, [load]);

    // Derive unique sectors from returned data for the sector filter dropdown
    const sectors = [...new Set(items.map((i) => i.sector))].sort();

    return (
        <div>
            {/* Filters */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div>
                    <label className="form-label" style={{ marginBottom: 4, display: 'block' }}>Pillar</label>
                    <select className="form-control" style={{ minWidth: 140 }}
                            value={pillar} onChange={(e) => setPillar(e.target.value)}>
                        <option value="">All pillars</option>
                        {PILLARS.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>
                <div>
                    <label className="form-label" style={{ marginBottom: 4, display: 'block' }}>Sector</label>
                    <select className="form-control" style={{ minWidth: 160 }}
                            value={sector} onChange={(e) => setSector(e.target.value)}>
                        <option value="">All sectors</option>
                        {sectors.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div>
                    <label className="form-label" style={{ marginBottom: 4, display: 'block' }}>Period</label>
                    <input className="form-control" style={{ minWidth: 100 }}
                           placeholder="e.g. 2025"
                           value={period} onChange={(e) => setPeriod(e.target.value)} />
                </div>
                {(pillar || sector || period) && (
                    <button className="btn btn-sm btn-secondary"
                            style={{ alignSelf: 'flex-end' }}
                            onClick={() => { setPillar(''); setSector(''); setPeriod(''); }}>
                        Clear filters
                    </button>
                )}
            </div>

            {loading && <div className="text-muted" style={{ padding: 24 }}>Loading benchmarks…</div>}
            {error   && <div className="error-message" style={{ margin: 16 }}>{error}</div>}

            {!loading && !error && items.length === 0 && (
                <EmptyState message="No approved benchmark data yet. Approve items from the Review Queue to populate this view." />
            )}

            {!loading && !error && items.length > 0 && (
                <>
                    <p className="text-muted" style={{ marginBottom: 12, fontSize: 13 }}>
                        {items.length} approved data point{items.length !== 1 ? 's' : ''}
                        {pillar || sector ? ' (filtered)' : ''}.
                    </p>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table" style={{ minWidth: 860 }}>
                            <thead>
                                <tr>
                                    <th>Source</th>
                                    <th>Pillar</th>
                                    <th>Sector</th>
                                    <th>Risk Theme</th>
                                    <th>Frequency</th>
                                    <th>Severity</th>
                                    <th>Confidence</th>
                                    <th>Period</th>
                                    <th>Page</th>
                                    <th>Approved</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item) => (
                                    <tr key={item.id}>
                                        <td style={{ fontSize: 12 }}>
                                            <span title={item.organisation}>{item.source_name}</span>
                                        </td>
                                        <td>{item.pillar}</td>
                                        <td style={{ fontSize: 12 }}>{item.sector}</td>
                                        <td style={{ maxWidth: 280, fontSize: 13 }}>{item.risk_theme}</td>
                                        <td><FreqSevBadge value={item.frequency} /></td>
                                        <td><FreqSevBadge value={item.severity} /></td>
                                        <td>{confidenceBadge(item.confidence_score)}</td>
                                        <td style={{ fontSize: 12 }}>{item.period || '—'}</td>
                                        <td style={{ fontSize: 12 }}>{item.page_reference || '—'}</td>
                                        <td style={{ fontSize: 12 }}>{fmt(item.approved_at)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const TABS = [
    { id: 'sources',    label: 'Benchmark Sources' },
    { id: 'queue',      label: 'Review Queue'       },
    { id: 'benchmarks', label: 'Benchmark Data'     },
];

export default function ConsultantDashboard() {
    const { api } = useAuth();
    const [tab, setTab] = useState('sources');

    return (
        <div>
            <div style={{ marginBottom: 20 }}>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Consultant Dashboard</h2>
                <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
                    Platform-level intelligence layer — benchmark sources, ingestion review queue, and approved data.
                </p>
            </div>

            {/* Tab bar */}
            <div style={{
                display: 'flex', gap: 0, marginBottom: 20,
                borderBottom: '2px solid var(--color-border)',
            }}>
                {TABS.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        style={{
                            background: 'none', border: 'none', padding: '8px 20px',
                            fontSize: 14, fontWeight: 600, cursor: 'pointer',
                            color: tab === t.id ? 'var(--color-primary)' : 'var(--color-text-muted)',
                            borderBottom: tab === t.id ? '2px solid var(--color-primary)' : '2px solid transparent',
                            marginBottom: -2,
                        }}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            <div className="card">
                {tab === 'sources'    && <SourcesTab    api={api} />}
                {tab === 'queue'      && <QueueTab      api={api} />}
                {tab === 'benchmarks' && <BenchmarksTab api={api} />}
            </div>
        </div>
    );
}

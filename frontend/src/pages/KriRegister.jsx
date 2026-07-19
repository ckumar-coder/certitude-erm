import { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { useT } from '../contexts/LanguageContext';

const RAG_STYLES = {
    Green: { background: '#e8f5e9', color: '#1b5e20', border: '1px solid #a5d6a7' },
    Amber: { background: '#fff8e1', color: '#e65100', border: '1px solid #ffcc80' },
    Red:   { background: '#ffebee', color: '#b71c1c', border: '1px solid #ef9a9a' },
};

const RAG_OPTIONS = [
    { value: 'Green', label: '🟢 Green — No breach, within tolerance' },
    { value: 'Amber', label: '🟡 Amber — Approaching threshold, monitor closely' },
    { value: 'Red',   label: '🔴 Red — Threshold breached, action required' },
];

function ragEmoji(rag) {
    if (rag === 'Green') return '🟢';
    if (rag === 'Amber') return '🟡';
    if (rag === 'Red')   return '🔴';
    return '⚪';
}

function formatDateTime(isoStr) {
    if (!isoStr) return '—';
    const d = new Date(isoStr);
    return d.toLocaleDateString('en-CA') + ' ' + d.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' });
}

// Inline measurement form shown inside the expanded row
function InlineMeasurementForm({ kri, onDone, onError, api }) {
    const [submitting, setSubmitting] = useState(false);
    const [measurementDate, setMeasurementDate] = useState(new Date().toISOString().slice(0, 10));
    const [reportingPeriod, setReportingPeriod] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
    const [value, setValue] = useState('');
    const [ragStatus, setRagStatus] = useState('');
    const [notes, setNotes] = useState('');

    async function handleSubmit(e) {
        e.preventDefault();
        setSubmitting(true);
        onError('');
        try {
            await api.post(`/kris/${kri.id}/measurements`, {
                measurement_date: measurementDate,
                value: Number(value),
                rag_status: ragStatus || null,
                notes: notes || null,
                reporting_period: reportingPeriod || null,
            });
            onDone();
        } catch (err) {
            onError(err.message || 'Failed to record measurement');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 8, padding: 16, marginTop: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 14 }}>Record New Measurement</div>
            {kri.threshold_bands && kri.threshold_bands.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                    {kri.threshold_bands.map((b, i) => (
                        <span key={i} style={{ padding: '3px 10px', borderRadius: 5, fontSize: 11, fontWeight: 600, ...RAG_STYLES[b.rag] }}>
                            {ragEmoji(b.rag)} {b.label || `${b.min ?? ''}–${b.max ?? ''}`}
                        </span>
                    ))}
                </div>
            )}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div>
                    <label style={{ fontSize: 12, display: 'block', marginBottom: 3 }}>Reporting Period</label>
                    <input className="form-control" style={{ width: 120 }} value={reportingPeriod} onChange={(e) => setReportingPeriod(e.target.value)} placeholder="2026-06" />
                </div>
                <div>
                    <label style={{ fontSize: 12, display: 'block', marginBottom: 3 }}>Measurement Date</label>
                    <input type="date" className="form-control" style={{ width: 150 }} value={measurementDate} onChange={(e) => setMeasurementDate(e.target.value)} required />
                </div>
                <div>
                    <label style={{ fontSize: 12, display: 'block', marginBottom: 3 }}>Value</label>
                    <input type="number" step="any" className="form-control" style={{ width: 100 }} value={value} onChange={(e) => setValue(e.target.value)} required />
                </div>
                <div>
                    <label style={{ fontSize: 12, display: 'block', marginBottom: 3 }}>RAG Status</label>
                    <select
                        className="form-control"
                        style={{ width: 220, ...(ragStatus ? RAG_STYLES[ragStatus] : {}) }}
                        value={ragStatus}
                        onChange={(e) => setRagStatus(e.target.value)}
                    >
                        <option value="">— Select —</option>
                        {RAG_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>
                <div style={{ flex: 1, minWidth: 180 }}>
                    <label style={{ fontSize: 12, display: 'block', marginBottom: 3 }}>Notes</label>
                    <input className="form-control" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Context for this period…" />
                </div>
                <button type="submit" className="btn btn-primary btn-sm" disabled={submitting} style={{ whiteSpace: 'nowrap' }}>
                    {submitting ? 'Saving…' : 'Save'}
                </button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={onDone}>Cancel</button>
            </div>
        </form>
    );
}

export default function KriRegister() {
    const { api, session } = useAuth();
    const t = useT();
    const activeCompany = session.companies.find((c) => c.id === session.activeCompanyId);
    const isBuMode = !!activeCompany?.has_business_units;
    const [data, setData] = useState(null);
    const [allDepartments, setAllDepartments] = useState([]);
    const [allBus, setAllBus] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [expandedId, setExpandedId] = useState(null);
    const [recordingId, setRecordingId] = useState(null);

    // Filters
    const [search, setSearch] = useState('');
    const [filterDept, setFilterDept] = useState('');
    const [filterRag, setFilterRag] = useState('');
    const [filterOverdue, setFilterOverdue] = useState(false);

    async function load() {
        setLoading(true);
        setError('');
        try {
            const [kriData, depts, bus] = await Promise.all([
                api.get('/kri-register'),
                api.get('/departments').catch(() => []),
                isBuMode ? api.get('/business-units').catch(() => []) : Promise.resolve([]),
            ]);
            setData(kriData);
            setAllDepartments(depts || []);
            setAllBus(bus || []);
        } catch (e) {
            setError(e.message || 'Failed to load KRI Register');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

    const kris = data?.kris || [];
    const summary = data?.summary || {};

    const departments = [...new Set(kris.map((k) => k.department).filter(Boolean))].sort();

    const filtered = kris.filter((k) => {
        if (filterOverdue && !k.is_overdue) return false;
        if (filterDept && k.department !== filterDept) return false;
        const rag = k.current_rag || k.band;
        if (filterRag) {
            if (filterRag === 'None' && rag) return false;
            if (filterRag !== 'None' && rag !== filterRag) return false;
        }
        if (search) {
            const q = search.toLowerCase();
            return k.kri_uid.toLowerCase().includes(q) ||
                   k.name.toLowerCase().includes(q) ||
                   (k.owner || '').toLowerCase().includes(q);
        }
        return true;
    });

    return (
        <div>
            {/* Page header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                    <h1 className="page-title">{t('kri_register_title')}</h1>
                    <p className="page-subtitle">{t('kri_register_subtitle')}</p>
                </div>
                <button className="btn btn-secondary" onClick={load}>↻ Refresh</button>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            {/* RAG summary bar */}
            {!loading && data && (
                <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
                    {[
                        { label: '🔴 Red', key: 'Red', style: RAG_STYLES.Red },
                        { label: '🟡 Amber', key: 'Amber', style: RAG_STYLES.Amber },
                        { label: '🟢 Green', key: 'Green', style: RAG_STYLES.Green },
                        { label: '⚪ No Data', key: 'None', style: { background: 'var(--color-surface)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' } },
                        { label: '⚠ Overdue', key: 'overdue', style: { background: '#fff3e0', color: '#e65100', border: '1px solid #ffcc80' } },
                    ].map(({ label, key, style }) => (
                        <div
                            key={key}
                            onClick={() => {
                                if (key === 'overdue') setFilterOverdue((v) => !v);
                                else setFilterRag((v) => v === key ? '' : key);
                            }}
                            style={{
                                ...style,
                                padding: '8px 16px',
                                borderRadius: 8,
                                cursor: 'pointer',
                                fontWeight: 700,
                                fontSize: 13,
                                opacity: (key === 'overdue' ? filterOverdue : filterRag === key) ? 1 : 0.75,
                                outline: (key === 'overdue' ? filterOverdue : filterRag === key) ? '2px solid currentColor' : 'none',
                                outlineOffset: 2,
                            }}
                        >
                            {label}: <span style={{ fontSize: 18 }}>{summary[key] ?? 0}</span>
                        </div>
                    ))}
                    <div style={{ marginLeft: 'auto', color: 'var(--color-text-muted)', fontSize: 13, alignSelf: 'center' }}>
                        {kris.length} KRI{kris.length !== 1 ? 's' : ''} total
                    </div>
                </div>
            )}

            {/* Filter bar */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
                <input
                    className="form-control"
                    style={{ width: 220 }}
                    placeholder="Search KRI ID, name, owner…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <select className="form-control" style={{ width: 180 }} value={filterDept} onChange={(e) => setFilterDept(e.target.value)}>
                    <option value="">All Departments</option>
                    {departments.map((code) => {
                        const dept = allDepartments.find((d) => d.code === code || d.name === code);
                        return <option key={code} value={code}>{dept ? dept.name : code}</option>;
                    })}
                </select>
                <select className="form-control" style={{ width: 160 }} value={filterRag} onChange={(e) => setFilterRag(e.target.value)}>
                    <option value="">All RAG Statuses</option>
                    <option value="Red">🔴 Red</option>
                    <option value="Amber">🟡 Amber</option>
                    <option value="Green">🟢 Green</option>
                    <option value="None">⚪ No Data</option>
                </select>
                {(search || filterDept || filterRag || filterOverdue) && (
                    <button className="btn btn-secondary btn-sm" onClick={() => { setSearch(''); setFilterDept(''); setFilterRag(''); setFilterOverdue(false); }}>
                        Clear filters
                    </button>
                )}
            </div>

            {loading ? (
                <div className="card">{t('loading')}</div>
            ) : filtered.length === 0 ? (
                <div className="card text-muted">No KRIs match the current filters.</div>
            ) : (
                <div className="card" style={{ padding: 0 }}>
                    <table>
                        <thead>
                            <tr>
                                <th>KRI</th>
                                <th>Owner</th>
                                <th>Business Unit</th>
                                <th>Department</th>
                                <th>Frequency</th>
                                <th>Current Status</th>
                                <th>Current Value</th>
                                <th>Last Updated</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((k) => {
                                const rag = k.current_rag || k.band;
                                const isExpanded = expandedId === k.id;
                                const isRecording = recordingId === k.id;

                                return (
                                    <>
                                        <tr
                                            key={k.id}
                                            style={{ cursor: 'pointer', background: isExpanded ? 'var(--color-surface)' : undefined }}
                                            onClick={() => { setExpandedId(isExpanded ? null : k.id); setRecordingId(null); }}
                                        >
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <strong>{k.kri_uid}</strong>
                                                    {k.is_overdue && (
                                                        <span style={{ background: '#fff3e0', color: '#e65100', border: '1px solid #ffcc80', borderRadius: 4, fontSize: 11, fontWeight: 700, padding: '1px 6px' }}>⚠ Overdue</span>
                                                    )}
                                                </div>
                                                <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{k.name}</div>
                                            </td>
                                            <td>{k.owner || '—'}</td>
                                            {(() => {
                                                const dept = allDepartments.find((d) => d.code === k.department || d.name === k.department);
                                                const bu = isBuMode && dept ? allBus.find((b) => b.id === dept.business_unit_id) : null;
                                                return <td className="text-muted">{bu ? bu.name : (dept ? dept.name : (k.department || 'Enterprise-wide'))}</td>;
                                            })()}
                                            <td className="text-muted">{allDepartments.find((d) => d.code === k.department || d.name === k.department)?.name || k.department || 'Enterprise-wide'}</td>
                                            <td className="text-muted">{k.measurement_frequency}</td>
                                            <td>
                                                {rag ? (
                                                    <span style={{ padding: '3px 10px', borderRadius: 5, fontSize: 12, fontWeight: 700, ...RAG_STYLES[rag] }}>
                                                        {ragEmoji(rag)} {rag}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted" style={{ fontSize: 12 }}>No data</span>
                                                )}
                                            </td>
                                            <td style={{ fontWeight: 600 }}>{k.current_value ?? '—'}</td>
                                            <td className="text-muted" style={{ fontSize: 12 }}>
                                                {k.last_measurement_date
                                                    ? new Date(k.last_measurement_date).toLocaleDateString('en-CA')
                                                    : <em>Never</em>}
                                            </td>
                                            <td onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    className="btn btn-sm btn-primary"
                                                    onClick={() => { setExpandedId(k.id); setRecordingId(isRecording ? null : k.id); }}
                                                >
                                                    {isRecording ? 'Cancel' : 'Record'}
                                                </button>
                                            </td>
                                        </tr>

                                        {isExpanded && (
                                            <tr key={`${k.id}-expand`}>
                                                <td colSpan={8} style={{ padding: '0 16px 16px', background: 'var(--color-surface)' }}>

                                                    {isRecording && (
                                                        <InlineMeasurementForm
                                                            kri={k}
                                                            api={api}
                                                            onError={setError}
                                                            onDone={() => { setRecordingId(null); load(); }}
                                                        />
                                                    )}

                                                    {/* Measurement history */}
                                                    <div style={{ marginTop: isRecording ? 20 : 8 }}>
                                                        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)' }}>
                                                            Measurement History
                                                        </div>
                                                        {k.history.length === 0 ? (
                                                            <div className="text-muted" style={{ fontSize: 13 }}>{t('no_readings')}</div>
                                                        ) : (
                                                            <table style={{ fontSize: 13 }}>
                                                                <thead>
                                                                    <tr>
                                                                        <th>Reporting Period</th>
                                                                        <th>{t('reading_date')}</th>
                                                                        <th>{t('reading_value')}</th>
                                                                        <th>{t('col_status')}</th>
                                                                        <th>Notes</th>
                                                                        <th>Recorded By</th>
                                                                        <th>Recorded At</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {k.history.map((m) => (
                                                                        <tr key={m.id}>
                                                                            <td>{m.reporting_period || '—'}</td>
                                                                            <td>{m.measurement_date ? new Date(m.measurement_date).toLocaleDateString('en-CA') : '—'}</td>
                                                                            <td style={{ fontWeight: 600 }}>{m.value}</td>
                                                                            <td>
                                                                                {m.rag_status ? (
                                                                                    <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, ...RAG_STYLES[m.rag_status] }}>
                                                                                        {ragEmoji(m.rag_status)} {m.rag_status}
                                                                                    </span>
                                                                                ) : '—'}
                                                                            </td>
                                                                            <td style={{ maxWidth: 240, color: 'var(--color-text-muted)' }}>{m.notes || '—'}</td>
                                                                            <td style={{ color: 'var(--color-text-muted)' }}>{m.recorded_by || '—'}</td>
                                                                            <td style={{ color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>{formatDateTime(m.created_at)}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        )}
                                                    </div>
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

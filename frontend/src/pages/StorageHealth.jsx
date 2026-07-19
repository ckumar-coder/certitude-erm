import { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { useT } from '../contexts/LanguageContext';

const QUOTA_BYTES = 500 * 1024 * 1024; // 500 MB

function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const b = parseInt(bytes);
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    if (b < 1024 * 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} MB`;
    return `${(b / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function pct(used, total) {
    if (!total) return 0;
    return Math.min(100, Math.round((parseInt(used) / parseInt(total)) * 100));
}

function moduleLabel(entityType) {
    switch (entityType) {
        case 'risk':        return 'Risk Register';
        case 'control':     return 'Control Library';
        case 'issue':       return 'Issues & Actions';
        case 'obligation':  return 'Compliance Obligations';
        case 'kri':         return 'KRI Library';
        default:            return entityType;
    }
}

function moduleColor(entityType) {
    switch (entityType) {
        case 'risk':        return '#ef4444';
        case 'control':     return '#3b82f6';
        case 'issue':       return '#f59e0b';
        case 'obligation':  return '#0891b2';
        case 'kri':         return '#8b5cf6';
        default:            return '#6b7280';
    }
}

function fileIcon(mimeType) {
    if (!mimeType) return '📎';
    if (mimeType.startsWith('image/')) return '🖼';
    if (mimeType === 'application/pdf') return '📄';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) return '📊';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    return '📎';
}

export default function StorageHealth() {
    const { api } = useAuth();
    const t = useT();
    const [stats, setStats]       = useState(null);
    const [loading, setLoading]   = useState(true);
    const [error, setError]       = useState('');
    const [selected, setSelected] = useState(new Set());
    const [deleting, setDeleting] = useState(false);
    const [filterType, setFilterType] = useState('all');

    async function load() {
        setLoading(true);
        setError('');
        try {
            const data = await api.get('/admin/storage-stats');
            setStats(data);
        } catch (e) {
            setError(e.message || 'Failed to load storage stats');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { load(); }, []); // eslint-disable-line

    async function handleBulkDelete() {
        if (selected.size === 0) return;
        if (!window.confirm(`Delete ${selected.size} file${selected.size > 1 ? 's' : ''}? This cannot be undone.`)) return;
        setDeleting(true);
        try {
            const result = await api.delete('/admin/evidence/bulk', { ids: [...selected] });
            setSelected(new Set());
            await load();
        } catch (e) {
            setError(e.message || 'Bulk delete failed');
        } finally {
            setDeleting(false);
        }
    }

    function toggleSelect(id) {
        setSelected(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }

    function toggleAll(files) {
        if (selected.size === files.length) {
            setSelected(new Set());
        } else {
            setSelected(new Set(files.map(f => f.id)));
        }
    }

    if (loading) return <div style={{ padding: 32 }}>{t('loading')}</div>;

    const usedBytes   = parseInt(stats?.evidence?.total_bytes || 0);
    const quotaBytes  = QUOTA_BYTES;
    const usedPct     = pct(usedBytes, quotaBytes);
    const barColor    = usedPct > 85 ? '#ef4444' : usedPct > 60 ? '#f59e0b' : '#22c55e';

    const allFiles    = stats?.files || [];
    const filtered    = filterType === 'all' ? allFiles : allFiles.filter(f => f.entity_type === filterType);
    const entityTypes = [...new Set(allFiles.map(f => f.entity_type))];

    return (
        <div>
            <h1 className="page-title">{t('storage_title')}</h1>
            <p className="page-subtitle">{t('storage_subtitle')}</p>

            {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

            {/* Summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
                <div className="card" style={{ padding: 20 }}>
                    <div className="text-muted" style={{ fontSize: 12, marginBottom: 4 }}>Database Size</div>
                    <div style={{ fontSize: 24, fontWeight: 700 }}>{stats?.db?.pretty || '—'}</div>
                    <div className="text-muted" style={{ fontSize: 11, marginTop: 4 }}>Total PostgreSQL DB</div>
                </div>
                <div className="card" style={{ padding: 20 }}>
                    <div className="text-muted" style={{ fontSize: 12, marginBottom: 4 }}>Evidence Storage Used</div>
                    <div style={{ fontSize: 24, fontWeight: 700 }}>{formatBytes(usedBytes)}</div>
                    <div className="text-muted" style={{ fontSize: 11, marginTop: 4 }}>of {formatBytes(quotaBytes)} quota</div>
                </div>
                <div className="card" style={{ padding: 20 }}>
                    <div className="text-muted" style={{ fontSize: 12, marginBottom: 4 }}>Evidence Files</div>
                    <div style={{ fontSize: 24, fontWeight: 700 }}>{stats?.evidence?.file_count ?? 0}</div>
                    <div className="text-muted" style={{ fontSize: 11, marginTop: 4 }}>Attachments across all modules</div>
                </div>
                <div className="card" style={{ padding: 20 }}>
                    <div className="text-muted" style={{ fontSize: 12, marginBottom: 4 }}>Last Auto-Vacuum</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>
                        {stats?.vacuum?.last_autovacuum
                            ? new Date(stats.vacuum.last_autovacuum).toLocaleString()
                            : 'Not yet run'}
                    </div>
                    <div className="text-muted" style={{ fontSize: 11, marginTop: 4 }}>
                        {stats?.vacuum?.n_dead_tup != null
                            ? `${stats.vacuum.n_live_tup} live / ${stats.vacuum.n_dead_tup} dead rows`
                            : 'evidence_attachments table'}
                    </div>
                </div>
            </div>

            {/* Storage quota bar */}
            <div className="card" style={{ padding: 20, marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                    <span style={{ fontWeight: 600 }}>Evidence Storage Quota</span>
                    <span className="text-muted">{formatBytes(usedBytes)} / {formatBytes(quotaBytes)} ({usedPct}%)</span>
                </div>
                <div style={{ height: 12, background: 'var(--color-border)', borderRadius: 6, overflow: 'hidden' }}>
                    <div style={{
                        height: '100%',
                        width: `${usedPct}%`,
                        background: barColor,
                        borderRadius: 6,
                        transition: 'width 0.4s ease',
                    }} />
                </div>
                {usedPct > 85 && (
                    <div className="alert alert-error" style={{ marginTop: 10, fontSize: 12 }}>
                        Storage is nearly full. Delete old evidence files to free space.
                    </div>
                )}

                {/* Per-module breakdown */}
                {(stats?.evidence?.by_type || []).length > 0 && (
                    <div style={{ marginTop: 16 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--color-text-muted)' }}>BY MODULE</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {stats.evidence.by_type.map(row => {
                                const rowPct = pct(row.total_bytes, usedBytes || 1);
                                return (
                                    <div key={row.entity_type}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                                            <span style={{ color: moduleColor(row.entity_type), fontWeight: 600 }}>
                                                {moduleLabel(row.entity_type)}
                                            </span>
                                            <span className="text-muted">
                                                {row.file_count} file{row.file_count !== 1 ? 's' : ''} · {formatBytes(row.total_bytes)}
                                            </span>
                                        </div>
                                        <div style={{ height: 6, background: 'var(--color-border)', borderRadius: 3, overflow: 'hidden' }}>
                                            <div style={{
                                                height: '100%',
                                                width: `${rowPct}%`,
                                                background: moduleColor(row.entity_type),
                                                borderRadius: 3,
                                            }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* File management table */}
            <div className="card" style={{ padding: 0 }}>
                <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>Evidence Files</div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        {/* Filter chips */}
                        <div style={{ display: 'flex', gap: 4 }}>
                            {['all', ...entityTypes].map(chip => (
                                <button
                                    key={chip}
                                    onClick={() => setFilterType(chip)}
                                    style={{
                                        padding: '3px 10px',
                                        borderRadius: 12,
                                        border: '1px solid',
                                        borderColor: filterType === chip ? moduleColor(chip) : 'var(--color-border)',
                                        background: filterType === chip ? moduleColor(chip) : 'transparent',
                                        color: filterType === chip ? '#fff' : 'var(--color-text-muted)',
                                        fontSize: 12,
                                        cursor: 'pointer',
                                        fontWeight: filterType === chip ? 600 : 400,
                                    }}
                                >
                                    {chip === 'all' ? t('all') : moduleLabel(chip)}
                                </button>
                            ))}
                        </div>
                        {selected.size > 0 && (
                            <button
                                className="btn btn-sm"
                                style={{ background: '#ef4444', color: '#fff', border: 'none' }}
                                disabled={deleting}
                                onClick={handleBulkDelete}
                            >
                                {deleting ? 'Deleting…' : `Delete ${selected.size} selected`}
                            </button>
                        )}
                    </div>
                </div>

                {filtered.length === 0 ? (
                    <div style={{ padding: 24 }} className="text-muted">No evidence files found.</div>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th style={{ width: 36 }}>
                                    <input
                                        type="checkbox"
                                        checked={selected.size === filtered.length && filtered.length > 0}
                                        onChange={() => toggleAll(filtered)}
                                    />
                                </th>
                                <th>File</th>
                                <th>Module</th>
                                <th>Entity</th>
                                <th>Size</th>
                                <th>Uploaded By</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(f => (
                                <tr key={f.id}>
                                    <td>
                                        <input
                                            type="checkbox"
                                            checked={selected.has(f.id)}
                                            onChange={() => toggleSelect(f.id)}
                                        />
                                    </td>
                                    <td>
                                        <span style={{ marginRight: 6 }}>{fileIcon(f.mime_type)}</span>
                                        <span style={{ fontWeight: 500 }}>{f.filename}</span>
                                    </td>
                                    <td>
                                        <span style={{
                                            fontSize: 11,
                                            fontWeight: 600,
                                            color: moduleColor(f.entity_type),
                                            background: moduleColor(f.entity_type) + '18',
                                            padding: '2px 8px',
                                            borderRadius: 10,
                                        }}>
                                            {moduleLabel(f.entity_type)}
                                        </span>
                                    </td>
                                    <td className="text-muted" style={{ fontSize: 12 }}>{f.entity_id}</td>
                                    <td className="text-muted" style={{ fontSize: 12 }}>{formatBytes(f.file_size_bytes)}</td>
                                    <td className="text-muted" style={{ fontSize: 12 }}>{f.uploaded_by}</td>
                                    <td className="text-muted" style={{ fontSize: 12 }}>
                                        {new Date(f.uploaded_at).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                <div style={{ padding: '10px 20px', borderTop: '1px solid var(--color-border)', fontSize: 12 }} className="text-muted">
                    {filtered.length} file{filtered.length !== 1 ? 's' : ''} · {formatBytes(filtered.reduce((s, f) => s + parseInt(f.file_size_bytes || 0), 0))}
                </div>
            </div>
        </div>
    );
}

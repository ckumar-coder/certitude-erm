import { useState, useEffect, useCallback } from 'react';

const CONTROL_TYPES = ['Preventive', 'Detective', 'Corrective', 'Directive'];

const TYPE_COLOURS = {
    Preventive: '#2e8b57',
    Detective:  '#1e90ff',
    Corrective: '#c0392b',
    Directive:  '#6a5acd',
};

export default function ControlLibraryModal({ onClose }) {
    const [search, setSearch] = useState('');
    const [type, setType] = useState('');
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    // Debounce search
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search), 300);
        return () => clearTimeout(t);
    }, [search]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const params = new URLSearchParams();
            if (debouncedSearch) params.set('search', debouncedSearch);
            if (type) params.set('type', type);
            const res = await fetch(`/api/control-library-ref?${params}`);
            if (!res.ok) throw new Error('Failed to load control library');
            setRows(await res.json());
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [debouncedSearch, type]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Close on Escape
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    return (
        <div className="disclaimer-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div style={{
                background: 'var(--color-surface, #fff)',
                borderRadius: 12,
                boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
                width: '95vw',
                maxWidth: 1200,
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
            }}>
                {/* Header */}
                <div style={{
                    padding: '16px 24px',
                    borderBottom: '1px solid var(--color-border, #e0e0e0)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexShrink: 0,
                }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: 18 }}>Control Reference Library</h2>
                        <p style={{ margin: '4px 0 0', fontSize: 12, color: '#888' }}>
                            Read-only reference. Use as inspiration when designing controls in your own register.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#888', lineHeight: 1 }}
                        aria-label="Close"
                    >×</button>
                </div>

                {/* Filters */}
                <div style={{
                    padding: '12px 24px',
                    borderBottom: '1px solid var(--color-border, #e0e0e0)',
                    display: 'flex',
                    gap: 12,
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    flexShrink: 0,
                    background: 'var(--color-bg, #f8f9fb)',
                }}>
                    <input
                        type="search"
                        placeholder="Search controls…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{
                            padding: '7px 12px',
                            border: '1px solid var(--color-border, #ddd)',
                            borderRadius: 6,
                            fontSize: 13,
                            width: 220,
                            background: 'var(--color-surface, #fff)',
                        }}
                        autoFocus
                    />

                    {/* Type chips */}
                    <div style={{ display: 'flex', gap: 6 }}>
                        <button
                            className={`btn btn-sm ${type === '' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setType('')}
                        >All Types</button>
                        {CONTROL_TYPES.map(t => (
                            <button
                                key={t}
                                className={`btn btn-sm ${type === t ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setType(type === t ? '' : t)}
                                style={type === t ? { background: TYPE_COLOURS[t], borderColor: TYPE_COLOURS[t] } : {}}
                            >{t}</button>
                        ))}
                    </div>

                    {(search || type) && (
                        <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => { setSearch(''); setType(''); }}
                        >Clear filters</button>
                    )}

                    <span style={{ marginLeft: 'auto', fontSize: 12, color: '#888' }}>
                        {loading ? 'Loading…' : `${rows.length} controls`}
                    </span>
                </div>

                {/* Table */}
                <div style={{ overflowY: 'auto', flex: 1 }}>
                    {error && (
                        <p style={{ padding: 24, color: '#c0392b' }}>{error}</p>
                    )}
                    {!error && (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                            <thead>
                                <tr style={{ background: 'var(--color-bg, #f8f9fb)', position: 'sticky', top: 0, zIndex: 1 }}>
                                    {['Type', 'Control Name', 'Description', 'Automation', 'Framework Reference', 'Testing Frequency'].map(h => (
                                        <th key={h} style={{
                                            padding: '10px 12px',
                                            textAlign: 'left',
                                            fontSize: 11,
                                            fontWeight: 600,
                                            color: '#666',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.04em',
                                            borderBottom: '1px solid var(--color-border, #e0e0e0)',
                                            whiteSpace: 'nowrap',
                                        }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {rows.length === 0 && !loading && (
                                    <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: '#888' }}>No controls match the current filters.</td></tr>
                                )}
                                {rows.map((r, i) => (
                                    <tr key={r.id} style={{ background: i % 2 === 0 ? 'var(--color-surface, #fff)' : 'var(--color-bg, #f8f9fb)' }}>
                                        <td style={{ padding: '9px 12px', verticalAlign: 'top' }}>
                                            <span style={{
                                                display: 'inline-block',
                                                padding: '2px 8px',
                                                borderRadius: 12,
                                                fontSize: 11,
                                                fontWeight: 600,
                                                background: (TYPE_COLOURS[r.control_type] || '#888') + '22',
                                                color: TYPE_COLOURS[r.control_type] || '#888',
                                                whiteSpace: 'nowrap',
                                            }}>{r.control_type}</span>
                                        </td>
                                        <td style={{ padding: '9px 12px', verticalAlign: 'top', fontWeight: 500, maxWidth: 220 }}>{r.name}</td>
                                        <td style={{ padding: '9px 12px', verticalAlign: 'top', color: '#555', maxWidth: 320 }}>{r.description}</td>
                                        <td style={{ padding: '9px 12px', verticalAlign: 'top', color: '#555', whiteSpace: 'nowrap' }}>{r.automation}</td>
                                        <td style={{ padding: '9px 12px', verticalAlign: 'top', color: '#555', maxWidth: 220, fontSize: 12 }}>{r.framework_reference}</td>
                                        <td style={{ padding: '9px 12px', verticalAlign: 'top', color: '#555', whiteSpace: 'nowrap' }}>{r.testing_frequency}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    padding: '12px 24px',
                    borderTop: '1px solid var(--color-border, #e0e0e0)',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    flexShrink: 0,
                }}>
                    <button className="btn btn-secondary" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
}

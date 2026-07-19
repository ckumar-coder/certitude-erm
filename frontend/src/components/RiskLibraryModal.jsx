import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../AuthContext';

// Maps company industry (from SetupWizard) → library sector value
const INDUSTRY_TO_SECTOR = {
    'Financial Services': 'Financial Services',
    'Banking': 'Financial Services',
    'Insurance': 'Financial Services',
    'Islamic Finance': 'Islamic Finance',
    'Healthcare & Life Sciences': 'Healthcare',
    'Technology & Software': 'Technology',
    'Professional Services': 'Professional Services',
    'Legal Services': 'Professional Services',
    'Manufacturing': 'Manufacturing',
    'Retail & E-commerce': 'Retail',
    'Energy & Utilities': 'Utilities',
    'Government & Public Sector': 'Government',
    'Real Estate': 'Construction & Real Estate',
    'Transportation & Logistics': 'Logistics & Transportation',
    'Telecommunications': 'Telecommunications',
    'Aviation': 'Aviation',
    'Oil & Gas': 'Oil & Gas (Upstream)',
    'Hospitality & Tourism': 'Hospitality & Tourism',
    'Trading': 'Trading',
    'Construction': 'Construction & Real Estate',
};

const PILLARS = ['Strategic', 'Governance', 'Finance', 'HR', 'IT', 'Compliance', 'Operations', 'BCM', 'Security'];

const SECTORS = [
    'All Sectors',
    'Financial Services',
    'Islamic Finance',
    'Professional Services',
    'Healthcare',
    'Technology',
    'Manufacturing',
    'Government',
    'Oil & Gas (Upstream)',
    'Oil & Gas (Downstream)',
    'Retail',
    'Trading',
    'Construction & Real Estate',
    'Hospitality & Tourism',
    'Logistics & Transportation',
    'Utilities',
    'Telecommunications',
    'Aviation',
];

export default function RiskLibraryModal({ onClose }) {
    const { session } = useAuth();

    // Derive default sector from active company's industry
    const activeCompany = session?.companies?.find(c => c.id === session.activeCompanyId);
    const defaultSector = (activeCompany?.industry && INDUSTRY_TO_SECTOR[activeCompany.industry]) || '';

    const [search, setSearch] = useState('');
    const [pillar, setPillar] = useState('');
    const [sector, setSector] = useState(defaultSector);
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    // Debounce search input
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
            if (pillar) params.set('pillar', pillar);
            if (sector) params.set('sector', sector);
            const res = await fetch(`/api/risk-library?${params}`);
            if (!res.ok) throw new Error('Failed to load risk library');
            setRows(await res.json());
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [debouncedSearch, pillar, sector]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Close on Escape
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    const PILLAR_COLOURS = {
        Strategic:  '#4a6fa5',
        Governance: '#6a5acd',
        Finance:    '#2e8b57',
        HR:         '#b8860b',
        IT:         '#1e90ff',
        Compliance: '#c0392b',
        Operations: '#e67e22',
        BCM:        '#16a085',
        Security:   '#8e44ad',
    };

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
                        <h2 style={{ margin: 0, fontSize: 18 }}>Risk Reference Library</h2>
                        <p style={{ margin: '4px 0 0', fontSize: 12, color: '#888' }}>
                            Read-only reference. Use as inspiration when building your own risk register.
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
                        placeholder="Search risks…"
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

                    {/* Pillar chips */}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button
                            className={`btn btn-sm ${pillar === '' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setPillar('')}
                        >All Pillars</button>
                        {PILLARS.map(p => (
                            <button
                                key={p}
                                className={`btn btn-sm ${pillar === p ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setPillar(pillar === p ? '' : p)}
                                style={pillar === p ? { background: PILLAR_COLOURS[p], borderColor: PILLAR_COLOURS[p] } : {}}
                            >{p}</button>
                        ))}
                    </div>

                    {/* Sector dropdown */}
                    <select
                        value={sector}
                        onChange={e => setSector(e.target.value)}
                        style={{
                            padding: '7px 10px',
                            border: '1px solid var(--color-border, #ddd)',
                            borderRadius: 6,
                            fontSize: 13,
                            background: 'var(--color-surface, #fff)',
                        }}
                    >
                        <option value="">All Sectors (incl. generic)</option>
                        {SECTORS.map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>

                    {(search || pillar || sector) && (
                        <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => { setSearch(''); setPillar(''); setSector(''); }}
                        >Clear filters</button>
                    )}

                    <span style={{ marginLeft: 'auto', fontSize: 12, color: '#888' }}>
                        {loading ? 'Loading…' : `${rows.length} risks`}
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
                                    {['Pillar', 'Sector', 'Risk Detail', 'Typical Cause', 'Typical Impact', 'Treatment Strategy'].map(h => (
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
                                    <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: '#888' }}>No risks match the current filters.</td></tr>
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
                                                background: (PILLAR_COLOURS[r.pillar] || '#888') + '22',
                                                color: PILLAR_COLOURS[r.pillar] || '#888',
                                                whiteSpace: 'nowrap',
                                            }}>{r.pillar}</span>
                                        </td>
                                        <td style={{ padding: '9px 12px', verticalAlign: 'top', whiteSpace: 'nowrap', color: '#555', fontSize: 12 }}>{r.sector}</td>
                                        <td style={{ padding: '9px 12px', verticalAlign: 'top', fontWeight: 500, maxWidth: 280 }}>{r.risk_detail}</td>
                                        <td style={{ padding: '9px 12px', verticalAlign: 'top', color: '#555', maxWidth: 200 }}>{r.typical_cause}</td>
                                        <td style={{ padding: '9px 12px', verticalAlign: 'top', color: '#555', maxWidth: 200 }}>{r.typical_impact}</td>
                                        <td style={{ padding: '9px 12px', verticalAlign: 'top', color: '#555', maxWidth: 220 }}>{r.treatment_strategy}</td>
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

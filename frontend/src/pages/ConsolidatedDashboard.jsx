// ConsolidatedDashboard.jsx — V1.9 Group consolidated view
// Shown when the user enters Group View mode (isGroupView = true).
// Displays per-subsidiary summary cards + rollup totals.
// Scope-aware: consolidated_only users see numbers only; view/full users
// can switch into a subsidiary via the "Open" button.

import { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';

const SCOPE_LABEL = {
    consolidated_only: 'Summary only',
    view:              'Read access',
    full:              'Full access',
};
const SCOPE_COLOR = {
    consolidated_only: { bg: '#FEF3C7', text: '#92400E' },
    view:              { bg: '#DBEAFE', text: '#1E40AF' },
    full:              { bg: '#D1FAE5', text: '#065F46' },
};

function ScoreBar({ value, max, color }) {
    const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, height: 6, background: '#E5E7EB', borderRadius: 3 }}>
                <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.4s' }} />
            </div>
            <span style={{ fontSize: 11, minWidth: 24, textAlign: 'right', color: 'var(--color-text-muted)' }}>{value}</span>
        </div>
    );
}

function StatCard({ label, value, color }) {
    return (
        <div style={{ textAlign: 'center', padding: '8px 12px', background: 'var(--color-bg-secondary)',
                      borderRadius: 6, minWidth: 60 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: color || 'var(--color-text)' }}>{value}</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{label}</div>
        </div>
    );
}

function RollupBanner({ rollup }) {
    if (!rollup) return null;
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24 }}>
            <div className="card" style={{ padding: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#DC2626' }}>{rollup.risks?.extreme || 0}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Extreme risks</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                    {rollup.risks?.open_total || 0} open total
                </div>
            </div>
            <div className="card" style={{ padding: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#EF4444' }}>{rollup.kris?.red || 0}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>KRIs in breach</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                    {rollup.kris?.amber || 0} amber
                </div>
            </div>
            <div className="card" style={{ padding: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#F59E0B' }}>{rollup.issues?.open || 0}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Open issues</div>
            </div>
            <div className="card" style={{ padding: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#7C3AED' }}>{rollup.obligations?.overdue || 0}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Overdue obligations</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                    {rollup.obligations?.total || 0} total
                </div>
            </div>
            <div className="card" style={{ padding: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#10B981' }}>{rollup.controls?.effective || 0}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Effective controls</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                    {rollup.controls?.total || 0} total
                </div>
            </div>
        </div>
    );
}

function SubsidiaryCard({ sub, onOpen }) {
    const scopeStyle = SCOPE_COLOR[sub.effective_scope] || SCOPE_COLOR.consolidated_only;
    const r = sub.risks || {};
    const k = sub.kris || {};
    const canDrillIn = sub.effective_scope !== 'consolidated_only';

    return (
        <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{sub.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{sub.code}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, borderRadius: 4, padding: '2px 8px',
                                   background: scopeStyle.bg, color: scopeStyle.text }}>
                        {SCOPE_LABEL[sub.effective_scope]}
                    </span>
                    {canDrillIn && (
                        <button className="btn btn-secondary btn-sm" onClick={() => onOpen(sub.id)}>
                            Open →
                        </button>
                    )}
                </div>
            </div>

            {/* Risk summary */}
            <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--color-text-muted)' }}>
                    RISKS ({r.open_total || 0} open)
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                    {[['Extreme', r.extreme, '#DC2626'], ['High', r.high, '#EF4444'],
                      ['Medium', r.medium, '#F59E0B'], ['Low', r.low, '#10B981']].map(([lbl, val, col]) => (
                        <StatCard key={lbl} label={lbl} value={parseInt(val) || 0} color={col} />
                    ))}
                </div>
            </div>

            {/* KRI + Issues + Obligations row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--color-text-muted)' }}>
                        KRIs
                    </div>
                    <ScoreBar value={parseInt(k.red) || 0}   max={parseInt(k.total) || 1} color="#DC2626" />
                    <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 2 }}>
                        Red: {k.red || 0} · Amber: {k.amber || 0} · Green: {k.green || 0}
                    </div>
                </div>
                <div>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--color-text-muted)' }}>
                        Issues
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: sub.issues?.open > 0 ? '#F59E0B' : '#10B981' }}>
                        {sub.issues?.open || 0}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>open</div>
                </div>
                <div>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--color-text-muted)' }}>
                        Obligations
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 700,
                                  color: sub.obligations?.overdue > 0 ? '#DC2626' : '#10B981' }}>
                        {sub.obligations?.overdue || 0}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
                        overdue / {sub.obligations?.total || 0} total
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div style={{ marginTop: 12, borderTop: '1px solid var(--color-border)', paddingTop: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--color-text-muted)' }}>
                    Controls ({sub.controls?.total || 0} total)
                </div>
                <ScoreBar
                    value={parseInt(sub.controls?.effective) || 0}
                    max={parseInt(sub.controls?.total) || 1}
                    color="#10B981"
                />
                <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 2 }}>
                    Effective: {sub.controls?.effective || 0} · Non-effective: {sub.controls?.non_effective || 0} · Untested: {sub.controls?.not_tested || 0}
                </div>
            </div>
        </div>
    );
}

export default function ConsolidatedDashboard() {
    const { api, session, switchCompany, openCompanyPicker } = useAuth();
    const [data, setData]       = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState('');

    const load = async () => {
        setLoading(true);
        setError('');
        try {
            const result = await api.get('/consolidated-summary');
            setData(result);
        } catch (e) {
            setError(e.message || 'Failed to load consolidated summary');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [session.activeCompanyId]);

    const handleOpen = async (subsidiaryId) => {
        await switchCompany(subsidiaryId);
    };

    if (loading) return (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
            <p className="text-muted">Loading group summary…</p>
        </div>
    );

    if (error) return (
        <div className="card" style={{ padding: 24 }}>
            <p style={{ color: 'var(--color-danger)' }}>{error}</p>
            <button className="btn btn-secondary" onClick={load}>Retry</button>
        </div>
    );

    const subsCount = data?.subsidiaries?.length || 0;

    return (
        <div>
            <div className="page-header" style={{ marginBottom: 20 }}>
                <div>
                    <h1 className="page-title">🌐 Group Dashboard</h1>
                    <p className="page-subtitle">
                        {data?.parent?.name} — consolidated view across {subsCount} subsidiar{subsCount === 1 ? 'y' : 'ies'}
                        {data?.user_scope === 'consolidated_only' && (
                            <span style={{ marginLeft: 8, fontSize: 12, color: '#92400E',
                                           background: '#FEF3C7', padding: '1px 6px', borderRadius: 4 }}>
                                Summary only — contact your administrator for drill-down access
                            </span>
                        )}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-secondary" onClick={load}>↻ Refresh</button>
                    <button className="btn btn-secondary" onClick={openCompanyPicker}>Switch view</button>
                </div>
            </div>

            {/* Rollup banner */}
            <RollupBanner rollup={data?.rollup} />

            {/* Subsidiary cards */}
            {subsCount === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: 40 }}>
                    <p className="text-muted">No subsidiaries found under this company.</p>
                    <p className="text-muted" style={{ fontSize: 13 }}>
                        An Admin can add subsidiaries from <strong>Admin → Company Structure</strong>.
                    </p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: 16 }}>
                    {data.subsidiaries.map((sub) => (
                        <SubsidiaryCard key={sub.id} sub={sub} onOpen={handleOpen} />
                    ))}
                </div>
            )}
        </div>
    );
}

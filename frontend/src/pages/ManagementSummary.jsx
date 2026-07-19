import { Fragment, useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { useT } from '../contexts/LanguageContext';
import { useLanguage } from '../contexts/LanguageContext';

// ── Colour palette (matches ScoringMethodology) ───────────────────────────────
const CELL_COLOR = { extreme: '#D4182E', high: '#E8601A', medium: '#D4920C', low: '#16924F' };
const BAND_COLOR = { extreme: '#C0152A', high: '#D9500A', medium: '#C07D0A', low: '#127A47' };
const BAND_LIGHT = { extreme: '#FEE2E2', high: '#FFEDD5', medium: '#FEF9C3', low: '#DCFCE7' };
const BAND_DARK  = { extreme: '#7F1D1D', high: '#7C2D12', medium: '#713F12', low: '#14532D' };
const SCORE_COL  = { 5: '#C0152A', 4: '#D9500A', 3: '#C07D0A', 2: '#127A47', 1: '#166534' };

function getBand(score) {
    if (score >= 17) return 'extreme';
    if (score >= 10) return 'high';
    if (score >= 5)  return 'medium';
    return 'low';
}

// ── Small reusable components ─────────────────────────────────────────────────
function SectionHeader({ title, subtitle, accent = '#1a56db' }) {
    return (
        <div style={{
            padding: '16px 24px',
            borderBottom: '1px solid var(--color-border)',
            borderLeft: `4px solid ${accent}`,
            background: 'var(--color-surface)',
            borderRadius: '8px 8px 0 0',
        }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{title}</h3>
            {subtitle && <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--color-text-muted)' }}>{subtitle}</p>}
        </div>
    );
}

function StatTile({ label, value, accent, sub }) {
    return (
        <div style={{
            flex: 1, minWidth: 130,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderTop: `3px solid ${accent}`,
            borderRadius: 8, padding: '16px 20px',
        }}>
            <div style={{ fontSize: 30, fontWeight: 800, color: accent, lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 5 }}>{label}</div>
            {sub && <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>{sub}</div>}
        </div>
    );
}

function ScoreChip({ score }) {
    const band = getBand(score);
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 38, height: 38, borderRadius: '50%',
            background: BAND_COLOR[band], color: '#fff',
            fontSize: 14, fontWeight: 800, flexShrink: 0,
        }}>{score}</span>
    );
}

function UidTag({ text, color = '#1a56db' }) {
    return (
        <span style={{
            fontSize: 11, fontWeight: 700, padding: '2px 8px',
            background: color, color: '#fff', borderRadius: 4,
            marginRight: 6, whiteSpace: 'nowrap',
        }}>{text}</span>
    );
}

function AlertRow({ uid, uidColor, title, sub, band }) {
    return (
        <div style={{
            padding: '10px 14px', borderRadius: 7, marginBottom: 8,
            background: BAND_LIGHT[band], border: `1px solid ${BAND_COLOR[band]}40`,
        }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 2 }}>
                <UidTag text={uid} color={uidColor || BAND_COLOR[band]} />
                <span style={{ fontSize: 13, fontWeight: 600 }}>{title}</span>
            </div>
            {sub && <div style={{ fontSize: 12, color: BAND_DARK[band], paddingLeft: 2 }}>{sub}</div>}
        </div>
    );
}

function GreenNote({ text }) {
    return <div style={{ fontSize: 13, color: '#127A47', fontWeight: 500 }}>✓ {text}</div>;
}

function trendArrow(trend) {
    if (trend === 'INCREASED') return { symbol: '▲', color: '#C0152A' };
    if (trend === 'DECREASED') return { symbol: '▼', color: '#127A47' };
    return { symbol: '→', color: '#94a3b8' };
}

// ── Heatmap ───────────────────────────────────────────────────────────────────
function RiskHeatmap({ cells, onCellClick, selectedCell }) {
    const byKey = {};
    for (const c of cells) byKey[`${c.likelihood}-${c.impact}`] = c;

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'auto repeat(5, 1fr)', gap: 4 }}>
            {[5, 4, 3, 2, 1].map((impact) => (
                <Fragment key={impact}>
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: 38, height: 54, borderRadius: 6,
                        background: SCORE_COL[impact], color: '#fff', fontSize: 13, fontWeight: 700,
                    }}>I{impact}</div>
                    {[1, 2, 3, 4, 5].map((l) => {
                        const cell  = byKey[`${l}-${impact}`];
                        const band  = getBand(l * impact);
                        const count = cell?.count || 0;
                        const isSelected = selectedCell?.likelihood === l && selectedCell?.impact === impact;
                        return (
                            <div key={`${l}-${impact}`}
                                onClick={() => count > 0 && onCellClick(cell)}
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    height: 54, borderRadius: 6,
                                    background: CELL_COLOR[band],
                                    color: '#fff',
                                    fontSize: 20, fontWeight: 800,
                                    cursor: count > 0 ? 'pointer' : 'default',
                                    outline: isSelected ? '3px solid #fff' : 'none',
                                    outlineOffset: -3,
                                    boxShadow: isSelected ? '0 0 0 3px rgba(0,0,0,0.4)' : 'none',
                                    transition: 'transform 0.1s',
                                    transform: count > 0 && !isSelected ? undefined : undefined,
                                }}
                                title={count > 0 ? `L${l} × I${impact} — click to view ${count} risk${count !== 1 ? 's' : ''}` : `L${l} × I${impact}`}
                            >
                                {count > 0 ? count : ''}
                            </div>
                        );
                    })}
                </Fragment>
            ))}
            <div />
            {[1, 2, 3, 4, 5].map((l) => (
                <div key={`l-${l}`} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    height: 38, borderRadius: 6,
                    background: SCORE_COL[l], color: '#fff', fontSize: 13, fontWeight: 700,
                }}>L{l}</div>
            ))}
        </div>
    );
}

// ── Department Risk Distribution (Inherent vs Residual) ──────────────────────
const BAND_HDR = { extreme: '#C0152A', high: '#D9500A', moderate: '#C07D0A', low: '#127A47' };
// BAND_LABELS is computed inside components that call useT()

function RiskDistHalfTable({ rows, side, accentColor, title, subtitle }) {
    const t = useT();
    const bands = ['extreme', 'high', 'moderate', 'low'];
    const BAND_LABELS = { extreme: t('band_extreme'), high: t('band_high'), moderate: t('band_moderate'), low: t('band_low') };
    const totals = rows.reduce((acc, r) => {
        bands.forEach((b) => { acc[b] = (acc[b] || 0) + r[side][b]; });
        acc.total = (acc.total || 0) + r[side].total;
        return acc;
    }, {});

    return (
        <div className="card" style={{ padding: 0, overflow: 'hidden', flex: 1, minWidth: 0 }}>
            <div style={{ padding: '14px 18px', background: accentColor, borderRadius: '8px 8px 0 0' }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>{title}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>{subtitle}</div>
            </div>
            <div style={{ overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', fontSize: 13, width: '100%' }}>
                    <thead>
                        <tr>
                            <th style={{ padding: '9px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', background: '#f8fafc', color: '#64748b', borderBottom: '2px solid var(--color-border)' }}>{t('dash_col_dept')}</th>
                            {bands.map((b) => (
                                <th key={b} style={{ padding: '9px 10px', textAlign: 'center', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#fff', background: BAND_HDR[b], borderBottom: '2px solid var(--color-border)', borderLeft: '1px solid rgba(255,255,255,0.2)' }}>{BAND_LABELS[b]}</th>
                            ))}
                            <th style={{ padding: '9px 10px', textAlign: 'center', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#fff', background: accentColor, borderBottom: '2px solid var(--color-border)', borderLeft: '1px solid rgba(255,255,255,0.2)' }}>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r, i) => (
                            <tr key={r.department} style={{ background: i % 2 === 1 ? 'var(--color-surface)' : '#fff' }}>
                                <td style={{ padding: '8px 14px', fontSize: 13, fontWeight: 500, borderBottom: '1px solid var(--color-border)', color: 'var(--color-text)', whiteSpace: 'nowrap' }}>{r.department}</td>
                                {bands.map((b) => {
                                    const v = r[side][b];
                                    return (
                                        <td key={b} style={{ padding: '8px 10px', textAlign: 'center', fontSize: 13, fontWeight: v ? 700 : 400, color: v ? BAND_HDR[b] : '#cbd5e1', borderBottom: '1px solid var(--color-border)', borderLeft: '1px solid var(--color-border)' }}>{v || '—'}</td>
                                    );
                                })}
                                <td style={{ padding: '8px 10px', textAlign: 'center', fontSize: 13, fontWeight: 700, color: accentColor, borderBottom: '1px solid var(--color-border)', borderLeft: '1px solid var(--color-border)', background: '#f8fafc' }}>{r[side].total}</td>
                            </tr>
                        ))}
                        <tr style={{ background: accentColor }}>
                            <td style={{ padding: '9px 14px', fontSize: 13, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap' }}>{t('dash_grand_total')}</td>
                            {bands.map((b) => (
                                <td key={b} style={{ padding: '9px 10px', textAlign: 'center', fontSize: 13, fontWeight: totals[b] ? 800 : 400, color: '#fff', borderLeft: '1px solid rgba(255,255,255,0.2)' }}>{totals[b] || '—'}</td>
                            ))}
                            <td style={{ padding: '9px 10px', textAlign: 'center', fontSize: 14, fontWeight: 800, color: '#fff', borderLeft: '1px solid rgba(255,255,255,0.3)', background: 'rgba(0,0,0,0.15)' }}>{totals.total || 0}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function DeptRiskDistTable({ rows }) {
    const t = useT();
    if (!rows || rows.length === 0) return null;
    return (
        <div style={{ display: 'flex', gap: 16, marginBottom: 20, alignItems: 'flex-start' }}>
            <RiskDistHalfTable rows={rows} side="inherent" accentColor="#7C4A1E" title={t('dash_inherent_title')} subtitle={t('dash_inherent_sub')} />
            <RiskDistHalfTable rows={rows} side="residual" accentColor="#1e3a5f" title={t('dash_residual_title')} subtitle={t('dash_residual_sub')} />
        </div>
    );
}

// ── KRI tile ──────────────────────────────────────────────────────────────────
function KriTile({ label, count, bg }) {
    return (
        <div style={{ flex: 1, textAlign: 'center', padding: '14px 8px', borderRadius: 8, background: bg }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#fff' }}>{count}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#fff', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
        </div>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ManagementSummary() {
    const { api, session } = useAuth();
    const t = useT();
    const activeCompany = session.companies.find((c) => c.id === session.activeCompanyId);
    const isBuMode = !!activeCompany?.has_business_units;
    const [data, setData] = useState(null);
    const [allDepartments, setAllDepartments] = useState([]);
    const [allBus, setAllBus] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError]   = useState('');
    const [selectedCell, setSelectedCell] = useState(null); // { likelihood, impact, risks[] }

    useEffect(() => {
        Promise.all([
            api.get('/dashboard/management-summary'),
            api.get('/departments').catch(() => []),
            isBuMode ? api.get('/business-units').catch(() => []) : Promise.resolve([]),
        ]).then(([summary, depts, bus]) => {
            setData(summary);
            setAllDepartments(depts || []);
            setAllBus(bus || []);
        }).catch((e) => setError(e.message || 'Failed to load'))
          .finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (loading) return <div><h1 className="page-title">{t('summary_title')}</h1><div className="card">{t('loading')}</div></div>;
    if (error || !data) return <div><h1 className="page-title">{t('summary_title')}</h1><div className="alert alert-error">{error || 'No data available'}</div></div>;

    const {
        risk_heatmap, top_risks, appetite_breaches, tolerance_breaches,
        category_appetite_breaches, reassessment_recommended,
        risk_movement, kri_summary, compliance_summary, issues_summary, risk_accepted_register,
        risk_distribution_by_dept,
    } = data;
    // tolerance_breaches replaces appetite_breaches (per-risk threshold)
    const toleranceBreaches = tolerance_breaches || appetite_breaches || [];
    const catBreaches = category_appetite_breaches || [];

    // Resolve a dept code/name to the full display name for AlertRow sub-text.
    const deptDisplayName = (dept) => {
        if (!dept) return t('dash_enterprise_wide');
        return allDepartments.find((d) => d.code === dept || d.name === dept)?.name || dept;
    };

    const totalObs     = compliance_summary.overall.total || 0;
    const compliantObs = compliance_summary.overall['Compliant'] || 0;
    const compliancePct = totalObs ? Math.round((compliantObs / totalObs) * 100) : 0;

    return (
        <div>
            <h1 className="page-title">{t('summary_title')}</h1>
            <p className="page-subtitle">{t('summary_subtitle')}</p>

            {/* ── KPI Strip ─────────────────────────────────────────────────── */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
                <StatTile label={t('dash_risks_tracked')} value={top_risks.length} accent="#1a56db" />
                <StatTile
                    label={t('dash_red_kris')} value={kri_summary.red}
                    accent={kri_summary.red > 0 ? '#C0152A' : '#127A47'}
                    sub={kri_summary.red > 0 ? t('dash_breaching') : t('dash_all_clear')}
                />
                <StatTile label={t('dash_open_issues')} value={issues_summary.open_count} accent={issues_summary.open_count > 0 ? '#D9500A' : '#127A47'} />
                <StatTile
                    label={t('dash_compliance_rate')} value={`${compliancePct}%`}
                    accent={compliancePct >= 80 ? '#127A47' : compliancePct >= 60 ? '#C07D0A' : '#C0152A'}
                    sub={`${compliantObs} / ${totalObs}`}
                />
                <StatTile
                    label={t('dash_appetite_breaches')} value={catBreaches.reduce((s, c) => s + c.risks.length, 0) || toleranceBreaches.length}
                    accent={(catBreaches.length > 0 || toleranceBreaches.length > 0) ? '#C0152A' : '#127A47'}
                    sub={(catBreaches.length > 0 || toleranceBreaches.length > 0) ? t('dash_exceeding') : t('dash_within')}
                />
            </div>

            {/* ── Department Risk Distribution ──────────────────────────────── */}
            <DeptRiskDistTable rows={risk_distribution_by_dept} />

            {/* ── Row 1: Heatmap + KRI Health ───────────────────────────────── */}
            <div className="grid-2" style={{ marginBottom: 20 }}>
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <SectionHeader
                        title={t('dash_heatmap_title')}
                        subtitle={t('dash_heatmap_sub')}
                        accent="#C0152A"
                    />
                    <div style={{ padding: '20px 24px' }}>
                        <RiskHeatmap
                            cells={risk_heatmap}
                            selectedCell={selectedCell}
                            onCellClick={(cell) => setSelectedCell(
                                selectedCell?.likelihood === cell.likelihood && selectedCell?.impact === cell.impact ? null : cell
                            )}
                        />
                    </div>
                    {selectedCell && (
                        <div style={{ borderTop: '1px solid var(--color-border)', padding: '16px 24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                <div style={{ fontWeight: 700, fontSize: 14 }}>
                                    L{selectedCell.likelihood} × I{selectedCell.impact} — {selectedCell.risks.length} risk{selectedCell.risks.length !== 1 ? 's' : ''}
                                    <span style={{
                                        display: 'inline-block', marginLeft: 8, padding: '2px 8px',
                                        borderRadius: 4, fontSize: 11, fontWeight: 600,
                                        background: CELL_COLOR[getBand(selectedCell.likelihood * selectedCell.impact)],
                                        color: '#fff'
                                    }}>
                                        {t('dash_score_vs')} {selectedCell.likelihood * selectedCell.impact}
                                    </span>
                                </div>
                                <button
                                    onClick={() => setSelectedCell(null)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--color-text-muted)', lineHeight: 1 }}
                                    title="Close"
                                >×</button>
                            </div>
                            <table style={{ width: '100%', fontSize: 13 }}>
                                <thead>
                                    <tr>
                                        <th style={{ textAlign: 'left', paddingBottom: 6, fontWeight: 600, color: 'var(--color-text-muted)', fontSize: 11, textTransform: 'uppercase' }}>{t('dash_col_risk_id')}</th>
                                        <th style={{ textAlign: 'left', paddingBottom: 6, fontWeight: 600, color: 'var(--color-text-muted)', fontSize: 11, textTransform: 'uppercase' }}>{t('dash_col_desc')}</th>
                                        <th style={{ textAlign: 'left', paddingBottom: 6, fontWeight: 600, color: 'var(--color-text-muted)', fontSize: 11, textTransform: 'uppercase' }}>{t('dash_col_dept')}</th>
                                        <th style={{ textAlign: 'left', paddingBottom: 6, fontWeight: 600, color: 'var(--color-text-muted)', fontSize: 11, textTransform: 'uppercase' }}>{t('dash_col_owner')}</th>
                                        <th style={{ textAlign: 'left', paddingBottom: 6, fontWeight: 600, color: 'var(--color-text-muted)', fontSize: 11, textTransform: 'uppercase' }}>{t('dash_col_approval')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedCell.risks.map((r) => (
                                        <tr key={r.risk_uid} style={{ borderTop: '1px solid var(--color-border)' }}>
                                            <td style={{ padding: '8px 0', fontWeight: 700, color: 'var(--color-primary)', whiteSpace: 'nowrap', paddingRight: 16 }}>{r.risk_uid}</td>
                                            <td style={{ padding: '8px 0', paddingRight: 16, color: 'var(--color-text)' }}>{r.risk_detail}</td>
                                            <td style={{ padding: '8px 0', paddingRight: 16, color: 'var(--color-text-muted)' }}>{r.department || '—'}</td>
                                            <td style={{ padding: '8px 0', paddingRight: 16, color: 'var(--color-text-muted)' }}>{r.risk_owner || '—'}</td>
                                            <td style={{ padding: '8px 0' }}>
                                                <span className={`badge ${r.approval_status === 'Approved' ? 'badge-approved' : r.approval_status === 'Draft' ? 'badge-role' : 'badge-pending'}`}>
                                                    {r.approval_status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <SectionHeader
                        title={t('dash_kri_title')}
                        subtitle={t('dash_kri_sub')}
                        accent="#C07D0A"
                    />
                    <div style={{ padding: '20px 24px' }}>
                        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                            <KriTile label={t('kri_green')}   count={kri_summary.green} bg="#16924F" />
                            <KriTile label={t('kri_amber')}   count={kri_summary.amber} bg="#D4920C" />
                            <KriTile label={t('kri_red')}     count={kri_summary.red}   bg="#D4182E" />
                            <KriTile label={t('kri_no_data')} count={kri_summary.none}  bg="#64748b" />
                        </div>
                        {kri_summary.red_items.length > 0 ? (
                            <>
                                <div style={{ fontSize: 11, fontWeight: 700, color: '#C0152A', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t('dash_red_kris_label')}</div>
                                {kri_summary.red_items.map((k) => (
                                    <AlertRow
                                        key={k.kri_uid}
                                        uid={k.kri_uid} uidColor="#C0152A"
                                        title={k.name}
                                        sub={`${t('dash_current_value')} ${k.current_value}`}
                                        band="extreme"
                                    />
                                ))}
                            </>
                        ) : (
                            <GreenNote text={t('dash_no_red_kris')} />
                        )}
                    </div>
                </div>
            </div>

            {/* ── Top Risks ─────────────────────────────────────────────────── */}
            <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
                <SectionHeader
                    title={t('dash_top_risks_title')}
                    subtitle={t('dash_top_risks_sub')}
                    accent="#D9500A"
                />
                {top_risks.length === 0 ? (
                    <div style={{ padding: 24 }} className="text-muted">{t('no_risks')}</div>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>{t('dash_col_risk')}</th>
                                <th>{t('dash_col_bu')}</th>
                                <th>{t('dash_col_dept')}</th>
                                <th style={{ textAlign: 'center' }}>{t('dash_col_score')}</th>
                                <th style={{ textAlign: 'center' }}>{t('dash_col_trend')}</th>
                                <th>{t('dash_col_approval')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {top_risks.map((r) => {
                                const arrow = trendArrow(r.directional_trend);
                                const approved = r.approval_status === 'Approved';
                                return (
                                    <tr key={r.risk_uid}>
                                        <td>
                                            <span style={{ fontWeight: 700, fontSize: 12, color: '#1a56db' }}>{r.risk_uid}</span>
                                            <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 2 }}>{r.risk_detail}</div>
                                        </td>
                                        {(() => {
                                            const dept = allDepartments.find((d) => d.code === r.department || d.name === r.department);
                                            const bu = isBuMode && dept ? allBus.find((b) => b.id === dept.business_unit_id) : null;
                                            return <td style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{bu ? bu.name : (dept ? dept.name : (r.department || t('dash_enterprise_wide')))}</td>;
                                        })()}
                                        <td style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{allDepartments.find((d) => d.code === r.department || d.name === r.department)?.name || r.department || t('dash_enterprise_wide')}</td>
                                        <td style={{ textAlign: 'center' }}><ScoreChip score={r.residual_score} /></td>
                                        <td style={{ textAlign: 'center', fontWeight: 800, color: arrow.color, fontSize: 16 }}>{arrow.symbol}</td>
                                        <td>
                                            <span style={{
                                                padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                                                background: approved ? '#DCFCE7' : '#FEF9C3',
                                                color: approved ? '#14532D' : '#713F12',
                                                border: `1px solid ${approved ? '#86efac' : '#fde68a'}`,
                                            }}>{r.approval_status}</span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* ── Row 3: Appetite Breaches + Reassessment ───────────────────── */}
            <div className="grid-2" style={{ marginBottom: 20 }}>
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    {/* Category appetite breaches (board-level) */}
                    <SectionHeader
                        title={t('dash_appetite_title')}
                        subtitle={t('dash_appetite_sub')}
                        accent="#C0152A"
                    />
                    <div style={{ padding: '20px 24px' }}>
                        {catBreaches.length === 0 ? (
                            <GreenNote text={t('dash_no_appetite')} />
                        ) : catBreaches.map((cat) => (
                            <div key={cat.risk_category} style={{ marginBottom: 16 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                    <span style={{
                                        padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                                        background: '#DC2626', color: '#fff',
                                    }}>{cat.risk_category}</span>
                                    {cat.appetite_level && (
                                        <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                                            {t('dash_appetite_label')} {cat.appetite_level} · {t('dash_max_score')} {cat.max_residual_score}
                                        </span>
                                    )}
                                </div>
                                {cat.risks.map((r) => (
                                    <AlertRow
                                        key={r.risk_uid}
                                        uid={r.risk_uid} uidColor="#C0152A"
                                        title={r.risk_detail}
                                        sub={`${t('dash_score_vs')} ${r.residual_score} ${t('dash_vs_appetite')}${cat.max_residual_score} · ${deptDisplayName(r.department)}`}
                                        band="extreme"
                                    />
                                ))}
                            </div>
                        ))}
                    </div>

                    {/* Tolerance breaches (per-risk operational threshold) */}
                    {toleranceBreaches.length > 0 && (
                        <>
                            <div style={{ borderTop: '1px solid var(--color-border)', padding: '12px 24px 0' }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 12 }}>
                                    {t('dash_tolerance_label')}
                                </div>
                                {toleranceBreaches.map((r) => (
                                    <AlertRow
                                        key={r.risk_uid}
                                        uid={r.risk_uid} uidColor="#E8601A"
                                        title={r.risk_detail}
                                        sub={`${t('dash_score_vs')} ${r.residual_score} ${t('dash_vs_tolerance')} ${r.tolerance_threshold_score} · ${deptDisplayName(r.department)}`}
                                        band="high"
                                    />
                                ))}
                            </div>
                            <div style={{ height: 20 }} />
                        </>
                    )}
                </div>

                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <SectionHeader
                        title={t('dash_reassess_title')}
                        subtitle={t('dash_reassess_sub')}
                        accent="#C07D0A"
                    />
                    <div style={{ padding: '20px 24px' }}>
                        {reassessment_recommended.length === 0 ? (
                            <GreenNote text={t('dash_no_reassess')} />
                        ) : reassessment_recommended.map((r) => (
                            <AlertRow
                                key={r.risk_uid}
                                uid={r.risk_uid} uidColor="#C07D0A"
                                title={r.risk_detail}
                                sub={`${deptDisplayName(r.department)} · Score ${r.residual_score}`}
                                band="medium"
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Risk Movement ─────────────────────────────────────────────── */}
            <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
                <SectionHeader
                    title={t('dash_movement_title')}
                    subtitle={t('dash_movement_sub')}
                    accent="#1a56db"
                />
                {risk_movement.length === 0 ? (
                    <div style={{ padding: 24 }} className="text-muted">{t('dash_no_movement')}</div>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>{t('dash_col_risk')}</th>
                                <th>{t('dash_col_bu')}</th>
                                <th>{t('dash_col_dept')}</th>
                                <th style={{ textAlign: 'center' }}>{t('dash_col_prev')}</th>
                                <th style={{ textAlign: 'center' }}>{t('dash_col_current')}</th>
                                <th style={{ textAlign: 'center' }}>{t('dash_col_change')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {risk_movement.map((r) => {
                                const arrow = trendArrow(r.direction);
                                return (
                                    <tr key={r.risk_uid}>
                                        <td>
                                            <span style={{ fontWeight: 700, fontSize: 12, color: '#1a56db' }}>{r.risk_uid}</span>
                                            <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 2 }}>{r.risk_detail}</div>
                                        </td>
                                        {(() => {
                                            const dept = allDepartments.find((d) => d.code === r.department || d.name === r.department);
                                            const bu = isBuMode && dept ? allBus.find((b) => b.id === dept.business_unit_id) : null;
                                            return <td style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{bu ? bu.name : (dept ? dept.name : (r.department || t('dash_enterprise_wide')))}</td>;
                                        })()}
                                        <td style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{allDepartments.find((d) => d.code === r.department || d.name === r.department)?.name || r.department || t('dash_enterprise_wide')}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <ScoreChip score={r.previous_score} />
                                            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 3 }}>{r.previous_quarter}</div>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <ScoreChip score={r.current_score} />
                                            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 3 }}>{r.current_quarter}</div>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span style={{ fontWeight: 800, fontSize: 17, color: arrow.color }}>
                                                {arrow.symbol} {r.delta > 0 ? '+' : ''}{r.delta}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* ── Row 5: Compliance + Open Issues ───────────────────────────── */}
            <div className="grid-2" style={{ marginBottom: 20 }}>
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <SectionHeader
                        title={t('dash_compliance_title')}
                        subtitle={`${totalObs} ${t('dash_obs_label')}`}
                        accent="#127A47"
                    />
                    <div style={{ padding: '20px 24px' }}>
                        {[
                            { s: 'Compliant',           color: '#127A47', light: '#DCFCE7' },
                            { s: 'Partially Compliant', color: '#C07D0A', light: '#FEF9C3' },
                            { s: 'Non-Compliant',       color: '#C0152A', light: '#FEE2E2' },
                            { s: 'Not Yet Assessed',    color: '#64748b', light: '#f1f5f9' },
                        ].map(({ s, color, light }) => {
                            const total = compliance_summary.overall.total || 1;
                            const count = compliance_summary.overall[s] || 0;
                            const pct   = Math.round((count / total) * 100);
                            return (
                                <div key={s} style={{ marginBottom: 14 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                                        <span style={{ fontSize: 13, fontWeight: 600 }}>{s}</span>
                                        <span style={{
                                            fontSize: 12, fontWeight: 700, padding: '2px 9px',
                                            background: light, color, borderRadius: 10,
                                            border: `1px solid ${color}40`,
                                        }}>{count} ({pct}%)</span>
                                    </div>
                                    <div style={{ background: 'var(--color-border)', borderRadius: 6, height: 10 }}>
                                        <div style={{ width: `${pct}%`, height: 10, borderRadius: 6, background: color, transition: 'width 0.5s ease' }} />
                                    </div>
                                </div>
                            );
                        })}

                        {compliance_summary.by_regulator.length > 0 && (
                            <>
                                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', marginTop: 20, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t('dash_by_regulator')}</div>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>{t('dash_regulator')}</th>
                                            <th style={{ textAlign: 'center', color: '#127A47' }}>✓</th>
                                            <th style={{ textAlign: 'center', color: '#C07D0A' }}>~</th>
                                            <th style={{ textAlign: 'center', color: '#C0152A' }}>✗</th>
                                            <th style={{ textAlign: 'center', color: '#64748b' }}>?</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {compliance_summary.by_regulator.map((r) => (
                                            <tr key={r.regulatory_body}>
                                                <td style={{ fontSize: 13 }}>{r.regulatory_body}</td>
                                                <td style={{ textAlign: 'center', color: '#127A47', fontWeight: 700 }}>{r.Compliant}</td>
                                                <td style={{ textAlign: 'center', color: '#C07D0A', fontWeight: 700 }}>{r['Partially Compliant']}</td>
                                                <td style={{ textAlign: 'center', color: '#C0152A', fontWeight: 700 }}>{r['Non-Compliant']}</td>
                                                <td style={{ textAlign: 'center', color: '#64748b', fontWeight: 700 }}>{r['Not Yet Assessed']}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </>
                        )}
                    </div>
                </div>

                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <SectionHeader
                        title={t('dash_open_issues_title')}
                        subtitle={`${issues_summary.open_count} ${t('dash_open_issues')}`}
                        accent="#D9500A"
                    />
                    <div style={{ padding: '20px 24px' }}>
                        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                            {[
                                { p: 'Critical', bg: '#C0152A', light: '#FEE2E2' },
                                { p: 'High',     bg: '#D9500A', light: '#FFEDD5' },
                                { p: 'Medium',   bg: '#C07D0A', light: '#FEF9C3' },
                                { p: 'Low',      bg: '#127A47', light: '#DCFCE7' },
                            ].map(({ p, bg }) => (
                                <div key={p} style={{ flex: 1, textAlign: 'center', padding: '12px 6px', borderRadius: 8, background: bg }}>
                                    <div style={{ fontSize: 24, fontWeight: 800, color: '#fff' }}>{issues_summary.by_priority[p] || 0}</div>
                                    <div style={{ fontSize: 11, fontWeight: 600, color: '#fff', marginTop: 3 }}>{p}</div>
                                </div>
                            ))}
                        </div>
                        {issues_summary.overdue.length > 0 ? (
                            <>
                                <div style={{ fontSize: 11, fontWeight: 700, color: '#C0152A', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t('dash_overdue_label')}</div>
                                {issues_summary.overdue.map((i) => (
                                    <AlertRow
                                        key={i.issue_uid}
                                        uid={i.issue_uid} uidColor="#C0152A"
                                        title={i.description}
                                        sub={`${i.days_overdue} ${t('dash_days_overdue')} ${i.owner || '—'}`}
                                        band="extreme"
                                    />
                                ))}
                            </>
                        ) : (
                            <GreenNote text={t('dash_no_overdue')} />
                        )}
                    </div>
                </div>
            </div>

            {/* ── Risk Accepted Register ─────────────────────────────────────── */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <SectionHeader
                    title={t('dash_accepted_title')}
                    subtitle={t('dash_accepted_sub')}
                    accent="#6366f1"
                />
                {risk_accepted_register.risks.length === 0 && risk_accepted_register.issues.length === 0 ? (
                    <div style={{ padding: 24 }} className="text-muted">{t('dash_nothing_accepted')}</div>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>{t('dash_col_item')}</th>
                                <th>{t('dash_col_rationale')}</th>
                                <th>{t('dash_col_approved_by')}</th>
                                <th>{t('dash_col_next_review')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {risk_accepted_register.risks.map((r) => (
                                <tr key={`risk-${r.risk_uid}`}>
                                    <td>
                                        <UidTag text={t('dash_risk_tag')} color="#6366f1" />
                                        <strong>{r.risk_uid}</strong>
                                        <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 2 }}>{r.risk_detail}</div>
                                    </td>
                                    <td style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{r.treatment_plan_rationale || '—'}</td>
                                    <td style={{ fontSize: 13 }}>{r.accept_approved_by || '—'}</td>
                                    <td style={{ fontSize: 13 }}>{r.next_review_date || '—'}</td>
                                </tr>
                            ))}
                            {risk_accepted_register.issues.map((i) => (
                                <tr key={`issue-${i.issue_uid}`}>
                                    <td>
                                        <UidTag text={t('dash_issue_tag')} color="#D9500A" />
                                        <strong>{i.issue_uid}</strong>
                                        <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 2 }}>{i.description}</div>
                                    </td>
                                    <td style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{i.disposition_rationale || '—'}</td>
                                    <td style={{ fontSize: 13 }}>{i.accepted_approved_by || '—'}</td>
                                    <td style={{ fontSize: 13 }}>{i.accepted_review_date || '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

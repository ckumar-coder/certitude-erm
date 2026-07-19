import { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import scoreBadge from '../components/scoreBadge';
import { useT } from '../contexts/LanguageContext';

export default function CriticalRisksLog() {
    const { api, session } = useAuth();
    const t = useT();
    const activeCompany = session.companies.find((c) => c.id === session.activeCompanyId);
    const isBuMode = !!activeCompany?.has_business_units;
    const [risks, setRisks] = useState([]);
    const [allDepartments, setAllDepartments] = useState([]);
    const [allBus, setAllBus] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        Promise.all([
            api.get('/risks?include_closed=true'),
            api.get('/departments').catch(() => []),
            isBuMode ? api.get('/business-units').catch(() => []) : Promise.resolve([]),
        ]).then(([data, depts, bus]) => {
            setRisks((data || []).filter((r) => r.is_critical));
            setAllDepartments(depts || []);
            setAllBus(bus || []);
            setLoading(false);
        }).catch((e) => {
            setError(e.message || 'Failed to load risks');
            setLoading(false);
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div>
            <div style={{ marginBottom: 16 }}>
                <h2 style={{ margin: 0 }}>{t('critical_risks_title')}</h2>
                <p className="text-muted" style={{ marginTop: 4 }}>{t('critical_risks_subtitle')}</p>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <div className="card" style={{ padding: 0 }}>
                {loading ? (
                    <div style={{ padding: 24 }}>{t('loading')}</div>
                ) : risks.length === 0 ? (
                    <div style={{ padding: 24 }} className="text-muted">
                        No risks have been flagged as critical.
                    </div>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>Risk ID</th>
                                <th>Business Unit</th>
                                <th>Department</th>
                                <th>Category</th>
                                <th>Description</th>
                                <th>Owner</th>
                                <th>Residual Score</th>
                                <th>Treatment</th>
                                <th>BCP Status</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {risks.map((r) => {
                                const residual = scoreBadge(r.residual_likelihood, r.residual_impact);
                                return (
                                    <tr key={r.id}>
                                        <td>
                                            <strong>{r.risk_uid}</strong>
                                            <div className="text-muted" style={{ fontSize: 11 }}>v{r.version}</div>
                                        </td>
                                        {(() => {
                                            const dept = allDepartments.find((d) => d.code === r.department || d.name === r.department);
                                            const bu = isBuMode && dept ? allBus.find((b) => b.id === dept.business_unit_id) : null;
                                            return <td>{bu ? bu.name : (dept ? dept.name : (r.department || '—'))}</td>;
                                        })()}
                                        <td>{allDepartments.find((d) => d.code === r.department || d.name === r.department)?.name || r.department || '—'}</td>
                                        <td>
                                            {r.risk_category}
                                            {r.sub_category && (
                                                <div className="text-muted" style={{ fontSize: 11 }}>{r.sub_category}</div>
                                            )}
                                        </td>
                                        <td style={{ maxWidth: 260 }}>{r.risk_detail}</td>
                                        <td>{r.risk_owner || '—'}</td>
                                        <td>
                                            <span className={`badge ${residual.className}`}>
                                                {residual.label} ({residual.score})
                                            </span>
                                        </td>
                                        <td>{r.treatment_strategy || '—'}</td>
                                        <td>{r.bcp_status || '—'}</td>
                                        <td>
                                            <span className={`badge ${r.workflow_status === 'Approved' ? 'badge-approved' : r.workflow_status === 'Closed' ? 'badge-low' : 'badge-medium'}`}>
                                                {r.workflow_status || '—'}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {!loading && risks.length > 0 && (
                <div className="text-muted" style={{ marginTop: 8, fontSize: 12 }}>
                    {risks.length} critical risk{risks.length !== 1 ? 's' : ''} on record
                </div>
            )}
        </div>
    );
}

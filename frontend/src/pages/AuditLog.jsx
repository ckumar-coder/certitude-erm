import { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { useT } from '../contexts/LanguageContext';

const SECURITY_ACTIONS = new Set([
    'login_failed', 'account_locked', 'mfa_verify_failed', 'mfa_enrolled',
    'login', 'password_changed', 'password_reset_requested',
    'password_reset_completed', 'logout',
]);

const ACTION_BADGE = {
    account_locked:            { label: 'Account Locked',      style: { background: '#fee2e2', color: '#991b1b' } },
    login_failed:              { label: 'Login Failed',         style: { background: '#fef3c7', color: '#92400e' } },
    mfa_verify_failed:         { label: 'MFA Failed',          style: { background: '#fef3c7', color: '#92400e' } },
    login:                     { label: 'Login',               style: { background: '#dcfce7', color: '#166534' } },
    mfa_enrolled:              { label: 'MFA Enrolled',        style: { background: '#dcfce7', color: '#166534' } },
    password_changed:          { label: 'Password Changed',    style: { background: '#dbeafe', color: '#1e40af' } },
    password_reset_requested:  { label: 'Reset Requested',     style: { background: '#ede9fe', color: '#5b21b6' } },
    password_reset_completed:  { label: 'Reset Completed',     style: { background: '#ede9fe', color: '#5b21b6' } },
    logout:                    { label: 'Logout',              style: { background: '#f3f4f6', color: '#374151' } },
};

function ActionCell({ action }) {
    const badge = ACTION_BADGE[action];
    if (badge) {
        return (
            <span style={{
                ...badge.style,
                padding: '2px 8px',
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 600,
            }}>
                {badge.label}
            </span>
        );
    }
    return <span style={{ fontSize: 12 }}>{action}</span>;
}

const ENTITY_TYPES = [
    { value: '',            label: 'All entity types' },
    { value: 'risk',        label: 'Risk' },
    { value: 'control',     label: 'Control' },
    { value: 'kri',         label: 'KRI' },
    { value: 'obligation',  label: 'Obligation' },
    { value: 'issue',       label: 'Issue' },
    { value: 'policy',      label: 'Policy' },
    { value: 'user',        label: 'User' },
    { value: 'company',     label: 'Company' },
];

export default function AuditLog() {
    const { api } = useAuth();
    const t = useT();
    const [tab, setTab]               = useState('all');
    const [entries, setEntries]       = useState([]);
    const [secEntries, setSecEntries] = useState([]);
    const [loading, setLoading]       = useState(true);
    const [secLoading, setSecLoading] = useState(false);
    const [error, setError]           = useState('');
    const [entityFilter, setEntityFilter] = useState('');
    const [actorFilter, setActorFilter]   = useState('');

    function fetchAuditLog(entityType) {
        setLoading(true);
        const qs = entityType ? `?entity_type=${encodeURIComponent(entityType)}` : '';
        api.get(`/audit-log${qs}`)
            .then(setEntries)
            .catch((e) => setError(e.message || 'Failed to load audit log'))
            .finally(() => setLoading(false));
    }

    useEffect(() => {
        fetchAuditLog(entityFilter);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [entityFilter]);

    function switchTab(t) {
        setTab(t);
        if (t === 'security' && secEntries.length === 0) {
            setSecLoading(true);
            api.get('/admin/security-log')
                .then(setSecEntries)
                .catch((e) => setError(e.message || 'Failed to load security log'))
                .finally(() => setSecLoading(false));
        }
    }

    const allRows   = tab === 'security' ? secEntries : entries;
    const isLoading = tab === 'security' ? secLoading : loading;

    // Client-side actor filter (applied on top of server-side entity filter)
    const rows = actorFilter.trim()
        ? allRows.filter((e) => (e.changed_by_email || '').toLowerCase().includes(actorFilter.trim().toLowerCase()))
        : allRows;

    return (
        <div>
            <h1 className="page-title">{t('audit_title')}</h1>
            <p className="page-subtitle">{t('audit_subtitle')}</p>

            {error && <div className="alert alert-error">{error}</div>}

            {/* Tab bar */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <button
                    className={`btn btn-sm ${tab === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => switchTab('all')}
                >
                    {t('audit_all_events')}
                </button>
                <button
                    className={`btn btn-sm ${tab === 'security' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => switchTab('security')}
                >
                    🔒 {t('audit_security_events')}
                </button>
            </div>

            {/* Filters — only shown on All Events tab */}
            {tab === 'all' && (
                <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                    <select
                        className="form-control"
                        style={{ width: 'auto', minWidth: 180 }}
                        value={entityFilter}
                        onChange={(e) => setEntityFilter(e.target.value)}
                    >
                        {ENTITY_TYPES.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                    <input
                        className="form-control"
                        style={{ width: 220 }}
                        placeholder={t('audit_filter_actor')}
                        value={actorFilter}
                        onChange={(e) => setActorFilter(e.target.value)}
                    />
                    {(entityFilter || actorFilter) && (
                        <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => { setEntityFilter(''); setActorFilter(''); }}
                        >
                            {t('audit_clear_filters')}
                        </button>
                    )}
                    <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                        {rows.length} {rows.length === 1 ? 'entry' : 'entries'}
                    </span>
                </div>
            )}

            <div className="card" style={{ padding: 0 }}>
                {isLoading ? (
                    <div style={{ padding: 24 }}>{t('loading')}</div>
                ) : rows.length === 0 ? (
                    <div style={{ padding: 24 }} className="text-muted">
                        {tab === 'security' ? t('audit_no_sec_events') : t('audit_no_events')}
                    </div>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>{t('audit_when')}</th>
                                <th>{t('audit_actor')}</th>
                                <th>{t('audit_action')}</th>
                                <th>{t('audit_entity')}</th>
                                <th>{t('audit_details')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((e) => (
                                <tr
                                    key={e.id}
                                    style={
                                        e.action === 'account_locked'
                                            ? { background: 'rgba(254,226,226,0.3)' }
                                            : e.action === 'login_failed' || e.action === 'mfa_verify_failed'
                                            ? { background: 'rgba(254,243,199,0.3)' }
                                            : {}
                                    }
                                >
                                    <td style={{ whiteSpace: 'nowrap' }}>
                                        {new Date(e.changed_at).toLocaleString()}
                                    </td>
                                    <td>{e.changed_by_email || 'system'}</td>
                                    <td><ActionCell action={e.action} /></td>
                                    <td>
                                        {e.entity_type}
                                        {e.entity_id ? ` #${e.entity_id}` : ''}
                                    </td>
                                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>
                                        {e.details ? JSON.stringify(e.details) : ''}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

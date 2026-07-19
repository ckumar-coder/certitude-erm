import { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { useT } from '../contexts/LanguageContext';

export default function EmailSettings() {
    const { api, session } = useAuth();
    const t = useT();
    const [form, setForm] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [message, setMessage] = useState(null); // { type: 'success'|'error', text }

    const isParent = !session?.companies?.find(c => c.id === session.activeCompanyId)?.parent_company_id;

    useEffect(() => {
        api.get('/email-settings')
            .then(cfg => setForm(cfg || {
                inherit_from_parent: false,
                smtp_host: '',
                smtp_port: 587,
                smtp_secure: true,
                smtp_user: '',
                smtp_password: '',
                from_name: '',
                from_email: '',
                reply_to: '',
            }))
            .catch(() => setMessage({ type: 'error', text: 'Failed to load email settings.' }))
            .finally(() => setLoading(false));
    }, []);

    function set(field, value) {
        setForm(f => ({ ...f, [field]: value }));
        setMessage(null);
    }

    async function handleSave(e) {
        e.preventDefault();
        setSaving(true);
        setMessage(null);
        try {
            const result = await api.put('/email-settings', form);
            setMessage({ type: 'success', text: result.message });
        } catch (err) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setSaving(false);
        }
    }

    async function handleTest() {
        setTesting(true);
        setMessage(null);
        try {
            const result = await api.post('/email-settings/test', {});
            setMessage({ type: 'success', text: result.message });
        } catch (err) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setTesting(false);
        }
    }

    if (loading) return <div className="page-content"><p>{t('loading')}</p></div>;
    if (!form)   return <div className="page-content"><p>Unable to load settings.</p></div>;

    return (
        <div className="page-content">
            <div className="page-header">
                <h1>{t('email_title')}</h1>
                <p className="page-subtitle">{t('email_subtitle')}</p>
            </div>

            {message && (
                <div className={`alert alert-${message.type === 'success' ? 'success' : 'error'}`} style={{ marginBottom: 16 }}>
                    {message.text}
                </div>
            )}

            {/* Inherit toggle — only shown for subsidiaries */}
            {!isParent && (
                <div className="card" style={{ marginBottom: 16, padding: 16 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14 }}>
                        <input
                            type="checkbox"
                            checked={form.inherit_from_parent || false}
                            onChange={e => set('inherit_from_parent', e.target.checked)}
                        />
                        <span>
                            <strong>Inherit email settings from parent company</strong>
                            <br />
                            <span style={{ color: '#666', fontSize: 12 }}>
                                When enabled, this subsidiary will use the parent&#x2019;s SMTP configuration.
                                The fields below are ignored.
                            </span>
                        </span>
                    </label>
                </div>
            )}

            <form onSubmit={handleSave} style={{ opacity: form.inherit_from_parent ? 0.5 : 1, pointerEvents: form.inherit_from_parent ? 'none' : 'auto' }}>
                <div className="card" style={{ padding: 20, marginBottom: 16 }}>
                    <h3 style={{ marginTop: 0, fontSize: 14, color: '#1F3964' }}>SMTP Server</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 12, alignItems: 'end' }}>
                        <div className="form-group" style={{ margin: 0 }}>
                            <label>{t('smtp_host')}</label>
                            <input className="form-control" value={form.smtp_host || ''} onChange={e => set('smtp_host', e.target.value)}
                                placeholder="smtp.office365.com" required={!form.inherit_from_parent} />
                        </div>
                        <div className="form-group" style={{ margin: 0, width: 90 }}>
                            <label>{t('smtp_port')}</label>
                            <input className="form-control" type="number" value={form.smtp_port || 587}
                                onChange={e => set('smtp_port', parseInt(e.target.value, 10))} />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                            <label style={{ display: 'block', marginBottom: 6 }}>TLS</label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', paddingTop: 6 }}>
                                <input type="checkbox" checked={form.smtp_secure !== false}
                                    onChange={e => set('smtp_secure', e.target.checked)} />
                                Enabled
                            </label>
                        </div>
                    </div>
                    <p style={{ fontSize: 11, color: '#888', margin: '8px 0 0' }}>
                        Common ports: 587 (STARTTLS), 465 (SSL), 25 (unencrypted — not recommended)
                    </p>
                </div>

                <div className="card" style={{ padding: 20, marginBottom: 16 }}>
                    <h3 style={{ marginTop: 0, fontSize: 14, color: '#1F3964' }}>Authentication</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div className="form-group" style={{ margin: 0 }}>
                            <label>Username</label>
                            <input className="form-control" value={form.smtp_user || ''} onChange={e => set('smtp_user', e.target.value)}
                                placeholder="noreply@yourcompany.com" autoComplete="username" />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                            <label>Password</label>
                            <input className="form-control" type="password" value={form.smtp_password || ''}
                                onChange={e => set('smtp_password', e.target.value)}
                                placeholder={form.verified_at ? 'Leave blank to keep existing' : 'Enter SMTP password'}
                                autoComplete="new-password" />
                        </div>
                    </div>
                </div>

                <div className="card" style={{ padding: 20, marginBottom: 16 }}>
                    <h3 style={{ marginTop: 0, fontSize: 14, color: '#1F3964' }}>Sender Details</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div className="form-group" style={{ margin: 0 }}>
                            <label>From Name</label>
                            <input className="form-control" value={form.from_name || ''} onChange={e => set('from_name', e.target.value)}
                                placeholder="ABC Financial GRC" />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                            <label>From Email</label>
                            <input className="form-control" type="email" value={form.from_email || ''} onChange={e => set('from_email', e.target.value)}
                                placeholder="noreply@yourcompany.com" />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                            <label>Reply-To <span style={{ color: '#888', fontWeight: 400 }}>(optional)</span></label>
                            <input className="form-control" type="email" value={form.reply_to || ''} onChange={e => set('reply_to', e.target.value)}
                                placeholder="grc-admin@yourcompany.com" />
                        </div>
                    </div>
                </div>

                {form.verified_at && (
                    <p style={{ fontSize: 12, color: '#107C10', marginBottom: 12 }}>
                        ✅ Verified {new Date(form.verified_at).toLocaleString()}
                    </p>
                )}

                <div style={{ display: 'flex', gap: 10 }}>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                        {saving ? t('saving') : 'Save settings'}
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={handleTest} disabled={testing || saving}>
                        {testing ? 'Sending…' : t('test_email')}
                    </button>
                </div>
            </form>
        </div>
    );
}

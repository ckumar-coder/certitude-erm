import { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';

export default function AiIntegration() {
    const { api } = useAuth();

    const [current, setCurrent]   = useState(null);  // { ai_api_provider, ai_api_key_masked, has_ai_key }
    const [loading, setLoading]   = useState(true);
    const [saving, setSaving]     = useState(false);
    const [message, setMessage]   = useState(null);  // { type: 'success'|'error', text }
    const [provider, setProvider] = useState('');
    const [apiKey, setApiKey]     = useState('');
    const [showKey, setShowKey]   = useState(false);

    useEffect(() => {
        api.get('/admin/ai-settings')
            .then((d) => {
                setCurrent(d);
                setProvider(d.ai_api_provider || '');
            })
            .catch(() => setMessage({ type: 'error', text: 'Failed to load AI integration settings.' }))
            .finally(() => setLoading(false));
    }, [api]);

    async function handleSave(e) {
        e.preventDefault();
        if (!provider.trim()) {
            setMessage({ type: 'error', text: 'Provider name is required.' });
            return;
        }
        setSaving(true);
        setMessage(null);
        try {
            const body = { ai_api_provider: provider.trim() };
            if (apiKey.trim()) body.ai_api_key = apiKey.trim();
            const result = await api.patch('/admin/ai-settings', body);
            setCurrent(result);
            setApiKey('');
            setShowKey(false);
            setMessage({ type: 'success', text: 'AI integration settings saved.' });
        } catch (err) {
            setMessage({ type: 'error', text: err.message || 'Failed to save settings.' });
        } finally {
            setSaving(false);
        }
    }

    async function handleRemove() {
        if (!window.confirm('Remove the API key? The AI scan button will be disabled until a new key is configured.')) return;
        setSaving(true);
        setMessage(null);
        try {
            const result = await api.patch('/admin/ai-settings', { ai_api_key: null, ai_api_provider: '' });
            setCurrent(result);
            setProvider('');
            setApiKey('');
            setMessage({ type: 'success', text: 'API key removed.' });
        } catch (err) {
            setMessage({ type: 'error', text: err.message || 'Failed to remove key.' });
        } finally {
            setSaving(false);
        }
    }

    if (loading) return <div className="page-content"><p>Loading…</p></div>;

    return (
        <div style={{ maxWidth: 680 }}>
            <div style={{ marginBottom: 24 }}>
                <h2 style={{ margin: '0 0 4px' }}>AI Integration</h2>
                <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 14 }}>
                    Configure an AI API key to enable the AI-assisted Horizon Scanning feature.
                    The key is stored server-side only and never returned in full.
                </p>
            </div>

            {/* Status card */}
            <div className="card" style={{ marginBottom: 20, padding: '14px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>Status</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{
                                width: 8, height: 8, borderRadius: '50%',
                                background: current?.has_ai_key ? '#22c55e' : '#94a3b8',
                                display: 'inline-block', flexShrink: 0,
                            }} />
                            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>
                                {current?.has_ai_key ? 'Active' : 'No key configured'}
                            </span>
                        </div>
                    </div>
                    {current?.has_ai_key && (
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>Provider</div>
                            <div style={{ fontSize: 14, fontWeight: 600 }}>{current.ai_api_provider || '—'}</div>
                        </div>
                    )}
                    {current?.has_ai_key && (
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>Key (masked)</div>
                            <div style={{ fontSize: 13, fontFamily: 'monospace', color: 'var(--color-text)' }}>{current.ai_api_key_masked}</div>
                        </div>
                    )}
                </div>
            </div>

            {/* How it works callout */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '14px 18px', marginBottom: 24 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1B3A6B', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.04em' }}>How it works</div>
                <div style={{ fontSize: 13, color: 'var(--color-text)', lineHeight: 1.65 }}>
                    When an AI API key is configured, users with the CRO, Consultant CRO, or Risk Manager role
                    can trigger an AI scan from the Horizon Scanning module. The AI fetches signals from external
                    regulatory and news sources, drafts candidate entries, and places them in a <strong>Draft</strong> status
                    for human review. Drafts are only visible to qualified roles and must be published before
                    they appear in the active signal list.
                </div>
                <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 10, lineHeight: 1.55 }}>
                    The API key is sent server-side only — it is never exposed to the browser. You can use any
                    provider that supports a chat completion endpoint (e.g. Anthropic, OpenAI). Enter the key
                    below and set the provider name for reference.
                </div>
            </div>

            {message && (
                <div style={{
                    background: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
                    border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
                    borderRadius: 6, padding: '10px 14px', fontSize: 13,
                    color: message.type === 'success' ? '#166534' : '#991b1b',
                    marginBottom: 16,
                }}>
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSave} className="card">
                <h3 style={{ marginTop: 0, fontSize: 14, marginBottom: 18 }}>
                    {current?.has_ai_key ? 'Update API key' : 'Configure API key'}
                </h3>

                <div className="form-group" style={{ marginBottom: 16 }}>
                    <label>Provider name *</label>
                    <input
                        className="form-control"
                        placeholder="e.g. Anthropic, OpenAI, Azure OpenAI"
                        value={provider}
                        onChange={(e) => setProvider(e.target.value)}
                        required
                    />
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>
                        Display label — shown for reference only.
                    </div>
                </div>

                <div className="form-group" style={{ marginBottom: 20 }}>
                    <label>{current?.has_ai_key ? 'New API key (leave blank to keep existing)' : 'API key *'}</label>
                    <div style={{ position: 'relative' }}>
                        <input
                            className="form-control"
                            type={showKey ? 'text' : 'password'}
                            placeholder={current?.has_ai_key ? current.ai_api_key_masked : 'sk-…'}
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            autoComplete="new-password"
                            style={{ paddingRight: 48 }}
                        />
                        <button
                            type="button"
                            onClick={() => setShowKey((v) => !v)}
                            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                                background: 'none', border: 'none', cursor: 'pointer', fontSize: 13,
                                color: 'var(--color-text-muted)', padding: '2px 4px' }}>
                            {showKey ? 'Hide' : 'Show'}
                        </button>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>
                        Stored securely server-side. Never returned to the browser in full.
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                        {saving ? 'Saving…' : (current?.has_ai_key ? 'Update settings' : 'Save settings')}
                    </button>
                    {current?.has_ai_key && (
                        <button type="button" className="btn btn-secondary"
                            style={{ color: '#991b1b', borderColor: '#fecaca' }}
                            disabled={saving} onClick={handleRemove}>
                            Remove key
                        </button>
                    )}
                </div>
            </form>

            <div style={{ marginTop: 24, padding: '14px 18px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#92400e', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.04em' }}>Security note</div>
                <div style={{ fontSize: 12, color: '#78350f', lineHeight: 1.6 }}>
                    API keys are sensitive credentials. Only share them with trusted administrators.
                    Rotate the key if you believe it has been compromised. The key is never logged
                    or returned in audit trails in full — only the last 4 characters are stored for identification.
                </div>
            </div>
        </div>
    );
}

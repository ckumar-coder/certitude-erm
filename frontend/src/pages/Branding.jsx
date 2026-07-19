import { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { useT } from '../contexts/LanguageContext';

const MAX_LOGO_BYTES = 1_500_000; // ~1.5MB, comfortably under the API's data-URI limit

export default function Branding() {
    const { api, refreshMe } = useAuth();
    const t = useT();
    const [branding, setBranding] = useState(null);
    const [color, setColor] = useState('#2563eb');
    const [logoDataUri, setLogoDataUri] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    async function load() {
        setLoading(true);
        setError('');
        try {
            const data = await api.get('/companies/current/branding');
            setBranding(data);
            setColor(data.branding_primary_color || '#2563eb');
            setLogoDataUri(data.branding_logo_url || null);
        } catch (e) {
            setError(e.message || 'Failed to load branding');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function handleLogoFile(e) {
        const file = e.target.files?.[0];
        if (!file) return;
        setError('');
        if (file.size > MAX_LOGO_BYTES) {
            setError(`Logo is too large (${Math.round(file.size / 1024)}KB). Please use an image under ${Math.round(MAX_LOGO_BYTES / 1024)}KB.`);
            return;
        }
        const reader = new FileReader();
        reader.onload = () => setLogoDataUri(reader.result);
        reader.readAsDataURL(file);
    }

    async function handleSave() {
        setSaving(true);
        setError('');
        setSuccess('');
        try {
            await api.patch('/companies/current/branding', {
                branding_primary_color: color,
                branding_logo_url: logoDataUri,
            });
            setSuccess('Branding updated.');
            await refreshMe();
            await load();
        } catch (e) {
            setError(e.message || 'Failed to save branding');
        } finally {
            setSaving(false);
        }
    }

    async function handleRemoveLogo() {
        setLogoDataUri(null);
    }

    return (
        <div>
            <h1 className="page-title">{t('branding_title')}</h1>
            <p className="page-subtitle">
                {t('branding_subtitle')}
            </p>

            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            {loading ? (
                <div className="card">{t('loading')}</div>
            ) : (
                <div className="card">
                    <div className="form-row">
                        <div className="form-group" style={{ flex: 2 }}>
                            <label>{t('branding_logo')}</label>
                            <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" onChange={handleLogoFile} />
                            <div className="text-muted" style={{ marginTop: 4 }}>
                                PNG, JPEG, SVG, or WebP, under {Math.round(MAX_LOGO_BYTES / 1024)}KB. Shown on the login
                                screen and in the sidebar.
                            </div>
                            {logoDataUri && (
                                <button type="button" className="btn btn-sm btn-secondary" style={{ marginTop: 8 }} onClick={handleRemoveLogo}>
                                    Remove logo
                                </button>
                            )}
                        </div>
                        <div className="form-group">
                            <label>{t('branding_color')}</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ width: 48, height: 38, padding: 2 }} />
                                <input className="form-control" value={color} onChange={(e) => setColor(e.target.value)} style={{ width: 100 }} />
                            </div>
                            <div className="text-muted" style={{ marginTop: 4 }}>
                                Used for buttons, links, and highlights app-wide.
                            </div>
                        </div>
                    </div>

                    <h3>{t('branding_preview')}</h3>
                    <div className="login-card" style={{ maxWidth: 320, margin: '0 0 20px' }}>
                        <div className="login-title">
                            {logoDataUri ? (
                                <img src={logoDataUri} alt="Logo preview" className="login-logo" />
                            ) : (
                                <>🔒 GRC Framework Gateway</>
                            )}
                        </div>
                        {logoDataUri && <div className="login-subtitle">{branding?.name} — GRC Workstation</div>}
                        <button type="button" className="btn btn-primary" style={{ width: '100%', background: color, borderColor: color }}>
                            Sign in
                        </button>
                    </div>

                    <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
                        {saving ? t('saving') : t('branding_save')}
                    </button>
                </div>
            )}
        </div>
    );
}

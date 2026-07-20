import { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { useBranding } from '../components/useBranding';
import certitudeLogo from '../assets/certitude-logo.png';
import { useT } from '../contexts/LanguageContext';

// ── Shared card wrapper ───────────────────────────────────────────────────────
function LoginCard({ branding, children }) {
    const t = useT();
    return (
        <div className="login-screen">
            <div className="login-card">
                <div className="login-title">
                    {branding.loaded && (
                        <img
                            src={branding.logoUrl || certitudeLogo}
                            alt={branding.name || 'Certitude Advisory Services'}
                            className="login-logo"
                        />
                    )}
                </div>
                <div className="login-subtitle">{t('login_subtitle')}</div>
                {children}
            </div>
        </div>
    );
}

// ── Screen 1: Email + password ────────────────────────────────────────────────
function PasswordScreen({ branding }) {
    const { login } = useAuth();
    const t = useT();
    const [email, setEmail]       = useState('');
    const [password, setPassword] = useState('');
    const [error, setError]       = useState('');
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            await login(email, password);
        } catch (err) {
            setError(err.message || 'Login failed');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <LoginCard branding={branding}>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>{t('login_email')}</label>
                    <input
                        type="email"
                        className="form-control"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="username"
                        required
                    />
                </div>
                <div className="form-group">
                    <label>{t('login_password')}</label>
                    <input
                        type="password"
                        className="form-control"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                        required
                    />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submitting}>
                    {submitting ? t('login_signing_in') : t('login_sign_in')}
                </button>
            </form>
            <p style={{ textAlign: 'center', marginTop: 12 }}>
                <a href="/reset-password-request" style={{ color: '#1F3964', fontSize: 12 }}>{t('login_forgot')}</a>
            </p>
        </LoginCard>
    );
}

// ── Screen 2: MFA Setup (enrol authenticator) ─────────────────────────────────
function MfaSetupScreen({ branding }) {
    const { getMfaSetup, confirmMfaSetup, cancelMfa } = useAuth();
    const t = useT();
    const [qrCode, setQrCode]     = useState(null);
    const [secret, setSecret]     = useState('');
    const [code, setCode]         = useState('');
    const [error, setError]       = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [loadingQr, setLoadingQr]   = useState(true);

    useEffect(() => {
        getMfaSetup()
            .then((data) => {
                setQrCode(data.qr_url);
                setSecret(data.secret);
            })
            .catch((err) => setError(err.message || 'Failed to load MFA setup'))
            .finally(() => setLoadingQr(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            await confirmMfaSetup(code.replace(/\s/g, ''));
        } catch (err) {
            setError(err.message || 'Invalid code. Please try again.');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <LoginCard branding={branding}>
            <h3 style={{ marginTop: 0, marginBottom: 8, fontSize: 15, color: '#1F3964' }}>
                Set Up Two-Factor Authentication
            </h3>
            <p style={{ fontSize: 13, color: '#444', marginBottom: 12 }}>
                Qatar Post GRC Workstation requires MFA for all accounts. Scan the QR code below
                with <strong>Google Authenticator</strong>, <strong>Authy</strong>, or any
                TOTP-compatible app, then enter the 6-digit code to confirm.
            </p>

            {error && <div className="alert alert-error">{error}</div>}

            {loadingQr ? (
                <p style={{ textAlign: 'center', color: '#888', fontSize: 13 }}>Loading QR code…</p>
            ) : qrCode ? (
                <div style={{ textAlign: 'center', margin: '12px 0' }}>
                    <img src={qrCode} alt="MFA QR code" style={{ width: 180, height: 180 }} />
                    <p style={{ fontSize: 11, color: '#888', marginTop: 6 }}>
                        Can't scan? Enter this key manually:
                    </p>
                    <code style={{ fontSize: 11, wordBreak: 'break-all', color: '#1F3964' }}>{secret}</code>
                </div>
            ) : null}

            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>6-digit verification code</label>
                    <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9 ]{6,7}"
                        className="form-control"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="000 000"
                        autoComplete="one-time-code"
                        required
                    />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submitting || loadingQr}>
                    {submitting ? 'Verifying…' : 'Confirm and sign in'}
                </button>
                <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ width: '100%', marginTop: 8 }}
                    onClick={cancelMfa}
                >
                    {t('cancel')}
                </button>
            </form>
        </LoginCard>
    );
}

// ── Screen 3: MFA Verify (already enrolled) ───────────────────────────────────
function MfaVerifyScreen({ branding }) {
    const { verifyMfa, cancelMfa } = useAuth();
    const t = useT();
    const [code, setCode]         = useState('');
    const [error, setError]       = useState('');
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            await verifyMfa(code.replace(/\s/g, ''));
        } catch (err) {
            setError(err.message || 'Invalid code. Please try again.');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <LoginCard branding={branding}>
            <h3 style={{ marginTop: 0, marginBottom: 8, fontSize: 15, color: '#1F3964' }}>
                Two-Factor Authentication
            </h3>
            <p style={{ fontSize: 13, color: '#444', marginBottom: 12 }}>
                Enter the 6-digit code from your authenticator app.
            </p>

            {error && <div className="alert alert-error">{error}</div>}

            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Verification code</label>
                    <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9 ]{6,7}"
                        className="form-control"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="000 000"
                        autoComplete="one-time-code"
                        autoFocus
                        required
                    />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submitting}>
                    {submitting ? 'Verifying…' : 'Verify and sign in'}
                </button>
                <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ width: '100%', marginTop: 8 }}
                    onClick={cancelMfa}
                >
                    {t('back')}
                </button>
            </form>
        </LoginCard>
    );
}

// ── Root export: picks which screen to show ───────────────────────────────────
export default function Login() {
    const { mfaState } = useAuth();
    const branding = useBranding();

    if (mfaState?.type === 'setup')  return <MfaSetupScreen  branding={branding} />;
    if (mfaState?.type === 'verify') return <MfaVerifyScreen branding={branding} />;
    return <PasswordScreen branding={branding} />;
}

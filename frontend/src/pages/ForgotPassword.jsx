import { useState } from 'react';
import { createApiClient } from '../api';

const api = createApiClient(null, () => {});

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [result, setResult] = useState(null); // { found, tempPassword? }
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const data = await api.post('/auth/forgot-password', { email });
            setResult(data);
        } catch (err) {
            setError(err.message || 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    function copyPassword() {
        if (result?.tempPassword) {
            navigator.clipboard.writeText(result.tempPassword);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    }

    if (result) {
        if (!result.found) {
            return (
                <div className="auth-container">
                    <div className="auth-card">
                        <h2>No account found</h2>
                        <p style={{ color: '#444', fontSize: 13, lineHeight: 1.6 }}>
                            No active account is registered for <strong>{email}</strong>. Please check the address and try again.
                        </p>
                        <p style={{ textAlign: 'center', marginTop: 20 }}>
                            <a href="/reset-password-request" style={{ color: '#1F3964', fontSize: 13 }}>← Try again</a>
                            {' · '}
                            <a href="/" style={{ color: '#1F3964', fontSize: 13 }}>Back to login</a>
                        </p>
                    </div>
                </div>
            );
        }

        return (
            <div className="auth-container">
                <div className="auth-card">
                    <h2>Temporary password generated</h2>
                    <p style={{ color: '#444', fontSize: 13, lineHeight: 1.6, marginBottom: 16 }}>
                        A temporary password has been set for <strong>{email}</strong>.
                        Log in with it below — you'll be required to choose a new password immediately.
                    </p>

                    <div style={{
                        background: '#f0f4ff',
                        border: '1.5px solid #1F3964',
                        borderRadius: 8,
                        padding: '14px 16px',
                        marginBottom: 16,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                    }}>
                        <code style={{ fontSize: 18, fontWeight: 700, letterSpacing: 2, color: '#1F3964', wordBreak: 'break-all' }}>
                            {result.tempPassword}
                        </code>
                        <button
                            onClick={copyPassword}
                            style={{
                                background: 'none',
                                border: '1px solid #1F3964',
                                borderRadius: 4,
                                padding: '4px 10px',
                                cursor: 'pointer',
                                fontSize: 12,
                                color: '#1F3964',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {copied ? '✓ Copied' : 'Copy'}
                        </button>
                    </div>

                    <p style={{ color: '#888', fontSize: 11, marginBottom: 20 }}>
                        This password expires once you set a new one. Keep this page open until you've logged in.
                    </p>

                    <a href="/" className="btn btn-primary" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
                        Go to login →
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2>Reset your password</h2>
                <p style={{ color: '#666', fontSize: 13, marginBottom: 20 }}>
                    Enter your email address and a temporary password will be generated for you to log in with.
                </p>

                {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Email address</label>
                        <input
                            className="form-control"
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            autoComplete="username"
                            autoFocus
                            required
                        />
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
                        {loading ? 'Generating…' : 'Get temporary password'}
                    </button>
                </form>
                <p style={{ textAlign: 'center', marginTop: 12 }}>
                    <a href="/" style={{ color: '#1F3964', fontSize: 13 }}>← Back to login</a>
                </p>
            </div>
        </div>
    );
}

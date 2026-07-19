import { useState } from 'react';
import { createApiClient } from '../api';

const api = createApiClient(null, () => {});

export default function ResetPassword() {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [status, setStatus] = useState(null); // { type: 'success'|'error', text }
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        if (password !== confirm) {
            setStatus({ type: 'error', text: 'Passwords do not match.' });
            return;
        }
        setLoading(true);
        setStatus(null);
        try {
            const res = await api.post('/auth/reset-password', { token, newPassword: password });
            setStatus({ type: 'success', text: res.message });
        } catch (err) {
            setStatus({ type: 'error', text: err.message });
        } finally {
            setLoading(false);
        }
    }

    if (!token) {
        return (
            <div className="auth-container">
                <div className="auth-card">
                    <p style={{ color: '#c0392b' }}>Invalid reset link. Please request a new one.</p>
                    <a href="/" style={{ color: '#1F3964', fontSize: 13 }}>← Back to login</a>
                </div>
            </div>
        );
    }

    if (status?.type === 'success') {
        return (
            <div className="auth-container">
                <div className="auth-card">
                    <h2>Password reset</h2>
                    <p style={{ color: '#107C10', marginBottom: 16 }}>{status.text}</p>
                    <a href="/" className="btn btn-primary" style={{ display: 'inline-block' }}>Sign in</a>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2>Set new password</h2>
                <p style={{ color: '#666', fontSize: 13, marginBottom: 20 }}>
                    Choose a strong password. It must be at least 8 characters and include upper, lower, number, and special characters.
                </p>

                {status?.type === 'error' && (
                    <div className="alert alert-error" style={{ marginBottom: 16 }}>{status.text}</div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>New password</label>
                        <input
                            className="form-control"
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            autoComplete="new-password"
                            required
                            autoFocus
                        />
                    </div>
                    <div className="form-group">
                        <label>Confirm password</label>
                        <input
                            className="form-control"
                            type="password"
                            value={confirm}
                            onChange={e => setConfirm(e.target.value)}
                            autoComplete="new-password"
                            required
                        />
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
                        {loading ? 'Resetting…' : 'Reset password'}
                    </button>
                </form>
                <p style={{ textAlign: 'center', marginTop: 16 }}>
                    <a href="/" style={{ color: '#1F3964', fontSize: 13 }}>← Back to login</a>
                </p>
            </div>
        </div>
    );
}

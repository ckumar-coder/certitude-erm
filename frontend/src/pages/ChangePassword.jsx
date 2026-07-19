import { useState } from 'react';
import { useAuth } from '../AuthContext';

export default function ChangePassword({ forced, reason }) {
    const { changePassword, logout } = useAuth();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');

        if (newPassword !== confirmPassword) {
            setError('New password and confirmation do not match');
            return;
        }

        setSubmitting(true);
        try {
            await changePassword(currentPassword, newPassword);
        } catch (e) {
            setError(e.message || 'Could not update password');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="login-screen">
            <div className="login-card">
                <div className="login-title">Update your password</div>
                {forced && (
                    <div className="alert alert-info">
                        {reason === 'expired'
                            ? 'Your password has expired and must be changed before continuing.'
                            : 'A password change is required before you can continue.'}
                    </div>
                )}
                {error && <div className="alert alert-error">{error}</div>}
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Current Password</label>
                        <input
                            type="password"
                            className="form-control"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            autoComplete="current-password"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>New Password</label>
                        <input
                            type="password"
                            className="form-control"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            autoComplete="new-password"
                            required
                        />
                        <div className="text-muted" style={{ marginTop: 6 }}>
                            At least 10 characters, with uppercase, lowercase, a number, and a special character.
                            Cannot reuse your last 5 passwords.
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Confirm New Password</label>
                        <input
                            type="password"
                            className="form-control"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            autoComplete="new-password"
                            required
                        />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submitting}>
                        {submitting ? 'Updating…' : 'Update password'}
                    </button>
                </form>
                <div style={{ textAlign: 'center', marginTop: 16 }}>
                    <button className="nav-link" style={{ width: 'auto', display: 'inline', color: 'var(--color-text-muted)' }} onClick={logout}>
                        Sign out instead
                    </button>
                </div>
            </div>
        </div>
    );
}

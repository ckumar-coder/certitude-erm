// auth.js
//
// Session management, password policy enforcement, account lockout,
// and the generic audit-log writer. Used by server.js.

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const pool = require('./db');

const SESSION_IDLE_TIMEOUT_MINUTES = parseInt(process.env.SESSION_TIMEOUT_MINUTES, 10) || 10; // G8: 10 min inactivity
const SESSION_IDLE_TIMEOUT_MS = SESSION_IDLE_TIMEOUT_MINUTES * 60 * 1000;

const MAX_FAILED_ATTEMPTS = 5; // G8: lock after 5 failed attempts
const LOCKOUT_MINUTES = parseInt(process.env.LOCKOUT_MINUTES, 10) || 30; // G8: e.g. 30 minutes

const PASSWORD_HISTORY_LIMIT = 5; // G8: no reuse of last 5 passwords
const PASSWORD_MAX_AGE_DAYS = parseInt(process.env.PASSWORD_MAX_AGE_DAYS, 10) || 90; // G8: forced rotation, configurable

// ============================================================
// Password policy (G8)
// ============================================================

// Returns an array of human-readable requirement strings that the
// given password fails to meet. Empty array = password is acceptable.
function validatePasswordPolicy(password) {
    const problems = [];
    if (!password || password.length < 10) problems.push('be at least 10 characters long');
    if (!/[A-Z]/.test(password || '')) problems.push('include an uppercase letter');
    if (!/[a-z]/.test(password || '')) problems.push('include a lowercase letter');
    if (!/[0-9]/.test(password || '')) problems.push('include a number');
    if (!/[^A-Za-z0-9]/.test(password || '')) problems.push('include a special character');
    return problems;
}

// Checks the new password against the user's last N password hashes.
async function isPasswordReused(userId, newPassword) {
    const result = await pool.query(
        `SELECT password_hash FROM password_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
        [userId, PASSWORD_HISTORY_LIMIT]
    );
    for (const row of result.rows) {
        if (await bcrypt.compare(newPassword, row.password_hash)) return true;
    }
    return false;
}

// Sets a new password: hashes it, updates the user row, records it in
// password_history, clears lockout/must-change flags, and trims history
// to the configured limit.
async function setPassword(userId, newPassword) {
    const hash = await bcrypt.hash(newPassword, 10);

    await pool.query(
        `UPDATE users
         SET password_hash = $1, password_changed_at = now(), must_change_password = false,
             failed_login_attempts = 0, locked_until = NULL
         WHERE id = $2`,
        [hash, userId]
    );

    await pool.query('INSERT INTO password_history (user_id, password_hash) VALUES ($1, $2)', [userId, hash]);

    await pool.query(
        `DELETE FROM password_history
         WHERE user_id = $1
         AND id NOT IN (
            SELECT id FROM password_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2
         )`,
        [userId, PASSWORD_HISTORY_LIMIT]
    );

    return hash;
}

function isPasswordExpired(user) {
    if (!user.password_changed_at) return false;
    const ageMs = Date.now() - new Date(user.password_changed_at).getTime();
    return ageMs > PASSWORD_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
}

// ============================================================
// Account lockout (G8)
// ============================================================

function isLocked(user) {
    return !!user.locked_until && new Date(user.locked_until) > new Date();
}

async function recordFailedLogin(userId) {
    // Auto-decay (fixed 2026-07-23): this route is only ever reached after
    // the caller has already checked isLocked(user) and found the account
    // NOT currently locked -- but that's true both for an account that has
    // never been locked (locked_until IS NULL) and for one whose lock timer
    // has simply expired (locked_until is in the past, counter never
    // cleared). Previously both cases fell through to the same plain
    // increment, so a lock that had already expired would still have its
    // old, stale failed_login_attempts count (>= MAX_FAILED_ATTEMPTS)
    // sitting there -- meaning the very next failed attempt (including this
    // app's own login-page "wrong password" UX, or test-suite.js's
    // deliberate first wrong-password test) would immediately re-lock the
    // account for another LOCKOUT_MINUTES, regardless of how long the prior
    // lock had already been sitting expired. This is the "self-perpetuating
    // loop" flagged as an open question elsewhere in this codebase's notes.
    // Fixed by treating an expired lock as an implicit counter reset: if
    // locked_until is set and in the past, this failed attempt starts a
    // fresh count at 1 (well under the threshold) instead of continuing the
    // old streak, and the stale locked_until is cleared in the same atomic
    // UPDATE. A still-active lock (defensive branch only -- unreachable via
    // the current login route, which always checks isLocked() first) keeps
    // incrementing normally.
    const result = await pool.query(
        `UPDATE users
         SET failed_login_attempts = CASE
                 WHEN locked_until IS NOT NULL AND locked_until <= now() THEN 1
                 ELSE failed_login_attempts + 1
             END,
             locked_until = CASE
                 WHEN locked_until IS NOT NULL AND locked_until <= now() THEN NULL
                 ELSE locked_until
             END
         WHERE id = $1
         RETURNING failed_login_attempts`,
        [userId]
    );
    const attempts = result.rows[0].failed_login_attempts;
    if (attempts >= MAX_FAILED_ATTEMPTS) {
        await pool.query(
            `UPDATE users SET locked_until = now() + make_interval(mins => $2) WHERE id = $1`,
            [userId, LOCKOUT_MINUTES]
        );
        // Lockout invalidates any existing sessions immediately.
        await pool.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
    }
    return attempts;
}

async function resetFailedLogins(userId) {
    await pool.query('UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1', [userId]);
}

// ============================================================
// Sessions (server-side, sliding inactivity timeout)
// ============================================================

function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

async function createSession(userId, activeCompanyId) {
    // Single-session enforcement: a new login invalidates all existing sessions
    // for this user. This ensures a compromised credential cannot maintain a
    // silent parallel session alongside the legitimate user.
    await pool.query('DELETE FROM sessions WHERE user_id = $1', [userId]);

    const token = generateToken();
    const expiresAt = new Date(Date.now() + SESSION_IDLE_TIMEOUT_MS);
    await pool.query('INSERT INTO sessions (token, user_id, active_company_id, expires_at) VALUES ($1, $2, $3, $4)', [
        token,
        userId,
        activeCompanyId,
        expiresAt,
    ]);
    return { token, expiresAt, idleTimeoutMinutes: SESSION_IDLE_TIMEOUT_MINUTES };
}

// Creates a short-lived (5-minute) pre-authentication session used to
// bridge the gap between password verification and TOTP completion.
// Pre-auth sessions are rejected by the main authenticate middleware and
// can only be used with /api/auth/mfa/* endpoints.
const PRE_AUTH_TIMEOUT_MS = 5 * 60 * 1000;

async function createPreAuthSession(userId) {
    const token = generateToken();
    const expiresAt = new Date(Date.now() + PRE_AUTH_TIMEOUT_MS);
    await pool.query(
        'INSERT INTO sessions (token, user_id, active_company_id, expires_at, pre_auth) VALUES ($1, $2, NULL, $3, TRUE)',
        [token, userId, expiresAt]
    );
    return { token };
}

// Validates a session token, and -- if valid -- slides its expiry
// forward by the idle timeout (G8: 10 minutes of inactivity).
async function touchSession(token) {
    const newExpiry = new Date(Date.now() + SESSION_IDLE_TIMEOUT_MS);
    const result = await pool.query(
        `UPDATE sessions SET last_activity_at = now(), expires_at = $2
         WHERE token = $1 AND expires_at > now()
         RETURNING *`,
        [token, newExpiry]
    );
    return result.rows[0] || null;
}

async function destroySession(token) {
    await pool.query('DELETE FROM sessions WHERE token = $1', [token]);
}

async function setActiveCompany(token, companyId) {
    await pool.query('UPDATE sessions SET active_company_id = $1 WHERE token = $2', [companyId, token]);
}

// Periodically called to clear out expired sessions so the table
// doesn't grow without bound.
async function purgeExpiredSessions() {
    await pool.query('DELETE FROM sessions WHERE expires_at < now()');
}

// ============================================================
// Audit log (G10)
// ============================================================

// Generic append-only audit entry. `actor` is the req.user object
// (or null for system actions). `details` is any JSON-serializable
// object describing what changed.
async function logAudit(client, { companyId, entityType, entityId, action, actor, details }) {
    const executor = client || pool;
    await executor.query(
        `INSERT INTO audit_log (company_id, entity_type, entity_id, action, changed_by, changed_by_email, details)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
            companyId || null,
            entityType,
            entityId || null,
            action,
            actor?.id || null,
            actor?.email || null,
            details ? JSON.stringify(details) : null,
        ]
    );
}

module.exports = {
    SESSION_IDLE_TIMEOUT_MINUTES,
    PASSWORD_MAX_AGE_DAYS,
    MAX_FAILED_ATTEMPTS,
    LOCKOUT_MINUTES,
    validatePasswordPolicy,
    isPasswordReused,
    setPassword,
    isPasswordExpired,
    isLocked,
    recordFailedLogin,
    resetFailedLogins,
    createSession,
    createPreAuthSession,
    touchSession,
    destroySession,
    setActiveCompany,
    purgeExpiredSessions,
    logAudit,
};

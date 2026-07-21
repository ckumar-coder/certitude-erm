// email.js
//
// Per-company SMTP email service.
//
// Credentials are AES-256-GCM encrypted at rest using EMAIL_ENCRYPTION_KEY
// from the environment (32-byte hex string = 64 hex chars).
//
// Hierarchy resolution: when a company has inherit_from_parent = TRUE,
// the system walks up the parent chain until it finds a verified config.
//
// Zero npm dependencies — uses Node's built-in `crypto` + `net` for SMTP.
// For SMTP delivery we use the `nodemailer` package which is added to
// package.json (it's the only additional dependency for this feature).

const crypto = require('crypto');
const pool   = require('./db');

// ── Encryption helpers ────────────────────────────────────────────────────────
// Key must be a 64-char hex string (32 bytes).  Set EMAIL_ENCRYPTION_KEY in
// the Cloud Run environment / Secret Manager.

const ALGO = 'aes-256-gcm';

function getEncKey() {
    const hex = process.env.EMAIL_ENCRYPTION_KEY || '';
    if (hex.length !== 64) {
        throw new Error('EMAIL_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)');
    }
    return Buffer.from(hex, 'hex');
}

function encryptPassword(plaintext) {
    const key = getEncKey();
    const iv  = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGO, key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    // Format: iv(12) + tag(16) + ciphertext — all base64
    return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

function decryptPassword(b64) {
    const key  = getEncKey();
    const buf  = Buffer.from(b64, 'base64');
    const iv   = buf.slice(0, 12);
    const tag  = buf.slice(12, 28);
    const data = buf.slice(28);
    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

// ── Config resolution ─────────────────────────────────────────────────────────

// Returns the effective email config for a company, walking up the parent
// hierarchy if inherit_from_parent is TRUE. Returns null if none found.
async function resolveEmailConfig(companyId) {
    const visited = new Set();
    let id = companyId;

    while (id && !visited.has(id)) {
        visited.add(id);

        const { rows } = await pool.query(
            'SELECT * FROM company_email_settings WHERE company_id = $1',
            [id]
        );

        const cfg = rows[0];
        if (cfg) {
            if (cfg.inherit_from_parent) {
                // Walk up to parent
                const parent = await pool.query(
                    'SELECT parent_company_id FROM companies WHERE id = $1',
                    [id]
                );
                id = parent.rows[0]?.parent_company_id || null;
                continue;
            }
            if (!cfg.verified_at) return null; // Not yet test-verified
            return cfg;
        }

        // No record — check parent
        const parent = await pool.query(
            'SELECT parent_company_id FROM companies WHERE id = $1',
            [id]
        );
        id = parent.rows[0]?.parent_company_id || null;
    }

    return null;
}

// ── Nodemailer transport ──────────────────────────────────────────────────────

// Lazily required so the module loads even if nodemailer isn't installed yet.
function getTransport(cfg) {
    let nodemailer;
    try {
        nodemailer = require('nodemailer');
    } catch {
        throw new Error('nodemailer is not installed. Run: npm install nodemailer');
    }

    const password = cfg.smtp_password_enc ? decryptPassword(cfg.smtp_password_enc) : '';

    return nodemailer.createTransport({
        host: cfg.smtp_host,
        port: cfg.smtp_port || 587,
        secure: cfg.smtp_port === 465, // true for 465 (SSL), STARTTLS otherwise
        auth: { user: cfg.smtp_user, pass: password },
        tls: { rejectUnauthorized: true },
    });
}

// ── Public API ────────────────────────────────────────────────────────────────

// Sends an email using the resolved config for companyId.
// Returns { sent: true } or { sent: false, reason: string }
async function sendEmail(companyId, { to, subject, html, text }) {
    const cfg = await resolveEmailConfig(companyId);
    if (!cfg) return { sent: false, reason: 'Email not configured or not verified for this company' };

    const transport = getTransport(cfg);
    await transport.sendMail({
        from: cfg.from_name ? `"${cfg.from_name}" <${cfg.from_email}>` : cfg.from_email,
        replyTo: cfg.reply_to || undefined,
        to,
        subject,
        html,
        text,
    });

    return { sent: true };
}

// Sends a test email and marks the config as verified on success.
async function sendTestEmail(companyId, toEmail) {
    const { rows } = await pool.query(
        'SELECT * FROM company_email_settings WHERE company_id = $1',
        [companyId]
    );
    const cfg = rows[0];
    if (!cfg) throw new Error('No email settings found for this company');
    if (cfg.inherit_from_parent) throw new Error('This company inherits email settings from its parent');

    const transport = getTransport(cfg);
    await transport.sendMail({
        from: cfg.from_name ? `"${cfg.from_name}" <${cfg.from_email}>` : cfg.from_email,
        to: toEmail,
        subject: 'ERM Workstation — Email Configuration Test',
        html: `<p>This is a test email confirming that your SMTP settings for <strong>ERM Workstation</strong> are working correctly.</p>
               <p>You can now use this email account to send system notifications.</p>`,
        text: 'This is a test email confirming that your SMTP settings for ERM Workstation are working correctly.',
    });

    // Mark as verified
    await pool.query(
        'UPDATE company_email_settings SET verified_at = now(), updated_at = now() WHERE company_id = $1',
        [companyId]
    );
}

// Sends the temporary password to a new user. Falls back gracefully if email
// is not configured — caller decides whether to include it in the API response.
async function sendTempPassword(companyId, { toEmail, toName, tempPassword, loginUrl }) {
    const html = `
<p>Hello ${toName || 'there'},</p>
<p>An account has been created for you on <strong>ERM Workstation</strong>.</p>
<p><strong>Login URL:</strong> <a href="${loginUrl}">${loginUrl}</a><br/>
   <strong>Email:</strong> ${toEmail}<br/>
   <strong>Temporary password:</strong> <code>${tempPassword}</code></p>
<p>You will be prompted to change your password on first login. Please do so immediately.</p>
<p>This email was sent automatically. If you did not expect this, please contact your GRC administrator.</p>
    `.trim();

    const text = `Hello ${toName || 'there'},\n\nAn account has been created for you on ERM Workstation.\n\nLogin URL: ${loginUrl}\nEmail: ${toEmail}\nTemporary password: ${tempPassword}\n\nYou will be prompted to change your password on first login.`;

    return sendEmail(companyId, {
        to: toEmail,
        subject: 'Your ERM Workstation account',
        html,
        text,
    });
}

// Sends a password reset link.
async function sendPasswordResetEmail(companyId, { toEmail, toName, resetUrl }) {
    const html = `
<p>Hello ${toName || 'there'},</p>
<p>A password reset was requested for your <strong>ERM Workstation</strong> account.</p>
<p><a href="${resetUrl}" style="padding:10px 20px;background:#1F3964;color:#fff;text-decoration:none;border-radius:4px;">Reset my password</a></p>
<p>Or copy this link: <a href="${resetUrl}">${resetUrl}</a></p>
<p>This link expires in <strong>60 minutes</strong>. If you did not request a reset, you can safely ignore this email.</p>
    `.trim();

    const text = `Hello ${toName || 'there'},\n\nA password reset was requested for your ERM Workstation account.\n\nReset link (expires in 60 minutes):\n${resetUrl}\n\nIf you did not request a reset, you can safely ignore this email.`;

    return sendEmail(companyId, {
        to: toEmail,
        subject: 'Reset your ERM Workstation password',
        html,
        text,
    });
}

// Security alert email — sent to the affected user when a high-severity
// security event occurs (e.g. account lockout). Uses the user's first
// company's SMTP config; fails silently if none is configured.
async function sendSecurityAlert(user, event, details = {}) {
    const pool = require('./db');
    // Find the user's first active company to get SMTP settings.
    const companyRes = await pool.query(
        `SELECT company_id FROM user_companies WHERE user_id = $1 LIMIT 1`,
        [user.id]
    );
    if (!companyRes.rows.length) return;
    const companyId = companyRes.rows[0].company_id;

    const eventLabels = {
        account_locked: 'Account Locked',
    };
    const label = eventLabels[event] || event;
    const when  = new Date().toUTCString();

    const html = `
        <p>Hi ${user.full_name || user.email},</p>
        <p>A security event was recorded on your ERM Workstation account:</p>
        <table style="border-collapse:collapse;margin:16px 0;">
            <tr><td style="padding:4px 12px 4px 0;color:#666;">Event</td><td><strong>${label}</strong></td></tr>
            <tr><td style="padding:4px 12px 4px 0;color:#666;">Time</td><td>${when}</td></tr>
            ${details.attempts ? `<tr><td style="padding:4px 12px 4px 0;color:#666;">Failed attempts</td><td>${details.attempts}</td></tr>` : ''}
        </table>
        <p>If this was not you, please contact your GRC administrator immediately.</p>
        <p style="color:#666;font-size:12px;">ERM Workstation — automated security notification</p>
    `;
    const text = `Security event: ${label}\nTime: ${when}\nIf this was not you, contact your administrator.`;

    return sendEmail(companyId, {
        to: user.email,
        subject: `ERM Workstation Security Alert: ${label}`,
        html,
        text,
    });
}

module.exports = {
    encryptPassword,
    decryptPassword,
    resolveEmailConfig,
    sendEmail,
    sendTestEmail,
    sendTempPassword,
    sendPasswordResetEmail,
    sendSecurityAlert,
};

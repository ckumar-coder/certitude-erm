import { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { useT } from '../contexts/LanguageContext';

const ROLES = ['Super Admin', 'Admin', 'Risk Champion', 'Risk Owner', 'Risk Manager', 'CRO', 'Viewer', 'Consultant CRO'];
const DEPT_SCOPED_ROLES = ['Risk Champion', 'Risk Owner', 'Risk Manager'];

// BU-scoped multi-select (BU Mode companies only)
function BuCheckboxCell({ user, bus, onSave }) {
    const t = useT();
    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState(user.business_unit_ids || []);

    const isDeptScoped = DEPT_SCOPED_ROLES.includes(user.role);
    const display = selected.length > 0
        ? bus.filter((b) => selected.includes(String(b.id))).map((b) => b.name).join(', ')
        : '—';

    if (!isDeptScoped) return <td>{display}</td>;

    function toggle(id) {
        setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
    }

    async function save() {
        await onSave(user.id, { business_unit_ids: selected });
        setOpen(false);
    }

    return (
        <td style={{ position: 'relative' }}>
            <button className="btn btn-sm btn-secondary" onClick={() => setOpen((o) => !o)}
                style={{ fontSize: 12, padding: '3px 10px', whiteSpace: 'nowrap' }}>
                {display} ✎
            </button>
            {open && (
                <div style={{
                    position: 'absolute', zIndex: 100, top: '100%', left: 0,
                    background: '#fff', border: '1px solid #ccc', borderRadius: 6,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.12)', padding: '10px 14px', minWidth: 200,
                }}>
                    <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8, color: '#555' }}>{t('business_units_label')}</div>
                    {bus.map((b) => (
                        <label key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 6, fontWeight: 'normal' }}>
                            <input type="checkbox" checked={selected.includes(String(b.id))} onChange={() => toggle(String(b.id))}
                                style={{ width: 15, height: 15, cursor: 'pointer' }} />
                            {b.name} <span style={{ fontSize: 11, color: '#888' }}>({b.code})</span>
                        </label>
                    ))}
                    {bus.length === 0 && <div style={{ fontSize: 12, color: '#999' }}>{t('no_bus_short')}</div>}
                    <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                        <button className="btn btn-sm btn-primary" onClick={save} style={{ flex: 1 }}>{t('save')}</button>
                        <button className="btn btn-sm btn-secondary" onClick={() => setOpen(false)} style={{ flex: 1 }}>{t('cancel')}</button>
                    </div>
                </div>
            )}
        </td>
    );
}

function DeptCheckboxCell({ user, departments, onSave }) {
    const t = useT();
    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState(
        user.departments && user.departments.length > 0 ? user.departments : (user.department ? [user.department] : [])
    );

    const isDeptScoped = DEPT_SCOPED_ROLES.includes(user.role);
    const display = selected.length > 0
        ? selected.map((code) => departments.find((d) => d.code === code)?.name || code).join(', ')
        : '—';

    if (!isDeptScoped) return <td>{display}</td>;

    function toggle(code) {
        setSelected((prev) => prev.includes(code) ? prev.filter((x) => x !== code) : [...prev, code]);
    }

    async function save() {
        await onSave(user.id, selected);
        setOpen(false);
    }

    return (
        <td style={{ position: 'relative' }}>
            <button
                className="btn btn-sm btn-secondary"
                onClick={() => setOpen((o) => !o)}
                style={{ fontSize: 12, padding: '3px 10px', whiteSpace: 'nowrap' }}
            >
                {display} ✎
            </button>
            {open && (
                <div style={{
                    position: 'absolute', zIndex: 100, top: '100%', left: 0,
                    background: '#fff', border: '1px solid #ccc', borderRadius: 6,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.12)', padding: '10px 14px',
                    minWidth: 200,
                }}>
                    <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8, color: '#555' }}>{t('departments_label')}</div>
                    {departments.map((d) => (
                        <label key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 6, fontWeight: 'normal' }}>
                            <input
                                type="checkbox"
                                checked={selected.includes(d.code)}
                                onChange={() => toggle(d.code)}
                                style={{ width: 15, height: 15, cursor: 'pointer' }}
                            />
                            {d.name}
                        </label>
                    ))}
                    {departments.length === 0 && <div style={{ fontSize: 12, color: '#999' }}>{t('no_depts_yet')}</div>}
                    <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                        <button className="btn btn-sm btn-primary" onClick={save} style={{ flex: 1 }}>{t('save')}</button>
                        <button className="btn btn-sm btn-secondary" onClick={() => setOpen(false)} style={{ flex: 1 }}>{t('cancel')}</button>
                    </div>
                </div>
            )}
        </td>
    );
}

export default function UserManagement() {
    const { api, session } = useAuth();
    const t = useT();
    const activeCompany = session?.companies?.find((c) => c.id === session.activeCompanyId);
    const isBuMode = !!activeCompany?.has_business_units;

    const [users, setUsers] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [bus, setBus] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [demoMode, setDemoMode] = useState(null);

    const maskEmail = (email) => {
        if (!demoMode) return email;
        const [local, domain] = email.split('@');
        if (!domain) return email;
        const tld = domain.includes('.') ? domain.slice(domain.lastIndexOf('.')) : '';
        return `${local[0]}***@***${tld}`;
    };

    async function load() {
        setLoading(true);
        setError('');
        try {
            setUsers(await api.get('/users'));
        } catch (e) {
            setError(e.message || 'Failed to load users');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
        api.get('/departments').then(setDepartments).catch(() => {});
        if (isBuMode) api.get('/business-units').then(setBus).catch(() => {});
        fetch('/api/version').then(r => r.json()).then(d => setDemoMode(d.demo_mode || null)).catch(() => {});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function handleRoleChange(userId, role) {
        try {
            await api.patch(`/users/${userId}`, { role });
            await load();
        } catch (e) {
            setError(e.message || 'Failed to update role');
        }
    }

    async function handleDeptChange(userId, depts) {
        try {
            await api.patch(`/users/${userId}`, { departments: depts });
            await load();
        } catch (e) {
            setError(e.message || 'Failed to update departments');
        }
    }

    async function handleBuChange(userId, patch) {
        try {
            await api.patch(`/users/${userId}`, patch);
            await load();
        } catch (e) {
            setError(e.message || 'Failed to update Business Units');
        }
    }

    async function handleRemove(userId, email) {
        if (!window.confirm(`Revoke ${email}'s access to ${session.companies.find((c) => c.id === session.activeCompanyId)?.name}?`)) return;
        try {
            await api.delete(`/users/${userId}`);
            setInfo('');
            await load();
        } catch (e) {
            setError(e.message || 'Failed to remove user');
        }
    }

    async function handleToggleActive(userId, email, makeActive) {
        const verb = makeActive ? 'Reactivate' : 'Deactivate';
        if (!window.confirm(`${verb} ${email}'s account? ${makeActive ? '' : 'This signs them out everywhere immediately.'}`)) return;
        try {
            await api.post(`/users/${userId}/active`, { is_active: makeActive });
            await load();
        } catch (e) {
            setError(e.message || `Failed to ${verb.toLowerCase()} user`);
        }
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 className="page-title">{t('users_title')}</h1>
                    <p className="page-subtitle">{t('users_subtitle')}</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowForm((s) => !s)}>
                    {showForm ? t('close') : t('add_user')}
                </button>
            </div>

            {error && <div className="alert alert-error">{error}</div>}
            {info && <div className="alert alert-info">{info}</div>}

            {showForm && (
                <AddUserForm
                    onCreated={(msg) => {
                        setShowForm(false);
                        setInfo(msg);
                        load();
                    }}
                    onError={setError}
                />
            )}

            <div className="card" style={{ padding: 0 }}>
                {loading ? (
                    <div style={{ padding: 24 }}>{t('loading')}</div>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>{t('col_email')}</th>
                                <th>{t('col_name')}</th>
                                <th>{t('col_role')}</th>
                                <th>{t('col_functional_role')}</th>
                                <th>{isBuMode ? t('col_bu_scope') : t('col_department')}</th>
                                <th>{t('col_status')}</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((u) => (
                                <tr key={u.id}>
                                    <td>{maskEmail(u.email)}</td>
                                    <td>{u.full_name || '—'}</td>
                                    <td>
                                        <select className="form-control" value={u.role} onChange={(e) => handleRoleChange(u.id, e.target.value)} style={{ width: 140 }}>
                                            {ROLES.map((r) => (
                                                <option key={r} value={r}>
                                                    {r}
                                                </option>
                                            ))}
                                        </select>
                                    </td>
                                    <td>{u.functional_role || '—'}</td>
                                    {isBuMode
                                        ? <BuCheckboxCell user={u} bus={bus} onSave={handleBuChange} />
                                        : <DeptCheckboxCell user={u} departments={departments} onSave={handleDeptChange} />
                                    }
                                    <td>
                                        {!u.is_active ? (
                                            <span className="badge badge-extreme">{t('status_deactivated')}</span>
                                        ) : u.must_change_password ? (
                                            <span className="badge badge-pending">{t('status_activation_pending')}</span>
                                        ) : (
                                            <span className="badge badge-approved">{t('status_active')}</span>
                                        )}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            <button
                                                className="btn btn-sm btn-secondary"
                                                onClick={() => handleToggleActive(u.id, u.email, !u.is_active)}
                                            >
                                                {u.is_active ? t('deactivate') : t('reactivate')}
                                            </button>
                                            <button className="btn btn-sm btn-danger" onClick={() => handleRemove(u.id, u.email)}>
                                                {t('remove')}
                                            </button>
                                        </div>
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

function TempPasswordModal({ email, tempPassword, emailSent, onDone }) {
    const [copied, setCopied] = useState(false);

    function copy() {
        navigator.clipboard.writeText(tempPassword);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
        }}>
            <div style={{
                background: '#fff', borderRadius: 10, padding: '28px 32px',
                maxWidth: 440, width: '90%', boxShadow: '0 8px 40px rgba(0,0,0,0.22)',
            }}>
                <h3 style={{ margin: '0 0 8px', color: '#1F3964' }}>User created — save this password</h3>
                <p style={{ fontSize: 13, color: '#444', margin: '0 0 16px', lineHeight: 1.5 }}>
                    {emailSent
                        ? <>A welcome email has been sent to <strong>{email}</strong>. The temporary password is also shown below — share it directly if the email doesn&apos;t arrive.</>
                        : <>The temporary password for <strong>{email}</strong> is shown below. Share it with the user — they will be required to change it on first login.</>
                    }
                </p>
                <div style={{
                    background: '#f0f4ff', border: '1.5px solid #1F3964', borderRadius: 8,
                    padding: '12px 16px', display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', gap: 12, marginBottom: 20,
                }}>
                    <code style={{ fontSize: 20, fontWeight: 700, letterSpacing: 2, color: '#1F3964', wordBreak: 'break-all' }}>
                        {tempPassword}
                    </code>
                    <button type="button" onClick={copy} style={{
                        background: 'none', border: '1px solid #1F3964', borderRadius: 4,
                        padding: '4px 12px', cursor: 'pointer', fontSize: 12, color: '#1F3964', whiteSpace: 'nowrap',
                    }}>
                        {copied ? '✓ Copied' : 'Copy'}
                    </button>
                </div>
                <button type="button" className="btn btn-primary" style={{ width: '100%' }} onClick={onDone}>
                    Done — I've noted the password
                </button>
            </div>
        </div>
    );
}

function AddUserForm({ onCreated, onError }) {
    const { api, session } = useAuth();
    const t = useT();
    const activeCompany = session?.companies?.find((c) => c.id === session.activeCompanyId);
    const isBuMode = !!activeCompany?.has_business_units;

    const [form, setForm] = useState({ email: '', full_name: '', role: 'Risk Manager', functional_role: '', departments: [], business_unit_ids: [] });
    const [submitting, setSubmitting] = useState(false);
    const [departments, setDepartments] = useState([]);
    const [bus, setBus] = useState([]);
    const [pendingResult, setPendingResult] = useState(null); // { email, tempPassword }

    useEffect(() => {
        api.get('/departments').then(setDepartments).catch(() => {});
        if (isBuMode) api.get('/business-units').then(setBus).catch(() => {});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function update(field, value) {
        setForm((f) => ({ ...f, [field]: value }));
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setSubmitting(true);
        onError('');
        try {
            const result = await api.post('/users', form);
            if (result.tempPassword) {
                // Show modal — call onCreated after admin acknowledges the password.
                setPendingResult({ email: form.email, role: form.role, tempPassword: result.tempPassword, emailSent: result.email_sent });
            } else {
                // User already exists globally and is active at other companies.
                // They can log in with their existing credentials.
                onCreated(`${form.email} added with role ${form.role}. They can log in with their existing credentials.`);
            }
        } catch (e) {
            onError(e.message || 'Failed to add user');
        } finally {
            setSubmitting(false);
        }
    }

    if (pendingResult) {
        return (
            <TempPasswordModal
                email={pendingResult.email}
                tempPassword={pendingResult.tempPassword}
                emailSent={pendingResult.emailSent}
                onDone={() => onCreated(`${pendingResult.email} added with role ${pendingResult.role}.`)}
            />
        );
    }

    return (
        <form className="card" onSubmit={handleSubmit}>
            <h3 style={{ marginTop: 0 }}>{t('add_user_title')}</h3>
            <div className="form-row">
                <div className="form-group">
                    <label>{t('col_email')}</label>
                    <input type="email" className="form-control" value={form.email} onChange={(e) => update('email', e.target.value)} required />
                </div>
                <div className="form-group">
                    <label>{t('full_name')}</label>
                    <input className="form-control" value={form.full_name} onChange={(e) => update('full_name', e.target.value)} />
                </div>
            </div>
            <div className="form-row">
                <div className="form-group">
                    <label>{t('col_role')}</label>
                    <select className="form-control" value={form.role} onChange={(e) => update('role', e.target.value)}>
                        {ROLES.map((r) => (
                            <option key={r} value={r}>
                                {r}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="form-group">
                    <label>{t('functional_role')}</label>
                    <input
                        className="form-control"
                        placeholder="e.g. Risk Owner"
                        value={form.functional_role}
                        onChange={(e) => update('functional_role', e.target.value)}
                    />
                </div>
                {DEPT_SCOPED_ROLES.includes(form.role) && isBuMode && (
                <div className="form-group">
                    <label>{t('bu_scope')} <span className="text-muted">{t('leave_blank_hint')}</span></label>
                    <div style={{ border: '1px solid #ccc', borderRadius: 6, padding: '6px 10px', background: '#fff', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {bus.map((b) => {
                            const checked = form.business_unit_ids.includes(String(b.id));
                            return (
                                <label key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 'normal', margin: 0 }}>
                                    <input type="checkbox" checked={checked}
                                        onChange={() => {
                                            const next = checked
                                                ? form.business_unit_ids.filter((x) => x !== String(b.id))
                                                : [...form.business_unit_ids, String(b.id)];
                                            update('business_unit_ids', next);
                                        }}
                                        style={{ width: 16, height: 16, cursor: 'pointer' }} />
                                    {b.name} <span style={{ fontSize: 12, color: '#888' }}>({b.code})</span>
                                </label>
                            );
                        })}
                        {bus.length === 0 && <span className="text-muted" style={{ fontSize: 13 }}>{t('no_bus_yet')}</span>}
                    </div>
                </div>
                )}
                {DEPT_SCOPED_ROLES.includes(form.role) && !isBuMode && (
                <div className="form-group">
                    <label>{t('dept_label')} <span className="text-muted">{t('leave_blank_hint')}</span></label>
                    <div style={{ border: '1px solid #ccc', borderRadius: 6, padding: '6px 10px', background: '#fff', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {departments.map((d) => {
                            const checked = form.departments.includes(d.code);
                            return (
                                <label key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 'normal', margin: 0 }}>
                                    <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => {
                                            const next = checked
                                                ? form.departments.filter((x) => x !== d.code)
                                                : [...form.departments, d.code];
                                            update('departments', next);
                                        }}
                                        style={{ width: 16, height: 16, cursor: 'pointer' }}
                                    />
                                    {d.name}
                                </label>
                            );
                        })}
                        {departments.length === 0 && <span className="text-muted" style={{ fontSize: 13 }}>{t('no_depts_yet')}</span>}
                    </div>
                </div>
                )}
            </div>
            <div className="text-muted" style={{ marginBottom: 12 }}>
                {t('temp_pass_hint')}
            </div>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? t('adding') : t('add_user')}
            </button>
        </form>
    );
}

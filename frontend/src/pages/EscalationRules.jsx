import { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { useT } from '../contexts/LanguageContext';

const TRIGGER_LABELS = {
    control_test_overdue:      'Control test overdue',
    kri_red_breach:            'KRI breaches Red zone',
    policy_review_due:         'Policy review due',
    issue_overdue:             'Issue overdue',
    obligation_non_compliant:  'Compliance obligation Non-Compliant',
};

const ALL_TRIGGERS = Object.keys(TRIGGER_LABELS);
const NOTIFY_TARGETS = ['Owner', 'Department Manager', 'Admin'];
const ESCALATE_TARGETS = ['Department Manager', 'Admin'];

const BLANK_FORM = {
    trigger_type:        '',
    threshold_days:      0,
    notify_target:       'Owner',
    escalate_after_days: '',
    escalate_to:         '',
    is_active:           true,
};

// ── Add Rule Modal ────────────────────────────────────────────────────────────

function AddRuleModal({ availableTriggers, onSave, onClose, saving }) {
    const [form, setForm] = useState({ ...BLANK_FORM, trigger_type: availableTriggers[0] || '' });
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    function handleSubmit(e) {
        e.preventDefault();
        const payload = {
            trigger_type:        form.trigger_type,
            threshold_days:      parseInt(form.threshold_days, 10) || 0,
            notify_target:       form.notify_target,
            escalate_after_days: form.escalate_after_days === '' ? null : parseInt(form.escalate_after_days, 10),
            escalate_to:         form.escalate_after_days === '' ? null : (form.escalate_to || null),
            is_active:           form.is_active,
        };
        onSave(payload);
    }

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
            <div style={{
                background: '#fff', borderRadius: 10, padding: 28,
                width: 480, boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            }}>
                <h3 style={{ margin: '0 0 18px', fontSize: 17, fontWeight: 700, color: 'var(--color-text)' }}>
                    Add Escalation Rule
                </h3>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Trigger *</label>
                        <select
                            className="form-control"
                            value={form.trigger_type}
                            onChange={e => set('trigger_type', e.target.value)}
                            required
                        >
                            {availableTriggers.map(t => (
                                <option key={t} value={t}>{TRIGGER_LABELS[t]}</option>
                            ))}
                        </select>
                        <div className="text-muted" style={{ fontSize: 11, marginTop: 4 }}>
                            {form.trigger_type === 'policy_review_due'
                                ? 'Notify this many days before the review date.'
                                : 'Notify this many days after the event occurs.'}
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        <div className="form-group">
                            <label className="form-label">Notify after (days) *</label>
                            <input
                                type="number" min="0" className="form-control"
                                value={form.threshold_days}
                                onChange={e => set('threshold_days', e.target.value)}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Notify</label>
                            <select
                                className="form-control"
                                value={form.notify_target}
                                onChange={e => set('notify_target', e.target.value)}
                            >
                                {NOTIFY_TARGETS.map(t => <option key={t}>{t}</option>)}
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        <div className="form-group">
                            <label className="form-label">Escalate after (days)</label>
                            <input
                                type="number" min="0" className="form-control"
                                placeholder="Leave blank to skip"
                                value={form.escalate_after_days}
                                onChange={e => set('escalate_after_days', e.target.value)}
                            />
                            <div className="text-muted" style={{ fontSize: 11, marginTop: 4 }}>
                                Extra days after initial notify
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Escalate to</label>
                            <select
                                className="form-control"
                                value={form.escalate_to}
                                disabled={form.escalate_after_days === ''}
                                onChange={e => set('escalate_to', e.target.value)}
                            >
                                <option value="">—</option>
                                {ESCALATE_TARGETS.map(t => <option key={t}>{t}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input
                            type="checkbox"
                            id="esc-active"
                            checked={form.is_active}
                            onChange={e => set('is_active', e.target.checked)}
                        />
                        <label htmlFor="esc-active" style={{ margin: 0, fontWeight: 500 }}>Active</label>
                    </div>

                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={saving || !form.trigger_type}>
                            {saving ? 'Adding…' : 'Add Rule'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function EscalationRules() {
    const { api } = useAuth();
    const t = useT();
    const [rules, setRules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(null);
    const [showAdd, setShowAdd] = useState(false);
    const [adding, setAdding] = useState(false);

    async function load() {
        setLoading(true);
        setError('');
        try {
            setRules(await api.get('/escalation-rules'));
        } catch (e) {
            setError(e.message || 'Failed to load escalation rules');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

    async function updateRule(rule, changes) {
        setSaving(rule.id);
        setError('');
        try {
            const updated = await api.patch(`/escalation-rules/${rule.id}`, changes);
            setRules(rs => rs.map(r => r.id === rule.id ? updated : r));
        } catch (e) {
            setError(e.message || 'Failed to update rule');
        } finally {
            setSaving(null);
        }
    }

    async function addRule(payload) {
        setAdding(true);
        setError('');
        try {
            const created = await api.post('/escalation-rules', payload);
            setRules(rs => [...rs, created].sort((a, b) => a.trigger_type.localeCompare(b.trigger_type)));
            setShowAdd(false);
        } catch (e) {
            setError(e.message || 'Failed to add rule');
        } finally {
            setAdding(false);
        }
    }

    const usedTriggers = new Set(rules.map(r => r.trigger_type));
    const availableTriggers = ALL_TRIGGERS.filter(t => !usedTriggers.has(t));

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <h1 className="page-title" style={{ margin: 0 }}>{t('escalation_title')}</h1>
                {availableTriggers.length > 0 && (
                    <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
                        + Add Rule
                    </button>
                )}
            </div>
            <p className="page-subtitle">{t('escalation_subtitle')}</p>

            {error && <div className="alert alert-error">{error}</div>}

            <div className="card" style={{ padding: 0 }}>
                {loading ? (
                    <div style={{ padding: 24 }}>{t('loading')}</div>
                ) : rules.length === 0 ? (
                    <div style={{ padding: 24, color: 'var(--color-text-muted)' }}>
                        No escalation rules configured yet. Click <strong>+ Add Rule</strong> to create one.
                    </div>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>{t('trigger')}</th>
                                <th>Notify after</th>
                                <th>{t('notify')}</th>
                                <th>Escalate after</th>
                                <th>Escalate to</th>
                                <th>Active</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rules.map(rule => (
                                <tr key={rule.id}>
                                    <td>
                                        <strong>{TRIGGER_LABELS[rule.trigger_type] || rule.trigger_type}</strong>
                                        {rule.trigger_type === 'policy_review_due' ? (
                                            <div className="text-muted">Days before the review date</div>
                                        ) : (
                                            <div className="text-muted">Days overdue / since breach</div>
                                        )}
                                    </td>
                                    <td>
                                        <input
                                            type="number" min="0" className="form-control" style={{ width: 80 }}
                                            defaultValue={rule.threshold_days}
                                            disabled={saving === rule.id}
                                            onBlur={e => {
                                                const value = parseInt(e.target.value, 10) || 0;
                                                if (value !== rule.threshold_days) updateRule(rule, { threshold_days: value });
                                            }}
                                        />
                                    </td>
                                    <td>
                                        <select
                                            className="form-control"
                                            value={rule.notify_target}
                                            disabled={saving === rule.id}
                                            onChange={e => updateRule(rule, { notify_target: e.target.value })}
                                        >
                                            {NOTIFY_TARGETS.map(t => <option key={t}>{t}</option>)}
                                        </select>
                                    </td>
                                    <td>
                                        <input
                                            type="number" min="0" className="form-control" style={{ width: 80 }}
                                            placeholder="Off"
                                            defaultValue={rule.escalate_after_days ?? ''}
                                            disabled={saving === rule.id}
                                            onBlur={e => {
                                                const raw = e.target.value;
                                                const value = raw === '' ? null : parseInt(raw, 10) || 0;
                                                if (value !== rule.escalate_after_days) updateRule(rule, { escalate_after_days: value });
                                            }}
                                        />
                                        <div className="text-muted">extra days</div>
                                    </td>
                                    <td>
                                        <select
                                            className="form-control"
                                            value={rule.escalate_to || ''}
                                            disabled={saving === rule.id || rule.escalate_after_days == null}
                                            onChange={e => updateRule(rule, { escalate_to: e.target.value || null })}
                                        >
                                            <option value="">—</option>
                                            {ESCALATE_TARGETS.map(t => <option key={t}>{t}</option>)}
                                        </select>
                                    </td>
                                    <td>
                                        <input
                                            type="checkbox"
                                            checked={rule.is_active}
                                            disabled={saving === rule.id}
                                            onChange={e => updateRule(rule, { is_active: e.target.checked })}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {availableTriggers.length > 0 && (
                <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 10 }}>
                    {availableTriggers.length} trigger type{availableTriggers.length > 1 ? 's' : ''} not yet configured.
                </p>
            )}

            {showAdd && (
                <AddRuleModal
                    availableTriggers={availableTriggers}
                    onSave={addRule}
                    onClose={() => setShowAdd(false)}
                    saving={adding}
                />
            )}
        </div>
    );
}

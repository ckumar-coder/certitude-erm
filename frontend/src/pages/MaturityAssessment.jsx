import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../AuthContext';

// ── Maturity level metadata ────────────────────────────────────────────────
const LEVEL_LABELS = {
    0: { label: '—',          color: '#6b7280' },
    1: { label: 'Initial',    color: '#ef4444' },
    2: { label: 'Developing', color: '#f97316' },
    3: { label: 'Defined',    color: '#eab308' },
    4: { label: 'Managed',    color: '#22c55e' },
    5: { label: 'Optimising', color: '#3b82f6' },
};

function LevelBadge({ level, score }) {
    const { label, color } = LEVEL_LABELS[level] || LEVEL_LABELS[0];
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: color + '20', color, border: `1px solid ${color}60`,
            borderRadius: 6, padding: '2px 10px', fontWeight: 700, fontSize: 13,
        }}>
            {score != null ? `${parseFloat(score).toFixed(1)} — ` : ''}Level {level} · {label}
        </span>
    );
}

// ── SVG Radar Chart ────────────────────────────────────────────────────────
function RadarChart({ domains, previousDomains }) {
    if (!domains || domains.length === 0) return null;

    const SIZE = 260;
    const CENTER = SIZE / 2;
    const MAX_RADIUS = 90;
    const n = domains.length;

    function polarToXY(angle, radius) {
        const rad = (angle - 90) * (Math.PI / 180);
        return {
            x: CENTER + radius * Math.cos(rad),
            y: CENTER + radius * Math.sin(rad),
        };
    }

    function buildPath(values) {
        const pts = values.map((v, i) => {
            const angle = (360 / n) * i;
            const r = (v / 5) * MAX_RADIUS;
            return polarToXY(angle, r);
        });
        return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + ' Z';
    }

    // Grid rings at levels 1–5
    const rings = [1, 2, 3, 4, 5];
    const axes = domains.map((d, i) => {
        const angle = (360 / n) * i;
        const outer = polarToXY(angle, MAX_RADIUS);
        const label = polarToXY(angle, MAX_RADIUS + 22);
        return { outer, label, name: d.domain_name || d.name };
    });

    const currentPath = buildPath(domains.map((d) => d.score || 0));
    const prevPath = previousDomains ? buildPath(previousDomains.map((d) => d.score || 0)) : null;

    return (
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE} style={{ overflow: 'visible' }}>
            {/* Grid rings */}
            {rings.map((level) =>
                axes.map((ax, i) => {
                    const nextAx = axes[(i + 1) % n];
                    const r = (level / 5) * MAX_RADIUS;
                    const a1 = polarToXY((360 / n) * i, r);
                    const a2 = polarToXY((360 / n) * ((i + 1) % n), r);
                    return (
                        <line key={`ring-${level}-${i}`}
                            x1={a1.x} y1={a1.y} x2={a2.x} y2={a2.y}
                            stroke="#e5e7eb" strokeWidth="1" />
                    );
                })
            )}

            {/* Axes */}
            {axes.map((ax, i) => (
                <line key={`axis-${i}`}
                    x1={CENTER} y1={CENTER} x2={ax.outer.x} y2={ax.outer.y}
                    stroke="#d1d5db" strokeWidth="1" />
            ))}

            {/* Previous assessment polygon */}
            {prevPath && (
                <path d={prevPath} fill="#94a3b820" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4 3" />
            )}

            {/* Current assessment polygon */}
            <path d={currentPath} fill="#3b82f630" stroke="#3b82f6" strokeWidth="2" />

            {/* Axis labels */}
            {axes.map((ax, i) => {
                const angle = (360 / n) * i;
                let anchor = 'middle';
                if (angle > 10 && angle < 170) anchor = 'start';
                if (angle > 190 && angle < 350) anchor = 'end';
                return (
                    <text key={`label-${i}`}
                        x={ax.label.x} y={ax.label.y}
                        textAnchor={anchor} dominantBaseline="middle"
                        fontSize="10" fill="var(--color-text)" fontFamily="Arial, sans-serif">
                        {ax.name}
                    </text>
                );
            })}

            {/* Level ring labels (on first axis) */}
            {rings.map((level) => {
                const pos = polarToXY(-90, (level / 5) * MAX_RADIUS);
                return (
                    <text key={`rlabel-${level}`}
                        x={CENTER + 3} y={CENTER - (level / 5) * MAX_RADIUS - 2}
                        fontSize="8" fill="#9ca3af" fontFamily="Arial, sans-serif">
                        {level}
                    </text>
                );
            })}
        </svg>
    );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function MaturityAssessment() {
    const { session } = useAuth();
    const activeCompany = session.companies.find((c) => c.id === session.activeCompanyId);
    const role = activeCompany?.role || '';
    const isAdmin = role === 'Admin';

    const [tab, setTab] = useState(isAdmin ? 'setup' : 'assess');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // ── Setup state ──
    const [domains, setDomains] = useState([]);
    const [selectedDomain, setSelectedDomain] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [showDomainForm, setShowDomainForm] = useState(false);
    const [showQuestionForm, setShowQuestionForm] = useState(false);
    const [editingDomain, setEditingDomain] = useState(null);
    const [editingQuestion, setEditingQuestion] = useState(null);
    const [domainForm, setDomainForm] = useState({ name: '', description: '', weight: '' });
    const [questionForm, setQuestionForm] = useState({
        question_text: '', option_1: '', option_2: '', option_3: '', option_4: '', option_5: '',
    });

    // ── Assessment state ──
    const [assessments, setAssessments] = useState([]);
    const [activeAssessment, setActiveAssessment] = useState(null); // full detail
    const [assessmentView, setAssessmentView] = useState('history'); // 'history'|'run'|'results'
    const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
    const [responses, setResponses] = useState({});
    const [savingResponse, setSavingResponse] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [resultData, setResultData] = useState(null);

    // ── Data fetchers ──
    const fetchDomains = useCallback(async () => {
        const r = await fetch('/api/maturity/domains', { credentials: 'include' });
        if (r.ok) setDomains(await r.json());
    }, []);

    const fetchQuestions = useCallback(async (domainId) => {
        const r = await fetch(`/api/maturity/domains/${domainId}/questions`, { credentials: 'include' });
        if (r.ok) setQuestions(await r.json());
    }, []);

    const fetchAssessments = useCallback(async () => {
        const r = await fetch('/api/maturity/assessments', { credentials: 'include' });
        if (r.ok) setAssessments(await r.json());
    }, []);

    useEffect(() => {
        fetchDomains();
        fetchAssessments();
    }, [fetchDomains, fetchAssessments]);

    useEffect(() => {
        if (selectedDomain) fetchQuestions(selectedDomain.id);
    }, [selectedDomain, fetchQuestions]);

    // ── Domain CRUD ──
    async function saveDomain(e) {
        e.preventDefault();
        setError('');
        const method = editingDomain ? 'PUT' : 'POST';
        const url = editingDomain ? `/api/maturity/domains/${editingDomain.id}` : '/api/maturity/domains';
        const r = await fetch(url, {
            method, credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(domainForm),
        });
        const data = await r.json();
        if (!r.ok) return setError(data.error || 'Save failed');
        await fetchDomains();
        setShowDomainForm(false);
        setEditingDomain(null);
        setDomainForm({ name: '', description: '', weight: '' });
    }

    async function deleteDomain(id) {
        if (!confirm('Deactivate this domain? Questions under it will also be hidden from new assessments.')) return;
        await fetch(`/api/maturity/domains/${id}`, { method: 'DELETE', credentials: 'include' });
        await fetchDomains();
        if (selectedDomain?.id === id) setSelectedDomain(null);
    }

    // ── Question CRUD ──
    async function saveQuestion(e) {
        e.preventDefault();
        setError('');
        const method = editingQuestion ? 'PUT' : 'POST';
        const url = editingQuestion ? `/api/maturity/questions/${editingQuestion.id}` : '/api/maturity/questions';
        const body = editingQuestion
            ? questionForm
            : { ...questionForm, domain_id: selectedDomain.id };
        const r = await fetch(url, {
            method, credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const data = await r.json();
        if (!r.ok) return setError(data.error || 'Save failed');
        await fetchQuestions(selectedDomain.id);
        setShowQuestionForm(false);
        setEditingQuestion(null);
        setQuestionForm({ question_text: '', option_1: '', option_2: '', option_3: '', option_4: '', option_5: '' });
    }

    async function deleteQuestion(id) {
        if (!confirm('Deactivate this question? It will be hidden from new assessments.')) return;
        await fetch(`/api/maturity/questions/${id}`, { method: 'DELETE', credentials: 'include' });
        await fetchQuestions(selectedDomain.id);
    }

    // ── Assessment flow ──
    async function startAssessment() {
        setError('');
        setLoading(true);
        const r = await fetch('/api/maturity/assessments', {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
        });
        const data = await r.json();
        setLoading(false);
        if (!r.ok) return setError(data.error || 'Could not start assessment');
        await openAssessment(data.id);
    }

    async function openAssessment(id) {
        setLoading(true);
        const r = await fetch(`/api/maturity/assessments/${id}`, { credentials: 'include' });
        const data = await r.json();
        setLoading(false);
        if (!r.ok) return setError(data.error || 'Could not load assessment');
        setActiveAssessment(data);
        setResponses(data.responses || {});
        if (data.status === 'completed') {
            setResultData(data.result);
            setAssessmentView('results');
        } else {
            // Find first unanswered question
            const firstUnanswered = data.questions.findIndex((q) => !data.responses[q.id]);
            setCurrentQuestionIdx(firstUnanswered >= 0 ? firstUnanswered : 0);
            setAssessmentView('run');
        }
    }

    async function saveResponse(questionId, domainId, level) {
        setSavingResponse(true);
        const r = await fetch(`/api/maturity/assessments/${activeAssessment.id}/responses`, {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question_id: questionId, domain_id: domainId, selected_level: level }),
        });
        setSavingResponse(false);
        if (r.ok) {
            setResponses((prev) => ({ ...prev, [questionId]: { selected_level: level } }));
        }
    }

    async function submitAssessment() {
        const questions = activeAssessment.questions;
        const unanswered = questions.filter((q) => !responses[q.id]);
        if (unanswered.length > 0) {
            return setError(`${unanswered.length} question(s) still unanswered.`);
        }
        if (!confirm('Submit this assessment? Scores will be calculated and the assessment will be locked.')) return;
        setSubmitting(true);
        setError('');
        const r = await fetch(`/api/maturity/assessments/${activeAssessment.id}/complete`, {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
        });
        const data = await r.json();
        setSubmitting(false);
        if (!r.ok) return setError(data.error || 'Submission failed');
        setResultData(data);
        setAssessmentView('results');
        await fetchAssessments();
    }

    // ── Rendering helpers ──
    function totalWeight() {
        return domains.filter((d) => d.is_active).reduce((s, d) => s + parseFloat(d.weight), 0);
    }

    const activeDomains = domains.filter((d) => d.is_active);

    // ══════════════════════════════════════════════════════════
    // RENDER
    // ══════════════════════════════════════════════════════════
    return (
        <div style={{ padding: '0 0 40px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h1 style={{ margin: 0 }}>GRC Maturity Assessment</h1>
            </div>

            {/* Tab bar */}
            <div style={{ display: 'flex', gap: 2, borderBottom: '2px solid var(--color-border)', marginBottom: 24 }}>
                {isAdmin && (
                    <button
                        className={`btn btn-${tab === 'setup' ? 'primary' : 'secondary'}`}
                        style={{ borderRadius: '4px 4px 0 0', borderBottom: 'none' }}
                        onClick={() => { setTab('setup'); setError(''); }}
                    >
                        ⚙ Setup
                    </button>
                )}
                <button
                    className={`btn btn-${tab === 'assess' ? 'primary' : 'secondary'}`}
                    style={{ borderRadius: '4px 4px 0 0', borderBottom: 'none' }}
                    onClick={() => {
                        setTab('assess');
                        setAssessmentView('history');
                        setActiveAssessment(null);
                        setError('');
                    }}
                >
                    ▶ Run Assessment
                </button>
            </div>

            {error && (
                <div className="alert alert-danger" style={{ marginBottom: 16 }}>{error}</div>
            )}

            {/* ── SETUP TAB ─────────────────────────────────────────────── */}
            {tab === 'setup' && isAdmin && (
                <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20 }}>

                    {/* Domain list */}
                    <div className="card" style={{ padding: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <h3 style={{ margin: 0, fontSize: 15 }}>Domains</h3>
                            <button className="btn btn-primary btn-sm" onClick={() => {
                                setShowDomainForm(true);
                                setEditingDomain(null);
                                setDomainForm({ name: '', description: '', weight: '' });
                            }}>+ Add</button>
                        </div>

                        <div style={{ fontSize: 12, color: totalWeight() === 100 ? 'green' : 'orange', marginBottom: 8 }}>
                            Total weight: {totalWeight().toFixed(0)}% {totalWeight() !== 100 ? '⚠ (should be 100%)' : '✓'}
                        </div>

                        {activeDomains.length === 0 && (
                            <p className="text-muted" style={{ fontSize: 13 }}>No domains yet. Add one to get started.</p>
                        )}

                        {activeDomains.map((d) => (
                            <div key={d.id}
                                onClick={() => { setSelectedDomain(d); setShowQuestionForm(false); setEditingQuestion(null); }}
                                style={{
                                    padding: '8px 10px', borderRadius: 6, cursor: 'pointer', marginBottom: 4,
                                    background: selectedDomain?.id === d.id ? 'var(--color-primary)10' : 'transparent',
                                    border: `1px solid ${selectedDomain?.id === d.id ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                }}
                            >
                                <div style={{ fontWeight: 600, fontSize: 13 }}>{d.name}</div>
                                <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                                    Weight: {d.weight}% · {d.active_question_count} question{d.active_question_count !== 1 ? 's' : ''}
                                </div>
                                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                                    <button className="btn btn-secondary btn-sm" style={{ fontSize: 11 }}
                                        onClick={(e) => { e.stopPropagation(); setEditingDomain(d); setDomainForm({ name: d.name, description: d.description || '', weight: d.weight }); setShowDomainForm(true); }}>
                                        Edit
                                    </button>
                                    <button className="btn btn-danger btn-sm" style={{ fontSize: 11 }}
                                        onClick={(e) => { e.stopPropagation(); deleteDomain(d.id); }}>
                                        Remove
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Right panel: domain form or question management */}
                    <div>
                        {showDomainForm && (
                            <div className="card" style={{ padding: 20, marginBottom: 20 }}>
                                <h3 style={{ margin: '0 0 16px' }}>{editingDomain ? 'Edit Domain' : 'Add Domain'}</h3>
                                <form onSubmit={saveDomain}>
                                    <div className="form-group">
                                        <label className="form-label">Domain Name *</label>
                                        <input className="form-control" value={domainForm.name}
                                            onChange={(e) => setDomainForm((f) => ({ ...f, name: e.target.value }))}
                                            placeholder="e.g. Risk Management" required />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Description</label>
                                        <textarea className="form-control" rows={2} value={domainForm.description}
                                            onChange={(e) => setDomainForm((f) => ({ ...f, description: e.target.value }))}
                                            placeholder="Brief description shown to assessors" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Weight (%) *</label>
                                        <input className="form-control" type="number" min="1" max="100" step="0.01"
                                            value={domainForm.weight}
                                            onChange={(e) => setDomainForm((f) => ({ ...f, weight: e.target.value }))}
                                            placeholder="e.g. 20" required />
                                        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
                                            All active domain weights should sum to 100%.
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button type="submit" className="btn btn-primary">Save Domain</button>
                                        <button type="button" className="btn btn-secondary"
                                            onClick={() => { setShowDomainForm(false); setEditingDomain(null); }}>Cancel</button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {selectedDomain && !showDomainForm && (
                            <div className="card" style={{ padding: 20 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                    <h3 style={{ margin: 0 }}>{selectedDomain.name} — Questions</h3>
                                    <button className="btn btn-primary btn-sm" onClick={() => {
                                        setShowQuestionForm(true);
                                        setEditingQuestion(null);
                                        setQuestionForm({ question_text: '', option_1: '', option_2: '', option_3: '', option_4: '', option_5: '' });
                                    }}>+ Add Question</button>
                                </div>

                                {showQuestionForm && (
                                    <form onSubmit={saveQuestion} style={{ background: 'var(--color-bg-alt)', borderRadius: 8, padding: 16, marginBottom: 20 }}>
                                        <h4 style={{ margin: '0 0 12px' }}>{editingQuestion ? 'Edit Question' : 'New Question'}</h4>
                                        <div className="form-group">
                                            <label className="form-label">Question *</label>
                                            <textarea className="form-control" rows={2}
                                                value={questionForm.question_text}
                                                onChange={(e) => setQuestionForm((f) => ({ ...f, question_text: e.target.value }))}
                                                placeholder="e.g. How does your organisation identify and assess risks?"
                                                required />
                                        </div>
                                        {[1, 2, 3, 4, 5].map((level) => (
                                            <div className="form-group" key={level}>
                                                <label className="form-label" style={{ color: LEVEL_LABELS[level].color }}>
                                                    Level {level} — {LEVEL_LABELS[level].label} *
                                                </label>
                                                <textarea className="form-control" rows={2}
                                                    value={questionForm[`option_${level}`]}
                                                    onChange={(e) => setQuestionForm((f) => ({ ...f, [`option_${level}`]: e.target.value }))}
                                                    placeholder={`Describe what Level ${level} looks like for this question`}
                                                    required />
                                            </div>
                                        ))}
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button type="submit" className="btn btn-primary">Save Question</button>
                                            <button type="button" className="btn btn-secondary"
                                                onClick={() => { setShowQuestionForm(false); setEditingQuestion(null); }}>Cancel</button>
                                        </div>
                                    </form>
                                )}

                                {questions.filter((q) => q.is_active).length === 0 && !showQuestionForm && (
                                    <p className="text-muted">No questions yet. Click "+ Add Question" to create one.</p>
                                )}

                                {questions.filter((q) => q.is_active).map((q, idx) => (
                                    <div key={q.id} style={{
                                        border: '1px solid var(--color-border)', borderRadius: 8,
                                        padding: 14, marginBottom: 12,
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div style={{ fontWeight: 600, fontSize: 14, flex: 1, marginRight: 12 }}>
                                                Q{idx + 1}. {q.question_text}
                                            </div>
                                            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                                <button className="btn btn-secondary btn-sm" onClick={() => {
                                                    setEditingQuestion(q);
                                                    setQuestionForm({
                                                        question_text: q.question_text,
                                                        option_1: q.option_1, option_2: q.option_2,
                                                        option_3: q.option_3, option_4: q.option_4, option_5: q.option_5,
                                                    });
                                                    setShowQuestionForm(true);
                                                }}>Edit</button>
                                                <button className="btn btn-danger btn-sm"
                                                    onClick={() => deleteQuestion(q.id)}>Remove</button>
                                            </div>
                                        </div>
                                        <div style={{ marginTop: 8 }}>
                                            {[1, 2, 3, 4, 5].map((level) => (
                                                <div key={level} style={{ fontSize: 12, marginTop: 4 }}>
                                                    <span style={{ color: LEVEL_LABELS[level].color, fontWeight: 700 }}>L{level}: </span>
                                                    {q[`option_${level}`]}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {!selectedDomain && !showDomainForm && (
                            <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                <div style={{ fontSize: 40, marginBottom: 8 }}>📋</div>
                                <div>Select a domain on the left to manage its questions,<br />or click "+ Add" to create your first domain.</div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── ASSESS TAB ────────────────────────────────────────────── */}
            {tab === 'assess' && (
                <>
                    {/* History view */}
                    {assessmentView === 'history' && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <h2 style={{ margin: 0, fontSize: 18 }}>Assessment History</h2>
                                <button className="btn btn-primary" onClick={startAssessment} disabled={loading}>
                                    {loading ? 'Starting…' : '+ New Assessment'}
                                </button>
                            </div>

                            {assessments.length === 0 && (
                                <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                    <div style={{ fontSize: 40, marginBottom: 8 }}>📊</div>
                                    <div>No assessments yet.<br />Click "New Assessment" to run your first one.</div>
                                    {isAdmin && activeDomains.length === 0 && (
                                        <div style={{ marginTop: 12, fontSize: 13, color: 'orange' }}>
                                            ⚠ No domains configured. Go to Setup to create domains and questions first.
                                        </div>
                                    )}
                                </div>
                            )}

                            {assessments.map((a) => (
                                <div key={a.id} className="card" style={{ padding: 16, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 16 }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600 }}>
                                            Assessment #{a.id}
                                            <span style={{
                                                marginLeft: 8, fontSize: 11, fontWeight: 400,
                                                background: a.status === 'completed' ? '#22c55e20' : '#f9731620',
                                                color: a.status === 'completed' ? '#166534' : '#c2410c',
                                                padding: '2px 8px', borderRadius: 10,
                                            }}>
                                                {a.status === 'completed' ? 'Completed' : 'In Progress'}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                                            Started {new Date(a.started_at).toLocaleDateString()} by {a.started_by_name || a.started_by_email || 'Unknown'}
                                            {a.completed_at && ` · Completed ${new Date(a.completed_at).toLocaleDateString()}`}
                                        </div>
                                    </div>
                                    {a.status === 'completed' && a.overall_score != null && (
                                        <LevelBadge level={a.overall_level} score={a.overall_score} />
                                    )}
                                    <button className="btn btn-secondary btn-sm"
                                        onClick={() => openAssessment(a.id)}>
                                        {a.status === 'completed' ? 'View Results' : 'Resume'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Question-by-question run view */}
                    {assessmentView === 'run' && activeAssessment && (() => {
                        const questions = activeAssessment.questions;
                        const total = questions.length;
                        const answered = Object.keys(responses).length;
                        const q = questions[currentQuestionIdx];
                        if (!q) return null;

                        // Group questions by domain for domain progress
                        const domainNames = [...new Set(questions.map((q) => q.domain_name))];

                        return (
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                    <h2 style={{ margin: 0, fontSize: 18 }}>Assessment #{activeAssessment.id}</h2>
                                    <button className="btn btn-secondary btn-sm" onClick={() => {
                                        setAssessmentView('history');
                                        setActiveAssessment(null);
                                    }}>← Back to History</button>
                                </div>

                                {/* Progress bar */}
                                <div style={{ marginBottom: 20 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                                        <span>Question {currentQuestionIdx + 1} of {total} · {q.domain_name}</span>
                                        <span>{answered} of {total} answered</span>
                                    </div>
                                    <div style={{ height: 6, background: 'var(--color-border)', borderRadius: 3 }}>
                                        <div style={{
                                            height: 6, borderRadius: 3,
                                            background: 'var(--color-primary)',
                                            width: `${(answered / total) * 100}%`,
                                            transition: 'width 0.3s',
                                        }} />
                                    </div>
                                </div>

                                {/* Question card */}
                                <div className="card" style={{ padding: 24, marginBottom: 16 }}>
                                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8 }}>
                                        {q.domain_name}
                                    </div>
                                    <h3 style={{ margin: '0 0 20px', fontSize: 17, lineHeight: 1.4 }}>{q.question_text}</h3>

                                    {[1, 2, 3, 4, 5].map((level) => {
                                        const selected = responses[q.id]?.selected_level === level;
                                        return (
                                            <label key={level} style={{
                                                display: 'flex', alignItems: 'flex-start', gap: 12,
                                                padding: '12px 14px', borderRadius: 8, marginBottom: 8, cursor: 'pointer',
                                                border: `2px solid ${selected ? LEVEL_LABELS[level].color : 'var(--color-border)'}`,
                                                background: selected ? LEVEL_LABELS[level].color + '12' : 'transparent',
                                                transition: 'all 0.15s',
                                            }}>
                                                <input type="radio" name={`q-${q.id}`} value={level}
                                                    checked={selected}
                                                    onChange={() => saveResponse(q.id, q.domain_id, level)}
                                                    style={{ marginTop: 2, accentColor: LEVEL_LABELS[level].color }} />
                                                <div>
                                                    <div style={{ fontWeight: 600, fontSize: 13, color: LEVEL_LABELS[level].color }}>
                                                        Level {level} — {LEVEL_LABELS[level].label}
                                                    </div>
                                                    <div style={{ fontSize: 13, marginTop: 3, color: 'var(--color-text)' }}>
                                                        {q[`option_${level}`]}
                                                    </div>
                                                </div>
                                            </label>
                                        );
                                    })}

                                    {savingResponse && (
                                        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 8 }}>Saving…</div>
                                    )}
                                </div>

                                {/* Navigation */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <button className="btn btn-secondary"
                                        disabled={currentQuestionIdx === 0}
                                        onClick={() => setCurrentQuestionIdx((i) => i - 1)}>
                                        ← Previous
                                    </button>

                                    <div style={{ display: 'flex', gap: 8 }}>
                                        {/* Jump to unanswered */}
                                        {questions.map((_, i) => {
                                            const isAnswered = !!responses[questions[i].id];
                                            const isCurrent = i === currentQuestionIdx;
                                            return (
                                                <button key={i}
                                                    onClick={() => setCurrentQuestionIdx(i)}
                                                    style={{
                                                        width: 28, height: 28, borderRadius: '50%',
                                                        border: isCurrent ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                                                        background: isAnswered ? 'var(--color-primary)' : 'transparent',
                                                        color: isAnswered ? '#fff' : 'var(--color-text-muted)',
                                                        fontSize: 11, cursor: 'pointer', padding: 0,
                                                        display: total <= 20 ? 'block' : 'none',
                                                    }}>
                                                    {i + 1}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {currentQuestionIdx < total - 1 ? (
                                        <button className="btn btn-primary"
                                            disabled={!responses[q.id]}
                                            onClick={() => setCurrentQuestionIdx((i) => i + 1)}>
                                            Next →
                                        </button>
                                    ) : (
                                        <button className="btn btn-primary"
                                            disabled={answered < total || submitting}
                                            onClick={submitAssessment}>
                                            {submitting ? 'Submitting…' : answered < total ? `${total - answered} unanswered` : 'Submit Assessment'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })()}

                    {/* Results view */}
                    {assessmentView === 'results' && activeAssessment && resultData && (() => {
                        // Find previous assessment for comparison
                        const sorted = assessments
                            .filter((a) => a.status === 'completed' && a.overall_score != null && a.id !== activeAssessment.id)
                            .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at));
                        const prev = sorted[0] || null;
                        const prevDomains = prev?.domain_scores || null;

                        return (
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                    <h2 style={{ margin: 0, fontSize: 18 }}>Assessment #{activeAssessment.id} — Results</h2>
                                    <button className="btn btn-secondary btn-sm" onClick={() => {
                                        setAssessmentView('history');
                                        setActiveAssessment(null);
                                    }}>← Back to History</button>
                                </div>

                                {/* Overall score */}
                                <div className="card" style={{ padding: 24, marginBottom: 20, textAlign: 'center' }}>
                                    <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 8 }}>
                                        Overall Maturity Score
                                    </div>
                                    <div style={{ fontSize: 48, fontWeight: 800, color: LEVEL_LABELS[resultData.overall_level]?.color }}>
                                        {parseFloat(resultData.overall_score).toFixed(2)}
                                    </div>
                                    <div style={{ fontSize: 20, fontWeight: 600, color: LEVEL_LABELS[resultData.overall_level]?.color, marginTop: 4 }}>
                                        Level {resultData.overall_level} — {LEVEL_LABELS[resultData.overall_level]?.label}
                                    </div>
                                    {prev && (
                                        <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 8 }}>
                                            Previous: {parseFloat(prev.overall_score).toFixed(2)} (Level {prev.overall_level})
                                            {' '}
                                            <span style={{ color: resultData.overall_score >= prev.overall_score ? 'green' : 'red' }}>
                                                {resultData.overall_score >= prev.overall_score ? '▲' : '▼'}
                                                {Math.abs(parseFloat(resultData.overall_score) - parseFloat(prev.overall_score)).toFixed(2)}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Radar + domain breakdown */}
                                <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20 }}>
                                    <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <div style={{ fontWeight: 600, marginBottom: 12 }}>Domain Radar</div>
                                        <RadarChart
                                            domains={resultData.domain_scores}
                                            previousDomains={prevDomains}
                                        />
                                        {prev && (
                                            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 8 }}>
                                                — Current &nbsp; - - Previous assessment
                                            </div>
                                        )}
                                    </div>

                                    <div className="card" style={{ padding: 20 }}>
                                        <div style={{ fontWeight: 600, marginBottom: 16 }}>Domain Breakdown</div>
                                        {resultData.domain_scores.map((d) => {
                                            const prevD = prevDomains?.find((p) => p.domain_id === d.domain_id);
                                            const delta = prevD ? d.score - prevD.score : null;
                                            return (
                                                <div key={d.domain_id} style={{
                                                    display: 'flex', alignItems: 'center', gap: 12,
                                                    padding: '10px 0',
                                                    borderBottom: '1px solid var(--color-border)',
                                                }}>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontWeight: 600, fontSize: 14 }}>{d.domain_name}</div>
                                                        <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                                                            Weight: {d.weight}% · {d.question_count} question{d.question_count !== 1 ? 's' : ''}
                                                        </div>
                                                    </div>
                                                    {/* Score bar */}
                                                    <div style={{ width: 120 }}>
                                                        <div style={{ height: 6, background: 'var(--color-border)', borderRadius: 3 }}>
                                                            <div style={{
                                                                height: 6, borderRadius: 3,
                                                                background: LEVEL_LABELS[d.level]?.color || '#6b7280',
                                                                width: `${(d.score / 5) * 100}%`,
                                                            }} />
                                                        </div>
                                                    </div>
                                                    <LevelBadge level={d.level} score={d.score} />
                                                    {delta != null && (
                                                        <span style={{ fontSize: 12, color: delta >= 0 ? 'green' : 'red', minWidth: 36 }}>
                                                            {delta >= 0 ? '▲' : '▼'}{Math.abs(delta).toFixed(2)}
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Priority gaps */}
                                {(() => {
                                    const gaps = (resultData.domain_scores || [])
                                        .flatMap((d) => d.question_count > 0 ? [{ ...d, gapScore: d.score }] : [])
                                        .filter((d) => d.level < 4)
                                        .sort((a, b) => a.score - b.score);

                                    if (gaps.length === 0) return (
                                        <div className="card" style={{ padding: 16, marginTop: 20, color: 'green', fontWeight: 600 }}>
                                            ✓ All domains are at Level 4 or above. Excellent maturity posture.
                                        </div>
                                    );

                                    return (
                                        <div className="card" style={{ padding: 20, marginTop: 20 }}>
                                            <div style={{ fontWeight: 600, marginBottom: 12 }}>Priority Improvement Areas</div>
                                            {gaps.map((d, i) => (
                                                <div key={d.domain_id} style={{
                                                    display: 'flex', alignItems: 'center', gap: 12,
                                                    padding: '8px 0', borderBottom: '1px solid var(--color-border)',
                                                }}>
                                                    <span style={{ fontWeight: 800, color: 'var(--color-text-muted)', minWidth: 20 }}>
                                                        {i + 1}.
                                                    </span>
                                                    <div style={{ flex: 1 }}>
                                                        <span style={{ fontWeight: 600 }}>{d.domain_name}</span>
                                                        <span style={{ fontSize: 12, color: 'var(--color-text-muted)', marginLeft: 8 }}>
                                                            Score {parseFloat(d.score).toFixed(2)} · Weight {d.weight}%
                                                        </span>
                                                    </div>
                                                    <LevelBadge level={d.level} score={d.score} />
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })()}
                            </div>
                        );
                    })()}
                </>
            )}
        </div>
    );
}

import { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { useT } from '../contexts/LanguageContext';

const MODULE_COLORS = {
    control:     { bg: '#3b82f6', label: 'Control Test' },
    kri:         { bg: '#8b5cf6', label: 'KRI Measurement' },
    policy:      { bg: '#0891b2', label: 'Policy Review' },
    issue:       { bg: '#ef4444', label: 'Issue Due' },
    obligation:  { bg: '#f59e0b', label: 'Obligation Review' },
};

function daysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }
function firstDayOfMonth(year, month) { return new Date(year, month, 1).getDay(); }

function toDateKey(dateStr) {
    if (!dateStr) return null;
    return dateStr.substring(0, 10); // YYYY-MM-DD
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DOW    = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export default function ComplianceCalendar() {
    const { api } = useAuth();
    const t = useT();
    const today = new Date();
    const [year,  setYear]  = useState(today.getFullYear());
    const [month, setMonth] = useState(today.getMonth());
    const [events, setEvents] = useState({});   // { 'YYYY-MM-DD': [event, ...] }
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState('');
    const [selected, setSelected] = useState(null); // date key
    const [moduleFilter, setModuleFilter] = useState(new Set(Object.keys(MODULE_COLORS)));

    useEffect(() => {
        setLoading(true);
        setError('');
        api.get('/calendar')
            .then((data) => {
                // Group by date key
                const map = {};
                (data || []).forEach((ev) => {
                    const key = toDateKey(ev.due_date);
                    if (!key) return;
                    if (!map[key]) map[key] = [];
                    map[key].push(ev);
                });
                setEvents(map);
            })
            .catch((e) => setError(e.message || 'Failed to load calendar'))
            .finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function prevMonth() {
        if (month === 0) { setYear((y) => y - 1); setMonth(11); }
        else setMonth((m) => m - 1);
        setSelected(null);
    }
    function nextMonth() {
        if (month === 11) { setYear((y) => y + 1); setMonth(0); }
        else setMonth((m) => m + 1);
        setSelected(null);
    }

    const numDays   = daysInMonth(year, month);
    const startDow  = firstDayOfMonth(year, month);
    const todayKey  = toDateKey(today.toISOString());

    // Build weeks array
    const weeks = [];
    let week = Array(startDow).fill(null);
    for (let d = 1; d <= numDays; d++) {
        week.push(d);
        if (week.length === 7 || d === numDays) {
            while (week.length < 7) week.push(null);
            weeks.push(week);
            week = [];
        }
    }

    function dateKey(d) {
        if (!d) return null;
        return `${year}-${String(month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    }

    function eventsForDay(d) {
        const key = dateKey(d);
        if (!key || !events[key]) return [];
        return events[key].filter((e) => moduleFilter.has(e.module));
    }

    const selectedEvents = selected
        ? (events[selected] || []).filter((e) => moduleFilter.has(e.module))
        : [];

    function toggleFilter(mod) {
        setModuleFilter((s) => {
            const next = new Set(s);
            next.has(mod) ? next.delete(mod) : next.add(mod);
            return next;
        });
    }

    // Count events in current month view for summary
    const monthEventCount = Object.entries(events)
        .filter(([k]) => k.startsWith(`${year}-${String(month + 1).padStart(2,'0')}`))
        .reduce((sum, [, evs]) => sum + evs.filter((e) => moduleFilter.has(e.module)).length, 0);

    return (
        <div>
            <h1 className="page-title">{t('calendar_title')}</h1>
            <p className="page-subtitle">{t('calendar_subtitle')}</p>

            {error && <div className="alert alert-error">{error}</div>}

            {/* Module filter chips */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                {Object.entries(MODULE_COLORS).map(([mod, { bg, label }]) => (
                    <button
                        key={mod}
                        onClick={() => toggleFilter(mod)}
                        style={{
                            padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '2px solid ' + bg,
                            background: moduleFilter.has(mod) ? bg : 'transparent',
                            color: moduleFilter.has(mod) ? '#fff' : bg,
                        }}
                    >
                        {label}
                    </button>
                ))}
                <span className="text-muted" style={{ fontSize: 12, alignSelf: 'center', marginLeft: 8 }}>
                    {monthEventCount} item{monthEventCount !== 1 ? 's' : ''} this month
                </span>
            </div>

            <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                {/* Calendar grid */}
                <div className="card" style={{ flex: 1, minWidth: 0, padding: 0 }}>
                    {/* Month nav */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid var(--color-border)' }}>
                        <button className="btn btn-sm btn-primary" onClick={prevMonth}>‹</button>
                        <strong style={{ fontSize: 16 }}>{MONTHS[month]} {year}</strong>
                        <button className="btn btn-sm btn-primary" onClick={nextMonth}>›</button>
                    </div>

                    {loading ? (
                        <div style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading…</div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                            <thead>
                                <tr>
                                    {DOW.map((d) => (
                                        <th key={d} style={{ padding: '6px 4px', fontSize: 11, textAlign: 'center', color: 'var(--color-text-muted)', fontWeight: 600 }}>{d}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {weeks.map((wk, wi) => (
                                    <tr key={wi}>
                                        {wk.map((d, di) => {
                                            const key  = dateKey(d);
                                            const evs  = eventsForDay(d);
                                            const isToday    = key === todayKey;
                                            const isSelected = key === selected;
                                            return (
                                                <td
                                                    key={di}
                                                    onClick={() => d && setSelected(isSelected ? null : key)}
                                                    style={{
                                                        height: 72,
                                                        verticalAlign: 'top',
                                                        padding: '4px 4px',
                                                        border: '1px solid var(--color-border)',
                                                        background: isSelected ? '#eff6ff' : isToday ? '#fefce8' : 'var(--color-surface)',
                                                        cursor: d ? 'pointer' : 'default',
                                                        position: 'relative',
                                                    }}
                                                >
                                                    {d && (
                                                        <>
                                                            <div style={{
                                                                fontSize: 12, fontWeight: isToday ? 700 : 400,
                                                                color: isToday ? 'var(--color-primary)' : 'var(--color-text)',
                                                                marginBottom: 2,
                                                            }}>
                                                                {d}
                                                            </div>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, overflow: 'hidden' }}>
                                                                {evs.slice(0, 3).map((ev, i) => (
                                                                    <div key={i} style={{
                                                                        background: MODULE_COLORS[ev.module]?.bg || '#666',
                                                                        color: '#fff', fontSize: 10, padding: '1px 4px',
                                                                        borderRadius: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                                                    }}>
                                                                        {ev.title}
                                                                    </div>
                                                                ))}
                                                                {evs.length > 3 && (
                                                                    <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>+{evs.length - 3} more</div>
                                                                )}
                                                            </div>
                                                        </>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Day detail panel */}
                {selected && (
                    <div className="card" style={{ width: 280, flexShrink: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <strong>{new Date(selected + 'T12:00:00').toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' })}</strong>
                            <button className="btn btn-sm btn-secondary" onClick={() => setSelected(null)}>✕</button>
                        </div>
                        {selectedEvents.length === 0 ? (
                            <div className="text-muted" style={{ fontSize: 13 }}>No items due on this date.</div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {selectedEvents.map((ev, i) => (
                                    <div key={i} style={{ borderLeft: `3px solid ${MODULE_COLORS[ev.module]?.bg}`, paddingLeft: 10 }}>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: MODULE_COLORS[ev.module]?.bg, textTransform: 'uppercase', marginBottom: 2 }}>
                                            {MODULE_COLORS[ev.module]?.label}
                                        </div>
                                        <div style={{ fontSize: 13, fontWeight: 600 }}>{ev.title}</div>
                                        {ev.uid && <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{ev.uid}</div>}
                                        {ev.owner && <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Owner: {ev.owner}</div>}
                                        {ev.status && <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Status: {ev.status}</div>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

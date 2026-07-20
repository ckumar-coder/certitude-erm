import { useState, useEffect } from 'react';
import { getHelp } from '../help-content';

const PALETTE = [
    {
        row:    '#EBF2FA',
        border: '#C8D8EC',
        answer: '#F3F8FD',
        text:   '#1A3A6A',
        pillBg: '#D0E4F5',
        pillActiveBg: '#1A3A6A',
        pillActiveText: '#fff',
    },
    {
        row:    '#E6F4EF',
        border: '#B8DDD0',
        answer: '#EDF7F2',
        text:   '#0A5C40',
        pillBg: '#C2E8D8',
        pillActiveBg: '#0A5C40',
        pillActiveText: '#fff',
    },
];

export default function HelpPanel({ page, onClose, onNavigate }) {
    const content = getHelp(page);
    const [openIdx, setOpenIdx] = useState(null);

    const toggle = (i) => setOpenIdx((prev) => (prev === i ? null : i));

    return (
        <>
            <div className="help-panel-backdrop" onClick={onClose} />
            <div className="help-panel">
                <div className="help-panel-header">
                    <span style={{ fontWeight: 700, fontSize: 15 }}>
                        {content ? `Help — ${content.title}` : 'Help'}
                    </span>
                    <button
                        className="btn btn-secondary btn-sm"
                        onClick={onClose}
                        style={{ padding: '2px 10px' }}
                    >
                        ✕
                    </button>
                </div>

                <div className="help-panel-body" style={{ padding: 0 }}>
                    {content ? (
                        content.items.map((item, i) => {
                            const p = PALETTE[i % 2];
                            const isOpen = openIdx === i;
                            return (
                                <div key={i} style={{ borderBottom: `0.5px solid ${p.border}` }}>
                                    {/* Question row */}
                                    <div
                                        onClick={() => toggle(i)}
                                        style={{
                                            display: 'flex', alignItems: 'flex-start', gap: 10,
                                            padding: '11px 16px',
                                            background: p.row,
                                            cursor: 'pointer',
                                        }}
                                    >
                                        {/* Numbered pill */}
                                        <div style={{
                                            width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: 11, fontWeight: 500, marginTop: 1,
                                            background: isOpen ? p.pillActiveBg : p.pillBg,
                                            color: isOpen ? p.pillActiveText : p.text,
                                            border: isOpen ? 'none' : `0.5px solid ${p.border}`,
                                            transition: 'background 0.15s, color 0.15s',
                                        }}>
                                            {i + 1}
                                        </div>
                                        {/* Question text */}
                                        <span style={{
                                            flex: 1, fontSize: 13, fontWeight: 500,
                                            color: 'var(--color-text, #1a1a1a)', lineHeight: 1.45,
                                        }}>
                                            {item.q}
                                        </span>
                                        {/* Chevron */}
                                        <span style={{
                                            fontSize: 13, flexShrink: 0, marginTop: 2,
                                            color: p.text,
                                            display: 'inline-block',
                                            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                            transition: 'transform 0.2s',
                                            lineHeight: 1,
                                        }}>▾</span>
                                    </div>

                                    {/* Answer */}
                                    {isOpen && (
                                        <div style={{
                                            background: p.answer,
                                            padding: '10px 16px 12px 46px',
                                            fontSize: 12, fontStyle: 'italic',
                                            color: p.text, lineHeight: 1.65,
                                            borderTop: `0.5px solid ${p.border}`,
                                        }}>
                                            {item.a}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        <div style={{ padding: 16 }}>
                            <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
                                No help content available for this page yet.
                            </p>
                        </div>
                    )}

                    <div style={{ padding: '10px 16px', borderTop: '1px solid var(--color-border)' }}>
                        <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>
                            Need more help? Contact{' '}
                            <a href="mailto:c.kumar@certitude-advisory.ca">
                                c.kumar@certitude-advisory.ca
                            </a>
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}

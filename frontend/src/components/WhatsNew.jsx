import { createPortal } from 'react-dom';
import changelog from '../data/changelog.json';

const STORAGE_KEY = 'grc_last_seen_version';
const SHOW_VERSIONS = 3; // how many recent versions to display in the modal

export function getLatestVersion() {
    return changelog[0]?.version || '';
}

export function hasUnseenUpdates() {
    const seen = localStorage.getItem(STORAGE_KEY);
    return seen !== getLatestVersion();
}

export function markAsSeen() {
    localStorage.setItem(STORAGE_KEY, getLatestVersion());
}

function typeBadgeStyle(type) {
    switch (type) {
        case 'Architecture': return { background: '#e8f4f8', color: '#1F4E79', border: '1px solid #b3d4e8' };
        case 'Enhancement':  return { background: '#e8f5e9', color: '#2e7d32', border: '1px solid #a5d6a7' };
        case 'Bug Fix':      return { background: '#fff8e1', color: '#f57f17', border: '1px solid #ffe082' };
        default:             return { background: '#f5f5f5', color: '#555',    border: '1px solid #ddd' };
    }
}

export default function WhatsNew({ onClose }) {
    const recent = changelog.slice(0, SHOW_VERSIONS);

    const modal = (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                background: 'rgba(0,0,0,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 24,
            }}
            onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div
                style={{
                    background: 'var(--color-card)',
                    borderRadius: 12,
                    width: 560,
                    maxWidth: '92vw',
                    maxHeight: '82vh',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 16px 48px rgba(0,0,0,0.28)',
                    overflow: 'hidden',
                }}
                onMouseDown={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{
                    padding: '20px 24px 16px',
                    borderBottom: '1px solid var(--color-border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexShrink: 0,
                }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
                            What&apos;s New
                        </h2>
                        <div className="text-muted" style={{ fontSize: 12, marginTop: 3 }}>
                            Qatar Post ERM Workstation — recent updates
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            background: 'none', border: 'none',
                            fontSize: 22, cursor: 'pointer',
                            color: 'var(--color-text-muted)',
                            lineHeight: 1, padding: '0 2px', marginTop: 2,
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* Version list */}
                <div style={{ overflowY: 'auto', flex: 1, padding: '16px 24px 24px' }}>
                    {recent.map((entry, idx) => (
                        <div
                            key={entry.version}
                            style={{
                                marginBottom: idx < recent.length - 1 ? 24 : 0,
                                paddingBottom: idx < recent.length - 1 ? 24 : 0,
                                borderBottom: idx < recent.length - 1 ? '1px solid var(--color-border)' : 'none',
                            }}
                        >
                            {/* Version row */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                                <span style={{ fontWeight: 700, fontSize: 15 }}>{entry.version}</span>
                                <span
                                    style={{
                                        fontSize: 11, fontWeight: 600, padding: '2px 8px',
                                        borderRadius: 4, ...typeBadgeStyle(entry.type),
                                    }}
                                >
                                    {entry.type}
                                </span>
                                <span className="text-muted" style={{ fontSize: 12, marginLeft: 'auto' }}>
                                    {entry.date}
                                </span>
                            </div>

                            {/* User-facing bullets */}
                            <ul style={{ margin: 0, paddingLeft: 18 }}>
                                {(entry.user_bullets || []).map((bullet, i) => (
                                    <li
                                        key={i}
                                        style={{ fontSize: 13, lineHeight: 1.55, marginBottom: 5, color: 'var(--color-text)' }}
                                    >
                                        {bullet}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div style={{
                    padding: '14px 24px',
                    borderTop: '1px solid var(--color-border)',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    flexShrink: 0,
                }}>
                    <button type="button" className="btn btn-primary btn-sm" onClick={onClose}>
                        Got it
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modal, document.body);
}

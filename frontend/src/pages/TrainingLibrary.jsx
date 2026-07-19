import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../AuthContext';
import { useT } from '../contexts/LanguageContext';

// ── Role hierarchy — mirrors server.js TRAINING_ROLE_HIERARCHY ────────────────
const ROLE_TABS = [
    { key: 'Risk Champion',  label: 'Risk Champion' },
    { key: 'Viewer',     label: 'Viewer' },
    { key: 'Risk Manager',    label: 'Risk Manager' },
    { key: 'CRO',        label: 'CRO / Consultant CRO' },
    { key: 'Admin',      label: 'Admin' },
];

const ACCESSIBLE_LEVELS = {
    'Risk Champion':      ['Risk Champion'],
    'Viewer':         ['Risk Champion', 'Viewer'],
    'Risk Manager':        ['Risk Champion', 'Viewer', 'Risk Manager'],
    'CRO':            ['Risk Champion', 'Viewer', 'Risk Manager', 'CRO'],
    'Consultant CRO': ['Risk Champion', 'Viewer', 'Risk Manager', 'CRO'],
    'Admin':          ['Risk Champion', 'Viewer', 'Risk Manager', 'CRO', 'Admin'],
};

// ── Option A — Midnight colour palette ───────────────────────────────────────
const NAVY   = '#0F1B2D';
const BLUE   = '#4A9EE8';
const BGSUB  = '#8BAFD4';

function formatDuration(secs) {
    if (!secs) return '';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
}

// ── Video Card ────────────────────────────────────────────────────────────────
function VideoCard({ video, onPlay }) {
    const [thumbUrl, setThumbUrl] = useState(null);

    useEffect(() => {
        if (!video.thumbnail_path) return;
        fetch(`/api/training/videos/${video.id}/thumbnail`, { credentials: 'include' })
            .then((r) => r.ok ? r.json() : null)
            .then((d) => d?.url && setThumbUrl(d.url))
            .catch(() => {});
    }, [video.id, video.thumbnail_path]);

    return (
        <div
            onClick={() => onPlay(video)}
            style={{
                background: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: 10,
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'box-shadow 0.15s, transform 0.15s',
                display: 'flex',
                flexDirection: 'column',
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(74,158,232,0.18)';
                e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'none';
            }}
        >
            {/* Thumbnail */}
            <div style={{
                width: '100%', aspectRatio: '16/9',
                background: NAVY,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative', overflow: 'hidden',
            }}>
                {thumbUrl ? (
                    <img src={thumbUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                        <circle cx="20" cy="20" r="18" fill={BLUE} fillOpacity="0.2" stroke={BLUE} strokeWidth="1.5" />
                        <polygon points="16,13 30,20 16,27" fill={BLUE} />
                    </svg>
                )}
                {video.duration_seconds && (
                    <div style={{
                        position: 'absolute', bottom: 6, right: 8,
                        background: 'rgba(15,27,45,0.85)',
                        color: '#fff', fontSize: 11, fontWeight: 600,
                        padding: '2px 6px', borderRadius: 4,
                    }}>
                        {formatDuration(video.duration_seconds)}
                    </div>
                )}
                <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: 0, transition: 'opacity 0.15s',
                    background: 'rgba(15,27,45,0.45)',
                }}
                    className="play-overlay"
                    onMouseEnter={(e) => { e.currentTarget.style.opacity = 1; }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = 0; }}
                >
                    <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
                        <circle cx="22" cy="22" r="20" fill={BLUE} />
                        <polygon points="18,14 34,22 18,30" fill="#fff" />
                    </svg>
                </div>
            </div>

            {/* Meta */}
            <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {video.module && (
                    <span style={{
                        fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
                        color: BLUE, textTransform: 'uppercase',
                    }}>
                        {video.module}
                    </span>
                )}
                <div style={{ fontSize: 13, fontWeight: 600, color: '#111', lineHeight: 1.4 }}>
                    {video.title}
                </div>
                {video.description && (
                    <div style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.5, marginTop: 2 }}>
                        {video.description}
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Video Player Modal ────────────────────────────────────────────────────────
function VideoModal({ video, onClose }) {
    const [url, setUrl] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/training/videos/${video.id}/url`, { credentials: 'include' })
            .then((r) => r.ok ? r.json() : Promise.reject())
            .then((d) => { setUrl(d.url); setLoading(false); })
            .catch(() => { setError('Could not load video. Please try again.'); setLoading(false); });
    }, [video.id]);

    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, zIndex: 1000,
                background: 'rgba(15,27,45,0.88)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 24,
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: '100%', maxWidth: 900,
                    background: NAVY, borderRadius: 12,
                    overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
                }}
            >
                {/* Modal header */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 20px',
                    borderBottom: `1px solid rgba(74,158,232,0.2)`,
                }}>
                    <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{video.title}</div>
                        {video.module && (
                            <div style={{ fontSize: 11, color: BGSUB, marginTop: 2 }}>{video.module}</div>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(74,158,232,0.12)', border: 'none',
                            color: BLUE, borderRadius: 6, padding: '4px 10px',
                            cursor: 'pointer', fontSize: 18, lineHeight: 1,
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* Video player */}
                <div style={{ aspectRatio: '16/9', background: '#000', position: 'relative' }}>
                    {loading && (
                        <div style={{
                            position: 'absolute', inset: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: BGSUB, fontSize: 13,
                        }}>
                            Loading…
                        </div>
                    )}
                    {error && (
                        <div style={{
                            position: 'absolute', inset: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#ef4444', fontSize: 13, padding: 24, textAlign: 'center',
                        }}>
                            {error}
                        </div>
                    )}
                    {url && (
                        <video
                            src={url}
                            controls
                            autoPlay
                            style={{ width: '100%', height: '100%', display: 'block' }}
                        />
                    )}
                </div>

                {/* Footer */}
                <div style={{ padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {video.duration_seconds && (
                        <span style={{ fontSize: 12, color: BGSUB }}>
                            Duration: {formatDuration(video.duration_seconds)}
                        </span>
                    )}
                    <span style={{ fontSize: 11, color: 'rgba(139,175,212,0.6)' }}>
                        Press Esc to close
                    </span>
                </div>
            </div>
        </div>
    );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function TrainingLibrary() {
    const { session } = useAuth();
    const t = useT();
    const activeCompany = session.companies.find((c) => c.id === session.activeCompanyId);
    const role = activeCompany?.role || 'Viewer';

    const accessibleLevels = ACCESSIBLE_LEVELS[role] || ['Risk Champion'];
    const visibleTabs = ROLE_TABS.filter((t) => accessibleLevels.includes(t.key));

    const [activeTab, setActiveTab]   = useState(visibleTabs[0]?.key || 'Risk Champion');
    const [videos, setVideos]         = useState([]);
    const [loading, setLoading]       = useState(true);
    const [playingVideo, setPlaying]  = useState(null);

    const fetchVideos = useCallback(async () => {
        setLoading(true);
        try {
            const r = await fetch('/api/training/videos', { credentials: 'include' });
            if (r.ok) setVideos(await r.json());
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchVideos(); }, [fetchVideos]);

    const tabVideos = videos.filter((v) => v.role_level === activeTab);

    return (
        <div className="card" style={{ maxWidth: 1100 }}>
            {/* Page header */}
            <div style={{ marginBottom: 20 }}>
                <h1 className="page-title">{t('training_title')}</h1>
                <p className="page-subtitle">{t('training_subtitle')}</p>
            </div>

            {/* Role tabs */}
            <div style={{
                display: 'flex', gap: 6, marginBottom: 24,
                borderBottom: '2px solid #e5e7eb', paddingBottom: 0,
            }}>
                {visibleTabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        style={{
                            padding: '8px 18px',
                            border: 'none', background: 'none',
                            fontSize: 13, fontWeight: 600, cursor: 'pointer',
                            color: activeTab === tab.key ? NAVY : '#6b7280',
                            borderBottom: activeTab === tab.key ? `3px solid ${BLUE}` : '3px solid transparent',
                            marginBottom: -2,
                            transition: 'color 0.15s, border-color 0.15s',
                        }}
                    >
                        {tab.label}
                        {(() => {
                            const count = videos.filter((v) => v.role_level === tab.key).length;
                            return count > 0 ? (
                                <span style={{
                                    marginLeft: 6, fontSize: 10, fontWeight: 700,
                                    background: activeTab === tab.key ? BLUE : '#e5e7eb',
                                    color: activeTab === tab.key ? '#fff' : '#6b7280',
                                    borderRadius: 20, padding: '1px 7px',
                                }}>
                                    {count}
                                </span>
                            ) : null;
                        })()}
                    </button>
                ))}
            </div>

            {/* Video grid */}
            {loading ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Loading videos…</div>
            ) : tabVideos.length === 0 ? (
                <div style={{
                    padding: 48, textAlign: 'center', color: '#9ca3af',
                    border: '2px dashed #e5e7eb', borderRadius: 10,
                }}>
                    <div style={{ fontSize: 32, marginBottom: 12 }}>🎬</div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                        No videos yet for this role
                    </div>
                    <div style={{ fontSize: 13 }}>
                        Training videos for the {activeTab} role are being produced and will appear here soon.
                    </div>
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                    gap: 16,
                }}>
                    {tabVideos.map((v) => (
                        <VideoCard key={v.id} video={v} onPlay={setPlaying} />
                    ))}
                </div>
            )}

            {/* Video modal */}
            {playingVideo && (
                <VideoModal video={playingVideo} onClose={() => setPlaying(null)} />
            )}
        </div>
    );
}

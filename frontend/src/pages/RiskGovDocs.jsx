import { Fragment, useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { useT } from '../contexts/LanguageContext';

const ALLOWED_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg',
    'image/png',
];
const ALLOWED_EXT = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png';

function fmtSize(bytes) {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-CA');
}

// ── Upload Modal ──────────────────────────────────────────────────────────────
function UploadModal({ categories, existingDoc, onClose, onUploaded }) {
    const { api } = useAuth();
    const t = useT();
    const isVersion = !!existingDoc;
    const [categoryId, setCategoryId] = useState(existingDoc?.category_id || (categories[0]?.id ?? ''));
    const [title, setTitle]           = useState(existingDoc?.title || '');
    const [description, setDescription] = useState('');
    const [file, setFile]             = useState(null);
    const [uploading, setUploading]   = useState(false);
    const [error, setError]           = useState('');
    const [progress, setProgress]     = useState('');

    async function handleSubmit(e) {
        e.preventDefault();
        if (!file) return setError('Please select a file.');
        if (!ALLOWED_TYPES.includes(file.type)) return setError('File type not supported. Use PDF, Word, Excel, PowerPoint, or image files.');
        setUploading(true);
        setError('');
        try {
            // 1. Get signed upload URL
            setProgress('Requesting upload URL…');
            const { url, gcsPath } = await api.post('/risk-gov/upload-url', {
                filename: file.name,
                contentType: file.type,
            });
            // 2. Upload directly to GCS
            setProgress('Uploading file…');
            const uploadRes = await fetch(url, {
                method: 'PUT',
                headers: { 'Content-Type': file.type },
                body: file,
            });
            if (!uploadRes.ok) throw new Error('Upload to storage failed.');
            // 3. Save record
            setProgress('Saving record…');
            if (isVersion) {
                await api.post(`/risk-gov/documents/${existingDoc.id}/version`, {
                    file_name: file.name,
                    file_size: file.size,
                    gcs_path: gcsPath,
                    description,
                });
            } else {
                await api.post('/risk-gov/documents', {
                    category_id: parseInt(categoryId, 10),
                    title: title.trim(),
                    description,
                    file_name: file.name,
                    file_size: file.size,
                    gcs_path: gcsPath,
                });
            }
            onUploaded();
        } catch (err) {
            setError(err.message || 'Upload failed.');
        } finally {
            setUploading(false);
            setProgress('');
        }
    }

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }} onMouseDown={(e) => { if (e.target === e.currentTarget && !uploading) onClose(); }}>
            <div style={{
                background: 'var(--color-surface)', borderRadius: 12, width: 520,
                maxWidth: '92vw', boxShadow: '0 16px 48px rgba(0,0,0,0.28)',
                overflow: 'hidden',
            }} onMouseDown={e => e.stopPropagation()}>
                <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>
                        {isVersion ? `${t('rgd_new_version_title')} — ${existingDoc.doc_id}` : t('rgd_upload_title')}
                    </h2>
                    <button type="button" onClick={onClose} disabled={uploading}
                        style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--color-text-muted)' }}>✕</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div style={{ padding: '20px 24px' }}>
                        {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}
                        {!isVersion && (
                            <>
                                <div className="form-group">
                                    <label>{t('rgd_category_label')}</label>
                                    <select className="form-control" value={categoryId} onChange={e => setCategoryId(e.target.value)} required>
                                        {categories.map(c => (
                                            <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
                                        ))}
                                    </select>
                                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 5 }}>
                                        {t('rgd_docid_hint')} <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{(categories.find(c => String(c.id) === String(categoryId))?.code || '???')}-{new Date().getFullYear()}-001</span>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>{t('rgd_title_label')}</label>
                                    <input className="form-control" value={title} onChange={e => setTitle(e.target.value)}
                                        placeholder="e.g. Board Risk Appetite Approval FY2026" required />
                                </div>
                            </>
                        )}
                        <div className="form-group">
                            <label>{t('rgd_desc_label')}</label>
                            <textarea className="form-control" rows={2} value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="Brief notes about this document or version…" />
                        </div>
                        <div className="form-group">
                            <label>{t('rgd_file_label')}</label>
                            <input type="file" accept={ALLOWED_EXT} onChange={e => setFile(e.target.files[0] || null)}
                                style={{ display: 'block', fontSize: 13, marginTop: 4 }} required />
                        </div>
                        {progress && (
                            <div style={{ fontSize: 13, color: 'var(--color-primary)', marginBottom: 8 }}>
                                ⏳ {progress}
                            </div>
                        )}
                    </div>
                    <div style={{ padding: '14px 24px 20px', borderTop: '1px solid var(--color-border)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={uploading}>{t('btn_cancel')}</button>
                        <button type="submit" className="btn btn-primary" disabled={uploading}>
                            {uploading ? t('rgd_uploading') : isVersion ? t('rgd_add_version') : t('rgd_upload')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ── Add Category Modal ────────────────────────────────────────────────────────
function AddCategoryModal({ onClose, onAdded }) {
    const { api } = useAuth();
    const t = useT();
    const [code, setCode] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            await api.post('/risk-gov/categories', { code: code.toUpperCase(), name });
            onAdded();
        } catch (err) {
            setError(err.message || 'Failed to add category');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
            onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div style={{ background: 'var(--color-surface)', borderRadius: 12, width: 400, maxWidth: '92vw', boxShadow: '0 16px 48px rgba(0,0,0,0.28)', overflow: 'hidden' }}
                onMouseDown={e => e.stopPropagation()}>
                <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{t('rgd_add_cat_title')}</h2>
                    <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--color-text-muted)' }}>✕</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div style={{ padding: '18px 24px' }}>
                        {error && <div className="alert alert-error">{error}</div>}
                        <div className="form-group">
                            <label>{t('rgd_cat_code')}</label>
                            <input className="form-control" value={code} onChange={e => setCode(e.target.value.toUpperCase())}
                                placeholder="e.g. BOD" maxLength={10} required style={{ textTransform: 'uppercase' }} />
                        </div>
                        <div className="form-group">
                            <label>{t('rgd_cat_name')}</label>
                            <input className="form-control" value={name} onChange={e => setName(e.target.value)}
                                placeholder="e.g. Board of Directors" required />
                        </div>
                    </div>
                    <div style={{ padding: '12px 24px 18px', borderTop: '1px solid var(--color-border)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button type="button" className="btn btn-secondary" onClick={onClose}>{t('forms_back')}</button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? '…' : t('rgd_add_cat_title')}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ── Version History Panel ─────────────────────────────────────────────────────
function VersionPanel({ docId, latestId, onClose, onDownload }) {
    const { api } = useAuth();
    const t = useT();
    const [versions, setVersions] = useState([]);
    const [loading, setLoading]   = useState(true);

    useEffect(() => {
        api.get(`/risk-gov/documents/${latestId}/versions`)
            .then(setVersions)
            .catch(() => setVersions([]))
            .finally(() => setLoading(false));
    }, [latestId]);

    return (
        <div style={{ background: '#f8fafc', border: '1px solid var(--color-border)', borderRadius: 8, margin: '4px 0 8px', padding: '12px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>{t('rgd_version_history')} — {docId}</span>
                <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: 16 }}>✕</button>
            </div>
            {loading ? <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{t('loading')}</div> : (
                <table style={{ fontSize: 12, borderRadius: 6 }}>
                    <thead>
                        <tr>
                            <th>{t('rgd_version_label')}</th>
                            <th>{t('rgd_file_label')}</th>
                            <th>{t('rgd_col_size')}</th>
                            <th>{t('rgd_col_uploaded_by')}</th>
                            <th>Date</th>
                            <th>{t('rgd_desc_label')}</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {versions.map(v => (
                            <tr key={v.id}>
                                <td>
                                    <span style={{ fontWeight: 700 }}>v{v.version}</span>
                                    {v.is_latest && <span className="badge badge-approved" style={{ marginLeft: 6, fontSize: 10 }}>{t('rgd_latest')}</span>}
                                </td>
                                <td>{v.file_name}</td>
                                <td>{fmtSize(v.file_size)}</td>
                                <td>{v.uploaded_by_name || '—'}</td>
                                <td>{fmtDate(v.uploaded_at)}</td>
                                <td style={{ maxWidth: 160, color: 'var(--color-text-muted)' }}>{v.description || '—'}</td>
                                <td>
                                    <button type="button" className="btn btn-sm btn-secondary" onClick={() => onDownload(v.id, v.file_name)}>
                                        ↓ Download
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function RiskGovDocs() {
    const { api } = useAuth();
    const t = useT();
    const [categories, setCategories]   = useState([]);
    const [documents, setDocuments]     = useState([]);
    const [loading, setLoading]         = useState(true);
    const [error, setError]             = useState('');
    const [filterCat, setFilterCat]     = useState('all');
    const [showUpload, setShowUpload]   = useState(false);
    const [versionTarget, setVersionTarget] = useState(null);
    const [showAddCat, setShowAddCat]   = useState(false);
    const [expandedDoc, setExpandedDoc] = useState(null);
    const [deletingDoc, setDeletingDoc] = useState(null);

    async function load() {
        setLoading(true);
        setError('');
        try {
            const [cats, docs] = await Promise.all([
                api.get('/risk-gov/categories'),
                api.get('/risk-gov/documents'),
            ]);
            setCategories(Array.isArray(cats) ? cats : []);
            setDocuments(Array.isArray(docs) ? docs : []);
        } catch (e) {
            setError(e.message || 'Failed to load');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { load(); }, []);

    async function handleDeleteCategory(cat) {
        if (!window.confirm(`Delete category "${cat.name}" (${cat.code})?`)) return;
        try {
            await api.delete(`/risk-gov/categories/${cat.id}`);
            await load();
        } catch (e) {
            alert(e.message || 'Failed to delete category');
        }
    }

    async function handleDeleteDocument(doc) {
        if (!window.confirm(`Delete "${doc.title}" (${doc.doc_id}) and ALL its versions? This cannot be undone.`)) return;
        setDeletingDoc(doc.id);
        try {
            await api.delete(`/risk-gov/documents/${doc.id}`);
            await load();
        } catch (e) {
            alert(e.message || 'Failed to delete document');
        } finally {
            setDeletingDoc(null);
        }
    }

    async function handleDownload(docId, fileName) {
        try {
            const { url } = await api.get(`/risk-gov/documents/${docId}/download`);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (e) {
            alert('Could not generate download link.');
        }
    }

    const filtered = filterCat === 'all'
        ? documents
        : documents.filter(d => String(d.category_id) === filterCat);

    return (
        <div>
            <div className="topbar">
                <div>
                    <h1 className="page-title">{t('rgd_title')}</h1>
                    <p className="page-subtitle">{t('rgd_subtitle')}</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowUpload(true)}>
                    {t('rgd_upload')}
                </button>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            {/* ── Category tabs + Documents table ── */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>

                {/* Category tab bar — wraps to a second row when there are many categories */}
                <div style={{
                    display: 'flex', flexWrap: 'wrap', alignItems: 'center',
                    borderBottom: '1px solid var(--color-border)',
                    padding: '0 8px',
                    gap: 0,
                }}>
                    {/* "All" tab */}
                    <button
                        type="button"
                        onClick={() => setFilterCat('all')}
                        style={{
                            padding: '13px 14px',
                            background: 'none', border: 'none', cursor: 'pointer',
                            fontSize: 13, fontWeight: filterCat === 'all' ? 700 : 500,
                            color: filterCat === 'all' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                            borderBottom: filterCat === 'all' ? '2px solid var(--color-primary)' : '2px solid transparent',
                            marginBottom: -1,
                            whiteSpace: 'nowrap',
                        }}
                    >
                        All
                        <span style={{
                            marginLeft: 6, fontSize: 11, fontWeight: 600,
                            background: filterCat === 'all' ? 'var(--color-primary)' : 'var(--color-border)',
                            color: filterCat === 'all' ? '#fff' : 'var(--color-text-muted)',
                            borderRadius: 10, padding: '1px 6px',
                        }}>{documents.length}</span>
                    </button>

                    {/* Per-category tabs */}
                    {!loading && categories.map(cat => {
                        const catDocs = documents.filter(d => String(d.category_id) === String(cat.id));
                        const isActive = filterCat === String(cat.id);
                        return (
                            <button
                                key={cat.id}
                                type="button"
                                onClick={() => setFilterCat(String(cat.id))}
                                style={{
                                    padding: '13px 14px',
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    fontSize: 13, fontWeight: isActive ? 700 : 400,
                                    color: isActive ? 'var(--color-primary)' : 'var(--color-text)',
                                    borderBottom: isActive ? '2px solid var(--color-primary)' : '2px solid transparent',
                                    marginBottom: -1,
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                <span style={{
                                    fontFamily: 'monospace', fontSize: 11, fontWeight: 700,
                                    color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
                                    marginRight: 5,
                                }}>{cat.code}</span>
                                {cat.name}
                                {catDocs.length > 0 && (
                                    <span style={{
                                        marginLeft: 6, fontSize: 11, fontWeight: 600,
                                        background: isActive ? 'var(--color-primary)' : 'var(--color-border)',
                                        color: isActive ? '#fff' : 'var(--color-text-muted)',
                                        borderRadius: 10, padding: '1px 6px',
                                    }}>{catDocs.length}</span>
                                )}
                            </button>
                        );
                    })}

                    {/* "+ Add Category" — sits inline at the end of the tabs */}
                    <button
                        type="button"
                        onClick={() => setShowAddCat(true)}
                        style={{
                            padding: '13px 14px',
                            background: 'none', border: 'none', cursor: 'pointer',
                            fontSize: 13, fontWeight: 500,
                            color: 'var(--color-primary)',
                            borderBottom: '2px solid transparent',
                            marginBottom: -1,
                            whiteSpace: 'nowrap',
                            opacity: 0.75,
                        }}
                    >{t('rgd_add_category')}</button>
                </div>

                {loading ? (
                    <div style={{ padding: 24, color: 'var(--color-text-muted)', fontSize: 13 }}>{t('loading')}</div>
                ) : filtered.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 14 }}>
                        {t('rgd_no_docs')}
                    </div>
                ) : (
                    <table style={{ borderRadius: 0, border: 'none' }}>
                        <thead>
                            <tr>
                                <th>{t('rgd_col_docid')}</th>
                                <th>{t('rgd_col_title')}</th>
                                <th>{t('rgd_col_category')}</th>
                                <th>{t('rgd_col_ver')}</th>
                                <th>{t('rgd_col_size')}</th>
                                <th>{t('rgd_col_uploaded_by')}</th>
                                <th>Date</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(doc => (
                                <Fragment key={doc.id}>
                                    <tr>
                                        <td>
                                            <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12, color: 'var(--color-primary)' }}>
                                                {doc.doc_id}
                                            </span>
                                        </td>
                                        <td style={{ fontWeight: 600 }}>{doc.title}</td>
                                        <td>
                                            <span className="badge badge-role">{doc.category_code}</span>
                                            <span style={{ marginLeft: 6, fontSize: 12, color: 'var(--color-text-muted)' }}>{doc.category_name}</span>
                                        </td>
                                        <td>
                                            <button
                                                type="button"
                                                onClick={() => setExpandedDoc(expandedDoc === doc.id ? null : doc.id)}
                                                style={{
                                                    background: 'none', border: '1px solid var(--color-border)',
                                                    borderRadius: 6, padding: '2px 10px', cursor: 'pointer',
                                                    fontSize: 12, fontWeight: 700,
                                                    color: expandedDoc === doc.id ? 'var(--color-primary)' : 'var(--color-text)',
                                                }}
                                                title="View version history"
                                            >
                                                v{doc.version} {expandedDoc === doc.id ? '▲' : '▼'}
                                            </button>
                                        </td>
                                        <td style={{ fontSize: 12 }}>{fmtSize(doc.file_size)}</td>
                                        <td style={{ fontSize: 12 }}>{doc.uploaded_by_name || '—'}</td>
                                        <td style={{ fontSize: 12 }}>{fmtDate(doc.uploaded_at)}</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                                <button type="button" className="btn btn-sm btn-secondary"
                                                    onClick={() => handleDownload(doc.id, doc.file_name)}>
                                                    ↓
                                                </button>
                                                <button type="button" className="btn btn-sm btn-secondary"
                                                    onClick={() => { setVersionTarget(doc); setShowUpload(false); }}
                                                    title="Upload new version">
                                                    ↑ Ver
                                                </button>
                                                <button type="button" className="btn btn-sm btn-danger"
                                                    disabled={deletingDoc === doc.id}
                                                    onClick={() => handleDeleteDocument(doc)}>
                                                    {deletingDoc === doc.id ? '…' : 'Delete'}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    {expandedDoc === doc.id && (
                                        <tr>
                                            <td colSpan={8} style={{ padding: 0, border: 'none' }}>
                                                <VersionPanel
                                                    docId={doc.doc_id}
                                                    latestId={doc.id}
                                                    onClose={() => setExpandedDoc(null)}
                                                    onDownload={handleDownload}
                                                />
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* ── Modals ── */}
            {showUpload && (
                <UploadModal
                    categories={categories}
                    existingDoc={null}
                    onClose={() => setShowUpload(false)}
                    onUploaded={() => { setShowUpload(false); load(); }}
                />
            )}
            {versionTarget && (
                <UploadModal
                    categories={categories}
                    existingDoc={versionTarget}
                    onClose={() => setVersionTarget(null)}
                    onUploaded={() => { setVersionTarget(null); load(); }}
                />
            )}
            {showAddCat && (
                <AddCategoryModal
                    onClose={() => setShowAddCat(false)}
                    onAdded={() => { setShowAddCat(false); load(); }}
                />
            )}
        </div>
    );
}

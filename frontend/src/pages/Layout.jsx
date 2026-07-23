import { useEffect, useState } from 'react';
import { useAuth, isStandaloneApp } from '../AuthContext';
import TopBar from '../components/TopBar';
import HelpPanel from '../components/HelpPanel';
import WhatsNew, { hasUnseenUpdates, markAsSeen } from '../components/WhatsNew';
import { useBranding } from '../components/useBranding';
import { useLanguage, useT } from '../contexts/LanguageContext';
import certitudeLogo from '../assets/certitude-logo.png';

// Nav items grouped by section. 'group' is the section heading shown in the
// sidebar; items with no group (undefined) render ungrouped at the top.
// Phase D cutover (2026-07-23): most items below now resolve visibility via
// a `capability` key instead of a role list -- CRO_ROLES/OP_ROLES/WORKFLOW
// are gone (no remaining call sites); ALL_ROLES and NON_ADMIN are kept for
// the handful of items with no corresponding capability (see the NAV_ITEMS
// header comment below).
const ALL_ROLES = ['Super Admin', 'Admin', 'Risk Champion', 'Risk Owner', 'Risk Manager', 'CRO', 'Viewer', 'Consultant CRO'];
const NON_ADMIN = ['Super Admin', 'Risk Champion', 'Risk Owner', 'Risk Manager', 'CRO', 'Consultant CRO', 'Viewer'];

// Arabic translations keyed by nav item id
const AR_LABELS = {
    'management-summary': 'لوحة القيادة',
    'my-tasks':           'مهامي',
    'policies':           'مستودع السياسات',
    'org-roles':          'الأدوار التنظيمية (RACI)',
    'risks':              'سجل المخاطر',
    'critical-risks':     'سجل المخاطر الحرجة',
    'controls':           'مكتبة الضوابط',
    'kris':               'مكتبة مؤشرات المخاطر',
    'kri-register':       'سجل مؤشرات المخاطر',
    'issues':             'القضايا والإجراءات',
    'scoring-methodology':'منهجية التقييم',
    'obligations':        'التزامات الامتثال',
    'calendar':           'تقويم الامتثال',
    'branding':           'العلامة التجارية',
    'companies':          'هيكل الشركة',
    'business-units':     'وحدات الأعمال',
    'departments':        'الأقسام',
    'users':              'المستخدمون والصلاحيات',
    'risk-config':        'إعداد المخاطر',
    'escalation-rules':   'قواعد التصعيد',
    'email-settings':     'إعدادات البريد الإلكتروني',
    'ai-integration':     'تكامل الذكاء الاصطناعي',
    'storage-health':     'التخزين والصحة',
    'glossary':           'المسرد',
    'audit':              'سجل المراجعة',
    'data-tools':         'استيراد / تصدير',
    'incident-log':       'سجل الحوادث',
    'risk-appetite':      'شهية المخاطر',
    'horizon-scanning':   'مسح الأفق الاستراتيجي',
    'access-matrix':      'مصفوفة الصلاحيات',
    'roles-permissions':  'الأدوار والصلاحيات',
};

const AR_GROUPS = {
    'Governance':             'الحوكمة',
    'Risk':                   'المخاطر',
    'Compliance':             'الامتثال',
    'Admin':                  'المسؤول',
    'Consultant':             'المستشار',
    'Strategic Intelligence': 'الاستخبارات الاستراتيجية',
};

// Phase D cutover (2026-07-23): most items now carry a `capability` key
// instead of (or alongside) a hardcoded `roles` array -- visibility is
// resolved against session.companies[].permissions (getPermissionsMap(),
// server.js) rather than a role-string comparison. Every mapping below was
// individually cross-checked against the seeded role_permissions data, the
// matching App.jsx page gate, and (where already cut over) the backing
// backend route before being wired up here -- see
// Documents/Internal/RBAC_Permissions_Engine_Scoping.docx Section 8.2/10.
//
// A handful of items have no `capability` at all and keep the old
// `roles` array unchanged, because no capability exists for them in the
// Section 7 taxonomy:
//   - 'critical-risks' -- no dedicated capability; App.jsx's page gate is
//     also fully ungated (everyone). Left as a hardcoded NON_ADMIN list.
//   - 'access-matrix' -- retired for Admin/Super Admin as of Phase B; the
//     page itself is a static, hand-typed reference with no backend route
//     at all (see AccessMatrix.jsx), so there is nothing for a capability
//     to represent. Left hardcoded to CRO/Consultant CRO, noBypass: true.
//   - 'glossary' -- GET /api/glossary has no role gate at all (open to any
//     authenticated user); ALL_ROLES here just documents that, not a real
//     restriction. Left hardcoded.
//
// Two real, confirmed behavior changes ship with this cutover (both
// reviewed and approved before implementing, not silently decided):
//   - 'horizon-scanning': was CRO/Consultant CRO/Risk Manager only; the
//     seeded horizon.view capability (and App.jsx's already-ungated page
//     gate) also cover Admin, Super Admin, Risk Champion, and Risk Owner --
//     they gain a working nav link to a page they could already reach by
//     URL.
//   - 'data-tools' (Import/Export): was CRO_ROLES only (no Risk Champion);
//     the backing backend routes (/api/import/:module, /api/export/:module)
//     already grant Risk Champion full access via their literal
//     requireRole() list -- confirmed by reading the live routes, not
//     assumed. App.jsx's page gate needed the matching one-line fix (see
//     App.jsx) since without it the nav link would have led nowhere.
//
// Every other capability-based item below is an exact match with today's
// real effective access (nav role array + the Admin/Super-Admin bypass
// below, cross-checked against App.jsx's page gate) EXCEPT for a uniform,
// single-root-cause gap repeated across ~9 items: the nav's `roles` array
// simply never had plain 'Admin' added, even though App.jsx's page gate
// and the backend capability both already grant Admin full access (Admin
// could only reach these pages via the default-landing fallback or a typed
// URL, never the sidebar). Cutting over fixes this uniformly wherever it
// applied: management-summary, my-tasks, policies, controls, kris,
// kri-register, issues, obligations, calendar, org-roles, incident-log.
const NAV_ITEMS = [
    // ── Cross-cutting (ungrouped, always at top) ──
    { id: 'management-summary', label: 'Dashboard', capability: 'dashboard.management_summary.view' },
    { id: 'my-tasks',           label: 'My Tasks',  capability: 'tasks.my_tasks.view' },

    // ── Governance ──
    { id: 'policies',   label: 'Policy Repository', capability: 'policy.view', group: 'Governance' },

    // ── Strategic Intelligence ──
    { id: 'horizon-scanning',    label: 'Horizon Scanning',     capability: 'horizon.view', group: 'Strategic Intelligence' },
    { id: 'org-roles',           label: 'Org Roles (RACI)',     capability: 'org_roles.view', group: 'Strategic Intelligence' },
    { id: 'risk-appetite',       label: 'Risk Appetite',        capability: 'risk_appetite.view', group: 'Strategic Intelligence' },
    { id: 'scoring-methodology', label: 'Scoring Methodology',  capability: 'scoring_methodology.view', group: 'Strategic Intelligence' },

    // ── Risk ──
    { id: 'risks',               label: 'Risk Register',       capability: 'risk.view', group: 'Risk' },
    { id: 'critical-risks',      label: 'Critical Risks Log',  roles: NON_ADMIN, group: 'Risk' }, // no capability -- see header note
    { id: 'controls',            label: 'Control Library',     capability: 'control.view', group: 'Risk' },
    { id: 'kris',                label: 'KRI Library',         capability: 'kri.view', group: 'Risk' },
    { id: 'kri-register',        label: 'KRI Register',        capability: 'kri.view', group: 'Risk' },
    { id: 'issues',              label: 'Issues & Actions',    capability: 'issue.view', group: 'Risk' },
    { id: 'incident-log',        label: 'Incident Log',        capability: 'incident.view', group: 'Risk' },
    { id: 'risk-gov-docs',        label: 'Risk Gov. Documents',       capability: 'risk_gov_docs.view', group: 'Risk' },
    { id: 'forms-templates',      label: 'Forms & Templates',         capability: 'forms.accepted_risk_report', group: 'Risk' },

    // ── Compliance ──
    { id: 'obligations', label: 'Compliance Obligations', capability: 'obligation.view', group: 'Compliance' },
    { id: 'calendar',    label: 'Compliance Calendar',    capability: 'calendar.view', group: 'Compliance' },

    // ── Admin (ordered by setup sequence) ──
    { id: 'branding',         label: 'Branding',           capability: 'branding.manage', group: 'Admin' },
    { id: 'companies',        label: 'Company Structure',  capability: 'company.manage', group: 'Admin' },
    { id: 'business-units',   label: 'Business Units',     capability: 'business_units.manage', group: 'Admin' },
    { id: 'departments',      label: 'Departments',        capability: 'departments.manage', group: 'Admin' },
    { id: 'users',            label: 'Users & Access',     capability: 'users.manage', group: 'Admin' },
    { id: 'roles-permissions', label: 'Roles & Permissions', capability: 'roles.manage', group: 'Admin' },
    // Access Matrix retired for Admin/Super Admin as of Phase B — see App.jsx.
    // Left in place for CRO/Consultant CRO only, who still use it as a
    // reference. No capability represents this page (see header note).
    // noBypass: true opts this item out of the blanket Admin/Super-Admin
    // "see every nav item" rule below, since App.jsx no longer has a
    // matching route for them (they use Roles & Permissions instead) —
    // without this flag the link stayed visible to Admin/Super Admin but
    // pointed at nothing.
    { id: 'access-matrix',   label: 'Access Matrix',      roles: ['CRO', 'Consultant CRO'], group: 'Admin', noBypass: true },
    { id: 'risk-config',      label: 'Risk Configuration', capability: 'risk_config.manage', group: 'Admin' },
    { id: 'escalation-rules', label: 'Escalation Rules',   capability: 'escalation_rules.manage', group: 'Admin' },
    { id: 'email-settings',   label: 'Email Settings',     capability: 'email_settings.manage', group: 'Admin' },
    { id: 'ai-integration',   label: 'AI Integration',     capability: 'ai_settings.manage', group: 'Admin' },
    { id: 'storage-health',   label: 'Storage & Health',   capability: 'storage.manage', group: 'Admin' },

    // ── Cross-cutting (ungrouped — below Admin so utility items stay at the bottom) ──
    { id: 'glossary',   label: 'Glossary',          roles: ALL_ROLES }, // GET /api/glossary has no role gate -- see header note
    { id: 'audit',      label: 'Audit Log',         capability: 'audit_log.view' },
    { id: 'data-tools', label: 'Import / Export',   capability: 'data.export' },
];

export default function Layout({ page, onNavigate, children, groupView }) {
    const { session, logout, openCompanyPicker, idleWarning, dismissIdleWarning } = useAuth();
    const activeCompany = session.companies.find((c) => c.id === session.activeCompanyId);
    const role = activeCompany?.role || 'Viewer';
    const permissions = activeCompany?.permissions || {};
    const isConsultant = !!session.user.is_consultant;
    const branding = useBranding();
    const { lang, setLang } = useLanguage();
    const ar = lang === 'ar';
    const t = useT();

    // Helper: resolve nav label in active language
    const navLabel = (item) => ar ? (AR_LABELS[item.id] || item.label) : item.label;
    const groupLabel = (g) => ar ? (AR_GROUPS[g] || g) : g;

    const [appVersion, setAppVersion] = useState('');
    const [demoMode, setDemoMode] = useState(null);
    const [helpOpen, setHelpOpen] = useState(false);
    const [whatsNewOpen, setWhatsNewOpen] = useState(false);
    const [hasUpdates, setHasUpdates] = useState(false);
    const [prevPage, setPrevPage] = useState(null);
    const [deptMap, setDeptMap] = useState({}); // code → name lookup

    function toggleAbout() {
        if (page === 'about') {
            onNavigate(prevPage || (role === 'Admin' ? 'users' : 'my-tasks'));
        } else {
            setPrevPage(page);
            onNavigate('about');
        }
    }

    useEffect(() => {
        setHasUpdates(hasUnseenUpdates());
    }, []);

    // Security: auto-logout if the browser back button is used.
    // Push a sentinel history entry on mount so there's always something to pop.
    // popstate only fires on browser back/forward — never on internal SPA navigation.
    // Skipped in the standalone Dock/Home Screen window: there's no address
    // bar or tab strip there for a "back to a stale page" concern to apply,
    // and pushing an extra history entry would otherwise block window.close()
    // on logout (Safari only allows a script to self-close a window whose
    // session history has exactly one entry).
    useEffect(() => {
        if (isStandaloneApp()) return;
        window.history.pushState({ grcApp: true }, '');
        const handlePop = () => { logout(); };
        window.addEventListener('popstate', handlePop);
        return () => window.removeEventListener('popstate', handlePop);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        fetch('/api/version')
            .then((r) => r.json())
            .then((d) => { setAppVersion(d.version || ''); setDemoMode(d.demo_mode || null); })
            .catch(() => {});
        fetch('/api/departments')
            .then((r) => r.json())
            .then((list) => {
                const map = {};
                (list || []).forEach((d) => { map[d.code?.toLowerCase()] = d.name; });
                setDeptMap(map);
            })
            .catch(() => {});
    }, []);

    // Resolve dept code → full name (falls back to the raw value if not found)
    const resolveDept = (code) => code ? (deptMap[code.toLowerCase()] || code) : null;

    // Capability-based items (the majority, post-Phase D) are resolved
    // against the live permissions map -- no separate Admin/Super-Admin
    // bypass needed here, since Phase A already seeds both roles at 'full'
    // on nearly every capability (the two documented exceptions --
    // scoring_methodology.manage, risk.auto_approve -- aren't behind any
    // nav item). The three items with no capability (critical-risks,
    // access-matrix, glossary; see the NAV_ITEMS header comment) keep the
    // old role-array + bypass check unchanged.
    const visibleItems = NAV_ITEMS.filter((item) => {
        if (item.capability) return (permissions[item.capability] || 'none') !== 'none';
        return item.roles.includes(role) ||
            ((role === 'Admin' || role === 'Super Admin') && !item.noBypass);
    }).filter((item) =>
        !(demoMode === 'risk-only' && (item.group === 'Governance' || item.group === 'Compliance'))
    );

    // Build a list of { type: 'heading'|'item', ... } for rendering.
    const navElements = [];
    const seenGroups = new Set();
    for (const item of visibleItems) {
        if (item.group && !seenGroups.has(item.group)) {
            navElements.push({ type: 'heading', label: item.group });
            seenGroups.add(item.group);
        }
        navElements.push({ type: 'item', item });
    }

    return (
        <div className="app-shell" dir={ar ? 'rtl' : 'ltr'}>
            <aside className="sidebar">
                <div className="sidebar-brand" style={{ paddingTop: 24, paddingBottom: 0 }}>
                    <img
                        src={branding.logoUrl || certitudeLogo}
                        alt={branding.name || 'Certitude Advisory Services'}
                        className="sidebar-logo"
                    />
                </div>

                <div className="sidebar-company">
                    {groupView ? (
                        <>
                            <div style={{ fontWeight: 700, color: 'var(--color-text)' }}>
                                🌐 {ar ? 'لوحة المجموعة' : 'Group Dashboard'}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                                {activeCompany?.name}
                            </div>
                        </>
                    ) : (
                        <>
                            <div style={{ fontWeight: 700, color: 'var(--color-text)' }}>{activeCompany?.name}</div>
                            <div style={{ marginTop: 2 }}>
                                {session.user.full_name && (
                                    <div style={{ fontWeight: 600, color: 'var(--color-text)', fontSize: 12 }}>
                                        {session.user.full_name}
                                    </div>
                                )}
                                <div style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>
                                    {role}
                                    {activeCompany?.departments?.length > 0
                                        ? ` · ${activeCompany.departments.map(resolveDept).join(', ')}`
                                        : activeCompany?.department
                                            ? ` · ${resolveDept(activeCompany.department)}`
                                            : ''}
                                </div>
                            </div>
                        </>
                    )}
                    {session.companies.length > 1 && (
                        <button
                            className="nav-link"
                            style={{ padding: '4px 0', fontSize: 12, fontWeight: 600 }}
                            onClick={openCompanyPicker}
                        >
                            {groupView
                                ? (ar ? 'تبديل / الخروج من عرض المجموعة' : 'Switch / exit group view')
                                : (ar ? 'تبديل الشركة' : 'Switch company')}
                        </button>
                    )}
                </div>

                <div className="sidebar-nav">
                {groupView ? (
                    /* In group view, show Group Dashboard */
                    <button
                        className={`nav-link ${page === 'consolidated-dashboard' ? 'active' : ''}`}
                        style={{ textAlign: ar ? 'right' : 'left' }}
                        onClick={() => onNavigate('consolidated-dashboard')}
                    >
                        🌐 {ar ? 'لوحة المجموعة' : 'Group Dashboard'}
                    </button>
                ) : navElements.map((el, i) =>
                    el.type === 'heading' ? (
                        <div
                            key={`heading-${el.label}`}
                            style={{
                                padding: '12px 12px 2px',
                                fontSize: 13,
                                fontWeight: 700,
                                color: 'var(--color-text)',
                                userSelect: 'none',
                                marginTop: i === 0 ? 0 : 6,
                                borderTop: i === 0 ? 'none' : '1px solid var(--color-border)',
                                paddingTop: i === 0 ? 4 : 12,
                                textAlign: ar ? 'right' : 'left',
                            }}
                        >
                            {groupLabel(el.label)}
                        </div>
                    ) : (
                        <button
                            key={el.item.id}
                            className={`nav-link ${page === el.item.id ? 'active' : ''}`}
                            style={{ textAlign: ar ? 'right' : 'left' }}
                            onClick={() => onNavigate(el.item.id)}
                        >
                            {navLabel(el.item)}
                        </button>
                    )
                )}

                {/* ── Consultant section (platform-level, not company-scoped) ── */}
                {isConsultant && (
                    <>
                        <div style={{
                            padding: '12px 12px 2px',
                            fontSize: 13, fontWeight: 700,
                            color: 'var(--color-text)',
                            borderTop: '1px solid var(--color-border)',
                            paddingTop: 12, marginTop: 6,
                        }}>
                            {groupLabel('Consultant')}
                        </div>
                        <button
                            className={`nav-link ${page === 'consultant-dashboard' ? 'active' : ''}`}
                            onClick={() => onNavigate('consultant-dashboard')}
                        >
                            {ar ? 'طبقة المعايير' : 'Benchmarking Layer'}
                        </button>
                    </>
                )}

                </div>{/* end sidebar-nav */}

                <div className="sidebar-footer">
                    <div className="text-muted" style={{ padding: '0 8px' }}>
                        {session.user.email}
                    </div>
                    {appVersion && (
                        <div className="text-muted" style={{ padding: '0 8px', fontSize: 11 }}>
                            Qatar Post ERM Workstation — {appVersion}
                        </div>
                    )}
                    <button
                        className="btn btn-secondary btn-sm"
                        style={{ width: '100%', position: 'relative' }}
                        onClick={() => {
                            setWhatsNewOpen(true);
                            markAsSeen();
                            setHasUpdates(false);
                        }}
                    >
                        {t('whats_new')}
                        {hasUpdates && (
                            <span style={{
                                position: 'absolute', top: 5, right: 8,
                                width: 7, height: 7, borderRadius: '50%',
                                background: '#e53935',
                                display: 'inline-block',
                            }} />
                        )}
                    </button>
                    <div style={{ display: 'flex', gap: 6 }}>
                        <button
                            className="btn btn-secondary btn-sm"
                            style={{ flex: 1 }}
                            onClick={() => setHelpOpen(true)}
                            title="Help for this page"
                        >
                            {t('help')}
                        </button>
                        <button
                            className="btn btn-secondary btn-sm"
                            style={{ flex: 1 }}
                            onClick={toggleAbout}
                        >
                            {t('about')}
                        </button>
                        {/* Language toggle — always LTR, always centered regardless of lang */}
                        <button
                            className="btn btn-secondary btn-sm"
                            style={{
                                flex: 1,
                                fontWeight: 600,
                                direction: 'ltr',
                                padding: '0 6px',
                            }}
                            onClick={() => setLang(ar ? 'en' : 'ar')}
                            title={ar ? 'Switch to English' : 'التبديل إلى العربية'}
                        >
                            {ar ? 'EN' : 'عر'}
                        </button>
                    </div>
                    <button className="btn btn-primary" style={{ width: '100%', textAlign: 'center' }} onClick={logout}>
                        {ar ? 'تسجيل الخروج' : 'Log out'}
                    </button>
                </div>
            </aside>

            <main
                className={`main-content${page === 'about' ? ' main-content--centered' : ''}`}
            >
                {page !== 'about' && <TopBar onNavigate={onNavigate} role={role} />}
                {children}
            </main>

            {helpOpen && (
                <HelpPanel
                    page={page}
                    onClose={() => setHelpOpen(false)}
                    onNavigate={(dest) => { setHelpOpen(false); onNavigate(dest); }}
                />
            )}

            {whatsNewOpen && (
                <WhatsNew onClose={() => setWhatsNewOpen(false)} />
            )}

            {idleWarning && (
                <div className="idle-toast">
                    {t('idle_warning')}{' '}
                    <button
                        className="btn btn-sm btn-primary"
                        style={{ marginLeft: 8 }}
                        onClick={dismissIdleWarning}
                    >
                        {t('stay_signed_in')}
                    </button>
                </div>
            )}
        </div>
    );
}

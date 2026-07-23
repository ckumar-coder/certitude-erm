import { useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import DisclaimerModal from './components/DisclaimerModal';
import About from './pages/About';
import Login from './pages/Login';
import ChangePassword from './pages/ChangePassword';
import CompanySelect from './pages/CompanySelect';
import Layout from './pages/Layout';
import RiskRegister from './pages/RiskRegister';
import ControlLibrary from './pages/ControlLibrary';
import KriLibrary from './pages/KriLibrary';
import KriRegister from './pages/KriRegister';
import ComplianceObligations from './pages/ComplianceObligations';
import IssuesTracker from './pages/IssuesTracker';
import PolicyRepository from './pages/PolicyRepository';
import OrgRoles from './pages/OrgRoles';
import UserManagement from './pages/UserManagement';
import RiskConfig from './pages/RiskConfig';
import AuditLog from './pages/AuditLog';
import ManagementSummary from './pages/ManagementSummary';
import MyTasks from './pages/MyTasks';
import DataTools from './pages/DataTools';
import EscalationRules from './pages/EscalationRules';
import Branding from './pages/Branding';
import ScoringMethodology from './pages/ScoringMethodology';
import EmailSettings from './pages/EmailSettings';
import ResetPassword from './pages/ResetPassword';
import ForgotPassword from './pages/ForgotPassword';
import ComplianceCalendar from './pages/ComplianceCalendar';
import Glossary from './pages/Glossary';
import StorageHealth from './pages/StorageHealth';
import Companies from './pages/Companies';
import Departments from './pages/Departments';
import BusinessUnits from './pages/BusinessUnits';
import ConsolidatedDashboard from './pages/ConsolidatedDashboard';
import SetupWizard from './pages/SetupWizard';
import ConsultantDashboard from './pages/ConsultantDashboard';
import CriticalRisksLog from './pages/CriticalRisksLog';
import AccessMatrix from './pages/AccessMatrix';
import IncidentLog from './pages/IncidentLog';
import RiskAppetite from './pages/RiskAppetite';
import HorizonScanning from './pages/HorizonScanning';
import RiskGovDocs from './pages/RiskGovDocs';
import FormsTemplates from './pages/FormsTemplates';
import AiIntegration from './pages/AiIntegration';
import RolesPermissions from './pages/RolesPermissions';

export default function App() {
    const { session, loading, companyPickerOpen } = useAuth();
    const [page, setPage] = useState('my-tasks');
    // Incident → Risk Register cross-navigation state
    const [fromIncidentId, setFromIncidentId] = useState(null);

    // Reset to the correct default page on every login (handles logout → re-login without a full
    // page reload, which would otherwise leave `page` at whatever it was last set to).
    useEffect(() => {
        if (!session?.user?.id) return;
        const activeRole = session.companies.find((c) => c.id === session.activeCompanyId)?.role;
        setPage(activeRole === 'Admin' || activeRole === 'Super Admin'
            ? 'management-summary'
            : 'my-tasks');
    }, [session?.user?.id, session?.activeCompanyId]);

    if (loading) {
        return <div className="login-screen">Loading…</div>;
    }

    // Public routes (unauthenticated)
    if (window.location.pathname === '/reset-password' || window.location.search.includes('token=')) {
        return <ResetPassword />;
    }
    if (window.location.pathname === '/reset-password-request') {
        return <ForgotPassword />;
    }

    if (!session) {
        return <Login />;
    }

    if (session.user.must_change_password || session.passwordExpired) {
        return <ChangePassword forced reason={session.passwordExpired ? 'expired' : 'required'} />;
    }

    // Legal disclaimer — shown once per user ever; stored server-side.
    if (!session.user.disclaimer_accepted) {
        return <DisclaimerModal />;
    }

    // No company memberships at all → first-time setup wizard.
    if (session.companies.length === 0) {
        return <SetupWizard />;
    }

    if (!session.activeCompanyId || companyPickerOpen) {
        return <CompanySelect />;
    }

    const isConsultant = !!session.user.is_consultant;

    // Consultant dashboard is platform-level — accessible from any view including group view
    if (page === 'consultant-dashboard' && isConsultant) {
        return (
            <Layout page="consultant-dashboard" onNavigate={setPage} groupView={session.isGroupView}>
                <ConsultantDashboard />
            </Layout>
        );
    }

    // Group view: show consolidated dashboard regardless of page
    if (session.isGroupView) {
        return (
            <Layout page="consolidated-dashboard" onNavigate={setPage} groupView>
                <ConsolidatedDashboard />
            </Layout>
        );
    }

    const activeCompany = session.companies.find((c) => c.id === session.activeCompanyId);
    const role = activeCompany?.role;

    const isSuperAdmin = role === 'Super Admin';
    const isCRO = role === 'CRO' || role === 'Consultant CRO';
    const isOp  = isSuperAdmin || role === 'Risk Manager' || role === 'Risk Owner' || isCRO;

    // Phase D batch 2 (2026-07-23) — page gates now read from the live
    // permissions map (session.companies[].permissions) instead of role
    // literals, mirroring Layout.jsx's batch 1 cutover. `can(key)` treats
    // any non-'none' scope as "the page is reachable"; scope-specific
    // filtering (own/dept/full) already happens inside each page's own API
    // calls, unchanged by this batch. Every mapping below was individually
    // cross-checked against schema_v75_permissions_engine.sql's seeded
    // role_permissions rows before being cut over — see CLAUDE.md for the
    // full batch 2 write-up, including the two flagged/decided exceptions
    // (Horizon Scanning, Import/Export) below.
    const permissions = activeCompany?.permissions || {};
    const can = (key) => permissions[key] && permissions[key] !== 'none';

    let content;

    // ── Admin-only pages ──────────────────────────────────────────────────────
    if (page === 'risk-config' && can('risk_config.manage')) {
        content = <RiskConfig />;
    } else if (page === 'users' && can('users.manage')) {
        content = <UserManagement />;
    } else if (page === 'roles-permissions' && can('roles.manage')) {
        // Phase B of the permissions engine — additive admin screen only,
        // not yet enforced. See RBAC_Permissions_Engine_Scoping.docx Section 9.
        content = <RolesPermissions />;
    } else if (page === 'departments' && can('departments.manage')) {
        content = <Departments />;
    } else if (page === 'business-units' && can('business_units.manage')) {
        content = <BusinessUnits />;
    } else if (page === 'escalation-rules' && can('escalation_rules.manage')) {
        content = <EscalationRules />;
    } else if (page === 'email-settings' && can('email_settings.manage')) {
        content = <EmailSettings />;
    } else if (page === 'ai-integration' && can('ai_settings.manage')) {
        content = <AiIntegration />;
    } else if (page === 'branding' && can('branding.manage')) {
        content = <Branding />;
    } else if (page === 'storage-health' && can('storage.manage')) {
        content = <StorageHealth />;
    } else if (page === 'companies' && can('company.manage')) {
        content = <Companies />;
    } else if (page === 'access-matrix' && isCRO) {
        // No corresponding capability exists in the taxonomy (it's a static,
        // hand-typed reference page with no backend route at all) — kept on
        // the old isCRO literal, unchanged, matching Layout.jsx's own
        // documented exception for this same item.
        content = <AccessMatrix />;

    // ── Admin + ops shared pages ──────────────────────────────────────────────
    } else if (page === 'scoring-methodology' && can('scoring_methodology.view')) {
        content = <ScoringMethodology />;
    } else if (page === 'audit' && can('audit_log.view')) {
        // audit_log.view is a non-configurable safety baseline (always
        // 'full' for every role) — this page previously had no gate at all,
        // so adding this check is a zero-behavior-change formalization, not
        // a restriction.
        content = <AuditLog />;
    } else if (page === 'data-tools' && can('data.export')) {
        // Decided 2026-07-23: gate tightened to exclude Risk Owner, who the
        // old isOp-based gate let through despite data.export/data.import
        // never having granted them real backend access (their import/export
        // calls already 403'd) — this page was silently broken for them
        // before. data.export and data.import share an identical seeded role
        // list, so checking either is equivalent.
        content = <DataTools />;

    // ── Always accessible ─────────────────────────────────────────────────────
    } else if (page === 'about') {
        content = <About />;
    } else if (page === 'glossary') {
        content = <Glossary />;

    // ── Operational pages ───────────────────────────────────────────────────
    } else if (page === 'my-tasks' && can('tasks.my_tasks.view')) {
        content = <MyTasks />;
    } else if (page === 'management-summary' && can('dashboard.management_summary.view')) {
        content = <ManagementSummary />;
    } else if (page === 'policies' && can('policy.view')) {
        content = <PolicyRepository />;
    } else if (page === 'risks' && can('risk.view')) {
        content = <RiskRegister
            fromIncidentId={fromIncidentId}
            onIncidentLinked={() => { setFromIncidentId(null); setPage('incident-log'); }}
        />;
    } else if (page === 'critical-risks') {
        // No corresponding capability exists in the taxonomy — this page has
        // never had a gate, unchanged, matching Layout.jsx's own documented
        // exception for this same item.
        content = <CriticalRisksLog />;
    } else if (page === 'controls' && can('control.view')) {
        content = <ControlLibrary />;
    } else if (page === 'kris' && can('kri.view')) {
        content = <KriLibrary />;
    } else if (page === 'kri-register' && can('kri.view')) {
        content = <KriRegister />;
    } else if (page === 'issues' && can('issue.view')) {
        content = <IssuesTracker onNavigate={setPage} />;
    } else if (page === 'horizon-scanning' && can('horizon.view')) {
        // Decided 2026-07-23 (settled after two rounds of correction):
        // Super Admin, CRO, and Consultant CRO retain access; Admin, Risk
        // Manager, Risk Champion, and Risk Owner do not. This page
        // previously had no gate at all; fix-horizon-permissions.js
        // corrects the underlying role_permissions seed to match, and this
        // check now enforces it. See CLAUDE.md for the full decision record.
        content = <HorizonScanning />;
    } else if (page === 'risk-gov-docs' && can('risk_gov_docs.view')) {
        content = <RiskGovDocs />;
    } else if (page === 'forms-templates' && can('forms.accepted_risk_report')) {
        content = <FormsTemplates />;
    } else if (page === 'risk-appetite' && can('risk_appetite.view')) {
        content = <RiskAppetite />;
    } else if (page === 'incident-log' && can('incident.view')) {
        content = <IncidentLog
            onNavigate={setPage}
            onCreateRisk={(incId) => { setFromIncidentId(incId); setPage('risks'); }}
        />;
    } else if (page === 'obligations' && can('obligation.view')) {
        content = <ComplianceObligations />;
    } else if (page === 'calendar' && can('calendar.view')) {
        content = <ComplianceCalendar />;
    } else if (page === 'org-roles' && can('org_roles.view')) {
        content = <OrgRoles />;

    // ── Fallbacks ─────────────────────────────────────────────────────────────
    } else if (role === 'Super Admin') {
        // Super Admin default landing: Risk Register
        content = <RiskRegister
            fromIncidentId={fromIncidentId}
            onIncidentLinked={() => { setFromIncidentId(null); setPage('incident-log'); }}
        />;
    } else if (role === 'Admin') {
        // Admin default landing: Users & Access
        content = <UserManagement />;
    } else if (isOp || role === 'Risk Champion') {
        // Operational roles default to Risk Register
        content = <RiskRegister
            fromIncidentId={fromIncidentId}
            onIncidentLinked={() => { setFromIncidentId(null); setPage('incident-log'); }}
        />;
    } else if (role === 'Viewer') {
        // Viewer default landing: Policy Repository
        content = <PolicyRepository />;
    } else {
        content = (
            <div className="card">
                Your account does not yet have access to any modules. Contact your administrator.
            </div>
        );
    }

    return (
        <Layout page={page} onNavigate={setPage}>
            {content}
        </Layout>
    );
}

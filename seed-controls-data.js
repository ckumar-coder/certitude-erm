// seed-controls-data.js
// Certitude standard controls — approved 2026-07-03.
// Fields: department, name, description, control_type.
// Automation / testing_frequency / evidence_required / framework_reference left null
// for the company Admin to populate after seeding.

module.exports = [
    // ── Finance ───────────────────────────────────────────────────────────────
    {
        department: 'Finance',
        name: 'Bank Account Reconciliation',
        description: 'All bank accounts reconciled to the general ledger monthly; discrepancies investigated and resolved within 5 business days.',
        control_type: 'Detective',
    },
    {
        department: 'Finance',
        name: 'Dual Authorization for Payments',
        description: 'All payments above the approved threshold require two authorized signatories before release.',
        control_type: 'Preventive',
    },
    {
        department: 'Finance',
        name: 'Segregation of Duties — AP and AR',
        description: 'Accounts payable and accounts receivable functions are performed by separate staff with no crossover.',
        control_type: 'Preventive',
    },
    {
        department: 'Finance',
        name: 'Budget vs. Actual Variance Review',
        description: 'Monthly variance analysis prepared and reviewed by the finance lead; material variances documented with explanation.',
        control_type: 'Detective',
    },
    {
        department: 'Finance',
        name: 'Financial Statement Review and Sign-Off',
        description: 'Quarterly financials reviewed and approved by CFO or Controller before distribution to management or board.',
        control_type: 'Detective',
    },
    {
        department: 'Finance',
        name: 'Access Controls to Financial Systems',
        description: 'User access rights to financial systems reviewed and certified by system owner quarterly; access removed promptly on role change.',
        control_type: 'Preventive',
    },
    {
        department: 'Finance',
        name: 'Journal Entry Review and Approval',
        description: 'All non-standard and manual journal entries reviewed and approved by a senior finance officer prior to posting.',
        control_type: 'Preventive',
    },
    {
        department: 'Finance',
        name: 'Fixed Asset Physical Verification',
        description: 'Annual physical count of all fixed assets reconciled to the asset register; discrepancies investigated.',
        control_type: 'Detective',
    },
    {
        department: 'Finance',
        name: 'Petty Cash Reconciliation',
        description: 'Petty cash fund balance reconciled to receipts and float register; custodian sign-off required.',
        control_type: 'Detective',
    },
    {
        department: 'Finance',
        name: 'Accounts Payable Aging Review',
        description: 'AP aging report reviewed monthly to identify overdue, disputed, or stale payables; follow-up actions documented.',
        control_type: 'Detective',
    },

    // ── Human Resources ───────────────────────────────────────────────────────
    {
        department: 'Human Resources',
        name: 'Pre-Employment Background Checks',
        description: 'Criminal record, identity verification, and professional reference checks completed for all new hires before start date.',
        control_type: 'Preventive',
    },
    {
        department: 'Human Resources',
        name: 'Payroll Authorization and Review',
        description: 'Payroll run reviewed for accuracy and approved by HR manager before disbursement; exceptions investigated.',
        control_type: 'Preventive',
    },
    {
        department: 'Human Resources',
        name: 'Employee Exit Clearance Procedure',
        description: 'Structured exit checklist completed for all departing employees covering asset return, IT access revocation, and final entitlements.',
        control_type: 'Preventive',
    },
    {
        department: 'Human Resources',
        name: 'Annual Performance Review Process',
        description: 'Structured performance appraisal conducted for all employees annually with documented ratings and development goals.',
        control_type: 'Directive',
    },
    {
        department: 'Human Resources',
        name: 'Leave Approval Workflow',
        description: 'All leave requests submitted through approved system and authorized by direct manager before taking effect.',
        control_type: 'Preventive',
    },
    {
        department: 'Human Resources',
        name: 'Mandatory Training Completion Tracking',
        description: 'Completion of mandatory training programs tracked for all staff; non-completions escalated to line manager.',
        control_type: 'Detective',
    },
    {
        department: 'Human Resources',
        name: 'HR Records Access Controls',
        description: 'Access to employee personnel files restricted to authorized HR staff only; access list reviewed annually.',
        control_type: 'Preventive',
    },
    {
        department: 'Human Resources',
        name: 'Disciplinary Procedure Documentation',
        description: 'All disciplinary actions documented in accordance with policy, reviewed by HR, and filed in the employee record.',
        control_type: 'Directive',
    },

    // ── Information Technology ────────────────────────────────────────────────
    {
        department: 'Information Technology',
        name: 'Password Policy Enforcement',
        description: 'System-enforced password complexity, minimum length, and expiry aligned with policy across all systems.',
        control_type: 'Preventive',
    },
    {
        department: 'Information Technology',
        name: 'Multi-Factor Authentication',
        description: 'MFA enforced for all remote access, privileged accounts, and critical system logins; exceptions documented.',
        control_type: 'Preventive',
    },
    {
        department: 'Information Technology',
        name: 'Privileged Access Review',
        description: 'Quarterly review and certification of all administrator and privileged user accounts; unused accounts disabled.',
        control_type: 'Detective',
    },
    {
        department: 'Information Technology',
        name: 'Patch Management',
        description: 'Critical and high-severity patches applied within defined SLA; patch compliance reported monthly.',
        control_type: 'Preventive',
    },
    {
        department: 'Information Technology',
        name: 'Data Backup and Recovery Testing',
        description: 'Daily backup job verification; quarterly full restore test with documented results confirming recovery within RTO.',
        control_type: 'Corrective',
    },
    {
        department: 'Information Technology',
        name: 'Incident Response Plan',
        description: 'Documented IT incident response plan tested annually via tabletop or simulation exercise; lessons learned actioned.',
        control_type: 'Corrective',
    },
    {
        department: 'Information Technology',
        name: 'Firewall and Network Monitoring',
        description: 'Firewall rules reviewed quarterly; security event logs and alerts reviewed daily by operations team.',
        control_type: 'Preventive',
    },
    {
        department: 'Information Technology',
        name: 'IT Change Management',
        description: 'All changes to production systems documented, assessed, approved, and tested before deployment.',
        control_type: 'Preventive',
    },
    {
        department: 'Information Technology',
        name: 'Software License Compliance',
        description: 'Software asset inventory reconciled to license entitlements annually; unlicensed software removed.',
        control_type: 'Detective',
    },
    {
        department: 'Information Technology',
        name: 'Data Classification and Handling',
        description: 'Data classification policy implemented; annual review of sensitive data handling practices across all business units.',
        control_type: 'Preventive',
    },

    // ── Legal & Compliance ────────────────────────────────────────────────────
    {
        department: 'Legal & Compliance',
        name: 'Regulatory Change Monitoring',
        description: 'Regulatory publications and updates reviewed quarterly; compliance team notified of material changes affecting the business.',
        control_type: 'Detective',
    },
    {
        department: 'Legal & Compliance',
        name: 'Compliance Obligations Register',
        description: 'Active register of all regulatory obligations maintained, updated as regulations change, and assigned to owners.',
        control_type: 'Preventive',
    },
    {
        department: 'Legal & Compliance',
        name: 'Contract Review and Approval',
        description: 'All material contracts reviewed by legal counsel for risk, liability, and regulatory alignment before execution.',
        control_type: 'Preventive',
    },
    {
        department: 'Legal & Compliance',
        name: 'Anti-Bribery and Corruption Training',
        description: 'All employees and relevant third parties complete ABC and ethics training on joining and annually thereafter.',
        control_type: 'Directive',
    },
    {
        department: 'Legal & Compliance',
        name: 'Data Privacy Compliance Review',
        description: 'Privacy impact assessments completed for new data processing activities; annual review of existing processing.',
        control_type: 'Preventive',
    },
    {
        department: 'Legal & Compliance',
        name: 'Litigation and Regulatory Action Log',
        description: 'Active log of all pending litigation, regulatory investigations, and enforcement actions maintained and reviewed.',
        control_type: 'Detective',
    },
    {
        department: 'Legal & Compliance',
        name: 'Legal Hold Management',
        description: 'Formal legal hold notices issued and tracked for all matters where litigation or regulatory inquiry is anticipated.',
        control_type: 'Preventive',
    },

    // ── Procurement & Vendor Management ──────────────────────────────────────
    {
        department: 'Procurement & Vendor Management',
        name: 'Vendor Due Diligence and Onboarding',
        description: 'All new vendors screened for financial stability, reputation, and sanctions exposure before engagement; renewed annually for critical vendors.',
        control_type: 'Preventive',
    },
    {
        department: 'Procurement & Vendor Management',
        name: 'Purchase Order Approval Workflow',
        description: 'All purchases above the approved threshold require a formal PO with management authorization before commitment.',
        control_type: 'Preventive',
    },
    {
        department: 'Procurement & Vendor Management',
        name: 'Competitive Sourcing Requirement',
        description: 'Minimum three quotes required for purchases above approved threshold; sole-source exceptions documented and approved.',
        control_type: 'Preventive',
    },
    {
        department: 'Procurement & Vendor Management',
        name: 'Vendor Performance Review',
        description: 'Key and critical vendors evaluated against agreed SLA and KPI benchmarks; underperformance escalated.',
        control_type: 'Detective',
    },
    {
        department: 'Procurement & Vendor Management',
        name: 'Vendor Contract Renewal Tracking',
        description: 'Register of all vendor contracts maintained with expiry dates; renewals initiated at least 90 days before expiry.',
        control_type: 'Preventive',
    },
    {
        department: 'Procurement & Vendor Management',
        name: 'Conflict of Interest Declaration',
        description: 'All procurement staff and approvers declare conflicts of interest annually and upon any change in personal circumstances.',
        control_type: 'Preventive',
    },
    {
        department: 'Procurement & Vendor Management',
        name: 'Vendor Risk Assessment',
        description: 'Third-party risk assessment completed for critical and high-spend vendors covering operational, financial, and cyber risk.',
        control_type: 'Detective',
    },

    // ── Risk Management ───────────────────────────────────────────────────────
    {
        department: 'Risk Management',
        name: 'Risk Register Review and Update',
        description: 'Risk register reviewed and updated with current likelihood, impact scores, and treatment status each quarter.',
        control_type: 'Detective',
    },
    {
        department: 'Risk Management',
        name: 'Risk Appetite and Tolerance Review',
        description: 'Board-approved risk appetite statements and tolerance thresholds reviewed and reconfirmed or revised annually.',
        control_type: 'Directive',
    },
    {
        department: 'Risk Management',
        name: 'New Risk Identification Process',
        description: 'Structured process for identifying, assessing, and logging emerging or new risks including horizon-scanning.',
        control_type: 'Detective',
    },
    {
        department: 'Risk Management',
        name: 'Risk Treatment Plan Monitoring',
        description: 'Progress against all approved risk treatment plans tracked quarterly and reported to management with escalation of delays.',
        control_type: 'Detective',
    },
    {
        department: 'Risk Management',
        name: 'Board and Management Risk Reporting',
        description: 'Comprehensive risk report prepared for senior management and board covering top risks, movements, and treatment status.',
        control_type: 'Directive',
    },
    {
        department: 'Risk Management',
        name: 'Emerging Risk Monitoring',
        description: 'Horizon-scanning exercise to identify macro-economic, sector-specific, regulatory, and geopolitical emerging risks.',
        control_type: 'Detective',
    },

    // ── Facilities & Administration ───────────────────────────────────────────
    {
        department: 'Facilities & Administration',
        name: 'Physical Access Control Review',
        description: 'Review and certification of all physical access rights to offices, server rooms, and secured areas.',
        control_type: 'Preventive',
    },
    {
        department: 'Facilities & Administration',
        name: 'Office Security Inspection',
        description: 'Regular security walkthrough to verify locks, alarms, surveillance cameras, and access control points are operational.',
        control_type: 'Detective',
    },
    {
        department: 'Facilities & Administration',
        name: 'Emergency Evacuation Drill',
        description: 'Fire or emergency evacuation drill conducted with all building occupants; assembly and accountability confirmed.',
        control_type: 'Directive',
    },
    {
        department: 'Facilities & Administration',
        name: 'Visitor Management',
        description: 'All visitors signed in at reception, issued visitor badges, and escorted within premises at all times.',
        control_type: 'Preventive',
    },
    {
        department: 'Facilities & Administration',
        name: 'Asset Inventory and Tagging',
        description: 'Annual physical inventory of all company-owned assets reconciled to the asset register; discrepancies investigated.',
        control_type: 'Detective',
    },
    {
        department: 'Facilities & Administration',
        name: 'Health and Safety Inspection',
        description: 'Workplace health and safety audit conducted by qualified officer covering ergonomics, hazards, and emergency equipment.',
        control_type: 'Preventive',
    },
    {
        department: 'Facilities & Administration',
        name: 'Premises Insurance Renewal Review',
        description: 'All premises-related insurance policies reviewed before renewal to confirm coverage adequacy and identify gaps.',
        control_type: 'Preventive',
    },
];

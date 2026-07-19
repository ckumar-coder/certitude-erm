// validate.js — Zod input validation middleware  (SOC 2: CC5.2)
//
// Provides a validate(schema) Express middleware factory and
// pre-built schemas for all key API endpoints.
//
// Usage:
//   const { validate, schemas } = require('./validate');
//   app.post('/api/auth/login', loginLimiter, validate(schemas.login), asyncHandler(...));
//
// The middleware calls schema.safeParse(req.body).  On failure it returns
// 400 with a plain-language error string.  On success it replaces req.body
// with the parsed (coerced + stripped) object so later handlers get clean data.

const { z } = require('zod');

// ── Middleware factory ────────────────────────────────────────────────────────
function validate(schema) {
    return function validateMiddleware(req, res, next) {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            const messages = result.error.issues.map((i) => i.message).join('; ');
            return res.status(400).json({ error: `Validation error: ${messages}` });
        }
        // Replace req.body with parsed data (Zod strips unknown keys on
        // strict schemas; .passthrough() schemas preserve extra fields).
        req.body = result.data;
        next();
    };
}

// ── Shared primitives ─────────────────────────────────────────────────────────
const email    = z.string().email('A valid email address is required').max(254).transform((s) => s.toLowerCase().trim());
const password = z.string().min(1, 'Password is required').max(1024, 'Password too long');
const totpCode = z.string().regex(/^\d{6}$/, 'Verification code must be exactly 6 digits');

const shortStr = (label, max = 255) =>
    z.string({ required_error: `${label} is required` }).min(1, `${label} is required`).max(max, `${label} must be ${max} characters or fewer`);

const optStr = (max = 2000) =>
    z.string().max(max).optional().nullable();

// ── Auth schemas ──────────────────────────────────────────────────────────────
const login = z.object({
    email,
    password,
});

const changePassword = z.object({
    currentPassword: password,
    newPassword:     password,
});

const forgotPassword = z.object({
    email,
});

const resetPassword = z.object({
    token:       z.string().min(1, 'Reset token is required').max(512),
    newPassword: password,
});

const mfaCode = z.object({
    code: totpCode,
});

const acceptDisclaimer = z.object({}).passthrough();  // no body required

const switchCompany = z.object({
    company_id: z.number({ required_error: 'company_id is required' }).int().positive(),
    group_view: z.boolean().optional(),
}).passthrough();

// ── Setup schema ──────────────────────────────────────────────────────────────
const setup = z.object({
    org_name:        shortStr('Organization name'),
    org_code:        z.string().min(2, 'Code must be at least 2 characters').max(10, 'Code must be 10 characters or fewer'),
    industry:        optStr(255),
    admin_full_name: optStr(255),
    departments:     z.array(z.object({
        name: z.string().min(1, 'Department name is required').max(100),
        code: z.string().min(2, 'Department code must be at least 2 characters').max(10),
    })).max(50).optional(),
});

// ── Risk schema ───────────────────────────────────────────────────────────────
// Field names match the POST /api/risks endpoint in server.js.
const scoreInt = z.preprocess(
    (v) => (v == null ? undefined : Number(v)),
    z.number().int().min(1).max(5).optional()
);
const BCP_STATUS_VALUES = ['Yes', 'No', 'In Development'];

const enumErr = (values) => ({ errorMap: () => ({ message: `Must be one of: ${values.join(', ')}` }) });

const createRisk = z.object({
    risk_detail:         shortStr('Risk detail'),
    department:          shortStr('Department'),
    risk_category:       shortStr('Risk category'),
    sub_category:        optStr(255),
    risk_uid:            optStr(50),
    risk_cause:          optStr(2000),
    risk_impact_desc:    optStr(2000),
    treatment_strategy:  optStr(255),
    treatment_plan:      optStr(5000),
    treatment_plan_rationale: optStr(5000),
    framework_ref:       optStr(255),
    assessed_by:         optStr(255),
    change_reason:       optStr(2000),
    escalation_justification: optStr(2000),
    bcp_status:          z.preprocess(v => (v === '' ? null : v), z.enum(BCP_STATUS_VALUES, enumErr(BCP_STATUS_VALUES)).optional().nullable()),
    bcp_link:            z.string().url('BCP link must be a valid URL').max(2000).optional().nullable().or(z.literal('')),
    inherent_likelihood: scoreInt,
    inherent_impact:     scoreInt,
    residual_likelihood: scoreInt,
    residual_impact:     scoreInt,
    controls:            z.array(z.object({ title: z.string().max(255) }).passthrough()).optional(),
    mitigations:         z.array(z.object({ action: z.string().max(1000) }).passthrough()).optional(),
    link_control_ids:    z.array(z.number().int().positive()).optional(),
    link_kri_ids:        z.array(z.number().int().positive()).optional(),
}).passthrough(); // allow additional fields (e.g. baseline ingestion metadata)

// ── Issue schema ──────────────────────────────────────────────────────────────
// Field names match POST /api/issues in server.js.
const ISSUE_PRIORITY_VALUES = ['Low', 'Medium', 'High', 'Critical'];

const createIssue = z.object({
    source_type:      shortStr('Source type'),
    description:      z.string().min(1, 'Description is required').max(10000),
    source_detail:    optStr(2000),
    root_cause:       optStr(5000),
    remediation_plan: optStr(5000),
    priority:         z.enum(ISSUE_PRIORITY_VALUES, enumErr(ISSUE_PRIORITY_VALUES)).optional().nullable(),
    owner:            optStr(255),
    due_date:         z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Due date must be YYYY-MM-DD').optional().nullable(),
    department:       optStr(255),
}).passthrough();

// ── Control schema ────────────────────────────────────────────────────────────
const CONTROL_TYPE_VALUES  = ['Preventive', 'Detective', 'Corrective', 'Directive'];
const AUTOMATION_VALUES    = ['Manual', 'Semi-automated', 'Automated'];
const FREQUENCY_VALUES     = ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Annually', 'Ad-hoc'];

const createControl = z.object({
    name:               shortStr('Control name'),
    description:        optStr(10000),
    control_type:       z.enum(CONTROL_TYPE_VALUES, enumErr(CONTROL_TYPE_VALUES)).optional(),
    automation:         z.enum(AUTOMATION_VALUES, enumErr(AUTOMATION_VALUES)).optional(),
    owner:              optStr(255),
    testing_frequency:  z.enum(FREQUENCY_VALUES, enumErr(FREQUENCY_VALUES)).optional(),
    evidence_required:  optStr(1000),
    framework_reference: optStr(255),
    department:         optStr(255),
    owner_department:   optStr(255),
}).passthrough();

// ── Policy schema ─────────────────────────────────────────────────────────────
const POLICY_STATUS_VALUES   = ['Draft', 'Published', 'Retired'];
const POLICY_CATEGORY_VALUES = ['Governance', 'Finance', 'HR', 'IT', 'Compliance', 'Operations', 'Risk', 'BCM', 'Security'];

const createPolicy = z.object({
    name:             shortStr('Policy name'),
    category:         z.enum(POLICY_CATEGORY_VALUES, enumErr(POLICY_CATEGORY_VALUES)).optional().nullable(),
    description:      optStr(10000),
    status:           z.enum(POLICY_STATUS_VALUES, enumErr(POLICY_STATUS_VALUES)).optional(),
    content_owner:    optStr(255),
    approver:         optStr(255),
    effective_date:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Effective date must be YYYY-MM-DD').optional().nullable(),
    review_frequency: optStr(50),
    next_review_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Next review date must be YYYY-MM-DD').optional().nullable(),
}).passthrough();

// ── KRI schema ────────────────────────────────────────────────────────────────
const createKri = z.object({
    name:            shortStr('KRI name'),
    description:     optStr(2000),
    unit:            optStr(50),
    threshold_amber: z.number().optional().nullable(),
    threshold_red:   z.number().optional().nullable(),
    department:      optStr(255),
    measurement_frequency: optStr(50),
}).passthrough();

// ── Obligation schema ─────────────────────────────────────────────────────────
const OBLIGATION_STATUS_VALUES = [
    'Compliant', 'Non-Compliant', 'Partially Compliant',
    'Not Yet Assessed', 'Not Applicable',
];

const createObligation = z.object({
    regulation_name:  shortStr('Regulation/Framework name'),
    regulatory_body:  optStr(255),
    description:      optStr(10000),
    compliance_status: z.enum(OBLIGATION_STATUS_VALUES, enumErr(OBLIGATION_STATUS_VALUES)).optional(),
    obligation_owner: optStr(255),
    department:       optStr(255),
    next_review_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Next review date must be YYYY-MM-DD').optional().nullable(),
}).passthrough();

// ── Evidence (file upload) schema ─────────────────────────────────────────────
// mime_type is also checked against the magic-byte allowlist in fileScan.js.
const ALLOWED_EVIDENCE_MIME_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    'application/zip',
    'application/x-7z-compressed',
    'application/gzip',
    'application/rtf',
];

const evidence = z.object({
    filename:  shortStr('Filename').max(255).refine(
        // Exclude path separators, shell metacharacters, and control characters
        // including CR, LF, NUL which could inject headers or truncate filenames.
        // (NEW-02 fix)
        (f) => /^[^/\\\r\n\0:*?"<>|]+$/.test(f),
        'Filename contains invalid characters'
    ),
    mime_type: z.enum(ALLOWED_EVIDENCE_MIME_TYPES, {
        errorMap: () => ({ message: 'File type not permitted. Allowed: PDF, Word, Excel, CSV, text, JPEG, PNG, GIF, WebP, ZIP.' }),
    }),
    file_data: z.string().min(1, 'File data is required').max(3_000_000, 'File data exceeds maximum size'),
});

// ── Glossary schema ───────────────────────────────────────────────────────────
const createGlossaryTerm = z.object({
    term:       shortStr('Term'),
    definition: z.string().min(1, 'Definition is required').max(5000),
});

// ── Export ────────────────────────────────────────────────────────────────────
module.exports = {
    validate,
    schemas: {
        login,
        changePassword,
        forgotPassword,
        resetPassword,
        mfaCode,
        switchCompany,
        setup,
        createRisk,
        createIssue,
        createControl,
        createPolicy,
        createKri,
        createObligation,
        evidence,
        createGlossaryTerm,
    },
};

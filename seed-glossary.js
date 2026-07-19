// seed-glossary.js — replaces the glossary with a comprehensive GRC term set.
// Run: node seed-glossary.js
const https       = require('https');
const { execSync } = require('child_process');

const ADMIN_EMAIL    = 'c.kumar@certitude-advisory.ca';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'A37@goodearth';

const GLOSSARY = [
    // ── Risk Management ───────────────────────────────────────────────────────
    { term: 'Appetite (Risk)',              definition: 'The amount and type of risk an organisation is willing to accept in pursuit of its objectives, as defined by the board or senior management.' },
    { term: 'Bow-Tie Analysis',             definition: 'A risk visualisation method that maps causes of a risk event on the left ("threats") and consequences on the right ("impacts"), with controls placed on each side.' },
    { term: 'Control',                      definition: 'Any measure — policy, process, technology, or behaviour — designed to reduce the likelihood or impact of a risk.' },
    { term: 'Control Effectiveness',        definition: 'An assessment of how well a control performs its intended risk-reduction function, typically rated as Effective, Partially Effective, or Ineffective.' },
    { term: 'Control Frequency',            definition: 'How often a control operates: continuous, daily, weekly, monthly, quarterly, or annually.' },
    { term: 'Control Owner',                definition: 'The individual accountable for designing, implementing, and maintaining a specific control.' },
    { term: 'Emerging Risk',                definition: 'A risk that is new or evolving and not yet fully understood, with uncertain likelihood and impact but potential to become material.' },
    { term: 'Exposure',                     definition: 'The potential financial, reputational, or operational loss an organisation faces from a risk event.' },
    { term: 'Gross Risk',                   definition: 'The level of risk before any controls or mitigating actions are applied. Also called inherent risk.' },
    { term: 'Heat Map',                     definition: 'A visual grid plotting risks by likelihood (y-axis) and impact (x-axis), colour-coded to indicate risk severity bands (Extreme, High, Medium, Low).' },
    { term: 'Impact',                       definition: 'The severity of consequences if a risk event materialises, typically scored 1 (Negligible) to 5 (Catastrophic).' },
    { term: 'Inherent Risk',                definition: 'The level of risk present before controls are applied. Contrasted with residual risk, which reflects the post-control position.' },
    { term: 'Issue',                        definition: 'A risk event that has already occurred, or a control deficiency that has been identified and requires remediation.' },
    { term: 'Key Risk Indicator (KRI)',     definition: 'A metric that provides early warning of increasing risk exposure. KRIs are monitored against thresholds (amber/red) to trigger escalation.' },
    { term: 'Likelihood',                   definition: 'The probability that a risk event will occur, typically scored 1 (Rare) to 5 (Almost Certain) over a defined time horizon.' },
    { term: 'Mitigation',                   definition: 'Actions taken to reduce the likelihood or impact of a risk, thereby lowering residual risk towards an acceptable level.' },
    { term: 'Monte Carlo Simulation',       definition: 'A statistical technique using random sampling to model the probability distribution of risk outcomes, particularly for quantitative risk analysis.' },
    { term: 'PESTLE Analysis',              definition: 'A framework for identifying external risks across Political, Economic, Social, Technological, Legal, and Environmental dimensions.' },
    { term: 'Residual Risk',                definition: 'The level of risk remaining after controls and mitigations have been applied. Residual risk is compared against risk appetite to determine acceptability.' },
    { term: 'Risk',                         definition: 'The effect of uncertainty on objectives. A risk combines a potential event, its likelihood of occurrence, and the magnitude of its impact.' },
    { term: 'Risk Acceptance',              definition: 'A formal decision by management to tolerate a risk within appetite without implementing further controls, typically documented and time-limited.' },
    { term: 'Risk Assessment',              definition: 'The process of identifying, analysing, and evaluating risks to determine their likelihood and impact, forming the basis for treatment decisions.' },
    { term: 'Risk Avoidance',               definition: 'A risk response strategy in which an activity or exposure is eliminated entirely to remove the associated risk.' },
    { term: 'Risk Category',                definition: 'A classification grouping risks of similar nature (e.g., Operational, Financial, Compliance, Strategic). Categories enable aggregation and reporting.' },
    { term: 'Risk Escalation',              definition: 'The process of elevating a risk to senior management or the board when it exceeds defined thresholds or breaches appetite.' },
    { term: 'Risk Event',                   definition: 'An occurrence that creates uncertainty with respect to the achievement of objectives; the materialisation of a risk.' },
    { term: 'Risk Framework',               definition: 'The overall structure of policies, processes, roles, and tools by which an organisation manages risk. Often aligned to ISO 31000 or COSO ERM.' },
    { term: 'Risk Identification',          definition: 'The process of finding, recognising, and describing risks that could affect the achievement of organisational objectives.' },
    { term: 'Risk Owner',                   definition: 'The individual accountable for managing a specific risk, including ensuring appropriate controls are in place and monitoring residual risk.' },
    { term: 'Risk Register',                definition: 'A central repository recording all identified risks, their assessments, owners, controls, and status. The primary tool for operational risk management.' },
    { term: 'Risk Taxonomy',                definition: 'A hierarchical classification of risk types used to ensure consistent categorisation across the organisation.' },
    { term: 'Risk Tolerance',               definition: 'The acceptable variation in outcomes relative to risk appetite. Tolerance defines the upper boundary of acceptable residual risk for each risk category.' },
    { term: 'Risk Transfer',                definition: 'A risk response strategy in which the financial consequences of a risk are shifted to a third party, typically through insurance or contractual arrangements.' },
    { term: 'Risk Treatment',               definition: 'The process of selecting and implementing options to modify risk, including mitigation, avoidance, transfer, or acceptance.' },
    { term: 'Risk Universe',                definition: 'The complete set of risks that an organisation could potentially face, used as the starting point for risk identification and scoping.' },
    { term: 'Scenario Analysis',            definition: 'A risk technique that examines plausible future events or combinations of events to assess their potential impact on the organisation.' },
    { term: 'Stress Testing',               definition: 'An analysis that evaluates how an organisation would perform under extreme but plausible adverse conditions, commonly used in financial and operational risk.' },
    { term: 'SWOT Analysis',               definition: 'A strategic tool identifying Strengths, Weaknesses, Opportunities, and Threats — used to surface internal and external risks to objectives.' },
    { term: 'Threat',                       definition: 'A potential cause of an unwanted risk event that may result in harm to an organisation or its objectives.' },
    { term: 'Vulnerability',                definition: 'A weakness in a system, process, or control that could be exploited by a threat to cause a risk event.' },

    // ── Governance ────────────────────────────────────────────────────────────
    { term: 'Accountability',              definition: 'The obligation of an individual or role to accept responsibility for outcomes and to report on performance, decisions, and actions.' },
    { term: 'Board Risk Committee',        definition: 'A committee of the board responsible for overseeing the risk management framework, risk appetite, and material risk exposures.' },
    { term: 'Chief Risk Officer (CRO)',    definition: 'The senior executive accountable for developing and maintaining the enterprise risk management framework and providing independent risk oversight.' },
    { term: 'Corporate Governance',        definition: 'The system of rules, practices, and processes by which a company is directed and controlled, balancing the interests of stakeholders.' },
    { term: 'Delegation of Authority',     definition: 'A formal framework defining the levels of financial or operational approval authority granted to each role or position within the organisation.' },
    { term: 'Enterprise Risk Management (ERM)', definition: 'A structured, enterprise-wide approach to identifying, assessing, and managing all types of risk in alignment with strategic objectives. Key frameworks include COSO ERM and ISO 31000.' },
    { term: 'Four Eyes Principle',         definition: 'A control requiring that significant decisions or transactions are reviewed and approved by at least two independent individuals to prevent errors and fraud.' },
    { term: 'Maturity Model',              definition: 'A framework for assessing the sophistication and effectiveness of an organisation\'s risk or compliance capabilities, typically on a scale of 1 (Initial) to 5 (Optimised).' },
    { term: 'RACI Matrix',                 definition: 'A responsibility assignment chart that defines, for each activity, who is Responsible, Accountable, Consulted, and Informed.' },
    { term: 'Segregation of Duties',       definition: 'A control principle ensuring that no single individual has end-to-end control over a process, reducing the risk of error or fraud.' },
    { term: 'Three Lines Model',           definition: 'A governance framework defining three distinct functions: (1) operational management owning risk, (2) risk and compliance functions providing oversight, and (3) internal audit providing independent assurance.' },
    { term: 'Tone at the Top',             definition: 'The ethical culture and risk awareness demonstrated by senior leadership, which influences the behaviour and values of the entire organisation.' },

    // ── Compliance ────────────────────────────────────────────────────────────
    { term: 'Audit Finding',              definition: 'A conclusion reached by auditors regarding a deficiency, non-conformance, or opportunity for improvement identified during an audit.' },
    { term: 'Compliance Obligation',      definition: 'A legal, regulatory, contractual, or internal requirement that the organisation must fulfil. Obligations are tracked, monitored, and evidenced.' },
    { term: 'Compliance Risk',            definition: 'The risk of legal sanctions, financial penalties, or reputational damage arising from failure to comply with applicable laws, regulations, or standards.' },
    { term: 'Control Self-Assessment (CSA)', definition: 'A technique in which management and staff evaluate the effectiveness of internal controls within their own area of responsibility.' },
    { term: 'Due Diligence',              definition: 'A systematic investigation and appraisal of a third party, transaction, or activity to assess risks and verify compliance before proceeding.' },
    { term: 'Exception',                  definition: 'An instance where an approved deviation from a policy or standard has been granted, typically subject to compensating controls and time limits.' },
    { term: 'Gap Analysis',               definition: 'A comparison of the organisation\'s current state against a target state (e.g., a regulatory standard) to identify areas of non-compliance or under-maturity.' },
    { term: 'Internal Audit',             definition: 'An independent assurance function that evaluates the effectiveness of governance, risk management, and internal controls, reporting to the board or audit committee.' },
    { term: 'Obligation Register',        definition: 'A central record of all compliance obligations, including their source, owner, due dates, and current compliance status.' },
    { term: 'Policy',                     definition: 'A formal statement of intent that sets out the organisation\'s position, principles, and requirements on a specific subject.' },
    { term: 'Procedure',                  definition: 'A documented set of step-by-step instructions for performing a specific task in accordance with a policy or standard.' },
    { term: 'Regulatory Change',          definition: 'A new or amended law, regulation, or guidance that requires the organisation to assess and potentially modify its policies, processes, or controls.' },
    { term: 'Standard',                   definition: 'A detailed, specific requirement that supports a policy and defines the minimum acceptable level of performance or behaviour.' },

    // ── Business Continuity ───────────────────────────────────────────────────
    { term: 'Business Continuity Management (BCM)', definition: 'A holistic management process that identifies potential threats and their impact on operations, and builds organisational resilience and response capability.' },
    { term: 'Business Continuity Plan (BCP)',        definition: 'A documented set of procedures and information that enables an organisation to continue delivering critical products and services following a disruptive incident.' },
    { term: 'Business Impact Analysis (BIA)',        definition: 'A process that identifies critical business functions, assesses the impact of their disruption over time, and defines recovery priorities and objectives.' },
    { term: 'Crisis Management',          definition: 'The coordinated response to a significant disruptive event, involving senior leadership decision-making, communications, and escalation.' },
    { term: 'Disaster Recovery (DR)',     definition: 'The process of restoring IT systems, data, and infrastructure following a disruptive event, typically measured by RTO and RPO targets.' },
    { term: 'Maximum Tolerable Downtime (MTD)', definition: 'The longest period a business function can be unavailable before the impact becomes unacceptable to the organisation.' },
    { term: 'Recovery Point Objective (RPO)', definition: 'The maximum acceptable amount of data loss measured in time — i.e., how far back data can be restored from backup after an incident.' },
    { term: 'Recovery Time Objective (RTO)', definition: 'The target duration within which a business function or IT system must be restored following a disruption.' },
    { term: 'Resilience',                 definition: 'The ability of an organisation to anticipate, prepare for, respond to, and adapt to incremental change and sudden disruptions.' },
    { term: 'Tabletop Exercise',          definition: 'A discussion-based simulation in which participants walk through a hypothetical scenario to test plans, identify gaps, and clarify roles without operational disruption.' },

    // ── Technology & Cyber Risk ───────────────────────────────────────────────
    { term: 'Cyber Risk',                 definition: 'The risk of financial loss, disruption, or reputational damage arising from failures of digital technology or malicious cyber attacks.' },
    { term: 'Data Breach',                definition: 'An incident in which sensitive, confidential, or protected information is accessed, disclosed, or stolen without authorisation.' },
    { term: 'Information Security',       definition: 'The practice of protecting information from unauthorised access, use, disclosure, disruption, or destruction — encompassing people, processes, and technology.' },
    { term: 'Penetration Testing',        definition: 'An authorised simulated cyber attack on a system to identify exploitable vulnerabilities before malicious actors can.' },
    { term: 'Ransomware',                 definition: 'Malicious software that encrypts an organisation\'s data and demands payment for the decryption key, causing operational disruption and potential data loss.' },
    { term: 'Social Engineering',         definition: 'Manipulation techniques used by attackers to deceive individuals into revealing confidential information or performing actions that compromise security.' },
    { term: 'Zero-Day Vulnerability',     definition: 'A software security flaw that is unknown to the vendor and for which no patch exists, making it particularly dangerous until discovered and remediated.' },

    // ── Audit & Assurance ─────────────────────────────────────────────────────
    { term: 'Assurance',                  definition: 'An objective examination of evidence to provide an independent assessment of the adequacy and effectiveness of governance, risk management, and controls.' },
    { term: 'Audit Trail',                definition: 'A chronological record of all changes, transactions, and events within a system or process, enabling traceability and accountability.' },
    { term: 'Independent Review',         definition: 'An evaluation of processes, controls, or outcomes conducted by a party with no direct involvement in or responsibility for the subject being reviewed.' },
    { term: 'Key Control',                definition: 'A control that is critical to the management of a significant risk; failure of a key control would materially increase residual risk.' },
    { term: 'Management Action Plan',     definition: 'A documented response to an audit finding or issue, specifying the corrective actions to be taken, the responsible owner, and the target completion date.' },
    { term: 'Walkthrough',                definition: 'An audit procedure in which the auditor traces a single transaction from initiation to completion to confirm that controls operate as documented.' },
];

// ── readline prompt ───────────────────────────────────────────────────────────
function prompt(question) {
    const rl = require('readline').createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans.trim()); }));
}

// ── API helper ────────────────────────────────────────────────────────────────
const BASE_URL = execSync(
    'gcloud run services describe grc-app-staging --project=certitude-grc --region=northamerica-northeast1 --format="value(status.url)"',
    { encoding: 'utf8' }
).trim();

function req(method, path, body, token, overrideToken) {
    token = overrideToken || token;
    return new Promise((resolve, reject) => {
        const url  = new URL(path, BASE_URL);
        const data = body ? JSON.stringify(body) : null;
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (data)  headers['Content-Length'] = Buffer.byteLength(data);
        const r = https.request({ hostname: url.hostname, path: url.pathname, method, headers }, res => {
            let raw = '';
            res.on('data', c => raw += c);
            res.on('end', () => { try { resolve(JSON.parse(raw)); } catch { resolve(raw); } });
        });
        r.on('error', reject);
        if (data) r.write(data);
        r.end();
    });
}

async function run() {
    console.log('Staging:', BASE_URL);

    console.log('Logging in…');
    const login = await req('POST', '/api/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });

    let token;
    if (login.token) {
        token = login.token;
    } else if (login.mfa_required) {
        const code = await prompt('MFA code from your authenticator app: ');
        const mfa = await req('POST', '/api/auth/mfa/verify', { code }, null, login.pre_auth_token);
        if (!mfa.token) { console.error('MFA failed:', JSON.stringify(mfa)); process.exit(1); }
        token = mfa.token;
    } else {
        console.error('Login failed:', JSON.stringify(login)); process.exit(1);
    }

    console.log('Fetching existing terms…');
    const existing = await req('GET', '/api/glossary', null, token);
    console.log(`Deleting ${existing.length} existing terms…`);
    for (const t of existing) {
        await req('DELETE', `/api/glossary/${t.id}`, null, token);
        process.stdout.write('.');
    }
    if (existing.length) console.log();

    console.log(`Inserting ${GLOSSARY.length} new terms…`);
    let added = 0;
    for (const t of GLOSSARY) {
        const r = await req('POST', '/api/glossary', { term: t.term, definition: t.definition }, token);
        if (r && r.id) { added++; process.stdout.write('.'); }
        else console.warn(`\nFailed: ${t.term}`, JSON.stringify(r));
    }
    console.log(`\nDone — ${added} terms inserted.`);
}

run().catch(e => { console.error(e.message); process.exit(1); });

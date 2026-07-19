// migrate-v18-to-v19.js
// Adds impact pillar scoring columns to the risks table and seeds default
// pillar definitions + updated likelihood into company_settings.
//
// Usage:
//   DATABASE_URL=postgresql://... node migrate-v18-to-v19.js

const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ── Default pillar definitions (sourced from Doha Insurance Group risk register) ──
const DEFAULT_PILLARS = [
    {
        name: 'Financial',
        definitions: [
            { score: 1, label: 'Insignificant', description: '0–1 (financial loss threshold)' },
            { score: 2, label: 'Low / Minor',   description: '1–5' },
            { score: 3, label: 'Moderate',      description: '5–25' },
            { score: 4, label: 'Major',          description: '25–50' },
            { score: 5, label: 'Catastrophic',   description: '>50' },
        ],
    },
    {
        name: 'Operational',
        definitions: [
            { score: 1, label: 'Insignificant', description: 'Minor disruptions, no real impact on operations; service disruption less than 2 hours.' },
            { score: 2, label: 'Low / Minor',   description: 'Slight disruption to a few processes, minimal impact on overall operations; service disruption 2–4 hours.' },
            { score: 3, label: 'Moderate',      description: 'Noticeable disruption to operations, key services affected; disruption 4 hours–1 day.' },
            { score: 4, label: 'Major',          description: 'Significant disruption, critical services impacted; service disruption up to 3 days.' },
            { score: 5, label: 'Catastrophic',   description: 'Severe disruption, entire services could be halted; service disruption more than 3 days.' },
        ],
    },
    {
        name: 'Strategic',
        definitions: [
            { score: 1, label: 'Insignificant', description: 'Minimal effect on achieving strategic goals; no significant disruption to long-term plans.' },
            { score: 2, label: 'Low / Minor',   description: 'Small, manageable effects on strategic plans; some adjustments needed but no major deviation from core objectives.' },
            { score: 3, label: 'Moderate',      description: 'Noticeable effects on one or more strategic goals, requiring reallocation of resources or re-prioritisation.' },
            { score: 4, label: 'Major',          description: 'Significant disruption to strategic initiatives, potentially requiring substantial changes to plans or strategic direction.' },
            { score: 5, label: 'Catastrophic',   description: 'Critical impact that may render strategic goals unachievable, requiring a complete overhaul of strategy or long-term business sustainability.' },
        ],
    },
    {
        name: 'Reputational',
        definitions: [
            { score: 1, label: 'Insignificant', description: 'Limited local adverse publicity or dissatisfaction within the organisation.' },
            { score: 2, label: 'Low / Minor',   description: 'Adverse publicity at local level with some dissatisfaction amongst service users.' },
            { score: 3, label: 'Moderate',      description: 'Adverse publicity in local media and/or significant dissatisfaction of service users.' },
            { score: 4, label: 'Major',          description: 'Adverse publicity in regional media for a short period, or sustained adverse publicity in local media.' },
            { score: 5, label: 'Catastrophic',   description: 'Substantial adverse media comment at regional level with long-term impact, including potential resignation of key senior staff.' },
        ],
    },
    {
        name: 'Legal & Regulatory',
        definitions: [
            { score: 1, label: 'Insignificant', description: 'Minor compliance issue; no formal action required.' },
            { score: 2, label: 'Low / Minor',   description: 'Formal notice or warning from regulator.' },
            { score: 3, label: 'Moderate',      description: 'Regulatory fine or formal corrective action required.' },
            { score: 4, label: 'Major',          description: 'Major regulatory penalties or legal action; potential investigation.' },
            { score: 5, label: 'Catastrophic',   description: 'Severe legal consequences, regulatory shutdown, or loss of licences.' },
        ],
    },
    {
        name: 'People & Safety',
        definitions: [
            { score: 1, label: 'Insignificant', description: 'Minor injuries; no hospitalisation.' },
            { score: 2, label: 'Low / Minor',   description: 'Injuries requiring hospital treatment.' },
            { score: 3, label: 'Moderate',      description: 'Lost time injury or restricted work injury to one or more people.' },
            { score: 4, label: 'Major',          description: 'Serious injuries or permanent disability; work-related disease.' },
            { score: 5, label: 'Catastrophic',   description: 'Fatalities and/or multiple serious injuries.' },
        ],
    },
];

// ── Updated likelihood definitions (sourced from Doha Insurance Group) ──
const DEFAULT_LIKELIHOOD = [
    { score: 5, label: 'Very Likely',  description: 'The event has already happened or happens regularly, or there is significant reason to believe it is virtually imminent.', frequency: 'At least once in 6 months' },
    { score: 4, label: 'Likely',       description: 'The event is more likely to happen than not. There is a notable probability of occurrence based on past frequency or current circumstances.', frequency: 'At least once in 3 years' },
    { score: 3, label: 'Occasional',   description: 'The event has a reasonable likelihood of happening based on current circumstances or historical data. More than a remote possibility.', frequency: 'At least once in 5 years' },
    { score: 2, label: 'Seldom',       description: 'There is a possibility the event could occur at some time, but it is not expected. Likelihood of occurrence is low based on available information.', frequency: 'At least once in 10 years' },
    { score: 1, label: 'Unlikely',     description: 'The event is exceptionally unlikely to happen based on past frequency and current circumstances. Occurrence would be an extreme outlier.', frequency: 'Not expected to occur within 10 years' },
];

// ── Default single-dimension impact (retained for backward compat) ──
const DEFAULT_IMPACT = [
    { score: 5, label: 'Catastrophic', description: 'Existential threat — severe financial loss, regulatory licence at risk, or irreversible reputational damage.' },
    { score: 4, label: 'Major',        description: 'Significant disruption — regulatory sanction, sustained adverse media, or loss of key clients.' },
    { score: 3, label: 'Moderate',     description: 'Moderate impact — regulatory inquiry, negative media coverage, or significant customer complaints.' },
    { score: 2, label: 'Low / Minor',  description: 'Minor disruption — limited reputational impact, resolved quickly with additional resources.' },
    { score: 1, label: 'Insignificant', description: 'Negligible impact — no regulatory interest, handled through normal operations.' },
];

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Seed scoring methodology for all companies
        //    Merges with any existing methodology (preserves custom likelihood/impact if set)
        const companies = await client.query(`SELECT id FROM companies`);
        for (const { id } of companies.rows) {
            const existing = await client.query(
                `SELECT setting_value FROM company_settings WHERE company_id=$1 AND setting_key='scoring_methodology'`,
                [id]
            );
            let current = {};
            if (existing.rows.length > 0) {
                try { current = JSON.parse(existing.rows[0].setting_value); } catch { current = {}; }
            }

            const merged = {
                likelihood: current.likelihood?.length ? current.likelihood : DEFAULT_LIKELIHOOD,
                impact:     current.impact?.length     ? current.impact     : DEFAULT_IMPACT,
                pillars:    current.pillars?.length    ? current.pillars    : DEFAULT_PILLARS,
            };

            await client.query(
                `INSERT INTO company_settings (company_id, setting_key, setting_value)
                 VALUES ($1, 'scoring_methodology', $2)
                 ON CONFLICT (company_id, setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value`,
                [id, JSON.stringify(merged)]
            );
            console.log(`✔ Seeded scoring methodology for company ${id}`);
        }

        await client.query('COMMIT');
        console.log('✔ Migration v19 complete');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ Migration v19 failed:', e.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();

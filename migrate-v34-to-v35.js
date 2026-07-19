// migrate-v34-to-v35.js
// Consultant Benchmarking Layer — Phase 2: Database Schema
//
// What this migration does:
//   1. Adds is_consultant to users (platform-level Consultant role flag)
//   2. Adds is_external to user_companies (marks external/consultant users)
//   3. Adds 'Consultant CRO' to the user_companies role CHECK constraint
//   4. Creates 5 new global tables:
//        source_registry, ingestion_runs, ingestion_queue,
//        external_benchmark, client_benchmark
//   5. Seeds 9 confirmed benchmark sources into source_registry
//
// Safe to run multiple times — all DDL uses IF NOT EXISTS / IF EXISTS guards.
//
// Usage:
//   DATABASE_URL=postgresql://... node migrate-v34-to-v35.js

'use strict';

const { Pool } = require('pg');
const fs       = require('fs');
const path     = require('path');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ── 9 confirmed benchmark sources (design doc v0.5) ───────────────────────
const SOURCES = [
    {
        name:                  'Allianz Risk Barometer 2026',
        organisation:          'Allianz Commercial',
        url:                   'https://commercial.allianz.com/news-and-insights/reports/allianz-risk-barometer.html',
        format:                'PDF',
        publication_frequency: 'Annual',
        pillar_coverage:       ['Strategic','Governance','Finance','IT','Compliance','Operations','BCM','Security'],
        sector_coverage:       ['All Sectors'],
    },
    {
        name:                  'Allianz Risk Barometer 2026 — Sector Appendix',
        organisation:          'Allianz Commercial',
        url:                   'https://commercial.allianz.com/news-and-insights/reports/allianz-risk-barometer.html',
        format:                'PDF',
        publication_frequency: 'Annual',
        pillar_coverage:       ['Strategic','Governance','Finance','IT','Compliance','Operations','BCM','Security'],
        sector_coverage:       ['All Sectors'],
    },
    {
        name:                  'Verizon DBIR 2026',
        organisation:          'Verizon',
        url:                   'https://www.verizon.com/business/resources/reports/dbir/',
        format:                'PDF',
        publication_frequency: 'Annual',
        pillar_coverage:       ['IT','Security'],
        sector_coverage:       ['All Sectors'],
    },
    {
        name:                  'WEF Global Risks Report 2026',
        organisation:          'World Economic Forum',
        url:                   'https://www.weforum.org/reports/global-risks-report-2026/',
        format:                'PDF',
        publication_frequency: 'Annual',
        pillar_coverage:       ['Strategic','BCM','IT','Security'],
        sector_coverage:       ['All Sectors'],
    },
    {
        name:                  'IBM Cost of Data Breach 2025',
        organisation:          'IBM / Ponemon',
        url:                   'https://www.ibm.com/reports/data-breach',
        format:                'PDF',
        publication_frequency: 'Annual',
        pillar_coverage:       ['IT','Security','Finance'],
        sector_coverage:       ['All Sectors'],
    },
    {
        name:                  'ENISA Threat Landscape 2025',
        organisation:          'EU Agency for Cybersecurity',
        url:                   'https://www.enisa.europa.eu/publications/enisa-threat-landscape-2025',
        format:                'PDF',
        publication_frequency: 'Annual',
        pillar_coverage:       ['IT','Security'],
        sector_coverage:       ['All Sectors'],
    },
    {
        name:                  'ENISA Finance Sector Threat Landscape 2025',
        organisation:          'EU Agency for Cybersecurity',
        url:                   'https://www.enisa.europa.eu/publications/financial-sector-threat-landscape',
        format:                'PDF',
        publication_frequency: 'Annual',
        pillar_coverage:       ['IT','Security','Compliance'],
        sector_coverage:       ['Financial Services'],
    },
    {
        name:                  'ENISA Public Admin Threat Landscape 2025',
        organisation:          'EU Agency for Cybersecurity',
        url:                   'https://www.enisa.europa.eu/publications/public-administration-threat-landscape',
        format:                'PDF',
        publication_frequency: 'Annual',
        pillar_coverage:       ['IT','Security','Governance'],
        sector_coverage:       ['Public Sector'],
    },
    {
        name:                  'PwC ME Digital Trust Insights 2025',
        organisation:          'PwC Middle East',
        url:                   'https://www.pwc.com/m1/en/publications/documents/2024/2025-global-digital-trust-insights-middle-east-findings.pdf',
        format:                'PDF',
        publication_frequency: 'Annual',
        pillar_coverage:       ['IT','Security','Compliance','Governance','Finance'],
        sector_coverage:       ['All Sectors'],
    },
];

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Apply DDL (everything above the seed comment line)
        const sqlPath = path.join(__dirname, 'schema_v35_consultant_benchmarking.sql');
        const fullSql = fs.readFileSync(sqlPath, 'utf8');
        const ddl     = fullSql.split('-- ── Seed:')[0];
        await client.query(ddl);
        console.log('✔ DDL applied: tables and constraints created');

        // Seed sources only if table is empty (idempotent)
        const { rows } = await client.query('SELECT COUNT(*) FROM source_registry');
        if (parseInt(rows[0].count) === 0) {
            for (const s of SOURCES) {
                await client.query(
                    `INSERT INTO source_registry
                        (name, organisation, url, format, publication_frequency,
                         pillar_coverage, sector_coverage)
                     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
                    [s.name, s.organisation, s.url, s.format,
                     s.publication_frequency, s.pillar_coverage, s.sector_coverage]
                );
            }
            console.log(`✔ ${SOURCES.length} benchmark sources seeded into source_registry`);
        } else {
            console.log('✔ source_registry already populated — seed skipped');
        }

        await client.query('COMMIT');
        console.log('✔ Migration v35 complete: Consultant Benchmarking Layer schema ready');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ Migration v35 failed:', e.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();

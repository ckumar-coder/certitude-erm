#!/usr/bin/env node
//
// generate-release-log.js
// Reads frontend/src/data/changelog.json and regenerates GRC_App_Release_Log.docx.
// Run automatically from deploy-staging.sh and deploy-certitude.sh before each build.
// Manual: npm run release-log
//

'use strict';

const fs   = require('fs');
const path = require('path');

// Resolve docx from local node_modules, global npm, or the pre-installed global path
let docxModule;
try {
    docxModule = require('docx');
} catch (_) {
    try {
        docxModule = require('/usr/local/lib/node_modules_global/lib/node_modules/docx');
    } catch (__) {
        const { execSync } = require('child_process');
        const globalRoot = execSync('npm root -g 2>/dev/null || echo ""').toString().trim();
        if (globalRoot) docxModule = require(`${globalRoot}/docx`);
    }
}
if (!docxModule) { console.error('❌ docx package not found. Run: npm install -g docx'); process.exit(1); }

const {
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
    Header, Footer, AlignmentType, BorderStyle, WidthType, ShadingType,
    PageNumber, VerticalAlign,
} = docxModule;

const changelog = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../frontend/src/data/changelog.json'), 'utf8')
);

// ── Helpers ────────────────────────────────────────────────────────────────────

const NAVY   = '1F4E79';   // v2.x header colour
const BLUE   = '2E75B6';   // v1.x header colour
const WHITE  = 'FFFFFF';
const GHOST  = 'D0E8FF';   // subtitle text in header
const STRIPE = 'F5F7FA';   // schema cell background
const AMBER  = 'FFF3CD';   // changes cell background
const GREY44 = '444444';
const GREY33 = '333333';

const ARIAL = (opts = {}) => ({
    font: 'Arial',
    ...opts,
});

const COURIER = (opts = {}) => ({
    font: 'Courier New',
    ...opts,
});

function border(color) {
    return { style: BorderStyle.SINGLE, size: 4, color };
}

function cellBorders(color) {
    const b = border(color);
    return { top: b, bottom: b, left: b, right: b };
}

function headerColor(version) {
    return version.startsWith('1.') ? BLUE : NAVY;
}

// A plain bullet paragraph in the changes cell
function changePara(text, last = false) {
    return new Paragraph({
        spacing: { after: last ? 100 : 60 },
        children: [new TextRun({ ...ARIAL({ size: 19 }), text: `•  ${text}` })],
    });
}

// "Files modified:" label paragraph
function filesLabel() {
    return new Paragraph({
        spacing: { after: 60 },
        children: [new TextRun({ ...ARIAL({ bold: true, color: GREY44, size: 18 }), text: 'Files modified:' })],
    });
}

// A monospace file-path paragraph
function filePara(text, last = false) {
    return new Paragraph({
        spacing: { after: last ? 0 : 40 },
        children: [new TextRun({ ...COURIER({ color: GREY44, size: 17 }), text: `    ${text}` })],
    });
}

// Build a single version table
function versionTable(entry) {
    const color = headerColor(entry.version);

    // ── Row 1: version header (full-width, coloured) ──────────────────────────
    const headerRow = new TableRow({
        children: [
            new TableCell({
                columnSpan: 2,
                width: { size: 10026, type: WidthType.DXA },
                borders: cellBorders(color),
                shading: { fill: color, type: ShadingType.CLEAR },
                margins: { top: 80, bottom: 80, left: 140, right: 140 },
                children: [
                    new Paragraph({
                        children: [
                            new TextRun({ ...ARIAL({ bold: true, color: WHITE, size: 24 }), text: entry.version }),
                            new TextRun({ ...ARIAL({ color: GHOST, size: 20 }), text: `  —  ${entry.date}  —  ${entry.type}` }),
                        ],
                    }),
                ],
            }),
        ],
    });

    // ── Row 2: "DB Schema" / "Changes" subheader ─────────────────────────────
    const subheaderRow = new TableRow({
        children: [
            new TableCell({
                width: { size: 1400, type: WidthType.DXA },
                borders: cellBorders(color),
                shading: { fill: color, type: ShadingType.CLEAR },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({
                    children: [new TextRun({ ...ARIAL({ bold: true, color: WHITE, size: 19 }), text: 'DB Schema' })],
                })],
            }),
            new TableCell({
                width: { size: 8626, type: WidthType.DXA },
                borders: cellBorders(color),
                shading: { fill: color, type: ShadingType.CLEAR },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({
                    children: [new TextRun({ ...ARIAL({ bold: true, color: WHITE, size: 19 }), text: 'Changes' })],
                })],
            }),
        ],
    });

    // ── Row 3: schema text / bullets + files ─────────────────────────────────
    const changeParas = (entry.bullets || []).map((b, i) =>
        changePara(b, i === (entry.bullets.length - 1) && !(entry.files?.length))
    );

    if (entry.files && entry.files.length > 0) {
        changeParas.push(filesLabel());
        entry.files.forEach((f, i) => changeParas.push(filePara(f, i === entry.files.length - 1)));
    }

    const dataRow = new TableRow({
        children: [
            new TableCell({
                width: { size: 1400, type: WidthType.DXA },
                borders: cellBorders('CCCCCC'),
                shading: { fill: STRIPE, type: ShadingType.CLEAR },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({
                    spacing: { after: 0 },
                    children: [new TextRun({ ...COURIER({ color: GREY33, size: 17 }), text: entry.schema })],
                })],
            }),
            new TableCell({
                width: { size: 8626, type: WidthType.DXA },
                borders: cellBorders('CCCCCC'),
                shading: { fill: AMBER, type: ShadingType.CLEAR },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: changeParas,
            }),
        ],
    });

    return new Table({
        width: { size: 10026, type: WidthType.DXA },
        columnWidths: [1400, 8626],
        borders: { ...cellBorders(color) },
        rows: [headerRow, subheaderRow, dataRow],
    });
}

// Spacer paragraph between tables
function spacer() {
    return new Paragraph({ spacing: { after: 200 }, children: [new TextRun('')] });
}

// ── Document header table ──────────────────────────────────────────────────────

function metaTable(currentVersion, currentDate) {
    const labelCell = (text) => new TableCell({
        width: { size: 2200, type: WidthType.DXA },
        borders: cellBorders('CCCCCC'),
        shading: { fill: STRIPE, type: ShadingType.CLEAR },
        margins: { top: 60, bottom: 60, left: 120, right: 120 },
        children: [new Paragraph({
            children: [new TextRun({ ...ARIAL({ bold: true, color: GREY44, size: 19 }), text })],
        })],
    });

    const valueCell = (text) => new TableCell({
        width: { size: 7826, type: WidthType.DXA },
        borders: cellBorders('CCCCCC'),
        margins: { top: 60, bottom: 60, left: 120, right: 120 },
        children: [new Paragraph({
            children: [new TextRun({ ...ARIAL({ size: 19 }), text })],
        })],
    });

    const rows = [
        ['Document type',  'Running Release Changelog — updated with every deployment'],
        ['Maintained by',  'Chandrashekar Kumar'],
        ['Current version', `${currentVersion} (deployed ${currentDate})`],
        ['GitHub repo',    'https://github.com/ckumar-coder/grc-workstation (private)'],
        ['GCP project',    'certitude-grc'],
    ].map(([label, value]) => new TableRow({
        children: [labelCell(label), valueCell(value)],
    }));

    return new Table({
        width: { size: 10026, type: WidthType.DXA },
        columnWidths: [2200, 7826],
        rows,
    });
}

// ── Build document ─────────────────────────────────────────────────────────────

const latest = changelog[0];

const titlePara = new Paragraph({
    spacing: { after: 200 },
    children: [
        new TextRun({ ...ARIAL({ bold: true, size: 36, color: NAVY }), text: 'GRC App — Release Log' }),
    ],
});

const notePara = new Paragraph({
    spacing: { before: 200, after: 300 },
    children: [new TextRun({
        ...ARIAL({ size: 17, color: '666666', italics: true }),
        text: 'Note: Versions prior to v1.0.x pre-date this log. '
            + 'Entries from v1.0.x onwards represent a best-effort reconstruction from migration files, task records, and deployment history. '
            + 'From v2.0.0 onwards all entries are recorded in real time.',
    })],
});

const versionBlocks = [];
changelog.forEach((entry, i) => {
    versionBlocks.push(versionTable(entry));
    if (i < changelog.length - 1) versionBlocks.push(spacer());
});

const doc = new Document({
    styles: {
        default: { document: { run: { font: 'Arial', size: 22 } } },
    },
    sections: [{
        properties: {
            page: {
                size: { width: 12240, height: 15840 },
                margin: { top: 1080, right: 900, bottom: 1080, left: 900 },
            },
        },
        headers: {
            default: new Header({
                children: [
                    new Paragraph({
                        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: NAVY, space: 1 } },
                        children: [
                            new TextRun({ ...ARIAL({ bold: true, color: NAVY, size: 18 }), text: 'GRC Workstation — Release Log' }),
                            new TextRun({ ...ARIAL({ color: '888888', size: 18 }), text: '\t' + latest.version }),
                        ],
                        tabStops: [{ type: 'right', position: 9360 }],
                    }),
                ],
            }),
        },
        footers: {
            default: new Footer({
                children: [
                    new Paragraph({
                        border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC', space: 1 } },
                        alignment: AlignmentType.RIGHT,
                        children: [
                            new TextRun({ ...ARIAL({ color: '888888', size: 16 }), text: 'Page ' }),
                            new TextRun({ ...ARIAL({ color: '888888', size: 16 }), children: [PageNumber.CURRENT] }),
                            new TextRun({ ...ARIAL({ color: '888888', size: 16 }), text: ' of ' }),
                            new TextRun({ ...ARIAL({ color: '888888', size: 16 }), children: [PageNumber.TOTAL_PAGES] }),
                        ],
                    }),
                ],
            }),
        },
        children: [
            titlePara,
            metaTable(latest.version, latest.date),
            notePara,
            ...versionBlocks,
        ],
    }],
});

// ── Write output ───────────────────────────────────────────────────────────────

const outPath = path.join(__dirname, '../../GRC_App_Release_Log.docx');

Packer.toBuffer(doc).then((buf) => {
    fs.writeFileSync(outPath, buf);
    console.log(`✔ GRC_App_Release_Log.docx written (${(buf.length / 1024).toFixed(0)} KB) → ${outPath}`);
}).catch((err) => {
    console.error('❌ Failed to generate release log:', err.message);
    process.exit(1);
});

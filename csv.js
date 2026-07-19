// csv.js -- minimal CSV parsing/stringifying, RFC-4180-ish.
//
// Written by hand rather than pulling in a dependency: bulk import (H1)
// and data export (H6) only need basic quoted-field/comma/newline
// handling, and keeping this dependency-free means `npm install` stays
// untouched for clients who just want the existing stack.

// Parses CSV text into an array of objects keyed by the header row.
// Handles quoted fields containing commas, newlines, and escaped quotes
// ("" inside a quoted field).
function parseCSV(text) {
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;
    // Normalize line endings so \r\n inside/outside quotes behaves the same.
    const input = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    for (let i = 0; i < input.length; i++) {
        const char = input[i];

        if (inQuotes) {
            if (char === '"') {
                if (input[i + 1] === '"') {
                    field += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                field += char;
            }
            continue;
        }

        if (char === '"') {
            inQuotes = true;
        } else if (char === ',') {
            row.push(field);
            field = '';
        } else if (char === '\n') {
            row.push(field);
            rows.push(row);
            row = [];
            field = '';
        } else {
            field += char;
        }
    }
    // Final field/row (files may or may not end with a newline).
    if (field !== '' || row.length > 0) {
        row.push(field);
        rows.push(row);
    }

    // Drop fully-blank trailing rows (common with trailing newlines).
    while (rows.length > 0 && rows[rows.length - 1].every((c) => c === '')) {
        rows.pop();
    }

    if (rows.length === 0) return [];
    const header = rows[0].map((h) => h.trim());
    return rows.slice(1).map((r) => {
        const obj = {};
        header.forEach((h, idx) => {
            obj[h] = r[idx] !== undefined ? r[idx] : '';
        });
        return obj;
    });
}

// Quotes a field if it contains a comma, quote, or newline.
function csvField(value) {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (/[",\n]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

// Serializes an array of objects to CSV text using the given column list
// (in order). `columns` is an array of either strings (used as both the
// header label and the object key) or {key, label} objects.
function toCSV(records, columns) {
    const cols = columns.map((c) => (typeof c === 'string' ? { key: c, label: c } : c));
    const lines = [cols.map((c) => csvField(c.label)).join(',')];
    for (const record of records) {
        lines.push(cols.map((c) => csvField(record[c.key])).join(','));
    }
    return lines.join('\n') + '\n';
}

module.exports = { parseCSV, toCSV, csvField };

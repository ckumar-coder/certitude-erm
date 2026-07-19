// fileScan.js — Evidence file validation and malware scanning hook  (SOC 2: CC6.8)
//
// Phase 1 (current): validates file type via magic-byte inspection and enforces
// an extension/MIME allowlist. This blocks disguised files even when the client
// sends a forged Content-Type header or renames a dangerous file with a safe
// extension.
//
// Phase 2 (future): set FILE_SCAN_API_URL to the base URL of your AV REST API
// (e.g., a ClamAV daemon REST wrapper, VirusTotal private API, or Google DLP).
// scanFile() will call it automatically. No caller changes needed.
//
// Usage:
//   const { scanFile } = require('./fileScan');
//   const result = await scanFile(filename, mime_type, file_data_base64);
//   if (!result.safe) return res.status(400).json({ error: result.reason });

// ── Allowed extensions ────────────────────────────────────────────────────────
const ALLOWED_EXTENSIONS = new Set([
    '.pdf',
    '.doc', '.docx',
    '.xls', '.xlsx',
    '.ppt', '.pptx',
    '.txt', '.csv', '.rtf',
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp',
    '.zip', '.7z', '.gz', '.tar',
]);

// ── Allowed MIME types ────────────────────────────────────────────────────────
const ALLOWED_MIME_TYPES = new Set([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'application/rtf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    'application/zip',
    'application/x-7z-compressed',
    'application/gzip',
]);

// ── Magic-byte signatures ─────────────────────────────────────────────────────
// Each entry maps a set of MIME types to the leading bytes that must be present
// in a legitimate file of that type.  Validation fails if the bytes don't match.
const MAGIC_RULES = [
    {
        mimes: ['application/pdf'],
        sig:   [0x25, 0x50, 0x44, 0x46],          // %PDF
    },
    {
        mimes: ['image/jpeg'],
        sig:   [0xFF, 0xD8, 0xFF],                  // JPEG SOI marker
    },
    {
        mimes: ['image/png'],
        sig:   [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],  // PNG
    },
    {
        mimes: ['image/gif'],
        sig:   [0x47, 0x49, 0x46, 0x38],            // GIF8
    },
    {
        mimes: ['image/webp'],
        sig:   [0x52, 0x49, 0x46, 0x46],            // RIFF (WebP container)
    },
    {
        mimes: ['image/bmp'],
        sig:   [0x42, 0x4D],                         // BM
    },
    {
        // ZIP-based formats: DOCX, XLSX, PPTX, ZIP
        mimes: [
            'application/zip',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        ],
        sig: [0x50, 0x4B, 0x03, 0x04],              // PK local file header
    },
    {
        // Legacy OLE2 Compound Document: DOC, XLS, PPT
        mimes: [
            'application/msword',
            'application/vnd.ms-excel',
            'application/vnd.ms-powerpoint',
        ],
        sig: [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1],
    },
    {
        mimes: ['application/x-7z-compressed'],
        sig:   [0x37, 0x7A, 0xBC, 0xAF, 0x27, 0x1C], // 7z
    },
    {
        mimes: ['application/gzip'],
        sig:   [0x1F, 0x8B],                          // GZIP
    },
];

// These MIME types are plain text — no fixed magic bytes, validated differently.
const TEXT_MIMES = new Set(['text/plain', 'text/csv', 'application/rtf']);

// ── Helpers ───────────────────────────────────────────────────────────────────
function fileExtension(filename) {
    const dot = filename.lastIndexOf('.');
    return dot >= 0 ? filename.slice(dot).toLowerCase() : '';
}

function matchesMagic(buf, mimeType) {
    // Text files have no fixed signature — accept if decodable (already done by Buffer.from).
    if (TEXT_MIMES.has(mimeType)) return true;

    for (const rule of MAGIC_RULES) {
        if (!rule.mimes.includes(mimeType)) continue;
        if (buf.length < rule.sig.length) return false;
        return rule.sig.every((byte, i) => buf[i] === byte);
    }

    // No rule found for this MIME type — reject to be safe.
    return false;
}

// ── Optional external AV API ──────────────────────────────────────────────────
// Set FILE_SCAN_API_URL=https://your-av-service/scan to enable.
// Expected JSON request: { filename, data }  (data = base64 file bytes)
// Expected JSON response: { safe: true } | { safe: false, reason: "..." }
//
// If the scanner is unreachable or returns an unexpected response, the upload
// is ALLOWED (fail-open) so a scanner outage does not block all evidence
// uploads.  Change to fail-closed if your policy requires it.
async function callExternalScanner(filename, base64Data) {
    const url = process.env.FILE_SCAN_API_URL;
    if (!url) return null;   // not configured — skip

    try {
        // Use dynamic import so this file loads even without node-fetch installed.
        const { default: fetch } = await import('node-fetch').catch(() => ({ default: null }));
        if (!fetch) return null;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10_000);
        try {
            const resp = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename, data: base64Data }),
                signal: controller.signal,
            });
            if (!resp.ok) return null;
            return await resp.json();
        } finally {
            clearTimeout(timeout);
        }
    } catch {
        // Scanner unreachable — fail-open
        return null;
    }
}

// ── Public API ────────────────────────────────────────────────────────────────
// Returns { safe: true } or { safe: false, reason: string }
//
// @param filename    - original filename from the upload (e.g. "report.pdf")
// @param mimeType    - declared MIME type from the client (e.g. "application/pdf")
// @param base64Data  - file bytes encoded as base64 (the file_data field)
async function scanFile(filename, mimeType, base64Data) {
    // 1. Extension allowlist — blocks dangerous extensions (.exe, .sh, .js, etc.)
    const ext = fileExtension(filename);
    if (ext && !ALLOWED_EXTENSIONS.has(ext)) {
        return { safe: false, reason: `File extension "${ext}" is not permitted.` };
    }

    // 2. MIME type allowlist — should already be enforced by Zod schema, but
    //    double-checked here as defence in depth.
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
        return { safe: false, reason: `File type "${mimeType}" is not permitted.` };
    }

    // 3. Decode and check magic bytes.
    let buf;
    try {
        buf = Buffer.from(base64Data, 'base64');
    } catch {
        return { safe: false, reason: 'File data is not valid base64.' };
    }

    if (!matchesMagic(buf, mimeType)) {
        return {
            safe:   false,
            reason: 'File content does not match its declared type. The file may have a spoofed extension.',
        };
    }

    // 4. Optional external AV scan.
    const extResult = await callExternalScanner(filename, base64Data);
    if (extResult && extResult.safe === false) {
        return { safe: false, reason: extResult.reason || 'File did not pass the malware scan.' };
    }

    return { safe: true };
}

module.exports = { scanFile, ALLOWED_EXTENSIONS, ALLOWED_MIME_TYPES };

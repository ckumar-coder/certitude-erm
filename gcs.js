// gcs.js — Google Cloud Storage helper
// Uses Application Default Credentials (ADC) — works automatically on Cloud Run.
// Locally: set GOOGLE_APPLICATION_CREDENTIALS to a service account key JSON file.
//
// Required env var: GCS_BUCKET (name of the GCS bucket, e.g. certitude-grc-assets)
// Service account needs: roles/storage.objectAdmin on the bucket.

'use strict';

const { Storage } = require('@google-cloud/storage');

const storage = new Storage();
const BUCKET  = process.env.GCS_BUCKET;

if (!BUCKET && process.env.NODE_ENV === 'production') {
    console.warn('[gcs] WARNING: GCS_BUCKET env var is not set. Training video uploads will fail.');
}

/**
 * Generate a v4 signed URL for reading an object (video playback / thumbnail).
 * Expires in 60 minutes by default.
 */
async function getSignedReadUrl(gcsPath, expiresMinutes = 60) {
    if (!BUCKET) throw new Error('GCS_BUCKET environment variable is not configured');
    const [url] = await storage.bucket(BUCKET).file(gcsPath).getSignedUrl({
        version: 'v4',
        action:  'read',
        expires: Date.now() + expiresMinutes * 60 * 1000,
    });
    return url;
}

/**
 * Generate a v4 signed URL for uploading an object directly from the browser.
 * Expires in 15 minutes by default.
 */
async function getSignedUploadUrl(gcsPath, contentType, expiresMinutes = 15) {
    if (!BUCKET) throw new Error('GCS_BUCKET environment variable is not configured');
    const [url] = await storage.bucket(BUCKET).file(gcsPath).getSignedUrl({
        version:     'v4',
        action:      'write',
        expires:     Date.now() + expiresMinutes * 60 * 1000,
        contentType,
    });
    return url;
}

/**
 * Delete an object from GCS (used when a video record is deleted).
 */
async function deleteObject(gcsPath) {
    if (!BUCKET) throw new Error('GCS_BUCKET environment variable is not configured');
    await storage.bucket(BUCKET).file(gcsPath).delete({ ignoreNotFound: true });
}

module.exports = { getSignedReadUrl, getSignedUploadUrl, deleteObject };

#!/usr/bin/env bash
#
# setup-staging.sh — one-time creation of the GRC Workstation staging environment.
#
# Run this ONCE from the repo root to provision the staging Cloud SQL instance,
# database user, and Secret Manager secrets.  After this completes, use
# deploy-staging.sh for all subsequent deploys.
#
# Prerequisites:
#   - gcloud CLI installed and authenticated (gcloud auth login)
#   - You have Owner or Editor + Cloud SQL Admin + Secret Manager Admin on certitude-grc
#   - The production service account grc-app-run@certitude-grc.iam.gserviceaccount.com exists
#
# Usage:
#   cd /path/to/grc-app
#   chmod +x setup-staging.sh
#   ./setup-staging.sh
#

set -euo pipefail

# ── Configuration ──────────────────────────────────────────────────────────────
PROJECT_ID=certitude-grc
REGION=northamerica-northeast1
STAGING_INSTANCE=certitude-grc-db-staging   # new Cloud SQL instance
STAGING_DB=grcdb_staging                     # database name inside the instance
STAGING_USER=grcuser_staging                 # database user
STAGING_SERVICE=grc-app-staging              # Cloud Run service name
SA_EMAIL=grc-app-run@${PROJECT_ID}.iam.gserviceaccount.com

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║   GRC Workstation — Staging Environment Setup            ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo "  Project:          ${PROJECT_ID}"
echo "  Region:           ${REGION}"
echo "  Cloud SQL:        ${STAGING_INSTANCE}"
echo "  Cloud Run:        ${STAGING_SERVICE}"
echo ""

# ── Step 1: Create Cloud SQL staging instance ──────────────────────────────────
echo "── Step 1: Create Cloud SQL instance (this takes ~5 minutes) ──"
echo ""
echo "  Instance: ${STAGING_INSTANCE}"
echo "  Tier:     db-f1-micro  (smallest tier — adequate for staging)"
echo "  Region:   ${REGION}"
echo ""

gcloud sql instances create "${STAGING_INSTANCE}" \
    --project="${PROJECT_ID}" \
    --database-version=POSTGRES_15 \
    --tier=db-f1-micro \
    --region="${REGION}" \
    --storage-size=10GB \
    --storage-type=SSD \
    --no-storage-auto-increase \
    --backup-start-time=03:00 \
    --deletion-protection

echo "✔ Cloud SQL instance created: ${STAGING_INSTANCE}"
echo ""

# ── Step 2: Create database and user ──────────────────────────────────────────
echo "── Step 2: Create database and user ──"
echo ""

gcloud sql databases create "${STAGING_DB}" \
    --instance="${STAGING_INSTANCE}" \
    --project="${PROJECT_ID}"

echo "✔ Database created: ${STAGING_DB}"

# Generate a random password for the staging DB user
STAGING_DB_PASSWORD=$(openssl rand -base64 32 | tr -d '/+=' | head -c 40)

gcloud sql users create "${STAGING_USER}" \
    --instance="${STAGING_INSTANCE}" \
    --project="${PROJECT_ID}" \
    --password="${STAGING_DB_PASSWORD}"

echo "✔ Database user created: ${STAGING_USER}"
echo ""

# ── Step 3: Build the DATABASE_URL and store in Secret Manager ────────────────
echo "── Step 3: Store secrets in Secret Manager ──"
echo ""

# Get the instance connection name (project:region:instance)
INSTANCE_CONNECTION_NAME=$(gcloud sql instances describe "${STAGING_INSTANCE}" \
    --project="${PROJECT_ID}" \
    --format='value(connectionName)')

# Cloud Run connects via Unix socket through the Cloud SQL Auth Proxy
DATABASE_URL="postgresql://${STAGING_USER}:${STAGING_DB_PASSWORD}@localhost/${STAGING_DB}?host=/cloudsql/${INSTANCE_CONNECTION_NAME}"

# Store the staging DATABASE_URL
echo -n "${DATABASE_URL}" | gcloud secrets create grc-app-staging-database-url \
    --project="${PROJECT_ID}" \
    --replication-policy=automatic \
    --data-file=-

echo "✔ Secret created: grc-app-staging-database-url"

# Staging APP_URL — update this if you add a custom subdomain later
STAGING_APP_URL="https://$(gcloud run services describe ${STAGING_SERVICE} \
    --project=${PROJECT_ID} --region=${REGION} \
    --format='value(status.url)' 2>/dev/null || echo 'TBD')"

# We set a placeholder now; deploy-staging.sh will update it after first deploy
echo -n "https://staging.grc.certitude-advisory.ca" | gcloud secrets create grc-app-staging-url \
    --project="${PROJECT_ID}" \
    --replication-policy=automatic \
    --data-file=-

echo "✔ Secret created: grc-app-staging-url"

# Email encryption key — generate a fresh one for staging isolation
STAGING_EMAIL_KEY=$(openssl rand -hex 32)

echo -n "${STAGING_EMAIL_KEY}" | gcloud secrets create grc-app-staging-email-encryption-key \
    --project="${PROJECT_ID}" \
    --replication-policy=automatic \
    --data-file=-

echo "✔ Secret created: grc-app-staging-email-encryption-key"

# Test API key for running the test suite against staging
STAGING_TEST_API_KEY=$(openssl rand -hex 24)

echo -n "${STAGING_TEST_API_KEY}" | gcloud secrets create grc-app-staging-test-api-key \
    --project="${PROJECT_ID}" \
    --replication-policy=automatic \
    --data-file=-

echo "✔ Secret created: grc-app-staging-test-api-key"
echo ""

# ── Step 4: Grant the service account access to the staging secrets ────────────
echo "── Step 4: Grant service account access to staging secrets ──"
echo ""

for SECRET in \
    grc-app-staging-database-url \
    grc-app-staging-url \
    grc-app-staging-email-encryption-key \
    grc-app-staging-test-api-key; do

    gcloud secrets add-iam-policy-binding "${SECRET}" \
        --project="${PROJECT_ID}" \
        --member="serviceAccount:${SA_EMAIL}" \
        --role="roles/secretmanager.secretAccessor" \
        --quiet

    echo "  ✔ ${SA_EMAIL} → ${SECRET}"
done

echo ""

# ── Step 5: Grant the service account Cloud SQL access ────────────────────────
echo "── Step 5: Grant service account Cloud SQL client access ──"
echo ""

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/cloudsql.client" \
    --quiet

echo "✔ Cloud SQL client role granted (already held from production — no-op if already set)"
echo ""

# ── Done ───────────────────────────────────────────────────────────────────────
echo "╔══════════════════════════════════════════════════════════╗"
echo "║   Staging infrastructure is ready                        ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "  Cloud SQL instance:   ${STAGING_INSTANCE}"
echo "  Connection name:      ${INSTANCE_CONNECTION_NAME}"
echo "  Database:             ${STAGING_DB}"
echo "  DB user:              ${STAGING_USER}"
echo ""
echo "  Secrets created:"
echo "    grc-app-staging-database-url"
echo "    grc-app-staging-url"
echo "    grc-app-staging-email-encryption-key"
echo "    grc-app-staging-test-api-key"
echo ""
echo "  ⚠  The DB password was generated in-memory and is stored"
echo "     only in Secret Manager. It is not logged anywhere."
echo ""
echo "  Next step: run ./deploy-staging.sh to build and deploy the"
echo "  staging Cloud Run service and run schema migrations."
echo ""

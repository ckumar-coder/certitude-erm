#!/usr/bin/env bash
#
# deploy-certitude.sh  — deploy GRC Workstation to the Certitude instance.
#
# Run from the repo root:
#   cd /path/to/grc-app
#   ./deploy-certitude.sh
#
# To find your Cloud SQL instance name if unsure:
#   gcloud sql instances list --project=certitude-grc

set -euo pipefail

PROJECT_ID=certitude-grc
REGION=northamerica-northeast1
SERVICE_NAME=grc-app
AR_REPO=grc-images
INSTANCE_NAME=certitude-grc-db        # ← confirm this with: gcloud sql instances list --project=certitude-grc
GCS_BUCKET=certitude-grc-assets

IMAGE_TAG=$(date +%Y%m%d-%H%M%S)
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPO}/${SERVICE_NAME}:${IMAGE_TAG}"
INSTANCE_CONNECTION_NAME=$(gcloud sql instances describe "$INSTANCE_NAME" \
    --project="$PROJECT_ID" \
    --format='value(connectionName)')
SA_EMAIL="${SERVICE_NAME}-run@${PROJECT_ID}.iam.gserviceaccount.com"

cd "$(dirname "$0")"

echo "== Regenerating GRC_App_Release_Log.docx =="
node scripts/generate-release-log.js

echo "== Building and pushing ${IMAGE} =="
gcloud builds submit \
    --project="$PROJECT_ID" \
    --tag="$IMAGE" \
    .

echo "== Deploying Cloud Run service: ${SERVICE_NAME} =="
gcloud run deploy "$SERVICE_NAME" \
    --project="$PROJECT_ID" \
    --region="$REGION" \
    --image="$IMAGE" \
    --service-account="$SA_EMAIL" \
    --set-cloudsql-instances="$INSTANCE_CONNECTION_NAME" \
    --set-secrets="DATABASE_URL=${SERVICE_NAME}-database-url:latest,EMAIL_ENCRYPTION_KEY=grc-app-email-encryption-key:latest,TEST_API_KEY=grc-app-test-api-key:latest,APP_URL=grc-app-url:latest" \
    --set-env-vars="SESSION_TIMEOUT_MINUTES=30,LOCKOUT_MINUTES=30,PASSWORD_MAX_AGE_DAYS=90,GCS_BUCKET=${GCS_BUCKET}" \
    --min-instances=1 \
    --max-instances=4 \
    --memory=512Mi \
    --cpu=1 \
    --allow-unauthenticated

echo "== Applying any new schema migrations =="
gcloud run jobs deploy "${SERVICE_NAME}-migrate" \
    --project="$PROJECT_ID" \
    --region="$REGION" \
    --image="$IMAGE" \
    --command=node \
    --args=migrate-all.js \
    --set-secrets="DATABASE_URL=${SERVICE_NAME}-database-url:latest" \
    --set-cloudsql-instances="$INSTANCE_CONNECTION_NAME" \
    --service-account="$SA_EMAIL" \
    --max-retries=0

gcloud run jobs execute "${SERVICE_NAME}-migrate" \
    --project="$PROJECT_ID" \
    --region="$REGION" \
    --wait

URL=$(gcloud run services describe "$SERVICE_NAME" \
    --project="$PROJECT_ID" \
    --region="$REGION" \
    --format='value(status.url)')

echo ""
echo "============================================================"
echo "✔ Deployed ${SERVICE_NAME} → ${IMAGE}"
echo ""
echo "  URL:          ${URL}"
echo "  Health check: ${URL}/api/health"
echo "============================================================"

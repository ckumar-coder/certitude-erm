#!/usr/bin/env bash
#
# setup-uptime.sh — configure GCP Uptime Checks + email alerting for production.
#
# Run ONCE from the repo root after the production service is live.
#
# Creates:
#   - An email notification channel → c.kumar@certitude-advisory.ca
#   - An HTTPS uptime check on /api/health every 60 s from 3 GCP regions
#   - An alerting policy that fires after 2 consecutive failures (≥ 2 min down)
#     and re-alerts at most once per hour
#
# Prerequisites:
#   - gcloud CLI authenticated (gcloud auth login)
#   - Monitoring Admin + Notification Channel Editor on certitude-grc
#
# Usage:
#   chmod +x setup-uptime.sh
#   ./setup-uptime.sh
#

set -euo pipefail

PROJECT_ID=certitude-grc
REGION=northamerica-northeast1
ALERT_EMAIL=c.kumar@certitude-advisory.ca
PROD_HOST=grc-app-i7277bhvma-nn.a.run.app
HEALTH_PATH=/api/health

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║   GRC Workstation — Uptime Check + Alerting Setup        ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo "  Project:  ${PROJECT_ID}"
echo "  Alert to: ${ALERT_EMAIL}"
echo "  URL:      https://${PROD_HOST}${HEALTH_PATH}"
echo ""

# ── Step 1: Email notification channel ────────────────────────────────────────
echo "── Step 1: Create email notification channel ──"
echo ""

CHANNEL_RESOURCE=$(gcloud beta monitoring channels create \
    --project="${PROJECT_ID}" \
    --display-name="GRC Workstation Alerts — Chandrashekar Kumar" \
    --type=email \
    --channel-labels="email_address=${ALERT_EMAIL}" \
    --format='value(name)')

echo "✔ Notification channel: ${CHANNEL_RESOURCE}"
echo ""

# ── Step 2: Uptime check (via Monitoring REST API — most reliable) ─────────────
echo "── Step 2: Create uptime check (every 60 s, 3 regions) ──"
echo ""

ACCESS_TOKEN=$(gcloud auth print-access-token)

UPTIME_RESPONSE=$(curl -s -X POST \
    "https://monitoring.googleapis.com/v3/projects/${PROJECT_ID}/uptimeCheckConfigs" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{
      \"displayName\": \"GRC Workstation — Production Health\",
      \"httpCheck\": {
        \"path\": \"${HEALTH_PATH}\",
        \"port\": 443,
        \"useSsl\": true,
        \"validateSsl\": true,
        \"requestMethod\": \"GET\"
      },
      \"monitoredResource\": {
        \"type\": \"uptime_url\",
        \"labels\": {
          \"project_id\": \"${PROJECT_ID}\",
          \"host\": \"${PROD_HOST}\"
        }
      },
      \"period\": \"60s\",
      \"timeout\": \"10s\",
      \"selectedRegions\": [\"USA_OREGON\", \"EUROPE_WEST\", \"ASIA_PACIFIC\"]
    }")

# Extract the short check ID from the name field (projects/.../uptimeCheckConfigs/ID)
CHECK_ID=$(echo "${UPTIME_RESPONSE}" | python3 -c \
    "import sys,json; r=json.load(sys.stdin); print(r['name'].split('/')[-1])")

if [[ -z "${CHECK_ID}" ]]; then
    echo "❌ Failed to create uptime check. Response:"
    echo "${UPTIME_RESPONSE}"
    exit 1
fi

echo "✔ Uptime check ID: ${CHECK_ID}"
echo ""

# ── Step 3: Alerting policy ────────────────────────────────────────────────────
echo "── Step 3: Create alerting policy ──"
echo ""

POLICY_FILE=$(mktemp /tmp/grc-uptime-policy-XXXXXX.json)

cat > "${POLICY_FILE}" << POLICY
{
  "displayName": "GRC Workstation — Production Uptime Alert",
  "conditions": [
    {
      "displayName": "Production /api/health failing",
      "conditionThreshold": {
        "filter": "resource.type = \"uptime_url\" AND metric.type = \"monitoring.googleapis.com/uptime_check/check_passed\" AND metric.labels.check_id = \"${CHECK_ID}\"",
        "comparison": "COMPARISON_LT",
        "thresholdValue": 1,
        "duration": "120s",
        "trigger": { "count": 1 },
        "aggregations": [
          {
            "alignmentPeriod": "60s",
            "crossSeriesReducer": "REDUCE_FRACTION_TRUE",
            "groupByFields": ["resource.label.check_id"],
            "perSeriesAligner": "ALIGN_NEXT_OLDER"
          }
        ]
      }
    }
  ],
  "combiner": "OR",
  "enabled": true,
  "notificationChannels": ["${CHANNEL_RESOURCE}"],
  "alertStrategy": {
    "notificationRateLimit": { "period": "3600s" },
    "autoClose": "604800s"
  },
  "documentation": {
    "content": "## GRC Workstation — Production Down\n\nThe health check at https://${PROD_HOST}${HEALTH_PATH} has been failing for at least 2 minutes.\n\n**Immediate steps:**\n1. Check Cloud Run service: https://console.cloud.google.com/run/detail/${REGION}/grc-app/revisions?project=${PROJECT_ID}\n2. Check Cloud SQL instance: https://console.cloud.google.com/sql/instances?project=${PROJECT_ID}\n3. Review recent deploys — roll back with: `gcloud run services update-traffic grc-app --to-revisions=PREV=100 --region=${REGION} --project=${PROJECT_ID}`\n\nHealth endpoint should return: `{\"status\":\"ok\",\"db\":\"ok\"}`",
    "mimeType": "text/markdown"
  }
}
POLICY

POLICY_RESOURCE=$(gcloud alpha monitoring policies create \
    --project="${PROJECT_ID}" \
    --policy-from-file="${POLICY_FILE}" \
    --format='value(name)')

rm -f "${POLICY_FILE}"

echo "✔ Alerting policy: ${POLICY_RESOURCE}"
echo ""

# ── Done ───────────────────────────────────────────────────────────────────────
echo "╔══════════════════════════════════════════════════════════╗"
echo "║   Uptime monitoring is live                               ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "  Check interval:  every 60 s from USA, Europe, Asia-Pacific"
echo "  Alert triggers:  2 consecutive failures (≥ 2 min down)"
echo "  Alert sends to:  ${ALERT_EMAIL}"
echo "  Re-alert period: at most once per hour"
echo "  Auto-closes:     7 days after condition clears"
echo ""
echo "  ⚠  Check your inbox — Google will send a verification email"
echo "     to confirm the notification channel. Click the link to"
echo "     activate alerts before they can fire."
echo ""
echo "  View uptime checks:"
echo "  https://console.cloud.google.com/monitoring/uptime?project=${PROJECT_ID}"
echo ""
echo "  View alerting policies:"
echo "  https://console.cloud.google.com/monitoring/alerting?project=${PROJECT_ID}"
echo ""

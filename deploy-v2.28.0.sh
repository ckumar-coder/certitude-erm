#!/bin/bash
set -e
cd "$(dirname "$0")"

echo ""
echo "================================================="
echo "  Deploying v2.28.0 to Qatar Post"
echo "================================================="
echo ""

echo ">>> Step 1: Schema migration (incident_log table)"
PROJECT_ID=certitude-grc bash deploy/migrate-qatar-post-demo.sh schema

echo ""
echo ">>> Step 2: Build and deploy (backend + frontend)"
PROJECT_ID=certitude-grc bash deploy/deploy-qatar-post-demo.sh

echo ""
echo ">>> Step 3: Commit and push to GitHub"
git add -A
git commit -m "v2.28.0 — 12-bug batch + risk detail redesign: sectioned card layout matching create form style"
git push

echo ""
echo "================================================="
echo "  v2.28.0 deployed successfully!"
echo "================================================="

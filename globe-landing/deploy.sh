#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────
# Globe Landing — Deploy to S3 + CloudFront
#
# Usage:
#   ./deploy.sh              # deploy to globepower.cl (default)
#   ./deploy.sh globepower   # deploy to globepower.cl
#   ./deploy.sh energymonitor # deploy to energymonitor.click/landing/
#   ./deploy.sh both         # deploy to both
# ─────────────────────────────────────────────────────────

TARGET="${1:-globepower}"

# ── Config ──
GLOBEPOWER_BUCKET="globe-landing-grupoglobe"
GLOBEPOWER_CF="E1BXDUUMOYADWG"
GLOBEPOWER_PREFIX=""
GLOBEPOWER_PATH="/*"
GLOBEPOWER_URL="https://globepower.cl"

ENERGYMONITOR_BUCKET="globe-landing-hoktus"
ENERGYMONITOR_CF="ECR03RA6F872Q"
ENERGYMONITOR_PREFIX="landing/"
ENERGYMONITOR_PATH="/landing/*"
ENERGYMONITOR_URL="https://energymonitor.click/landing/"

cd "$(dirname "$0")"

# ── Build ──
echo "→ Installing dependencies..."
npm ci --silent

echo "→ Building..."
npm run build

echo "→ Build complete ($(du -sh dist | awk '{print $1}'))"
echo ""

deploy_target() {
  local name="$1" bucket="$2" cf_id="$3" prefix="$4" cf_path="$5" url="$6"

  echo "═══ Deploying to $name ═══"

  # Sync to S3
  echo "  → Syncing to s3://$bucket/$prefix ..."
  aws s3 sync dist/ "s3://$bucket/$prefix" \
    --delete \
    --cache-control "public, max-age=31536000, immutable" \
    --exclude "index.html" \
    --region us-east-1

  # index.html with no-cache (so CloudFront always fetches latest)
  aws s3 cp dist/index.html "s3://$bucket/${prefix}index.html" \
    --cache-control "no-cache, no-store, must-revalidate" \
    --content-type "text/html" \
    --region us-east-1

  # Invalidate CloudFront
  echo "  → Invalidating CloudFront $cf_id ($cf_path)..."
  INVALIDATION_ID=$(aws cloudfront create-invalidation \
    --distribution-id "$cf_id" \
    --paths "$cf_path" \
    --query 'Invalidation.Id' \
    --output text \
    --region us-east-1)

  echo "  → Invalidation: $INVALIDATION_ID"

  # Verify
  echo "  → Verifying $url ..."
  sleep 3
  HTTP_STATUS=$(curl -sI -o /dev/null -w '%{http_code}' "$url" || echo "000")
  if [ "$HTTP_STATUS" = "200" ]; then
    echo "  ✓ $name OK (HTTP $HTTP_STATUS)"
  else
    echo "  ⚠ $name returned HTTP $HTTP_STATUS (may need 1-2 min for invalidation)"
  fi
  echo ""
}

case "$TARGET" in
  globepower)
    deploy_target "globepower.cl" "$GLOBEPOWER_BUCKET" "$GLOBEPOWER_CF" "$GLOBEPOWER_PREFIX" "$GLOBEPOWER_PATH" "$GLOBEPOWER_URL"
    ;;
  energymonitor)
    deploy_target "energymonitor.click" "$ENERGYMONITOR_BUCKET" "$ENERGYMONITOR_CF" "$ENERGYMONITOR_PREFIX" "$ENERGYMONITOR_PATH" "$ENERGYMONITOR_URL"
    ;;
  both)
    deploy_target "globepower.cl" "$GLOBEPOWER_BUCKET" "$GLOBEPOWER_CF" "$GLOBEPOWER_PREFIX" "$GLOBEPOWER_PATH" "$GLOBEPOWER_URL"
    deploy_target "energymonitor.click" "$ENERGYMONITOR_BUCKET" "$ENERGYMONITOR_CF" "$ENERGYMONITOR_PREFIX" "$ENERGYMONITOR_PATH" "$ENERGYMONITOR_URL"
    ;;
  *)
    echo "Usage: ./deploy.sh [globepower|energymonitor|both]"
    exit 1
    ;;
esac

echo "Done."

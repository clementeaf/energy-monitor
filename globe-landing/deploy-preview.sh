#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────
# Globe Landing — Deploy PREVIEW to a temporary S3 + CloudFront
#
# Creates a new S3 bucket + CloudFront distribution for preview.
# Does NOT touch the production bucket/CF (globepower.cl).
#
# Usage:
#   ./deploy-preview.sh           # create infra + deploy
#   ./deploy-preview.sh update    # just re-deploy (infra already exists)
#   ./deploy-preview.sh destroy   # tear down preview infra
# ─────────────────────────────────────────────────────────

BUCKET="globe-landing-preview-$(whoami)"
REGION="us-east-1"
ACTION="${1:-deploy}"

cd "$(dirname "$0")"

# ── Helpers ──
bucket_exists() {
  aws s3api head-bucket --bucket "$BUCKET" --region "$REGION" 2>/dev/null
}

get_cf_id() {
  aws cloudfront list-distributions \
    --query "DistributionList.Items[?Origins.Items[0].DomainName=='${BUCKET}.s3.amazonaws.com'].Id | [0]" \
    --output text --region "$REGION" 2>/dev/null || echo ""
}

# ── Destroy ──
if [ "$ACTION" = "destroy" ]; then
  echo "→ Destroying preview infra..."
  CF_ID=$(get_cf_id)
  if [ -n "$CF_ID" ] && [ "$CF_ID" != "None" ]; then
    echo "  → Disabling CloudFront $CF_ID..."
    ETAG=$(aws cloudfront get-distribution-config --id "$CF_ID" --query 'ETag' --output text --region "$REGION")
    aws cloudfront get-distribution-config --id "$CF_ID" --output json --region "$REGION" \
      | jq '.DistributionConfig.Enabled = false | .DistributionConfig' \
      > /tmp/cf-disable.json
    aws cloudfront update-distribution --id "$CF_ID" --if-match "$ETAG" \
      --distribution-config file:///tmp/cf-disable.json --region "$REGION" > /dev/null
    echo "  → Waiting for CF to disable (this takes a few minutes)..."
    aws cloudfront wait distribution-deployed --id "$CF_ID" --region "$REGION" 2>/dev/null || true
    ETAG=$(aws cloudfront get-distribution-config --id "$CF_ID" --query 'ETag' --output text --region "$REGION")
    aws cloudfront delete-distribution --id "$CF_ID" --if-match "$ETAG" --region "$REGION" 2>/dev/null || echo "  ⚠ CF delete may need manual cleanup"
  fi
  if bucket_exists; then
    echo "  → Emptying and deleting bucket $BUCKET..."
    aws s3 rm "s3://$BUCKET" --recursive --region "$REGION"
    aws s3api delete-bucket --bucket "$BUCKET" --region "$REGION"
  fi
  echo "Done. Preview infra destroyed."
  exit 0
fi

# ── Build ──
echo "→ Building..."
npm ci --silent
npm run build
echo "→ Build complete ($(du -sh dist | awk '{print $1}'))"
echo ""

# ── Create bucket if needed ──
if ! bucket_exists; then
  echo "→ Creating S3 bucket: $BUCKET"
  aws s3api create-bucket --bucket "$BUCKET" --region "$REGION"
  # Block public access (CF will access via OAC)
  aws s3api put-public-access-block --bucket "$BUCKET" --region "$REGION" \
    --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
fi

# ── Sync files ──
echo "→ Syncing to s3://$BUCKET/ ..."
aws s3 sync dist/ "s3://$BUCKET/" \
  --delete \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "index.html" \
  --region "$REGION"

aws s3 cp dist/index.html "s3://$BUCKET/index.html" \
  --cache-control "no-cache, no-store, must-revalidate" \
  --content-type "text/html" \
  --region "$REGION"

# ── Create CloudFront if needed ──
CF_ID=$(get_cf_id)
if [ -z "$CF_ID" ] || [ "$CF_ID" = "None" ]; then
  echo "→ Creating CloudFront distribution..."
  CF_ID=$(aws cloudfront create-distribution \
    --origin-domain-name "${BUCKET}.s3.amazonaws.com" \
    --default-root-object index.html \
    --query 'Distribution.Id' \
    --output text \
    --region "$REGION")
  echo "  → Distribution created: $CF_ID"
  echo "  → Waiting for deployment (2-5 min)..."
  aws cloudfront wait distribution-deployed --id "$CF_ID" --region "$REGION" 2>/dev/null || true
else
  echo "→ CloudFront exists: $CF_ID — invalidating..."
  aws cloudfront create-invalidation \
    --distribution-id "$CF_ID" \
    --paths "/*" \
    --region "$REGION" > /dev/null
fi

# ── Get URL ──
CF_DOMAIN=$(aws cloudfront get-distribution --id "$CF_ID" \
  --query 'Distribution.DomainName' --output text --region "$REGION")

echo ""
echo "═══════════════════════════════════════"
echo "  Preview URL: https://$CF_DOMAIN"
echo "  Bucket:      $BUCKET"
echo "  CF ID:       $CF_ID"
echo "═══════════════════════════════════════"
echo ""
echo "To update:   ./deploy-preview.sh update"
echo "To destroy:  ./deploy-preview.sh destroy"

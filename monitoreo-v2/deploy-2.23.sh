#!/bin/bash
# =============================================================================
# Deploy monitoreo-v2 v2.23.0 — Map view + Parque Arauco malls
#
# Steps:
#   1. Apply migrations 50–53 via ECS Exec
#   2. Build + push backend Docker image to ECR
#   3. Update ECS service (force new deployment)
#   4. Build + deploy frontend to S3 + invalidate CloudFront
#   5. Seed mapvx data (malls, stores, tiles, markers) via ECS Exec
#   6. Verify health
#
# Usage:
#   cd monitoreo-v2
#   ./deploy-2.23.sh              # full deploy
#   ./deploy-2.23.sh --skip-seed  # skip mapvx seed (if already done)
# =============================================================================
set -euo pipefail

REGION="us-east-1"
ACCOUNT_ID="058310292956"
ECR_REPO="monitoreo-v2-backend"
ECR_URI="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${ECR_REPO}"
ECS_CLUSTER="monitoreo-v2"
ECS_SERVICE="monitoreo-v2-backend-restored"
TASK_FAMILY="monitoreo-v2-backend"
S3_BUCKET="power-monitor-frontend"
CF_DIST_ID="E1SNFETXON2VSI"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

SKIP_SEED=false
[[ "${1:-}" == "--skip-seed" ]] && SKIP_SEED=true

echo "=========================================="
echo "Deploy v2.23.0 — $(date)"
echo "=========================================="

# ── Step 1: Migrations 50–53 ──
echo ""
echo "[1/6] Applying migrations 50–53 via ECS Exec..."
cd "$PROJECT_ROOT/backend"
bash scripts/apply-prod-migrations-2.23.sh

# ── Step 2: Build and push Docker image ──
echo ""
echo "[2/6] Building and pushing Docker image..."
cd "$PROJECT_ROOT/backend"

aws ecr get-login-password --region "$REGION" | \
  docker login --username AWS --password-stdin "${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"

DOCKER_TAG="map-arauco-$(date +%Y%m%d-%H%M%S)"
docker build --platform linux/amd64 -t "${ECR_URI}:${DOCKER_TAG}" -t "${ECR_URI}:latest" .

docker push "${ECR_URI}:${DOCKER_TAG}"
docker push "${ECR_URI}:latest"
echo "    Image: ${ECR_URI}:${DOCKER_TAG}"

# ── Step 3: Update ECS service ──
echo ""
echo "[3/6] Updating ECS service (force new deployment)..."
aws ecs update-service \
  --cluster "$ECS_CLUSTER" \
  --service "$ECS_SERVICE" \
  --force-new-deployment \
  --region "$REGION" \
  --query 'service.deployments[0].{status:status,desired:desiredCount,running:runningCount}' \
  --output table

echo "    Waiting for service to stabilize..."
aws ecs wait services-stable \
  --cluster "$ECS_CLUSTER" \
  --services "$ECS_SERVICE" \
  --region "$REGION" 2>&1 || echo "    WARNING: Service did not stabilize within timeout"

# ── Step 4: Build and deploy frontend ──
echo ""
echo "[4/6] Building and deploying frontend..."
cd "$PROJECT_ROOT/frontend"

VITE_MICROSOFT_CLIENT_ID="8edc85d3-0952-4222-8a3f-54e503042c30" \
VITE_MICROSOFT_TENANT_ID="ab1064b9-4d50-4651-a4cb-c04d2642b18c" \
VITE_GOOGLE_CLIENT_ID="420852401159-iv8trudae3p77cbgcgagc0pbllkbcag4.apps.googleusercontent.com" \
VITE_AUTH_MODE="microsoft" \
npm run build

aws s3 sync dist/ "s3://${S3_BUCKET}/" \
  --cache-control "public,max-age=31536000,immutable" \
  --exclude "index.html" \
  --exclude "*.json" \
  --region "$REGION"

aws s3 cp dist/index.html "s3://${S3_BUCKET}/index.html" \
  --cache-control "no-cache,no-store,must-revalidate" \
  --region "$REGION"

aws cloudfront create-invalidation \
  --distribution-id "$CF_DIST_ID" \
  --paths "/index.html" "/*" \
  --region "$REGION" \
  --query 'Invalidation.{Id:Id,Status:Status}' \
  --output table

echo "    Frontend deployed to s3://${S3_BUCKET}/"

# ── Step 5: Seed mapvx data via ECS Exec ──
if [ "$SKIP_SEED" = false ]; then
  echo ""
  echo "[5/6] Seeding mapvx data via ECS Exec..."
  cd "$PROJECT_ROOT/backend"
  node scripts/seed-mapvx-ecs.mjs
else
  echo ""
  echo "[5/6] Skipping seed (--skip-seed)"
fi

# ── Step 6: Verify ──
echo ""
echo "[6/6] Verifying deployment..."
sleep 10

HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "https://power-monitor.cloud/api/health" || echo "000")
echo "    Backend health: HTTP $HEALTH"

AUTH=$(curl -s -o /dev/null -w "%{http_code}" "https://power-monitor.cloud/api/auth/me" || echo "000")
echo "    Auth endpoint:  HTTP $AUTH (expected 401)"

FE=$(curl -s -o /dev/null -w "%{http_code}" "https://power-monitor.cloud/" || echo "000")
echo "    Frontend:       HTTP $FE"

MALLS=$(curl -s -o /dev/null -w "%{http_code}" "https://power-monitor.cloud/api/mapvx/malls" || echo "000")
echo "    MapVX malls:    HTTP $MALLS"

echo ""
echo "=========================================="
echo "Deploy completed at $(date)"
echo "=========================================="

if [ "$HEALTH" = "200" ] && [ "$AUTH" = "401" ] && [ "$FE" = "200" ]; then
  echo "All checks PASSED"
else
  echo "Some checks failed — review above"
fi

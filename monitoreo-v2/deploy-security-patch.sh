#!/bin/bash
# =============================================================================
# Security Patch Deploy — monitoreo-v2
# Scheduled for 2026-04-28 03:00 CLT
#
# Actions:
#   1. Rotate JWT_SECRET + COOKIE_SECRET in ECS task definition
#   2. Build + push backend Docker image to ECR
#   3. Update ECS service (forces new deployment with new secrets)
#   4. Build + deploy frontend to S3 + invalidate CloudFront
#   5. Verify health
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
PROJECT_ROOT="/Users/clementefalcone/Desktop/hoktus/energy-monitor/monitoreo-v2"
LOG_FILE="${PROJECT_ROOT}/deploy-security-patch.log"

# Redirect all output to log
exec > >(tee -a "$LOG_FILE") 2>&1

echo "=========================================="
echo "Security Patch Deploy — $(date)"
echo "=========================================="

# ── Step 0: Generate new secrets ──
NEW_JWT_SECRET=$(openssl rand -hex 32)
NEW_COOKIE_SECRET=$(openssl rand -hex 32)
echo "[0/5] Secrets generated (not logged for security)"

# ── Step 1: Get current task definition and update secrets ──
echo "[1/5] Updating ECS task definition with rotated secrets..."

# Get current task definition
CURRENT_TD=$(aws ecs describe-task-definition \
  --task-definition "$TASK_FAMILY" \
  --region "$REGION" \
  --query 'taskDefinition' \
  --output json)

# Extract container definitions and replace secrets
CONTAINER_DEFS=$(echo "$CURRENT_TD" | python3 -c "
import json, sys
td = json.load(sys.stdin)
containers = td['containerDefinitions']
for c in containers:
    for env in c.get('environment', []):
        if env['name'] == 'JWT_SECRET':
            env['value'] = '${NEW_JWT_SECRET}'
        elif env['name'] == 'COOKIE_SECRET':
            env['value'] = '${NEW_COOKIE_SECRET}'
print(json.dumps(containers))
")

# Get other required fields
TASK_ROLE=$(echo "$CURRENT_TD" | python3 -c "import json,sys; td=json.load(sys.stdin); print(td.get('taskRoleArn',''))")
EXEC_ROLE=$(echo "$CURRENT_TD" | python3 -c "import json,sys; td=json.load(sys.stdin); print(td.get('executionRoleArn',''))")
NETWORK_MODE=$(echo "$CURRENT_TD" | python3 -c "import json,sys; td=json.load(sys.stdin); print(td.get('networkMode','awsvpc'))")
CPU=$(echo "$CURRENT_TD" | python3 -c "import json,sys; td=json.load(sys.stdin); print(td.get('cpu','256'))")
MEMORY=$(echo "$CURRENT_TD" | python3 -c "import json,sys; td=json.load(sys.stdin); print(td.get('memory','512'))")
COMPAT=$(echo "$CURRENT_TD" | python3 -c "import json,sys; td=json.load(sys.stdin); print(td.get('requiresCompatibilities',['FARGATE'])[0])")

# Register new task definition
NEW_TD_ARN=$(aws ecs register-task-definition \
  --family "$TASK_FAMILY" \
  --container-definitions "$CONTAINER_DEFS" \
  --task-role-arn "$TASK_ROLE" \
  --execution-role-arn "$EXEC_ROLE" \
  --network-mode "$NETWORK_MODE" \
  --cpu "$CPU" \
  --memory "$MEMORY" \
  --requires-compatibilities "$COMPAT" \
  --region "$REGION" \
  --query 'taskDefinition.taskDefinitionArn' \
  --output text)

echo "    New task definition: $NEW_TD_ARN"

# ── Step 2: Build and push Docker image ──
echo "[2/5] Building and pushing Docker image..."
cd "$PROJECT_ROOT/backend"

# Login to ECR
aws ecr get-login-password --region "$REGION" | \
  docker login --username AWS --password-stdin "${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"

# Build for amd64 (Fargate)
DOCKER_TAG="security-patch-$(date +%Y%m%d-%H%M%S)"
docker build --platform linux/amd64 -t "${ECR_URI}:${DOCKER_TAG}" -t "${ECR_URI}:latest" .

# Push both tags
docker push "${ECR_URI}:${DOCKER_TAG}"
docker push "${ECR_URI}:latest"
echo "    Image pushed: ${ECR_URI}:${DOCKER_TAG}"

# ── Step 3: Update ECS service with new task definition ──
echo "[3/5] Updating ECS service (force new deployment)..."
aws ecs update-service \
  --cluster "$ECS_CLUSTER" \
  --service "$ECS_SERVICE" \
  --task-definition "$NEW_TD_ARN" \
  --force-new-deployment \
  --region "$REGION" \
  --query 'service.deployments[0].{status:status,desired:desiredCount,running:runningCount}' \
  --output table

# Wait for service to stabilize (max 10 minutes)
echo "    Waiting for service to stabilize..."
aws ecs wait services-stable \
  --cluster "$ECS_CLUSTER" \
  --services "$ECS_SERVICE" \
  --region "$REGION" 2>&1 || echo "    WARNING: Service did not stabilize within timeout. Check manually."

# ── Step 4: Build and deploy frontend ──
echo "[4/5] Building and deploying frontend..."
cd "$PROJECT_ROOT/frontend"

# Build with prod env vars
VITE_MICROSOFT_CLIENT_ID="8edc85d3-0952-4222-8a3f-54e503042c30" \
VITE_MICROSOFT_TENANT_ID="ab1064b9-4d50-4651-a4cb-c04d2642b18c" \
VITE_GOOGLE_CLIENT_ID="420852401159-iv8trudae3p77cbgcgagc0pbllkbcag4.apps.googleusercontent.com" \
VITE_AUTH_MODE="microsoft" \
npm run build

# Sync to S3 (assets with long cache, index.html with no-cache)
aws s3 sync dist/ "s3://${S3_BUCKET}/" \
  --delete \
  --cache-control "public,max-age=31536000,immutable" \
  --exclude "index.html" \
  --exclude "*.json" \
  --region "$REGION"

aws s3 cp dist/index.html "s3://${S3_BUCKET}/index.html" \
  --cache-control "no-cache,no-store,must-revalidate" \
  --region "$REGION"

# Invalidate CloudFront
aws cloudfront create-invalidation \
  --distribution-id "$CF_DIST_ID" \
  --paths "/index.html" "/*" \
  --region "$REGION" \
  --query 'Invalidation.{Id:Id,Status:Status}' \
  --output table

echo "    Frontend deployed to s3://${S3_BUCKET}/"

# ── Step 5: Verify ──
echo "[5/5] Verifying deployment..."
sleep 10

# Backend health
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "https://power-monitor.cloud/api/health" || echo "000")
echo "    Backend health: HTTP $HEALTH"

# Auth endpoint (should be 401 = running correctly)
AUTH=$(curl -s -o /dev/null -w "%{http_code}" "https://power-monitor.cloud/api/auth/me" || echo "000")
echo "    Auth endpoint:  HTTP $AUTH (expected 401)"

# Frontend
FE=$(curl -s -o /dev/null -w "%{http_code}" "https://power-monitor.cloud/" || echo "000")
echo "    Frontend:       HTTP $FE"

# Swagger should NOT be accessible in prod
SWAGGER=$(curl -s -o /dev/null -w "%{http_code}" "https://power-monitor.cloud/api/docs" || echo "000")
echo "    Swagger (should be 404): HTTP $SWAGGER"

echo ""
echo "=========================================="
echo "Deploy completed at $(date)"
echo "=========================================="

if [ "$HEALTH" = "200" ] && [ "$AUTH" = "401" ] && [ "$FE" = "200" ]; then
  echo "✅ All checks PASSED"
else
  echo "⚠️  Some checks failed — review above"
fi

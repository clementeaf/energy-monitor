#!/usr/bin/env bash
set -euo pipefail

: "${AWS_PROFILE:?AWS_PROFILE required (target account profile)}"
: "${MICROSOFT_TENANT_ID:?MICROSOFT_TENANT_ID required}"
: "${MICROSOFT_CLIENT_ID:?MICROSOFT_CLIENT_ID required}"
: "${GOOGLE_CLIENT_ID:?GOOGLE_CLIENT_ID required}"

export AWS_REGION="${AWS_REGION:-us-east-1}"
export AWS_DEFAULT_REGION="$AWS_REGION"
STACK_NAME="${STACK_NAME:-monitoreo-v2}"
DOMAIN_NAME="${DOMAIN_NAME:-}"
if [ -n "$DOMAIN_NAME" ] && [ "$AWS_REGION" != us-east-1 ]; then
  echo "DOMAIN_NAME requires AWS_REGION=us-east-1 (CloudFront certificate), got $AWS_REGION" >&2
  exit 1
fi
HOSTED_ZONE_ID="${HOSTED_ZONE_ID:-}"
SES_FROM_EMAIL="${SES_FROM_EMAIL:-}"
PROJECT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
BUILD_DIR="$(mktemp -d)"
trap 'rm -rf "$BUILD_DIR"' EXIT

ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
ARTIFACTS_BUCKET="${STACK_NAME}-artifacts-${ACCOUNT_ID}"

stack_output() {
  aws cloudformation describe-stacks --stack-name "$STACK_NAME" \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text
}

ensure_artifacts_bucket() {
  if aws s3api head-bucket --bucket "$ARTIFACTS_BUCKET" 2>/dev/null; then return; fi
  echo "==> creating artifacts bucket $ARTIFACTS_BUCKET"
  aws s3 mb "s3://$ARTIFACTS_BUCKET" >/dev/null
  aws s3api put-public-access-block --bucket "$ARTIFACTS_BUCKET" \
    --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
}

package_backend() {
  echo "==> building backend" >&2
  (cd "$PROJECT_DIR/backend" && npm ci --silent && npm run build --silent && node esbuild-lambda.mjs) >&2
  (cd "$PROJECT_DIR/backend/dist-lambda" && zip -q "$BUILD_DIR/lambda.zip" lambda.js lambda.js.map)
  (cd "$PROJECT_DIR/backend" && zip -q -r "$BUILD_DIR/lambda.zip" certs)
  local code_key
  code_key="lambda/$(shasum -a 256 "$BUILD_DIR/lambda.zip" | cut -c1-16).zip"
  aws s3 cp --quiet "$BUILD_DIR/lambda.zip" "s3://$ARTIFACTS_BUCKET/$code_key"
  echo "$code_key"
}

deploy_stack() {
  echo "==> deploying stack $STACK_NAME (first run takes ~15 min: RDS + CloudFront)"
  aws cloudformation deploy \
    --stack-name "$STACK_NAME" \
    --template-file "$PROJECT_DIR/infra/aws/stack.yml" \
    --capabilities CAPABILITY_IAM \
    --no-fail-on-empty-changeset \
    --parameter-overrides \
      CodeBucket="$ARTIFACTS_BUCKET" \
      CodeKey="$1" \
      DomainName="$DOMAIN_NAME" \
      HostedZoneId="$HOSTED_ZONE_ID" \
      DbInstanceClass="${DB_INSTANCE_CLASS:-db.t4g.small}" \
      DbBackupRetentionDays="${DB_BACKUP_RETENTION_DAYS:-7}" \
      MicrosoftTenantId="$MICROSOFT_TENANT_ID" \
      MicrosoftClientId="$MICROSOFT_CLIENT_ID" \
      GoogleClientId="$GOOGLE_CLIENT_ID" \
      SesFromEmail="$SES_FROM_EMAIL"
}

bootstrap_database_if_empty() {
  export PGHOST PGPASSWORD PGUSER=emadmin PGDATABASE=monitoreo_v2 PGSSLMODE=require
  PGHOST="$(stack_output DbEndpoint)"
  PGPASSWORD="$(aws secretsmanager get-secret-value --secret-id "$(stack_output DbPasswordSecretArn)" --query SecretString --output text)"
  if [ "$(psql -X -tA -c "SELECT to_regclass('public.tenants') IS NOT NULL")" = "t" ]; then
    echo "==> database already bootstrapped"
    return
  fi
  echo "==> bootstrapping empty database"
  "$PROJECT_DIR/database/rds/bootstrap.sh"
}

deploy_frontend() {
  local site_url="$1"
  echo "==> building frontend for $site_url"
  (cd "$PROJECT_DIR/frontend" && npm ci --silent && \
    VITE_API_BASE_URL=/api \
    VITE_MICROSOFT_CLIENT_ID="$MICROSOFT_CLIENT_ID" \
    VITE_MICROSOFT_TENANT_ID="$MICROSOFT_TENANT_ID" \
    VITE_MICROSOFT_REDIRECT_URI="$site_url" \
    VITE_GOOGLE_CLIENT_ID="$GOOGLE_CLIENT_ID" \
    npm run build --silent)
  aws s3 sync "$PROJECT_DIR/frontend/dist/" "s3://$(stack_output FrontendBucketName)/" --exclude "docs/*" --only-show-errors
  aws cloudfront create-invalidation --distribution-id "$(stack_output DistributionId)" --paths "/*" >/dev/null
}

ensure_artifacts_bucket
deploy_stack "$(package_backend)"
bootstrap_database_if_empty
SITE_URL="$(stack_output SiteUrl)"
deploy_frontend "$SITE_URL"

echo "==> smoke test"
curl -fsS "$SITE_URL/api/health"
echo
echo "==> done: $SITE_URL"

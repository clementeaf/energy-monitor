#!/usr/bin/env bash
# Deploy billing-pdf-generator Lambda (Python 3.12)
# Usage: ./deploy.sh [create|update]
set -euo pipefail

FUNCTION_NAME="billing-pdf-generator"
RUNTIME="python3.12"
HANDLER="handler.handler"
MEMORY=512
TIMEOUT=30
REGION="us-east-1"
ROLE_ARN="${LAMBDA_ROLE_ARN:?Set LAMBDA_ROLE_ARN env var}"

# VPC config (same as Node lambdas)
VPC_SUBNET_IDS="${VPC_SUBNET_ID_1},${VPC_SUBNET_ID_2},${VPC_SUBNET_ID_3}"
VPC_SG_IDS="${VPC_SECURITY_GROUP_ID}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BUILD_DIR="$SCRIPT_DIR/.build"
ZIP_FILE="$SCRIPT_DIR/function.zip"

echo "==> Building deployment package..."
rm -rf "$BUILD_DIR" "$ZIP_FILE"
mkdir -p "$BUILD_DIR"

# Install deps using Docker for Linux compatibility
docker run --rm -v "$BUILD_DIR":/out -v "$SCRIPT_DIR":/src \
  public.ecr.aws/lambda/python:3.12 \
  bash -c "pip install -r /src/requirements.txt -t /out && cp /src/handler.py /out/"

# Create zip
cd "$BUILD_DIR"
zip -r9 "$ZIP_FILE" .
cd "$SCRIPT_DIR"
rm -rf "$BUILD_DIR"

echo "==> Package size: $(du -h "$ZIP_FILE" | cut -f1)"

ACTION="${1:-update}"

if [ "$ACTION" = "create" ]; then
  echo "==> Creating Lambda function: $FUNCTION_NAME"
  aws lambda create-function \
    --function-name "$FUNCTION_NAME" \
    --runtime "$RUNTIME" \
    --handler "$HANDLER" \
    --memory-size "$MEMORY" \
    --timeout "$TIMEOUT" \
    --role "$ROLE_ARN" \
    --zip-file "fileb://$ZIP_FILE" \
    --vpc-config "SubnetIds=$VPC_SUBNET_IDS,SecurityGroupIds=$VPC_SG_IDS" \
    --environment "Variables={DB_HOST=${DB_HOST},DB_PORT=${DB_PORT:-5432},DB_NAME=${DB_NAME},DB_USERNAME=${DB_USERNAME},DB_PASSWORD=${DB_PASSWORD}}" \
    --region "$REGION"
else
  echo "==> Updating Lambda function: $FUNCTION_NAME"
  aws lambda update-function-code \
    --function-name "$FUNCTION_NAME" \
    --zip-file "fileb://$ZIP_FILE" \
    --region "$REGION"
fi

echo "==> Done. Test with:"
echo "aws lambda invoke --function-name $FUNCTION_NAME --payload '{\"storeName\":\"LOC-39\",\"buildingName\":\"Parque Arauco Kennedy\",\"month\":\"2025-02-01\"}' /tmp/pdf-response.json --region $REGION"

rm -f "$ZIP_FILE"

#!/bin/bash
set -e

FUNCTION_NAME="backfill-vcf"
DIR="$(cd "$(dirname "$0")" && pwd)"
ZIP="/tmp/${FUNCTION_NAME}.zip"

echo "Packaging..."
cd "$DIR"
rm -f "$ZIP"
zip -r "$ZIP" handler.mjs node_modules/ package.json -q

# Check if function exists
if aws lambda get-function --function-name "$FUNCTION_NAME" &>/dev/null; then
  echo "Updating code..."
  aws lambda update-function-code --function-name "$FUNCTION_NAME" --zip-file "fileb://$ZIP" --query 'LastModified' --output text
else
  echo "Creating function..."
  # Get VPC config from existing function
  VPC_CONFIG=$(aws lambda get-function-configuration --function-name power-digital-api-dev-api \
    --query 'VpcConfig.{SubnetIds:SubnetIds,SecurityGroupIds:SecurityGroupIds}' --output json)

  ROLE=$(aws lambda get-function-configuration --function-name power-digital-api-dev-api \
    --query 'Role' --output text)

  aws lambda create-function \
    --function-name "$FUNCTION_NAME" \
    --runtime nodejs20.x \
    --handler handler.handler \
    --role "$ROLE" \
    --zip-file "fileb://$ZIP" \
    --timeout 900 \
    --memory-size 1024 \
    --vpc-config "$VPC_CONFIG" \
    --environment "Variables={DB_HOST=energy-monitor-db.ci1q4okokkkd.us-east-1.rds.amazonaws.com,DB_PORT=5432,DB_NAME=energy_monitor,DB_USERNAME=emadmin,DB_PASSWORD=EmAdmin2026Prod,S3_BUCKET=energy-monitor-ingest-058310292956}" \
    --query 'FunctionArn' --output text
fi

echo "Done. Invoke with:"
echo "  aws lambda invoke --function-name $FUNCTION_NAME --cli-binary-format raw-in-base64-out --payload '{\"key\":\"raw/OUTLET_70_anual.csv\"}' /tmp/vcf-out.json && cat /tmp/vcf-out.json"

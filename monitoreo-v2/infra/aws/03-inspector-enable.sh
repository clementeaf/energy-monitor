#!/usr/bin/env bash
# CYB-13: Enable AWS Inspector v2 for vulnerability scanning.
#
# Usage:
#   ./03-inspector-enable.sh [--dry-run]
#
# Cost: $0.01/image scan (ECR) + $0.01/Lambda scan
# Scans: ECR images on push, Lambda functions on deploy

set -euo pipefail

REGION="us-east-1"
DRY_RUN="${1:-}"

echo "=== CYB-13: Inspector v2 Enablement ==="
echo "Region: $REGION"
echo ""

if [ "$DRY_RUN" = "--dry-run" ]; then
  echo "[DRY RUN] Would enable Inspector v2 with:"
  echo "  - ECR image scanning (on push)"
  echo "  - Lambda code scanning"
  echo "  - EC2/ECS scanning"
  exit 0
fi

echo "Enabling Inspector v2..."
aws inspector2 enable \
  --region "$REGION" \
  --resource-types ECR LAMBDA EC2 \
  --query 'Accounts[0].Status' \
  --output text

echo "Inspector v2 enabled."

# Verify ECR scan config
echo "Verifying ECR scan configuration..."
aws ecr put-registry-scanning-configuration \
  --region "$REGION" \
  --scan-type ENHANCED \
  --rules '[{"repositoryFilters":[{"filter":"monitoreo-v2","filterType":"WILDCARD"}],"scanFrequency":"SCAN_ON_PUSH"}]'

echo "ECR enhanced scanning configured for monitoreo-v2 repos."
echo ""
echo "=== Inspector setup complete ==="
echo "Console: https://console.aws.amazon.com/inspector/v2/home?region=$REGION"
echo ""
echo "Next steps:"
echo "  1. Review initial findings after first ECR push"
echo "  2. Configure EventBridge rule for CRITICAL/HIGH findings → SNS"
echo "  3. Set suppression rules for accepted risks"

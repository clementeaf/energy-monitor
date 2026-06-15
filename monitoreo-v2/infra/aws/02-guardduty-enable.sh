#!/usr/bin/env bash
# CYB-22: Enable AWS GuardDuty for threat detection.
#
# Usage:
#   ./02-guardduty-enable.sh [--dry-run]
#
# Cost: ~$4/GB of CloudTrail + VPC Flow Logs analyzed
# Features: S3 protection, ECS runtime monitoring, RDS login anomalies

set -euo pipefail

REGION="us-east-1"
DRY_RUN="${1:-}"

echo "=== CYB-22: GuardDuty Enablement ==="
echo "Region: $REGION"
echo ""

if [ "$DRY_RUN" = "--dry-run" ]; then
  echo "[DRY RUN] Would enable GuardDuty detector with:"
  echo "  - S3 data event monitoring"
  echo "  - ECS runtime monitoring"
  echo "  - RDS login activity monitoring"
  echo "  - Malware protection for ECS"
  exit 0
fi

echo "Creating GuardDuty detector..."
DETECTOR_ID=$(aws guardduty create-detector \
  --region "$REGION" \
  --enable \
  --finding-publishing-frequency FIFTEEN_MINUTES \
  --data-sources '{
    "S3Logs": { "Enable": true },
    "MalwareProtection": { "ScanEc2InstanceWithFindings": { "EbsVolumes": true } }
  }' \
  --features '[
    { "Name": "S3_DATA_EVENTS", "Status": "ENABLED" },
    { "Name": "ECS_RUNTIME_MONITORING", "Status": "ENABLED" },
    { "Name": "RDS_LOGIN_EVENTS", "Status": "ENABLED" },
    { "Name": "RUNTIME_MONITORING", "Status": "ENABLED" }
  ]' \
  --query 'DetectorId' \
  --output text)

echo "GuardDuty enabled: detector $DETECTOR_ID"

# Create SNS topic for findings notification
echo "Creating SNS topic for findings..."
TOPIC_ARN=$(aws sns create-topic \
  --region "$REGION" \
  --name "guardduty-findings-energy-monitor" \
  --query 'TopicArn' \
  --output text)

echo "SNS topic: $TOPIC_ARN"
echo ""
echo "=== GuardDuty setup complete ==="
echo "Detector: $DETECTOR_ID"
echo "Console: https://console.aws.amazon.com/guardduty/home?region=$REGION"
echo ""
echo "Next steps:"
echo "  1. Subscribe ops email to SNS topic: $TOPIC_ARN"
echo "  2. Create EventBridge rule for HIGH/CRITICAL findings → SNS"
echo "  3. Review initial findings after 24h"

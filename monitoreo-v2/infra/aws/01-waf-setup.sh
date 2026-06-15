#!/usr/bin/env bash
# CYB-09: Create AWS WAF Web ACL for CloudFront distribution.
#
# Prerequisites:
#   - AWS CLI v2 configured with appropriate permissions
#   - CloudFront distribution ID: ECR03RA6F872Q
#
# Usage:
#   ./01-waf-setup.sh [--dry-run]
#
# Cost: ~$5/month + $0.60/million requests
# Region: us-east-1 (required for CloudFront WAF)

set -euo pipefail

REGION="us-east-1"
CF_DIST_ID="ECR03RA6F872Q"
WAF_NAME="energy-monitor-waf"
WAF_SCOPE="CLOUDFRONT"
DRY_RUN="${1:-}"

echo "=== CYB-09: WAF Setup for Energy Monitor ==="
echo "Region: $REGION"
echo "CloudFront: $CF_DIST_ID"
echo ""

# 1. Create Web ACL with managed rule groups
WAF_JSON=$(cat <<'WAFEOF'
{
  "Name": "energy-monitor-waf",
  "Scope": "CLOUDFRONT",
  "DefaultAction": { "Allow": {} },
  "Description": "CYB-09: WAF protection for Energy Monitor API + frontend",
  "Rules": [
    {
      "Name": "AWSCommonRules",
      "Priority": 1,
      "Statement": {
        "ManagedRuleGroupStatement": {
          "VendorName": "AWS",
          "Name": "AWSManagedRulesCommonRuleSet"
        }
      },
      "OverrideAction": { "None": {} },
      "VisibilityConfig": {
        "SampledRequestsEnabled": true,
        "CloudWatchMetricsEnabled": true,
        "MetricName": "AWSCommonRules"
      }
    },
    {
      "Name": "AWSSQLiRules",
      "Priority": 2,
      "Statement": {
        "ManagedRuleGroupStatement": {
          "VendorName": "AWS",
          "Name": "AWSManagedRulesSQLiRuleSet"
        }
      },
      "OverrideAction": { "None": {} },
      "VisibilityConfig": {
        "SampledRequestsEnabled": true,
        "CloudWatchMetricsEnabled": true,
        "MetricName": "AWSSQLiRules"
      }
    },
    {
      "Name": "AWSKnownBadInputs",
      "Priority": 3,
      "Statement": {
        "ManagedRuleGroupStatement": {
          "VendorName": "AWS",
          "Name": "AWSManagedRulesKnownBadInputsRuleSet"
        }
      },
      "OverrideAction": { "None": {} },
      "VisibilityConfig": {
        "SampledRequestsEnabled": true,
        "CloudWatchMetricsEnabled": true,
        "MetricName": "AWSKnownBadInputs"
      }
    },
    {
      "Name": "RateLimit",
      "Priority": 4,
      "Statement": {
        "RateBasedStatement": {
          "Limit": 2000,
          "AggregateKeyType": "IP"
        }
      },
      "Action": { "Block": {} },
      "VisibilityConfig": {
        "SampledRequestsEnabled": true,
        "CloudWatchMetricsEnabled": true,
        "MetricName": "RateLimit"
      }
    }
  ],
  "VisibilityConfig": {
    "SampledRequestsEnabled": true,
    "CloudWatchMetricsEnabled": true,
    "MetricName": "energy-monitor-waf"
  }
}
WAFEOF
)

if [ "$DRY_RUN" = "--dry-run" ]; then
  echo "[DRY RUN] Would create Web ACL:"
  echo "$WAF_JSON" | head -20
  echo "..."
  echo "[DRY RUN] Would associate with CloudFront $CF_DIST_ID"
  exit 0
fi

echo "Creating Web ACL..."
WAF_ARN=$(aws wafv2 create-web-acl \
  --region "$REGION" \
  --scope "$WAF_SCOPE" \
  --cli-input-json "$WAF_JSON" \
  --query 'Summary.ARN' \
  --output text)

echo "Web ACL created: $WAF_ARN"

# 2. Associate with CloudFront
echo "Associating with CloudFront $CF_DIST_ID..."
aws wafv2 associate-web-acl \
  --region "$REGION" \
  --web-acl-arn "$WAF_ARN" \
  --resource-arn "arn:aws:cloudfront::$(aws sts get-caller-identity --query Account --output text):distribution/$CF_DIST_ID"

echo "=== WAF setup complete ==="
echo "ARN: $WAF_ARN"
echo "Monitor: https://console.aws.amazon.com/wafv2/homev2/web-acls"

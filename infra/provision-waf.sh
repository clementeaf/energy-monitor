#!/usr/bin/env bash
# Provision AWS WAF WebACL for CloudFront + API Gateway.
# Attaches managed rule groups: AWSManagedRulesCommonRuleSet, SQLi, XSS, IP reputation.
#
# Usage:
#   bash infra/provision-waf.sh
#
# After creation, associate with:
#   - CloudFront distribution E1SNFETXON2VSI (frontend + API)
#   - API Gateway stage (if separate)

set -euo pipefail

WAF_NAME="energy-monitor-waf"
REGION="us-east-1"  # WAF for CloudFront must be us-east-1

echo "==> Creating WAF WebACL: $WAF_NAME"

ACL_ARN=$(aws wafv2 create-web-acl \
  --name "$WAF_NAME" \
  --scope CLOUDFRONT \
  --region "$REGION" \
  --default-action '{"Allow":{}}' \
  --visibility-config '{
    "SampledRequestsEnabled": true,
    "CloudWatchMetricsEnabled": true,
    "MetricName": "energyMonitorWaf"
  }' \
  --rules '[
    {
      "Name": "AWS-AWSManagedRulesCommonRuleSet",
      "Priority": 1,
      "Statement": {
        "ManagedRuleGroupStatement": {
          "VendorName": "AWS",
          "Name": "AWSManagedRulesCommonRuleSet"
        }
      },
      "OverrideAction": {"None": {}},
      "VisibilityConfig": {
        "SampledRequestsEnabled": true,
        "CloudWatchMetricsEnabled": true,
        "MetricName": "CommonRuleSet"
      }
    },
    {
      "Name": "AWS-AWSManagedRulesSQLiRuleSet",
      "Priority": 2,
      "Statement": {
        "ManagedRuleGroupStatement": {
          "VendorName": "AWS",
          "Name": "AWSManagedRulesSQLiRuleSet"
        }
      },
      "OverrideAction": {"None": {}},
      "VisibilityConfig": {
        "SampledRequestsEnabled": true,
        "CloudWatchMetricsEnabled": true,
        "MetricName": "SQLiRuleSet"
      }
    },
    {
      "Name": "AWS-AWSManagedRulesKnownBadInputsRuleSet",
      "Priority": 3,
      "Statement": {
        "ManagedRuleGroupStatement": {
          "VendorName": "AWS",
          "Name": "AWSManagedRulesKnownBadInputsRuleSet"
        }
      },
      "OverrideAction": {"None": {}},
      "VisibilityConfig": {
        "SampledRequestsEnabled": true,
        "CloudWatchMetricsEnabled": true,
        "MetricName": "KnownBadInputs"
      }
    },
    {
      "Name": "AWS-AWSManagedRulesAmazonIpReputationList",
      "Priority": 4,
      "Statement": {
        "ManagedRuleGroupStatement": {
          "VendorName": "AWS",
          "Name": "AWSManagedRulesAmazonIpReputationList"
        }
      },
      "OverrideAction": {"None": {}},
      "VisibilityConfig": {
        "SampledRequestsEnabled": true,
        "CloudWatchMetricsEnabled": true,
        "MetricName": "IpReputationList"
      }
    },
    {
      "Name": "RateLimit-Global",
      "Priority": 5,
      "Statement": {
        "RateBasedStatement": {
          "Limit": 2000,
          "AggregateKeyType": "IP"
        }
      },
      "Action": {"Block": {}},
      "VisibilityConfig": {
        "SampledRequestsEnabled": true,
        "CloudWatchMetricsEnabled": true,
        "MetricName": "RateLimitGlobal"
      }
    }
  ]' \
  --query 'Summary.ARN' --output text)

echo "==> WebACL created: $ACL_ARN"
echo ""
echo "==> Associating with CloudFront distribution E1SNFETXON2VSI..."

CF_ARN="arn:aws:cloudfront::$(aws sts get-caller-identity --query Account --output text):distribution/E1SNFETXON2VSI"

aws wafv2 associate-web-acl \
  --web-acl-arn "$ACL_ARN" \
  --resource-arn "$CF_ARN" \
  --region "$REGION"

echo "==> WAF associated with CloudFront. Done."
echo ""
echo "Rules active:"
echo "  1. AWSManagedRulesCommonRuleSet (OWASP top 10)"
echo "  2. AWSManagedRulesSQLiRuleSet (SQL injection)"
echo "  3. AWSManagedRulesKnownBadInputsRuleSet (XSS, log4j, etc)"
echo "  4. AWSManagedRulesAmazonIpReputationList (known bad IPs)"
echo "  5. Rate limit 2000 req/5min per IP"

#!/usr/bin/env bash
# Provision ElastiCache Serverless Redis for rate limiting + JWT blacklist.
# Requires: AWS CLI v2, VPC subnet IDs and security group.
#
# Usage:
#   export VPC_SUBNET_ID_1=subnet-xxx VPC_SUBNET_ID_2=subnet-yyy VPC_SUBNET_ID_3=subnet-zzz
#   export VPC_SECURITY_GROUP_ID=sg-0adda6a999e8d5d9a
#   bash infra/provision-redis.sh
#
# After creation, add REDIS_URL to ECS task definition environment:
#   REDIS_URL=redis://<endpoint>:6379

set -euo pipefail

CACHE_NAME="energy-monitor-redis"
REGION="${AWS_REGION:-us-east-1}"

: "${VPC_SUBNET_ID_1:?Set VPC_SUBNET_ID_1}"
: "${VPC_SUBNET_ID_2:?Set VPC_SUBNET_ID_2}"
: "${VPC_SUBNET_ID_3:?Set VPC_SUBNET_ID_3}"
: "${VPC_SECURITY_GROUP_ID:?Set VPC_SECURITY_GROUP_ID}"

echo "==> Creating ElastiCache Serverless cache: $CACHE_NAME"

aws elasticache create-serverless-cache \
  --serverless-cache-name "$CACHE_NAME" \
  --engine redis \
  --region "$REGION" \
  --security-group-ids "$VPC_SECURITY_GROUP_ID" \
  --subnet-ids "$VPC_SUBNET_ID_1" "$VPC_SUBNET_ID_2" "$VPC_SUBNET_ID_3" \
  --cache-usage-limits "DataStorage={Maximum=1,Unit=GB},ECPUPerSecond={Maximum=1000}" \
  --description "Rate limiting + JWT blacklist for energy-monitor"

echo "==> Waiting for cache to become available..."
aws elasticache describe-serverless-caches \
  --serverless-cache-name "$CACHE_NAME" \
  --region "$REGION" \
  --query 'ServerlessCaches[0].{Status:Status,Endpoint:Endpoint.Address,Port:Endpoint.Port}'

echo ""
echo "Once status=available, set in ECS task definition:"
echo "  REDIS_URL=redis://<Endpoint>:6379"
echo ""
echo "Then update ECS service to pick up the new env var."

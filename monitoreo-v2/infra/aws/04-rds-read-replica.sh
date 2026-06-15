#!/usr/bin/env bash
# DAT-01: Create RDS Read Replica for PASA ETL access.
#
# Usage:
#   ./04-rds-read-replica.sh [--dry-run]
#
# Cost: ~$14/month (db.t3.small) + storage
# Source: monitoreo-v2-db (us-east-1)
# Replica: monitoreo-v2-db-replica (same AZ for NRT sync)

set -euo pipefail

REGION="us-east-1"
SOURCE_DB="monitoreo-v2-db"
REPLICA_DB="monitoreo-v2-db-replica"
INSTANCE_CLASS="db.t3.small"
DRY_RUN="${1:-}"

echo "=== DAT-01: RDS Read Replica for ETL ==="
echo "Source: $SOURCE_DB"
echo "Replica: $REPLICA_DB"
echo "Class: $INSTANCE_CLASS"
echo ""

if [ "$DRY_RUN" = "--dry-run" ]; then
  echo "[DRY RUN] Would create read replica:"
  echo "  Source: $SOURCE_DB"
  echo "  Replica: $REPLICA_DB"
  echo "  Instance class: $INSTANCE_CLASS"
  echo "  Publicly accessible: no"
  echo "  Storage encrypted: yes (inherits from source)"
  echo "  Monitoring: enhanced (60s interval)"
  exit 0
fi

echo "Creating read replica..."
aws rds create-db-instance-read-replica \
  --region "$REGION" \
  --db-instance-identifier "$REPLICA_DB" \
  --source-db-instance-identifier "$SOURCE_DB" \
  --db-instance-class "$INSTANCE_CLASS" \
  --no-publicly-accessible \
  --enable-performance-insights \
  --monitoring-interval 60 \
  --monitoring-role-arn "$(aws iam get-role --role-name rds-monitoring-role --query 'Role.Arn' --output text 2>/dev/null || echo '')" \
  --tags Key=Project,Value=energy-monitor Key=Purpose,Value=pasa-etl-replica Key=Anexo07,Value=DAT-01

echo "Waiting for replica to become available..."
aws rds wait db-instance-available \
  --region "$REGION" \
  --db-instance-identifier "$REPLICA_DB"

ENDPOINT=$(aws rds describe-db-instances \
  --region "$REGION" \
  --db-instance-identifier "$REPLICA_DB" \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text)

echo ""
echo "=== Read replica created ==="
echo "Endpoint: $ENDPOINT"
echo "Port: 5432"
echo "Sync: asynchronous (near real-time, typically <1s lag)"
echo ""
echo "Next steps:"
echo "  1. Create read-only DB user for PASA ETL"
echo "  2. Configure VPC security group for PASA access"
echo "  3. Share endpoint + credentials with PASA Data team"
echo "  4. Monitor ReplicaLag in CloudWatch"

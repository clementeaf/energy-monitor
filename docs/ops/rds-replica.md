# RDS Read Replica — Runbook

Operational guide for enabling a PostgreSQL read replica for ETL/export workloads (GAP-108, GAP-109).

## Purpose

Heavy **SELECT** traffic (CSV export, Parquet jobs, future BI connectors) should use a read replica so the primary RDS instance stays responsive for the UI and write paths (ingress, alerts, billing).

The backend reads `DB_READ_REPLICA_HOST` when set. If unset or unreachable, all queries fall back to the primary automatically.

## 1. Create the replica (AWS Console)

1. Open **RDS → Databases → monitoreo-v2-db** (primary).
2. **Actions → Create read replica**.
3. Same VPC and subnet group as the ECS tasks.
4. Instance class: start with **db.t3.small** (match primary or one size down for cost).
5. **Multi-AZ**: optional for replica (usually single-AZ is enough).
6. Note the replica endpoint hostname, e.g. `monitoreo-v2-db-replica.xxxxx.us-east-1.rds.amazonaws.com`.

## 2. Security group

Allow **inbound PostgreSQL (5432)** on the replica security group from:

- ECS task security group (backend service)
- Same sources already allowed on the primary

No public ingress required if API runs in the same VPC.

## 3. ECS / secrets (GAP-109)

Add to the backend task definition environment or Secrets Manager JSON:

| Variable | Example | Required |
|----------|---------|----------|
| `DB_READ_REPLICA_HOST` | `monitoreo-v2-db-replica.xxxxx.rds.amazonaws.com` | No (omit to disable) |
| `DB_PORT` | `5432` | Same as primary |
| `DB_NAME` | `energy_monitor` | Same as primary |
| `DB_USERNAME` / `DB_PASSWORD` | (same as primary) | Same credentials |

Redeploy ECS service after updating secrets.

Optional export storage (async Parquet/CSV jobs):

| Variable | Purpose |
|----------|---------|
| `EXPORT_S3_BUCKET` | S3 bucket for completed export files |
| `EXPORT_LOCAL_DIR` | Local path when S3 is not configured (dev) |
| `AWS_REGION` | Region for S3 presigned URLs |

## 4. Verify

```bash
# From ECS Exec or a bastion in the VPC
psql "host=$DB_READ_REPLICA_HOST port=5432 dbname=$DB_NAME user=$DB_USERNAME sslmode=require" -c "SELECT pg_is_in_recovery();"
# Expected: t (true on replica)
```

Hit a read-replica route:

```bash
curl -H "X-API-Key: $KEY" \
  "https://plataforma.globepower.cl/api/v1/readings/export?format=csv&from=2026-01-01T00:00:00Z&to=2026-01-02T00:00:00Z" \
  -o readings.csv
```

Check backend logs for: `Read replica connected (...)`.

## 5. Replication lag monitoring

- CloudWatch metric: **ReplicaLag** on the replica instance.
- Alert if lag > 60s during normal operation.
- ETL consumers should tolerate small lag; watermarks (`etl_watermarks`) track incremental cursors per `X-Consumer-Id`.

## 6. Rollback

Remove `DB_READ_REPLICA_HOST` from ECS env and redeploy. Exports continue on primary with no schema changes.

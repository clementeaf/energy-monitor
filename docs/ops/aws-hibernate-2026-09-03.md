# AWS Infrastructure Hibernate — 2026-09-03

## Context

Platform had 5 registered users, last human login Aug 20 2026 (Marcelo Caceres via Microsoft).
No active PASA pipeline — synthetic readings only. Monthly AWS bill: **$227 USD**.
Decision: hibernate all monitoreo-v2 backend infra, keep S3+CloudFront frontends alive.

## What was shut down

| Resource | Type | Action | Monthly cost removed |
|----------|------|--------|---------------------|
| ECS service `monitoreo-v2-backend-restored` | Fargate, 1 task | Scaled to 0 | $6 |
| ALB `monitoreo-v2-alb` | Application LB | **Deleted** | $17 |
| ElastiCache `energy-monitor-redis-v2` | cache.t3.micro | **Deleted** | $13 |
| WAF `energy-monitor-waf` | CloudFront scope | **Deleted** (disassociated from CF first) | $10 |
| EC2 `energy-monitor-rds-tunnel` (i-0275563605d1d0dda) | t3.nano | Stopped | $4 |
| EIP 44.196.13.51 | Idle | **Released** | $1 |
| Lightsail `saturnus-api` | nano Ubuntu 22.04 | **Deleted** (not energy-monitor, idle since creation) | $5 |
| RDS `monitoreo-v2-db` | db.t3.small, 20GB | **Stopped** | $42 |
| CloudFront `E1SNFETXON2VSI` | WAF association | Removed (distro still active) | $0 |

**Total savings: ~$120/mes (with tax)**

## What stays running

| Resource | Why |
|----------|-----|
| S3 `power-monitor-frontend` + CloudFront `E1SNFETXON2VSI` | Frontend SPA power-monitor.cloud (~$0) |
| S3 `globe-landing-grupoglobe` + CloudFront `E28IBIJXQLJUQ7` | grupoglobe.com landing (~$0, cuenta-1016) |
| Route 53 zones | DNS ($1/mes) |
| Secrets Manager | 6 secrets ($1.20/mes) |
| ECR image | Docker image for future restore ($0.06/mes) |

## RDS snapshot

- **Identifier:** `monitoreo-v2-db-hibernate-2026-09-03`
- **Engine:** PostgreSQL 16, db.t3.small, 20GB
- **Contents:** All data up to 2026-09-03 (users, tenants, readings, audit_logs, maps, etc.)
- **Cost:** ~$0.10/mes (snapshot storage)
- **Warning:** RDS stopped instances auto-restart after 7 days. Either delete the instance (recommended) or re-stop it weekly.

## Bill impact

| Period | Total account cost |
|--------|-------------------|
| June 2026 | $99 |
| July 2026 | $221 |
| August 2026 | $227 |
| **September 2026 (projected)** | **~$40** |

## How to restore

### Full restore (~30 min)

```bash
# 1. Restore RDS from snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier monitoreo-v2-db \
  --db-snapshot-identifier monitoreo-v2-db-hibernate-2026-09-03 \
  --db-instance-class db.t3.micro \
  --region us-east-1

# 2. Wait for RDS to be available
aws rds wait db-instance-available --db-instance-identifier monitoreo-v2-db --region us-east-1

# 3. Recreate Redis
aws elasticache create-replication-group \
  --replication-group-id energy-monitor-redis-v2 \
  --replication-group-description "Energy monitor Redis" \
  --engine redis \
  --cache-node-type cache.t3.micro \
  --num-cache-clusters 1 \
  --region us-east-1

# 4. Recreate ALB + listeners + target group
# See terraform: monitoreo-v2/infra/aws/terraform/main.tf

# 5. Scale ECS back up
aws ecs update-service \
  --cluster monitoreo-v2 \
  --service monitoreo-v2-backend-restored \
  --desired-count 1 \
  --region us-east-1

# 6. Start bastion if needed
aws ec2 start-instances --instance-ids i-0275563605d1d0dda --region us-east-1

# 7. Optionally re-attach WAF
# Use terraform or recreate manually
```

### Cheaper alternative (if restoring)

Skip ALB+ECS entirely. Deploy backend as Lambda (already supported via `backend/serverless.yml` pattern).
Use Neon/Supabase free tier instead of RDS. Total: $0-3/mes.

## Other non-monitoreo resources in the account

| Resource | Region | Type | Cost/mes | Status |
|----------|--------|------|----------|--------|
| xauusd-scalp-bot | us-east-1 | t3.medium EC2 | $6 | Running |
| goya-node-3 | eu-west-1 | t2.micro EC2 | $5 | Running |
| liq-listener | ap-southeast-1 | t4g.nano EC2 | $0 | Stopped |

## Last known activity

- **Last login:** Marcelo Caceres (mcaceres@grupoglobe.com) — 2026-08-20 13:07 UTC, Microsoft auth, tenant PASA
- **Last reading:** 2026-09-03 08:00 UTC (synthetic, not real meter data)
- **Total users:** 8
- **Total tenants:** 3 (Globe Power, Siemens, PASA)
- **PASA pipeline:** Never activated in production

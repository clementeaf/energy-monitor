# DevOps Patterns

## CI/CD Pipeline (`.github/workflows/deploy.yml`)

```
Trigger: push to main

Frontend:
  npm ci → tsc --noEmit → vite build → aws s3 sync --delete → cloudfront invalidation (/index.html)

Backend:
  npm ci → tsc --noEmit → nest build → npx sls deploy --stage dev

PR builds:
  type-check + build only (no deploy)
```

Node 20, npm.

## AWS Infrastructure

```
CloudFront (energymonitor.click)
├── /* → S3 bucket (frontend SPA)
└── /api/* → API Gateway HTTP → Lambda (power-digital-api)
                                  └── RDS PostgreSQL (VPC)

EventBridge rate(1 min) → Lambda synthetic-readings-generator
EventBridge rate(5 min) → Lambda offlineAlerts (en serverless.yml)
```

## Serverless Framework v3

```yaml
# backend/serverless.yml
service: power-digital-api
provider:
  runtime: nodejs20.x
  memorySize: 256
  timeout: 10
  vpc:
    securityGroupIds: [${env:VPC_SECURITY_GROUP_ID}]
    subnetIds: [${env:VPC_SUBNET_ID_1}, ...]
  environment:
    DB_HOST, DB_PORT, DB_NAME, DB_USERNAME, DB_PASSWORD
    GOOGLE_CLIENT_ID, MICROSOFT_CLIENT_ID

functions:
  api:
    handler: dist/serverless.handler
    events:
      - httpApi: '{method} /api/{proxy+}'
  offlineAlerts:
    handler: dist/offline-alerts.handler
    timeout: 30
    events:
      - schedule: rate(5 minutes)
```

## Environment Variables

### Backend Lambda
```
DB_HOST, DB_PORT, DB_NAME, DB_USERNAME, DB_PASSWORD
GOOGLE_CLIENT_ID, MICROSOFT_CLIENT_ID
NODE_ENV=production
```

### Frontend (VITE_*)
```
VITE_AUTH_MODE
VITE_MICROSOFT_CLIENT_ID, VITE_MICROSOFT_TENANT_ID
VITE_GOOGLE_CLIENT_ID
```

### Infra Lambdas
```
DB_HOST, DB_USER, DB_PASS, DB_NAME
```

### VPC
```
VPC_SECURITY_GROUP_ID
VPC_SUBNET_ID_1, VPC_SUBNET_ID_2, VPC_SUBNET_ID_3
```

Secrets: GitHub Actions secrets (CI), `.env` local (gitignored), Lambda env vars (serverless.yml).

## Deploy Commands

```bash
# Frontend (normalmente via CI)
cd frontend && npm run build
aws s3 sync dist/ s3://$S3_BUCKET/ --delete
aws cloudfront create-invalidation --distribution-id $DIST_ID --paths "/index.html"

# Backend
cd backend && npx sls deploy --stage dev

# Infra lambdas (manual, independientes)
cd infra/synthetic-generator && zip -r function.zip . && aws lambda update-function-code ...
```

## Monitoring

- **Logs:** CloudWatch (default Lambda behavior). NestJS Logger en backend.
- **Error tracking:** Ninguno (no Sentry/Datadog).
- **API docs:** Swagger en `/api/docs`.
- **Alertas:** Solo offline meter alerts internas. Sin alarmas CloudWatch configuradas.

## Database

- PostgreSQL 16 en RDS, VPC con security groups + 3 subnets
- SSL: `rejectUnauthorized: false` (TODO: CA cert)
- Schema: SQL migrations manuales (`sql/001-006`)
- Sin rollback scripts, sin schema drift validation
- Readings: crecimiento unbounded (~21,600/día), sin partitioning/retention

## Infra Lambdas (standalone)

```
infra/
  synthetic-generator/   → EventBridge 1/min, pg directo, TEMPORAL
  reimport-readings/     → One-off CSV import + regen synthetic
  backfill-gap/          → One-off gap backfill
```

Cada uno con su `package.json` y `node_modules`. No parte del build NestJS. Usan `pg` client directo.

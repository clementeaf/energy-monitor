# Deploy

## Local Development

### Prerequisites
- Node.js 20+
- Docker (for TimescaleDB)

### Backend
```bash
cd monitoreo-v2/backend

# Start DB
docker run -d --name pg-arauco -p 5434:5432 \
  -e POSTGRES_PASSWORD=arauco -e POSTGRES_DB=arauco \
  timescale/timescaledb:latest-pg16

# Run migrations (if fresh DB)
psql -h 127.0.0.1 -p 5434 -U postgres -d arauco -f ../database/init/01-extensions.sql
psql -h 127.0.0.1 -p 5434 -U postgres -d arauco -f ../database/init/02-core.sql
psql -h 127.0.0.1 -p 5434 -U postgres -d arauco -f ../database/init/03-rbac.sql
psql -h 127.0.0.1 -p 5434 -U postgres -d arauco -f ../database/init/04-seed.sql

# Start backend
npm ci
npm run start:dev   # http://localhost:4000
```

### Frontend
```bash
cd monitoreo-v2/frontend
npm ci
npm run dev         # http://localhost:5173 (proxies /api → :4000)
```

### Verify
- Swagger: http://localhost:4000/api/docs
- Frontend: http://localhost:5173
- DB: `psql -h 127.0.0.1 -p 5434 -U postgres -d arauco`

## Production (AWS Target)

### Architecture
```
CloudFront → S3 (frontend SPA)
           → ALB → ECS Fargate (NestJS backend)
                    → RDS TimescaleDB (private subnet)
```

### Backend (ECS Fargate)
- Docker image from `backend/Dockerfile`
- Required env vars: DB_HOST, DB_PASSWORD, JWT_SECRET, COOKIE_SECRET, FRONTEND_URL
- Health check: `GET /api/health`
- Port: 4000

### Frontend (S3 + CloudFront)
```bash
cd monitoreo-v2/frontend
npm run build       # outputs to dist/
# Upload dist/ to S3 bucket
# CloudFront serves with SPA redirect (404 → index.html)
```

### Database
- RDS PostgreSQL 16 with TimescaleDB extension
- Private subnet, no public access
- TLS via `RDS_CA_BUNDLE_PATH` env var
- Backups: automated daily snapshots

### Migrations
Run new migrations against production DB before deploying new backend version:
```bash
psql -h $DB_HOST -U $DB_USERNAME -d $DB_NAME -f backend/src/database/migrations/10-add-missing-permissions.sql
```

### Environment Checklist

- [ ] DB_HOST, DB_PASSWORD configured
- [ ] JWT_SECRET, COOKIE_SECRET set (random 64+ char)
- [ ] FRONTEND_URL set to CloudFront domain
- [ ] GOOGLE_CLIENT_ID, MICROSOFT_CLIENT_ID, MICROSOFT_TENANT_ID configured
- [ ] NODE_ENV=production
- [ ] RDS_CA_BUNDLE_PATH pointing to TLS cert
- [ ] SES_FROM_EMAIL verified in SES (if email needed)
- [ ] Security group: backend → RDS on port 5432 only

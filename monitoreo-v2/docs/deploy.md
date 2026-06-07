# Deploy

## Local Development

Two supported workflows. **Use Workflow A** for day-to-day development (hot reload). **Use Workflow B** only to smoke-test the production Docker image locally.

### Prerequisites
- Node.js 20+
- Docker

### Workflow A — Recommended (DB in Docker, app on host)

| Component | Where it runs | Command |
|-----------|---------------|---------|
| TimescaleDB | Docker | see below |
| Backend (NestJS) | Host | `npm run start:dev` → `:4000` |
| Frontend (Vite) | Host | `npm run dev` → `:5173` |

#### A1 — Database via docker compose (preferred)

Runs `monitoreo-v2-db` on host port **5434**. Init scripts in `database/init/` run automatically on first boot.

```bash
cd monitoreo-v2
docker compose up -d timescaledb

cd backend
cp .env.example .env   # defaults match compose (DB monitoreo_v2)
npm ci
npm run start:dev      # http://localhost:4000
```

```bash
cd monitoreo-v2/frontend
npm ci
npm run dev            # http://localhost:5173 — proxies /api → :4000
```

**Backend `.env` for compose DB:**

| Variable | Value |
|----------|-------|
| `DB_HOST` | `127.0.0.1` |
| `DB_PORT` | `5434` |
| `DB_NAME` | `monitoreo_v2` |
| `DB_USERNAME` | `postgres` |
| `DB_PASSWORD` | `monitoreo2026` |

Override DB credentials via `monitoreo-v2/.env` (read by compose) or edit `backend/.env`.

#### A2 — Database via standalone container (legacy)

Same port **5434**, different database name/password. Manual init if the volume is new:

```bash
docker run -d --name pg-arauco -p 5434:5432 \
  -e POSTGRES_PASSWORD=arauco -e POSTGRES_DB=arauco \
  timescale/timescaledb:latest-pg16

# Only if init scripts did not run (fresh container without compose volume):
for f in ../database/init/*.sql; do
  PGPASSWORD=arauco psql -h 127.0.0.1 -p 5434 -U postgres -d arauco -f "$f"
done

cd monitoreo-v2/backend
# Set DB_NAME=arauco DB_PASSWORD=arauco in .env
npm run start:dev
```

#### Verify (Workflow A)
- Swagger: http://localhost:4000/api/docs
- Frontend: http://localhost:5173
- DB (compose): `PGPASSWORD=monitoreo2026 psql -h 127.0.0.1 -p 5434 -U postgres -d monitoreo_v2`
- DB (legacy): `PGPASSWORD=arauco psql -h 127.0.0.1 -p 5434 -U postgres -d arauco`

---

### Workflow B — Full stack in Docker (optional)

Runs **both** DB and API in containers. The backend image is a **production build** (`node dist/main`) — **no hot reload**.

```bash
cd monitoreo-v2
cp .env.example .env
# Fill JWT_SECRET, COOKIE_SECRET, GOOGLE_CLIENT_ID, MICROSOFT_* (required by backend bootstrap)

docker compose up --build
# API: http://localhost:4000
# DB: localhost:5434 (same as Workflow A1)
```

| Service | Container | Notes |
|---------|-----------|-------|
| `timescaledb` | `monitoreo-v2-db` | Same as Workflow A1 |
| `backend` | `monitoreo-v2-api` | Built from `backend/Dockerfile`; connects to `timescaledb:5432` inside the network |

For frontend with Workflow B, still run Vite on the host (`npm run dev`) pointing at `:4000`.

**When to use:** CI-like smoke test, onboarding without Node backend setup, or verifying the Docker image. Not for active backend development.

---

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

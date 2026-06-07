# Backend — Monitoreo V2

NestJS 11 + TypeORM + TimescaleDB (PostgreSQL 16). Multi-tenant, ISO 27001.

## Quick Start

**Recommended:** DB in Docker, NestJS on the host with hot reload. See [docs/deploy.md](../docs/deploy.md) for both local workflows.

```bash
# 1 — Database (docker compose)
cd monitoreo-v2
docker compose up -d timescaledb

# 2 — Backend (host)
cd backend
cp .env.example .env
npm ci
npm run start:dev   # http://localhost:4000

# 3 — Tests
npm run test        # 656+ tests, 61 suites
npm run test:cov    # coverage (80% threshold)
```

**Optional:** `docker compose up --build` runs DB + API in containers (production image, no watch). Frontend still runs with `npm run dev` on the host.

### Local DB credentials

| Setup | `DB_NAME` | `DB_PASSWORD` | Container |
|-------|-----------|---------------|-----------|
| docker compose (default) | `monitoreo_v2` | `monitoreo2026` | `monitoreo-v2-db` |
| legacy `docker run pg-arauco` | `arauco` | `arauco` | `pg-arauco` |

Both expose port **5434** on the host. Init SQL in `../database/init/` runs automatically with compose; run manually for a fresh legacy container (see deploy.md).

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DB_HOST` | yes (prod) | `127.0.0.1` | Database host |
| `DB_PORT` | no | `5434` | Database port |
| `DB_NAME` | no | `monitoreo_v2` | Database name (`arauco` if using legacy `pg-arauco` container) |
| `DB_USERNAME` | no | `postgres` | Database user |
| `DB_PASSWORD` | yes (prod) | `monitoreo2026` | Database password (`arauco` with legacy container) |
| `JWT_SECRET` | yes (prod) | — | Secret for JWT signing |
| `COOKIE_SECRET` | yes (prod) | — | Secret for cookie signing |
| `FRONTEND_URL` | yes (prod) | — | CORS origin |
| `GOOGLE_CLIENT_ID` | yes | — | Google OAuth client ID |
| `MICROSOFT_CLIENT_ID` | yes | — | Microsoft OAuth client ID |
| `MICROSOFT_TENANT_ID` | yes | — | Microsoft tenant ID |
| `NODE_ENV` | no | `development` | Environment |
| `PORT` | no | `4000` | Server port |
| `LOG_FORMAT` | no | `text` | `json` for structured logging |
| `CONFIG_ENCRYPTION_KEY` | no | — | AES-256-GCM for integration secrets |
| `SES_FROM_EMAIL` | no | — | AWS SES verified sender |
| `SES_REGION` | no | `us-east-1` | AWS SES region |
| `ALERT_EMAIL_RECIPIENTS` | no | — | Comma-separated alert emails |
| `RDS_CA_BUNDLE_PATH` | no | — | TLS cert bundle for RDS |

## Architecture

```
Request → Helmet → ThrottlerGuard → ApiKeyGuard → JwtAuthGuard → PermissionsGuard
       → Controller → Service → TypeORM / Raw SQL → TimescaleDB
       → AuditLogInterceptor (writes audit trail)
```

### Global Guards (execution order)
1. **ThrottlerGuard** — 3 tiers: 10/s, 100/min, 1000/hr
2. **ApiKeyGuard** — X-API-Key header → constant-time hash compare
3. **JwtAuthGuard** — httpOnly cookie → JWT verify. `@Public()` to skip
4. **PermissionsGuard** — `@RequirePermission('module', 'action')` per endpoint

### Module Pattern (4 files)
```
entity.ts → service.ts → controller.ts → module.ts
```
Register in `app.module.ts`. Raw SQL via `this.dataSource.query()`.

## Modules (22)

| Module | Endpoints | Description |
|---|---|---|
| auth | login, refresh, logout, MFA setup/verify/validate | OAuth (Microsoft/Google) → JWT cookies |
| users | CRUD + building assignment | User management |
| roles | CRUD + permission catalog + assign | RBAC management |
| buildings | CRUD | Sites/buildings |
| meters | CRUD | Energy meters |
| concentrators | CRUD + meter assignment | Data concentrators |
| readings | list, latest, aggregated | Time-series (TimescaleDB) |
| iot-readings | 9 read-only endpoints | Siemens IoT data |
| alerts | CRUD + acknowledge/resolve | Alert management |
| alert-engine | evaluate (cron 5min) | 6 evaluators, 22+ alert types |
| tariffs | CRUD + blocks | Rate structures |
| invoices | generate, approve, cancel, PDF | Billing |
| reports | generate, schedule, export | PDF reports |
| integrations | CRUD + sync + logs | External connectors (MQTT, REST, FTP, Webhook) |
| hierarchy | CRUD tree nodes | Electrical hierarchy |
| tenant-units | CRUD + meter assign | Tenant unit management |
| tenants | CRUD + onboarding + theme | Multi-tenant config |
| audit-logs | list with filters | Audit trail (ISO 27001) |
| api-keys | CRUD + rotate | External API access |
| external-api | 9 read-only under /api/v1 | Third-party API |
| fault-events | list + detail | Equipment fault history |
| sessions | (internal) | Refresh token rotation |

## Database

30 tables. Key ones:

```
tenants → users → roles → permissions (via role_permissions)
       → buildings → meters → readings (hypertable, partitioned)
       → alerts → alert_rules
       → invoices → invoice_line_items
       → tariffs → tariff_blocks
       → integrations → integration_sync_logs
       → audit_logs (hypertable, 5yr retention)
```

Migrations in `src/database/migrations/` and `../database/init/`.

## Security

- Helmet (HSTS 1yr, Referrer-Policy, COOP)
- CORS whitelist (no wildcard in prod)
- Body limit 1MB
- `__Host-` cookie prefix in production
- Refresh token rotation with theft detection
- SSRF blocker in connectors
- HTML escape in PDF generation
- ReDoS-safe patterns
- PII redaction in logs
- Config encryption (AES-256-GCM)
- Constant-time API key comparison

## Swagger

Available at `/api/docs` in development. Auth via cookie or `X-API-Key` header.

# External Integrations

**Analysis Date:** 2026-03-09

## APIs & External Services

**Microsoft Entra ID (Azure AD):**
- Purpose: OAuth authentication (redirect flow)
- Frontend SDK: `@azure/msal-browser` + `@azure/msal-react` (`frontend/src/hooks/auth/useMicrosoftAuth.ts`)
- Backend verification: JWKS via `jose` library, endpoint `https://login.microsoftonline.com/common/discovery/v2.0/keys` (`backend/src/auth/auth.service.ts`)
- Auth: `VITE_MICROSOFT_CLIENT_ID`, `VITE_MICROSOFT_TENANT_ID` (frontend), `MICROSOFT_CLIENT_ID` (backend)
- Flow: MSAL redirect -> acquireTokenSilent -> ID token stored in sessionStorage -> sent as Bearer token to backend

**Google OAuth:**
- Purpose: OAuth authentication (One Tap / credential flow)
- Frontend SDK: `@react-oauth/google` (`frontend/src/hooks/auth/useGoogleAuth.ts`)
- Backend verification: JWKS via `jose` library, endpoint `https://www.googleapis.com/oauth2/v3/certs` (`backend/src/auth/auth.service.ts`)
- Auth: `VITE_GOOGLE_CLIENT_ID` (frontend), `GOOGLE_CLIENT_ID` (backend)
- Flow: Google credential (JWT) stored in sessionStorage -> sent as Bearer token to backend

## Data Storage

**Database:**
- PostgreSQL 16 via AWS RDS
- Connection: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD` env vars
- ORM: TypeORM 0.3.20 with `autoLoadEntities: true`, `synchronize: false` (`backend/src/app.module.ts`)
- SSL: enabled in production (`rejectUnauthorized: false`)
- VPC: Lambda connects via VPC security group + 3 subnets
- Schema managed via numbered SQL migrations in `sql/` directory (001 through 006)
- Direct `pg` client used by infra Lambdas (`infra/synthetic-generator/index.mjs`)

**File Storage:**
- AWS S3 - Frontend static assets only (SPA hosting)
- No application-level file storage detected

**Caching:**
- None (no Redis/Memcached/ElastiCache detected)
- Frontend uses TanStack Query for client-side cache with stale-while-revalidate pattern

## Authentication & Identity

**Dual OAuth Provider Architecture:**
- Backend auto-detects provider from JWT `iss` claim (`backend/src/auth/auth.service.ts:detectProvider()`)
- Microsoft: `iss` contains `microsoftonline.com`
- Google: `iss` contains `accounts.google.com`
- Token verified via provider-specific JWKS endpoint with RS256 algorithm
- On first login, user is upserted via `UsersService.upsert()` with externalId, provider, email, name, avatar
- User must have `isActive: true` to access the system (admin activation required)

**RBAC:**
- 7 roles, 10 modules, 3 actions stored in `role_permissions` table
- Permissions resolved on login via `RolesService.getPermissionsByRoleId()`
- Site-scoped access via `UsersService.getSiteIds()` (returns `['*']` if no restrictions)

**Token Flow:**
1. Frontend obtains ID token from Microsoft MSAL or Google credential
2. Token stored in `sessionStorage` as `access_token`
3. Axios interceptor injects `Authorization: Bearer <token>` on every API call (`frontend/src/services/api.ts`)
4. Backend verifies token via JWKS on each request
5. 401 response clears session and auth store

## Monitoring & Observability

**Error Tracking:**
- None (no Sentry, Datadog, or similar detected)

**Logs:**
- Backend: NestJS `Logger` class (`backend/src/offline-alerts.ts`, `backend/src/auth/auth.service.ts`)
- Frontend: `console.error` / `console.log`
- Lambda logs go to CloudWatch (default AWS behavior)

**API Documentation:**
- Swagger/OpenAPI at `/api/docs` via `@nestjs/swagger` (`backend/src/swagger.ts`)
- Bearer auth configured in Swagger UI

## CI/CD & Deployment

**Hosting:**
- Frontend: AWS S3 + CloudFront (domain: `energymonitor.click`)
- Backend: AWS Lambda via Serverless Framework v3 (service: `power-digital-api`)
- Database: AWS RDS PostgreSQL in VPC

**CI Pipeline:** `.github/workflows/deploy.yml`
- Trigger: push to `main` branch
- Frontend pipeline: `npm ci` -> `tsc --noEmit` -> `vite build` -> S3 sync -> CloudFront invalidation
- Backend pipeline: `npm ci` -> `tsc --noEmit` -> `nest build` -> `sls deploy --stage dev`
- PR builds: type-check and build only (no deploy)

**Deploy commands:**
```bash
# Frontend (via CI only)
aws s3 sync dist/ s3://$S3_BUCKET/ --delete
aws cloudfront create-invalidation --distribution-id $DIST_ID --paths "/index.html"

# Backend
cd backend && npx sls deploy --stage dev
```

## Scheduled Tasks (EventBridge)

**Synthetic Readings Generator:**
- Schedule: every 1 minute (EventBridge)
- Lambda: `infra/synthetic-generator/index.mjs`
- Purpose: generates synthetic meter readings using Box-Muller transform from statistical profiles
- Data: profiles per meter per hour in `infra/reimport-readings/profiles.json`
- Connects: directly to RDS via `pg` client (not via NestJS)
- Note: marked as TEMPORARY, intended to be replaced by real MQTT pipeline

**Offline Alerts Scanner:**
- Schedule: every 5 minutes (EventBridge, defined in `backend/serverless.yml`)
- Lambda: `backend/src/offline-alerts.ts`
- Purpose: detects meters that haven't reported readings recently
- Uses: NestJS `AlertsService.scanOfflineMeters()` via standalone application context

## Environment Configuration

**Required env vars (Backend Lambda):**
- `DB_HOST` - RDS endpoint
- `DB_PORT` - PostgreSQL port (default: 5432)
- `DB_NAME` - Database name (default: energy_monitor)
- `DB_USERNAME` - Database user
- `DB_PASSWORD` - Database password
- `GOOGLE_CLIENT_ID` - Google OAuth client ID for JWT verification
- `MICROSOFT_CLIENT_ID` - Microsoft OAuth client ID for JWT verification
- `NODE_ENV` - Set to `production` in Lambda

**Required env vars (Frontend build):**
- `VITE_AUTH_MODE` - Auth mode configuration
- `VITE_MICROSOFT_CLIENT_ID` - Microsoft OAuth client ID
- `VITE_MICROSOFT_TENANT_ID` - Microsoft tenant ID
- `VITE_GOOGLE_CLIENT_ID` - Google OAuth client ID

**Required env vars (Infra Lambdas):**
- `DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME` - Direct pg connection

**VPC Configuration (Backend Lambda):**
- `VPC_SECURITY_GROUP_ID` - Security group for Lambda
- `VPC_SUBNET_ID_1`, `VPC_SUBNET_ID_2`, `VPC_SUBNET_ID_3` - VPC subnets

**Secrets location:**
- GitHub Actions secrets (for CI/CD)
- `.env` files locally (gitignored)
- Lambda environment variables in AWS (set via `serverless.yml` referencing `env:` vars)

## Webhooks & Callbacks

**Incoming:**
- None detected

**Outgoing:**
- None detected

## Data Pipeline

**Current (Synthetic):**
```
EventBridge (1 min) -> Lambda (synthetic-generator) -> RDS (readings table)
```

**Planned (Real):**
```
Siemens Meters -> MQTT -> Lambda -> RDS (readings table)
```
Not yet implemented. The synthetic generator (`infra/synthetic-generator/index.mjs`) is explicitly marked as temporary.

**Historical Data:**
- CSV import script at `sql/import-readings.mjs`
- Historical CSV at `infra/reimport-readings/energy_meters_15devices_2months.csv`
- Profile regeneration at `infra/reimport-readings/regen-synthetic.mjs`

---

*Integration audit: 2026-03-09*

# CLAUDE.md

## Rules
- Si hay conflicto entre este archivo y el codigo, el codigo manda.
- Detalle extenso vive en `docs/context/`. Leer archivo correspondiente cuando necesites profundidad.

## Contexto Detallado (docs/context/)
| Archivo | Contenido |
|---------|-----------|
| [`db-schema.md`](docs/context/db-schema.md) | Tablas, columnas, relaciones, migraciones |
| [`api-endpoints.md`](docs/context/api-endpoints.md) | Endpoints con params y responses |
| [`frontend-views.md`](docs/context/frontend-views.md) | Vistas, hooks, cache, tipos TS |
| [`auth-rbac.md`](docs/context/auth-rbac.md) | Auth flow, RBAC, scoping |
| [`ingest-pipeline.md`](docs/context/ingest-pipeline.md) | Drive pipeline, billing import |
| [`functional-spec.md`](docs/context/functional-spec.md) | XLSX spec, alertas, navegacion |
| [`key-files.md`](docs/context/key-files.md) | Archivos clave backend/frontend/infra |
| [`CHANGELOG.md`](CHANGELOG.md) | Release notes (entrada mas reciente al inicio) |

## Project Overview
Plataforma monitoreo energetico multi-tenant. Dos temas: **PASA** (875 medidores, billing, drill-down) y **Siemens** (POC3000 via IoT Core MQTT). Mismas vistas, distinta fuente de datos segun tema. Vive en `monitoreo-v2/`.

## Estado Actual (v2.44.0)
- **Prod:** `power-monitor.cloud` — ECS rev 21, migraciones 1-55
- **Data:** ultima lectura `readings` = 25 abril 2026. NO hay pipeline PASA activo. Aggregated queries deshabilitadas.
- **Security:** JWT 15min, step-up auth, Redis rate limiting + JWT blacklist, WAF, pentest 91/0/22
- **Tests:** 1307 backend / 903 frontend / 23 E2E Playwright
- **Mapa:** 47 malls (20 indoor + 27 markers), 5977 stores, 946 tiles
- **IoT:** auto-discovery activo, asignacion libre desde `/admin/iot-devices`

### Pendiente
- Pipeline ingestion PASA (Drive->S3->RDS diario). Sin esto, vistas agregadas = placeholder.
- Timescale Cloud migration (`docs/ops/timescale-migration-plan.md`)
- SSO Azure AD PASA (credenciales cliente)
- Salida sandbox SES

## Tech Stack
- **Frontend:** React 19, Vite 8, TS 5.9, Tailwind v4, Highcharts Stock 12, TanStack Query v5, Zustand 5, React Router v7
- **Backend:** NestJS 11, TypeORM 0.3, PostgreSQL 16, jose (JWT/JWKS)
- **Infra:** ECS Fargate, RDS, S3+CloudFront, IoT Core, EventBridge, Lambda
- **Auth:** MSAL v5 (Microsoft), @react-oauth/google, cookie httpOnly

## Architecture
```
CloudFront (power-monitor.cloud)
+-- /* -> S3 (frontend SPA)
+-- /api/* -> API Gateway -> Lambda (NestJS) -> RDS PostgreSQL

Siemens POC3000 -> MQTT (IoT Core) -> S3 -> Lambda iot-ingest -> RDS
EventBridge (15min) -> Lambda synthetic-readings -> RDS
```

## Frontend Patterns
- **API layer:** `services/routes.ts` -> `services/endpoints.ts` -> `hooks/queries/use<Entity>.ts`
- **State:** TanStack Query (server) | Zustand useAuthStore + useAppStore (sessionStorage)
- **Multi-tema:** `useAppStore.theme` -> CSS vars `[data-theme="siemens"]` + hooks cambian data source
- **Routing:** `appRoutes.ts` -> `router.tsx` (lazy + ErrorBoundary + Suspense + ProtectedRoute)
- **Feature folders:** `features/<domain>/<Domain>Page.tsx` + `components/`
- **UI components:** `Drawer`, `DropdownSelect`, `DataTable`, `Button`, `Toggle`, `Card`, `Modal`, `QueryStateView` en `components/ui/`
- **Styling:** Tailwind v4 tokens: `text-pa-text`, `text-pa-text-muted`, `text-pa-navy`, `border-pa-border`
- **Highcharts:** import unico desde `lib/highcharts-init.ts`

## Backend Patterns
- **Module (4-file):** entity -> service -> controller -> module. Registrar en app.module.ts.
- **TypeORM:** autoLoadEntities, synchronize: false. Raw SQL con `this.dataSource.query()`.
- **Auth:** Guard global JWT + `@RequirePermissions(module, action)` + `RolesGuard`
- **Validation:** Global ValidationPipe({ whitelist, forbidNonWhitelisted, transform })
- **Error handling:** service null -> controller NotFoundException

## Development

```bash
# Hot reload (recomendado)
cd monitoreo-v2 && docker compose up -d timescaledb
cd monitoreo-v2/backend && cp .env.example .env && npm ci && npm run start:dev
cd monitoreo-v2/frontend && npm ci && npm run dev

# Frontend contra prod (zero Docker)
cd monitoreo-v2/frontend && VITE_API_TARGET=https://power-monitor.cloud npm run dev
```

**DB local:** `DB_HOST=127.0.0.1 DB_PORT=5434 DB_NAME=monitoreo_v2 DB_PASSWORD=monitoreo2026`

## Environment Variables
- **Backend required (prod):** `JWT_SECRET` (min 32), `COOKIE_SECRET`, `FRONTEND_URL`, `DB_HOST`, `DB_PASSWORD`, `MICROSOFT_TENANT_ID`, `MICROSOFT_CLIENT_ID`, `GOOGLE_CLIENT_ID`
- **Backend optional:** `REDIS_URL`, `SES_FROM_EMAIL`, `ALERT_EMAIL_RECIPIENTS`, `LOG_FORMAT=json`, `RDS_CA_BUNDLE_PATH`, `CONFIG_ENCRYPTION_KEY`
- **Frontend:** `VITE_AUTH_MODE`, `VITE_MICROSOFT_CLIENT_ID`, `VITE_MICROSOFT_TENANT_ID`, `VITE_GOOGLE_CLIENT_ID`

## Conventions
- **Idioma:** Espanol en UI/labels/changelog. Ingles en codigo/variables/commits.
- **Files:** PascalCase componentes, camelCase hooks/services (frontend). kebab-case con sufijo (backend).
- **Exports:** Named exports everywhere (excepto `api` Axios default).
- **TypeScript:** strict ambos. Backend: experimentalDecorators. Frontend: verbatimModuleSyntax.
- **Formatting:** 2-space, single quotes, semicolons, trailing commas. No Prettier.

## Deploy
- **Runbook:** [docs/aws-runbook.md](docs/aws-runbook.md)
- **Frontend:** `cd monitoreo-v2/frontend && npm run build && aws s3 sync dist/ s3://power-monitor-frontend/ --exclude "docs/*" --region us-east-1 && aws cloudfront create-invalidation --distribution-id E1SNFETXON2VSI --paths "/*"`
- **NUNCA usar `--delete`** en sync — borra `/docs/` (Docusaurus) del bucket.
- **Migraciones prod:** `docs/ops/rds-migrations-via-ecs-exec.md`

## References
[CHANGELOG](CHANGELOG.md) | [Docs Site](https://power-monitor.cloud/docs/) | [AWS Runbook](docs/aws-runbook.md) | [Issues & Fixes](docs/ISSUES_&_FIXES.md)

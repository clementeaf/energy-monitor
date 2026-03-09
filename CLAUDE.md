# CLAUDE.md

## Project Overview
Plataforma de monitoreo energético en tiempo real para edificios comerciales. Telemetría de 15 medidores Siemens (PAC1670 3P, PAC1651 1P) en 2 edificios, drill-down jerárquico, alertas, uptime tracking, Highcharts Stock interactivos.

## Tech Stack
- **Frontend:** React 19, Vite 7, TypeScript 5.9, Tailwind CSS v4, Highcharts Stock 12, TanStack Query v5, TanStack Table v8, Zustand 5, React Router v7, MSAL v5, @react-oauth/google
- **Backend:** NestJS 11, TypeORM 0.3, PostgreSQL 16, @vendia/serverless-express, jose (JWT/JWKS), class-validator, Swagger
- **Infra:** AWS Lambda (Node 20, Serverless Framework v3), API Gateway HTTP, RDS PostgreSQL, S3+CloudFront, EventBridge
- **CI/CD:** GitHub Actions → S3 sync + CloudFront invalidation (frontend), `sls deploy` (backend)
- **Testing:** Jest 29 + ts-jest (backend, sin tests escritos). Frontend sin test runner.

## Architecture
```
CloudFront (energymonitor.click)
├── /* → S3 (frontend SPA)
└── /api/* → API Gateway → Lambda (NestJS)
                              └── RDS PostgreSQL (VPC)

EventBridge (1 min) → Lambda synthetic-readings-generator → RDS
EventBridge (5 min) → Lambda offlineAlerts → RDS
```
- OAuth dual: Microsoft Entra + Google. JWT verificado via JWKS (`jose`). Provider detectado por `iss` claim.
- RBAC: 7 roles, 10 módulos, 3 acciones. Tabla `role_permissions`. **Solo frontend enforce** (`ProtectedRoute`); backend NO tiene auth guards en data endpoints.
- Lecturas: CSV históricas (86K filas, 15min) + sintéticas (Box-Muller por perfil estadístico/medidor/hora)
- Jerarquía: `hierarchy_nodes` con CTE recursivos (Edificio → Gateway → Medidor)
- State: TanStack Query (server), Zustand (auth + UI), no global app state adicional
- Resolución dinámica: ≤36h→15min, ≤7d→hourly, >7d→daily

## Development
```bash
cd frontend && npm ci && npm run dev   # http://localhost:5173
cd backend && npm ci && npm run start:dev   # http://localhost:4000
cd backend && npx sls offline   # Lambda emulation
```
Vite proxy: `/api` → API Gateway en dev (`vite.config.ts`)

## Conventions
- **Idioma:** Español en UI/labels/changelog. Inglés en código/variables/commits.
- **Frontend files:** PascalCase componentes (`BuildingsPage.tsx`), camelCase hooks (`useMeters.ts`), camelCase services (`endpoints.ts`)
- **Backend files:** kebab-case con sufijo (`meters.service.ts`, `meter.entity.ts`, `building-response.dto.ts`)
- **Feature folders:** `features/<domain>/` con `*Page.tsx` + `components/`
- **Hooks:** `hooks/queries/use<Entity>.ts` (TanStack Query), `hooks/auth/use<Provider>.ts`
- **API layer (3-file):** `routes.ts` (URL builders) → `endpoints.ts` (Axios calls) → `hooks/queries/use<Entity>.ts`
- **Backend module (4-file):** `entity.ts` → `service.ts` → `controller.ts` → `module.ts`
- **Entities TypeORM:** `<domain>/<entity>.entity.ts`, `synchronize: false`, `autoLoadEntities: true`
- **SQL migrations:** `sql/00N_<name>.sql`
- **Exports:** Named exports everywhere (no default exports excepto `api` Axios instance)
- **Imports:** Relative paths (no aliases). Orden: framework → libs → local
- **TypeScript:** strict mode ambos. Backend: `experimentalDecorators`. Frontend: `verbatimModuleSyntax`
- **Formatting:** 2-space indent, single quotes, semicolons, trailing commas. No Prettier.
- **Logging:** Backend `Logger` NestJS (`this.logger.warn/log`). Frontend `console.error('[Component]', err)`.
- **Error handling:** NestJS exceptions (`NotFoundException`), Axios 401 interceptor limpia auth, `ErrorBoundary` en todas las rutas

## Key Files
| Archivo | Propósito |
|---|---|
| `backend/src/serverless.ts` | Entry point Lambda (cached NestJS bootstrap) |
| `backend/src/offline-alerts.ts` | Lambda scheduled: detecta medidores offline (NO cachea bootstrap) |
| `backend/src/meters/meters.service.ts` | Core: lecturas, uptime, alarmas, consumo (309 líneas, 7 raw SQL queries) |
| `backend/src/hierarchy/hierarchy.service.ts` | CTE recursivos para drill-down (N+1 en children) |
| `backend/src/auth/auth.service.ts` | JWT/JWKS verification, user upsert, permisos |
| `backend/serverless.yml` | Lambda 256MB/10s, VPC, env vars |
| `frontend/src/components/ui/StockChart.tsx` | Highcharts Stock wrapper (bugs documentados en ISSUES) |
| `frontend/src/features/drilldown/DrilldownPage.tsx` | Drill-down jerárquico interactivo |
| `frontend/src/hooks/auth/useAuth.ts` | Fachada auth Microsoft/Google (race condition con ref guard) |
| `frontend/src/services/api.ts` | Axios con Bearer injection + 401 interceptor |
| `frontend/src/store/useAuthStore.ts` | Zustand persist → sessionStorage |
| `frontend/src/app/appRoutes.ts` | Rutas centralizadas + RBAC roles |
| `infra/synthetic-generator/index.mjs` | TEMPORAL: lecturas sintéticas (1/min, Box-Muller) |
| `infra/reimport-readings/profiles.json` | Perfiles estadísticos por medidor/hora |
| `sql/004_meters_readings.sql` | Schema meters + readings + seed 15 medidores |

## Known Issues & Tech Debt
- **Sin auth guards en API:** Todos los data endpoints son públicos. CORS no protege contra calls directos.
- **SQL injection:** `findBuildingConsumption` interpola `from`/`to` sin parametrizar.
- **Sin tests:** Zero coverage. Jest instalado en backend pero sin tests.
- **N+1 queries:** `findChildrenWithConsumption` ejecuta 3N+1 queries por nodo.
- **offlineAlerts cold start:** Bootstrap completo NestJS en cada invocación (288/día).
- **Readings sin retention:** 21,600 filas/día, sin partitioning ni cleanup.
- **SSL `rejectUnauthorized: false`** en todas las conexiones DB.
- **Serverless Framework v3** acercándose a EOL.
- **Token en sessionStorage:** Vulnerable a XSS.
- **Sin rate limiting, sin security headers, sin structured logging.**

## Deploy
- **Usar:** [AWS Runbook](docs/aws-runbook.md) + [Deploy Skill](skills/deploy.md)
- **NO usar:** cpanel-runbook.md, git-deploy.md, server-runbook.md

## References
- [CHANGELOG](CHANGELOG.md)
- [Issues & Fixes](docs/ISSUES_&_FIXES.md)
- [Perfil de Datos](scripts/perfil_datos.py)
- [Patrones Frontend](patterns/frontend.md)
- [Patrones Backend](patterns/backend.md)
- [Patrones DevOps](patterns/devops.md)
- [Patrones Fullstack](patterns/fullstack.md)

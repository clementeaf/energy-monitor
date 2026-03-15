# CLAUDE.md

## Purpose
Fuente única de contexto operativo. Detalle extenso vive en `docs/context/`.

- **Regla de mantenimiento:** si se agrega o cambia un patrón real, actualizar este archivo y/o los archivos de contexto.
- **Regla de verdad:** si hay conflicto entre este archivo y el código, el código manda; luego corregir.

## Prompt Mínimo
- Arranque base: `Read CLAUDE.md`
- Con tarea: `Read CLAUDE.md. Hoy voy a [tarea].`
- Si necesitas detalle específico: leer el archivo de `docs/context/` correspondiente.

## Contexto Detallado (docs/context/)
| Archivo | Contenido |
|---------|-----------|
| [`db-schema.md`](docs/context/db-schema.md) | Tablas, columnas, relaciones, migraciones |
| [`api-endpoints.md`](docs/context/api-endpoints.md) | Todos los endpoints con params y responses |
| [`frontend-views.md`](docs/context/frontend-views.md) | Vistas, gráficos, hooks, cache, tipos TS, flujo |
| [`auth-rbac.md`](docs/context/auth-rbac.md) | Auth flow, RBAC, scoping, onboarding |
| [`ingest-pipeline.md`](docs/context/ingest-pipeline.md) | Drive pipeline, promotion, agregados, billing import |
| [`functional-spec.md`](docs/context/functional-spec.md) | XLSX spec, alertas objetivo, navegación objetivo |
| [`key-files.md`](docs/context/key-files.md) | Archivos clave backend/frontend/infra |

## Próxima Sesión

### Completado (2026-03-15)
- Deploy AWS completo: CloudFront `energymonitor.click` → S3 (frontend) + API Gateway → Lambda → RDS
- Frontend `api.ts` usa `VITE_API_BASE_URL` con fallback `/api` (relativo para CloudFront en prod)
- Lambda `DB_PASSWORD` actualizado en 3 funciones (api, offlineAlerts, dbVerify)
- Frontend build + deploy S3 + invalidación CloudFront
- Fix TS: `aggregations.ts` tipos genéricos, `AlertsPage.tsx` RefObject
- RDS migración: 8 tablas operativas restauradas (store, store_type, building_summary, meter_monthly, meter_monthly_billing, tariff, alerts, billing_document)
- Infra temporal revertida: route→NAT, SG sin CIDRs públicos, RDS no-publicly-accessible
- GitHub secret `DB_PASSWORD` configurado
- Limpieza: S3 dump, task definitions, log group eliminados

### Pendiente
- Cargar meter_readings y raw_readings (~30M rows cada una). Plan: escalar RDS a db.t3.medium, restore selectivo, bajar a micro.

### Prompt de retoma
```
Read CLAUDE.md. Retomando sesión.

Deploy AWS completo. CloudFront energymonitor.click → S3 + API GW → Lambda → RDS.
8 tablas operativas en RDS con datos verificados.
Pendiente: cargar meter_readings y raw_readings (30M+ rows).
Plan: escalar RDS a db.t3.medium → restore selectivo desde Docker → bajar a micro.
```

## Prioridad Actual de Acceso
`rol → vistas → acciones`. Un usuario invitado entra con rol asignado que define qué vistas y acciones puede ejecutar.

## Project Overview
Plataforma de monitoreo energético en tiempo real para edificios comerciales. 875 medidores en 5 edificios, drill-down jerárquico, alertas, uptime tracking, Highcharts Stock interactivos.

## Tech Stack
- **Frontend:** React 19, Vite 7, TypeScript 5.9, Tailwind CSS v4, Highcharts Stock 12, TanStack Query v5, TanStack Table v8, Zustand 5, React Router v7
- **Backend:** NestJS 11, TypeORM 0.3, PostgreSQL 16, @vendia/serverless-express, jose (JWT/JWKS)
- **Infra:** AWS Lambda (Node 20, Serverless v3), ECS Fargate, API Gateway HTTP, RDS PostgreSQL, S3+CloudFront, EventBridge
- **Auth:** MSAL v5 (Microsoft), @react-oauth/google
- **Testing:** Jest 29 (backend, suite mínima). Frontend sin tests.

## Architecture
```
CloudFront (energymonitor.click)
├── /* → S3 (frontend SPA)
└── /api/* → API Gateway → Lambda (NestJS, cached bootstrap)
                              └── RDS PostgreSQL (VPC, 3 subnets)

EventBridge (1 min) → Lambda synthetic-readings-generator → RDS
EventBridge (5 min) → Lambda offlineAlerts → RDS
EventBridge (daily 03:00 Chile) → ECS Fargate drive-pipeline → Drive→S3→RDS
```

## Frontend Patterns
- **API layer (3-file):** `services/routes.ts` → `services/endpoints.ts` → `hooks/queries/use<Entity>.ts`
- **State:** TanStack Query (server) | Zustand useAuthStore + useAppStore (sessionStorage)
- **Routing:** `appRoutes.ts` → `router.tsx` (lazy + ErrorBoundary + Suspense + ProtectedRoute)
- **Feature folders:** `features/<domain>/<Domain>Page.tsx` + `components/`
- **Shared utils:** `lib/formatters.ts`, `lib/constants.ts`, `lib/aggregations.ts`, `lib/chartConfig.ts`
- **Shared UI:** `PillButton`, `SectionBanner`, `TogglePills`, `PillDropdown` en `components/ui/`
- **Shared hooks:** `useClickOutside` en `hooks/`
- **Styling:** Tailwind v4 tokens PA: `text-pa-text`, `text-pa-text-muted`, `text-pa-navy`, `bg-white`, `border-pa-border`, `text-pa-blue`, `hover:bg-gray-100`
- **StockChart:** afterSetExtremes → pickResolution(rangeMs) → refetch; keepPreviousData

## Backend Patterns
- **NestJS module (4-file):** entity → service → controller → module. Registrar en app.module.ts.
- **TypeORM:** autoLoadEntities, synchronize: false. Raw SQL con `this.dataSource.query()`. rawVal() para pg minúsculas.
- **Auth:** Guard global JWT + `@RequirePermissions(module, action)` + `RolesGuard`
- **Validation:** Global ValidationPipe({ whitelist, transform }). DTOs con class-validator.
- **Swagger:** @ApiOperation (español), @ApiOkResponse, @ApiParam, @ApiQuery
- **Error handling:** service null → controller NotFoundException; auth null on failure

## Data Flow (end-to-end)
```
routes.ts → endpoints.ts → useX.ts → Axios Bearer → CloudFront → API Gateway → Lambda
→ controller → service → raw SQL → PostgreSQL → JSON → TanStack Query → React → Highcharts/Table
```

## Development
```bash
cd frontend && npm ci && npm run dev
cd backend && npm ci && npm run start:dev
```
**DB local:** docker `pg-arauco` → `DB_HOST=127.0.0.1 DB_PORT=5434 DB_NAME=arauco DB_USERNAME=postgres DB_PASSWORD=arauco`

## Environment Variables
- **Backend Lambda:** `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD`, `GOOGLE_CLIENT_ID`, `MICROSOFT_CLIENT_ID`, `NODE_ENV`
- **Frontend:** `VITE_AUTH_MODE`, `VITE_MICROSOFT_CLIENT_ID`, `VITE_MICROSOFT_TENANT_ID`, `VITE_GOOGLE_CLIENT_ID`

## Conventions
- **Idioma:** Español en UI/labels/changelog. Inglés en código/variables/commits.
- **Files:** PascalCase componentes, camelCase hooks/services (frontend). kebab-case con sufijo (backend).
- **Exports:** Named exports everywhere (excepto `api` Axios default).
- **TypeScript:** strict ambos. Backend: experimentalDecorators. Frontend: verbatimModuleSyntax.
- **Formatting:** 2-space, single quotes, semicolons, trailing commas. No Prettier.

## Deploy
- **Usar:** [AWS Runbook](docs/aws-runbook.md) + [Deploy Skill](skills/deploy.md)

## Known Issues & Tech Debt
- SSL rejectUnauthorized: false en conexiones DB
- Token en sessionStorage (vulnerable a XSS)
- Sin rate limiting, sin security headers, sin structured logging
- Suite de tests mínima
- Invitaciones sin envío por email

## Playbooks Opcionales
- Componente nuevo: `patterns/playbooks/new-component.md`
- Chart nuevo: `patterns/playbooks/new-chart.md`
- Endpoint nuevo: `patterns/playbooks/new-endpoint.md`
- Flujo end-to-end: `patterns/playbooks/new-fullstack-flow.md`

## Contexto Externo
- Spec funcional XLSX: `docs/POWER_Digital_Especificacion_Modulos-rev2.1.xlsx` (ver `docs/context/functional-spec.md`)
- Documento externo complementario: `/Users/clementefalcone/Desktop/personal/Proyectos/Proyectos/energy-monitor.md`

## References
[CHANGELOG](CHANGELOG.md) | [Issues & Fixes](docs/ISSUES_&_FIXES.md) | [Auth Microsoft](docs/auth-microsoft-data-scope.md) | [AWS Runbook](docs/aws-runbook.md)

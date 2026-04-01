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

### Completado (2026-04-01)
- **Fase 2 backend completa** — 6 módulos: Hierarchy, Concentrators, TenantUnits, Tariffs, Invoices, FaultEvents. Tenant scoping + buildingIds RBAC. 40 endpoints, 152 tests nuevos
- **Frontend conectado a backend** — API layer completo: routes, endpoints, tipos TS, query hooks para buildings, meters, alerts, alertRules, readings
- **BuildingsPage** — Tabla con datos reales, click navega a medidores. CRUD modal (admin only)
- **MetersPage** — Nueva ruta `/meters`, filtro por edificio, CRUD modal (admin only)
- **AlertsPage** — Tabla con filtros (status, severity, building), acciones acknowledge/resolve
- **DashboardPage** — KPIs reales, StockChart dual-axis (potencia + FP) con resolucion adaptativa, alertas activas, resumen por edificio
- **Badge alertas** — Conteo alertas activas en sidebar
- **Componentes UI** — `Modal`, `ConfirmDialog`, `BuildingForm`, `MeterForm`
- **PLAN_ACCION.md** — Plan priorizado 8 fases con microtareas. Fases 1-2 completas

### Completado (2026-03-30)
- **ReadingsModule** — Read-only: `GET /readings` (time-series con downsampling vía `time_bucket`), `GET /readings/latest` (última lectura por medidor), `GET /readings/aggregated` (hourly/daily/monthly). Tenant + buildingIds RBAC
- **Dashboard layout** — Semáforo alertas movido a fila de controles. Cards y tabla Facturas Vencidas aprovechan espacio vertical completo
- **AlertsModule** — `GET /alerts` (filtros status/severity/buildingId/meterId), `GET /:id`, `PATCH /:id/acknowledge`, `PATCH /:id/resolve`. Tenant + buildingIds RBAC
- **AlertRulesModule** — CRUD reglas de alerta. Reglas globales (sin building) visibles cross-building
- **Tech debt cleanup** — TenantMiddleware y RolesGuard eliminados, DELETE → 204, `strict: true`, coverage threshold 80%, audit log con Logger, `access_level` limpiado, FK audit preservado, decoradores extraídos, dirs vacíos eliminados
- **BuildingsModule** — CRUD con tenant scoping + buildingIds RBAC
- **MetersModule** — CRUD con tenant + buildingIds scoping + filtro buildingId
- **138 tests, 16 suites** en backend

### Completado (2026-03-25)
- **Charts agnósticos** — `Chart`, `StockChart`, `MonthlyChart` + `chart-config.ts` en monitoreo-v2. Colores via CSS vars, sin acoplamiento a tema
- **Storybook 9** — catálogo de componentes en puerto 6006. Stories para los 3 charts
- **Fix login Microsoft** — race condition en `useSessionResolver` (esperaba MSAL `InteractionStatus.None`)
- **Layout cleanup** — sidebar sin iconos, "Cerrar Sesión" al fondo del sidebar
- **monitoreo-v2 frontend + auth e2e** — React 19, Vite 8, Tailwind v4. Login funcional con Microsoft (redirect) y Google (implicit + userinfo). Theming dinamico desde tenant. Session flag evita 401 innecesario. Seed tenant+user en TimescaleDB
- **monitoreo-v2 backend scaffold** — NestJS 11 + TimescaleDB (Docker), multi-tenant, ISO 27001, auth OAuth (JWKS jose), JWT httpOnly cookies, refresh token rotation (FOR UPDATE), audit log hypertable, rate limiting, helmet
- Fix operator filter: Siemens bypasses `useOperatorFilter` en Buildings, Alerts, Realtime
- Fix POC3000 VARIABLE_MAP: 10 variables corregidas en `iot-ingest` Lambda
- Backfill 123 filas IoT en prod (reactive, frequency, energy, THD) via dbVerify
- Alertas IoT: endpoint `/iot-readings/alerts` + `useAlerts` theme-aware
- dbVerify: nueva función `backfillIotReadings` para re-extraer de `raw_json`

### Completado (2026-03-24)
- IoT Core Siemens: Thing `siemens-poc3000`, certs TLS, policy `powercenter/*`, regla S3
- Lambda `iot-ingest`: S3 → tabla `iot_readings` cada 15 min, deduplicación unique index
- Multi-tema frontend: toggle PASA/Siemens, colores CSS variables, logo/favicon/título dinámicos
- Backend `IotReadingsModule`: 9 endpoints PASA-compatibles desde `iot_readings`
- Hooks theme-aware: mismas vistas, distinta fuente de datos según tema
- Siemens POC3000 conectado y enviando 451 variables cada 15 min

### Completado (2026-03-22)
- Globe Landing desplegado en globepower.cl (CF `EHRW4X3FSU1YQ`)

### Pendiente
- **monitoreo-v2**: Invoices generate + PDF endpoints (pendiente Fase 4)
- **monitoreo-v2**: Fases 3-8 del PLAN_ACCION — vistas monitoreo, facturación, admin, alertas avanzadas, reportes
- Verificar backfill MG + re-ejecutar dbVerify para is_three_phase
- Solicitar salida de SES sandbox (consola AWS)
- Costo por Centro (pendiente definición con cliente)
- DNS plataforma.globepower.cl: CNAME GoDaddy + alias CloudFront
- Reemplazar SVG placeholder Siemens con logo oficial
- Cuenta AWS `058310292956`: configurar método de pago (sin billing activo)
- Redeploy Lambda `iot-ingest` con VARIABLE_MAP corregido

### Prompt de retoma
```
Read CLAUDE.md y docs/PLAN_ACCION.md. Retomando monitoreo-v2.
Backend: Fases 1-2 completas — 12 módulos activos (290 tests, 28 suites).
Frontend: Fase 1 completa — API layer, BuildingsPage, MetersPage, AlertsPage, DashboardPage conectados.
Pendiente: Fases 3-8 del PLAN_ACCION (vistas monitoreo, facturacion, admin, alertas avanzadas, reportes).
```

## Prioridad Actual de Acceso
`rol → vistas → acciones`. Un usuario invitado entra con rol asignado que define qué vistas y acciones puede ejecutar.

## Project Overview
Plataforma de monitoreo energético multi-cliente. Dos temas: **PASA** (875 medidores PAC en 5 edificios, billing, drill-down jerárquico) y **Siemens** (POC3000 vía IoT Core MQTT, datos eléctricos puros). Mismas vistas, distinta fuente de datos según tema.

### monitoreo-v2
Rewrite multi-tenant de la plataforma. Vive en `monitoreo-v2/`.
- **Backend:** NestJS 11 + TimescaleDB (PG16) + Docker. Auth OAuth → JWT httpOnly cookies. ISO 27001.
- **Frontend:** React 19 + Vite 8 + Tailwind v4. Auth cookie-based (sin sessionStorage). Theming dinamico desde tenant. Storybook 9.
- **Target deploy:** AWS ECS Fargate. API externa para terceros.

## Tech Stack
- **Frontend:** React 19, Vite 8, TypeScript 5.9, Tailwind CSS v4, Highcharts Stock 12, TanStack Query v5, TanStack Table v8, Zustand 5, React Router v7
- **Backend:** NestJS 11, TypeORM 0.3, PostgreSQL 16, @vendia/serverless-express, jose (JWT/JWKS)
- **Infra:** AWS Lambda (Node 20, Serverless v3), ECS Fargate, API Gateway HTTP, RDS PostgreSQL, S3+CloudFront, EventBridge, AWS IoT Core (MQTT)
- **Auth:** MSAL v5 (Microsoft), @react-oauth/google
- **Testing:** Jest 30 (backend, 290 tests / 28 suites). Frontend sin tests.

## Architecture
```
CloudFront (energymonitor.click)
├── /* → S3 (frontend SPA)
└── /api/* → API Gateway → Lambda (NestJS, cached bootstrap)
                              └── RDS PostgreSQL (VPC, 3 subnets)

EventBridge (15 min) → Lambda synthetic-readings-generator → RDS (+ prune + cache refresh)
EventBridge (5 min) → Lambda offlineAlerts → RDS
EventBridge (daily 03:00 Chile) → ECS Fargate drive-pipeline → Drive→S3→RDS

Siemens POC3000 → MQTT (IoT Core) → Rule powercenter_to_s3 → S3
EventBridge (15 min) → Lambda iot-ingest → S3 → RDS (iot_readings)
```

## Frontend Patterns
- **API layer (3-file):** `services/routes.ts` → `services/endpoints.ts` → `hooks/queries/use<Entity>.ts`
- **State:** TanStack Query (server) | Zustand useAuthStore + useAppStore (sessionStorage, incl. userMode + selectedOperator + selectedBuilding + selectedStoreMeterId + theme)
- **Multi-tema:** `useAppStore.theme` (`'pasa'|'siemens'`) → CSS variables `[data-theme="siemens"]` en `<html>` + hooks detectan tema y cambian fuente de datos. Config en `lib/themes.ts`
- **Routing:** `appRoutes.ts` → `router.tsx` (lazy + ErrorBoundary + Suspense + ProtectedRoute)
- **Feature folders:** `features/<domain>/<Domain>Page.tsx` + `components/`
- **Shared utils:** `lib/formatters.ts`, `lib/constants.ts`, `lib/aggregations.ts`, `lib/chartConfig.ts`
- **Shared UI:** `PillButton`, `SectionBanner`, `TogglePills`, `PillDropdown`, `PillDropdownMulti` en `components/ui/`
- **Shared hooks:** `useClickOutside`, `useOperatorFilter` en `hooks/`
- **Styling:** Tailwind v4 tokens PA: `text-pa-text`, `text-pa-text-muted`, `text-pa-navy`, `bg-white`, `border-pa-border`, `text-pa-blue`, `hover:bg-gray-100`
- **StockChart:** afterSetExtremes → pickResolution(rangeMs) → refetch; keepPreviousData

## Backend Patterns
- **NestJS module (4-file):** entity → service → controller → module. Registrar en app.module.ts.
- **TypeORM:** autoLoadEntities, synchronize: false. Raw SQL con `this.dataSource.query()`. rawVal() para pg minúsculas.
- **Auth:** Guard global JWT + `@RequirePermissions(module, action)` + `RolesGuard`
- **Validation:** Global ValidationPipe({ whitelist, transform }). DTOs con class-validator.
- **Swagger:** @ApiOperation (español), @ApiOkResponse, @ApiParam, @ApiQuery. Prod: `/api/spec` (JSON), `/api/docs` (redirige a UI pública). Dev: UI embebida en `/api/docs`
- **Error handling:** service null → controller NotFoundException; auth null on failure
- **IoT module:** `IotReadingsModule` — 9 endpoints read-only desde tabla `iot_readings`. Endpoints PASA-compatibles (`buildings`, `meters-latest`, `monthly`, `meter-readings`, `alerts`) devuelven misma interfaz que módulos PASA con conversión de unidades (W→kW, Wh→kWh). Alertas generadas on-the-fly desde anomalías (voltaje, PF, potencia, THD)

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

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
- 5 edificios en pg-arauco, 875 medidores, 30.7M lecturas — todos alineados a 2025
- Dashboard: datos reales completos — gráfico, tabla, cards de pago y tabla de vencidos
- Comparativas: datos reales. Toggle Por Tipo / Por Tienda, MultiSelect, gráfico toggle Barra/Línea
- Incidencias en medidor: líneas rojas en gráfico 15 min, columna Incidencias en tablas mensual y diaria
- Click en incidencia → navega a `/alerts` con filtros pre-aplicados (meter_id + fecha)
- Tabla `billing_document` con 60 registros sintéticos de pagos (pagado/por_vencer/vencido)
- Cards dashboard: Pagos Recibidos, Docs por Vencer, Docs Vencidos — con datos reales y colores
- Tabla "Documentos Vencidos por Período" — 4 rangos de días con conteo y montos
- Componente `Drawer` reutilizable (portal, overlay, Escape, 4 lados, 5 tamaños)
- Drawers en dashboard: click en cards "Docs por Vencer" y "Docs Vencidos" abre drawer con tabla detallada (Edificio, N° Doc, Vencimiento, Neto, IVA, Total)
- Endpoint `GET /dashboard/documents/:status` para detalle de documentos por estado

### Prompt de retoma
```
Read CLAUDE.md. Retomando sesión.

5 edificios, 875 medidores, 30.7M lecturas.
Dashboard completo: gráfico, tabla edificios, cards de pago y tabla vencidos con datos reales.
Cards "Docs por Vencer" y "Docs Vencidos" clickeables → Drawer con tabla detallada.
Comparativas con datos reales.
Incidencias en medidor con navegación a Alertas.
Componente Drawer reutilizable.
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
- **Styling:** Tailwind v4 tokens: `text-text`, `text-muted`, `bg-base`, `bg-raised`, `border-border`
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

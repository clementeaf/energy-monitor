# CLAUDE.md

## Purpose
Este archivo debe ser la fuente única de contexto operativo para trabajar en este repo con rapidez, bajo costo de tokens y mínima ambigüedad.

- **Objetivo:** que `Read CLAUDE.md` baste para implementar cambios fullstack sin depender de otros archivos de contexto.
- **Prioridad:** evitar alucinaciones, reducir código que rompa la app y mantener continuidad entre sesiones.
- **Regla de mantenimiento:** si se agrega o cambia un patrón real de frontend, backend, infra o flujo de datos, actualizar este archivo.
- **Regla de verdad:** si hay conflicto entre este archivo y el código, el código manda; luego corregir `CLAUDE.md`.

## Prompt Mínimo
Usar el menor contexto posible.

- Arranque base: `Read CLAUDE.md`
- Con tarea: `Read CLAUDE.md. Hoy voy a [tarea].`
- Si además hay objetivo específico: `Read CLAUDE.md. Hoy voy a [tarea]. Debe quedar logrado [resultado].`

No hace falta pedir `patterns/` para arrancar. Solo usarlo como anexo secundario si se busca contexto histórico o detalle ampliado.

## Prioridad Actual de Acceso
La prioridad funcional actual del producto es: `rol -> vistas -> acciones`.

- En este repo, `module` debe leerse como `vista` para diseño funcional y RBAC.
- El catálogo de vistas debe ser la fuente para definir qué pantallas existen y qué acciones se pueden ejecutar dentro de cada una.
- Un usuario invitado deberá entrar ya con un rol asignado.
- Ese rol definirá automáticamente qué vistas puede abrir y qué acciones puede ejecutar dentro de esas vistas.
- Cualquier cambio futuro de auth, navegación, permisos, onboarding o administración debe evaluarse primero contra ese modelo.

## Contexto Externo Complementario
Existe además un documento externo complementario en `/Users/clementefalcone/Desktop/personal/Proyectos/Proyectos/energy-monitor.md`.

- No reemplaza a `CLAUDE.md` como fuente operativa principal de este repo.
- Usarlo solo como referencia secundaria o contexto histórico adicional cuando haga falta contrastar decisiones fuera del workspace.

## Playbooks Opcionales
Usarlos solo si la tarea es muy puntual.

- Componente nuevo: `patterns/playbooks/new-component.md`
- Chart nuevo: `patterns/playbooks/new-chart.md`
- Endpoint nuevo: `patterns/playbooks/new-endpoint.md`
- Flujo end-to-end nuevo: `patterns/playbooks/new-fullstack-flow.md`
- Lambda programada nueva: `patterns/playbooks/new-scheduled-lambda.md`
- Leer especificación funcional XLSX: `patterns/playbooks/use-excel-spec.md`

## Functional Spec (XLSX)
La especificación funcional externa vive en `docs/POWER_Digital_Especificacion_Modulos-rev2.1.xlsx`.

- Sirve como blueprint de producto, no como reflejo exacto del código actual.
- Si hay conflicto, el código manda para comportamiento presente; el XLSX manda para intención funcional y roadmap.
- Hojas más útiles para trabajo operativo:
  - `1. Roles y Permisos`: RBAC, autenticación y sesión.
  - `2. Módulos - Resumen`: módulos, vistas, roles y fase.
  - `5. Datos y Campos`: tablas, KPIs, formatos y fuentes.
  - `6. Tipos de Alertas`: catálogo de alertas, umbrales, severidad y escalamiento.
  - `7. Navegación`: menú, rutas y acceso por rol.
- Otras hojas cubren filtros detallados, gráficos/visualizaciones y catálogo de alertas.

### Qué aporta hoy
- RBAC objetivo más rico que el enforcement actual del backend.
- Navegación objetivo mucho más amplia que la app hoy implementada.
- Contratos funcionales de vistas, campos y dashboards que sirven como guía de expansión.

### Alertas objetivo del XLSX
- El spec define 22 tipos de alertas/fallos, mucho más que el `METER_OFFLINE` hoy persistido en backend.
- Familias observadas: comunicación, eléctrica, consumo, operativa, generación y bus/concentrador.
- Cada alerta trae: variable monitoreada, umbral default, severidad, escalamiento, canal de notificación, frecuencia de check y guía de acción por rol.
- Ejemplos: pérdida de comunicación, timeout Modbus, sobretensión, subtensión, THD aviso/crítico, sobreconsumo, peak demand, factor de potencia bajo, breaker disparado, exportación detectada, sobrecorriente, desequilibrio de fases, CRC/dirección Modbus duplicada, fallo de concentrador, fallo MQTT S7-1200, corte total del edificio.
- Usar esta hoja como blueprint para futuras reglas de alerts; el código actual implementa solo una fracción mínima.

### Navegación objetivo del XLSX
- Menú objetivo mucho más amplio que el router actual.
- Grupos principales observados: `Dashboard`, `Monitoreo`, `Facturación` y módulos administrativos/reporting no implementados aún.
- Rutas objetivo visibles en la muestra: `/dashboard/executive`, `/dashboard/executive/:siteId`, `/dashboard/compare`, `/monitoring/realtime`, `/monitoring/drilldown/:siteId`, `/monitoring/devices`, `/monitoring/demand/:siteId`, `/monitoring/quality/:siteId`, `/monitoring/meters/type`, `/monitoring/generation/:siteId`, `/monitoring/modbus-map/:siteId`, `/monitoring/fault-history/:meterId`, `/monitoring/concentrator/:concentratorId`, `/billing/rates`, `/billing/generate`.
- Usar esta navegación como target funcional y roadmap; no asumir que todas esas rutas existen hoy en el código.

### Mapa objetivo y backlog normalizados
- El mapa objetivo de vistas derivado del XLSX se mantiene normalizado en `PLAN_ACCION.md`.
- Agrupación canónica actual: Acceso y Contexto, Dashboard, Monitoreo, Facturación, Alertas, Reportes, Analítica, Administración, Auditoría, Integraciones.
- Frontend implementado hoy: `/login`, `/unauthorized`, `/context/select`, `/`, `/buildings/:id`, `/meters/:meterId`, `/monitoring/realtime`, `/monitoring/devices`, `/alerts`, `/alerts/:id`, `/monitoring/drilldown/:siteId`, `/admin/sites`, `/admin/users`, `/admin/meters`, `/admin/hierarchy/:siteId`.
- Todo objetivo del XLSX que no exista en esas rutas debe tratarse como backlog funcional, no como funcionalidad asumida.

### Regla de planificación funcional
- Si se usa el XLSX para planificar producto, primero normalizar mapa objetivo de vistas.
- Luego convertirlo en etapas priorizadas y checklist ejecutable en `PLAN_ACCION.md`.
- Si se completa o cambia una vista objetivo, actualizar código, `PLAN_ACCION.md` y `CLAUDE.md` cuando cambie el contexto operativo base.

Usar este XLSX solo cuando `CLAUDE.md` no alcance para resolver una duda funcional puntual.

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
└── /api/* → API Gateway → Lambda (NestJS, cached bootstrap)
                              └── RDS PostgreSQL (VPC, 3 subnets)

EventBridge (1 min) → Lambda synthetic-readings-generator → RDS (pg directo)
EventBridge (5 min) → Lambda offlineAlerts → RDS (NestJS context, NO cached)
```

## Runtime Data Flow
```
Medidor Siemens (PAC1670/PAC1651)
  → [futuro] MQTT broker
  → [actual] Lambda synthetic-readings-generator (EventBridge 1/min)
    → INSERT readings (15 filas/min, una por medidor)
    → UPDATE meters SET last_reading_at = NOW(), status = 'online'
```

- `infra/synthetic-generator/profiles.json`: media + desviación estándar por medidor, por hora y por campo eléctrico.
- `energy_kwh_total` es acumulativo; incremento sintético = `power_kw * dt_hours`.
- Historial: CSV Ene-Feb 2026 importado, gap Mar 2-5 backfilled, Mar 6+ generado en tiempo real.

## Offline Alerts Flow
```
Lambda offlineAlerts (EventBridge 5/min)
  → SELECT meters WHERE last_reading_at < NOW() - 5min
  → INSERT alert (type=METER_OFFLINE) si no existe activa
  → UPDATE alert SET resolved_at = NOW() si el medidor volvió online
```

## Auth Flow
```
Login → Microsoft (MSAL redirect) | Google (credential/One Tap)
  → JWT id_token → sessionStorage['access_token']
  → Axios interceptor inyecta Bearer → GET /api/auth/me
  → Backend: AuthGuard reusable extrae Bearer → detectProvider(iss) → jose.jwtVerify(jwks RS256)
  → RolesGuard global lee metadata @RequirePermissions(module, action) y aplica 403 por permiso faltante
  → resolveUser(): enlaza identidad OAuth contra un usuario invitado/preprovisionado por email y luego carga permisos
  → Frontend: Zustand useAuthStore.setUser() + contexto de sitio en Zustand useAppStore
  → ProtectedRoute checks roles y fuerza selección de sitio cuando aplica
  → 401 Axios interceptor → limpia auth store + sessionStorage
```
- RBAC: 7 roles (`SUPER_ADMIN`, `CORP_ADMIN`, `SITE_ADMIN`, `OPERATOR`, `ANALYST`, `TENANT_USER`, `AUDITOR`), 10 módulos, 3 acciones
- Regla funcional vigente: `módulo = vista`; los permisos deben interpretarse como acceso a vistas y acciones disponibles dentro de esas vistas.
- La tabla `modules` ya persiste el catálogo de vistas/rutas reales implementadas con metadata de navegación (`route_path`, `navigation_group`, `show_in_nav`, `sort_order`, `is_public`).
- Backend exige JWT válido en endpoints API mediante guard global y aplica RBAC por módulo/acción con metadata `@RequirePermissions(...)`
- Mapeo RBAC actual backend: `BUILDINGS_OVERVIEW.view` para `GET /buildings`, `BUILDING_DETAIL.view` para `/buildings/:id*`, `MONITORING_DEVICES.view` para `GET /meters/overview`, `METER_DETAIL.view` para `/meters/:id*`, `MONITORING_DRILLDOWN.view` para `/hierarchy*`, `ALERTS_OVERVIEW.view/manage` para `/alerts` y `sync-offline`, `ALERT_DETAIL.view/manage` para `/alerts/:id*`
- Catálogo de vistas implementadas hoy en DB: `LOGIN`, `UNAUTHORIZED`, `CONTEXT_SELECT`, `BUILDINGS_OVERVIEW`, `BUILDING_DETAIL`, `METER_DETAIL`, `MONITORING_REALTIME`, `MONITORING_DEVICES`, `ALERTS_OVERVIEW`, `ALERT_DETAIL`, `MONITORING_DRILLDOWN`, `ADMIN_SITES`, `ADMIN_USERS`, `ADMIN_METERS`, `ADMIN_HIERARCHY`.
- Base vigente de onboarding: el login ya no autocrea usuarios no invitados; el acceso requiere un registro previo en `users` con rol preasignado y sitios opcionales/preasignados.
- Admin base disponible: `/admin/users` permite provisionar invitaciones con rol y sitios; `GET /roles` expone el catálogo para esa vista.
- Catálogo de vistas disponible por API: `GET /views` para inspeccionar las vistas persistidas en DB.
- Operación pendiente en entornos ya existentes: aplicar `sql/008_views_catalog.sql` para migrar `modules` al catálogo de vistas reales y reseedear `role_permissions`.
- Alcance pendiente: todavía no existe scoping por site/recurso, sólo autorización por rol-permiso

## API Endpoints

### Auth (`/auth`) — requiere Bearer
| Method | Path | Params | Response |
|---|---|---|---|
| GET | `/auth/me` | — | `{ user, permissions }` |
| GET | `/auth/permissions` | — | `{ role, permissions }` |

### Buildings (`/buildings`) — requiere Bearer
| Method | Path | Query | Response |
|---|---|---|---|
| GET | `/buildings` | — | `BuildingSummaryDto[]` |
| GET | `/buildings/:id` | — | `BuildingSummaryDto` |
| GET | `/buildings/:id/meters` | — | `Meter[]` |
| GET | `/buildings/:id/consumption` | `resolution?` (`15min`/`hourly`/`daily`), `from?`, `to?` | `ConsumptionPoint[]` |

### Meters (`/meters`) — requiere Bearer
| Method | Path | Query | Response |
|---|---|---|---|
| GET | `/meters/overview` | — | `MeterOverview[]` (status + uptime24h + alarmCount30d) |
| GET | `/meters/:id` | — | `Meter` |
| GET | `/meters/:id/readings` | `resolution?` (`raw`/`15min`/`hourly`/`daily`), `from?`, `to?` | `Reading[]` |
| GET | `/meters/:id/uptime` | `period?` (daily/weekly/monthly/all) | `UptimeSummary` \| `UptimeAll` |
| GET | `/meters/:id/downtime-events` | `from`, `to` | `DowntimeEvent[]` |
| GET | `/meters/:id/alarm-events` | `from`, `to` | `AlarmEvent[]` |
| GET | `/meters/:id/alarm-summary` | `from`, `to` | `AlarmSummary` |

### Hierarchy (`/hierarchy`) — requiere Bearer
| Method | Path | Query | Response |
|---|---|---|---|
| GET | `/hierarchy/:buildingId` | — | `HierarchyNode[]` (tree) |
| GET | `/hierarchy/node/:nodeId` | — | `{ node, path }` |
| GET | `/hierarchy/node/:nodeId/children` | `from?`, `to?` | `HierarchyChildSummary[]` |
| GET | `/hierarchy/node/:nodeId/consumption` | `resolution?` (`hourly`/`daily`), `from?`, `to?` | time-series |

### Alerts (`/alerts`) — requiere Bearer
| Method | Path | Query | Response |
|---|---|---|---|
| GET | `/alerts` | `status?`, `type?`, `meterId?`, `buildingId?`, `limit?` | `Alert[]` |
| GET | `/alerts/:id` | — | `Alert` |
| POST | `/alerts/sync-offline` | — | `AlertsSyncSummary` |
| PATCH | `/alerts/:id/acknowledge` | — | `Alert` |

### Users (`/users`) — requiere Bearer + `ADMIN_USERS`
| Method | Path | Params | Response |
|---|---|---|---|
| GET | `/users` | — | `AdminUserSummary[]` |
| POST | `/users` | `{ email, name, roleId, siteIds, isActive? }` | `AdminUserSummary` |

### Roles (`/roles`) — requiere Bearer + `ADMIN_USERS.view`
| Method | Path | Params | Response |
|---|---|---|---|
| GET | `/roles` | — | `RoleOption[]` |

### Views (`/views`) — requiere Bearer + `CONTEXT_SELECT.view`
| Method | Path | Params | Response |
|---|---|---|---|
| GET | `/views` | — | `ViewOption[]` |

Resolutions: `raw`, `15min`, `hourly`, `daily`. Fechas ISO 8601.
**users** — id: uuid PK auto, external_id: varchar(255)?, provider: varchar(20)? ['microsoft'|'google'], email: varchar(255), name: varchar(255), avatar_url: text?, role_id: smallint FK→roles default 4, is_active: bool default true, created_at/updated_at: timestamptz

- `external_id` y `provider` quedan nulos en invitaciones pendientes y se completan en el primer login válido.
`sql/001_schema.sql` → users, roles | `002_seed.sql` → seed 7 roles, catálogo de vistas implementadas y acciones | `003_buildings_locals.sql` → buildings | `004_meters_readings.sql` → meters, readings, seed 15 meters | `005_hierarchy_nodes.sql` → hierarchy tree | `006_alerts.sql` → alerts | `007_invite_first_users.sql` → permite usuarios preprovisionados sin provider/external_id | `008_views_catalog.sql` → migra modules a catálogo de vistas reales

## Database Schema

### Tables
**roles** — id: smallint PK, name: varchar(30) unique, label_es: varchar(50), is_active: bool, created_at: timestamptz

**modules** — id: smallint PK, code: varchar(40) unique, label: varchar(60), route_path: varchar(120) unique, navigation_group: varchar(40), show_in_nav: bool, sort_order: smallint, is_public: bool, is_active: bool

**actions** — id: smallint PK, code: varchar(20) unique

**role_permissions** — PK(role_id, module_id, action_id), FK role_id → roles

**users** — id: uuid PK auto, external_id: varchar(255)?, provider: varchar(20)? ['microsoft'|'google'], email: varchar(255), name: varchar(255), avatar_url: text?, role_id: smallint FK→roles default 4, is_active: bool default true, created_at/updated_at: timestamptz

**user_sites** — PK(user_id, site_id), FK user_id → users CASCADE

**buildings** — id: varchar(50) PK (e.g. 'pac4220'), name: varchar(200), address: varchar(300), total_area: numeric(10,2)

**meters** — id: varchar(10) PK (e.g. 'M001'), building_id: varchar(50) FK→buildings, model: varchar(20) ['PAC1670'|'PAC1651'], phase_type: varchar(5) ['1P'|'3P'], bus_id: varchar(30), modbus_address: smallint, uplink_route: varchar(100), status: varchar(10) default 'online', last_reading_at: timestamptz?

**readings** — id: integer PK auto, meter_id: varchar(10) FK→meters, timestamp: timestamptz, voltage_l1/l2/l3: numeric(7,2)?, current_l1/l2/l3: numeric(8,3)?, power_kw: numeric(10,3) NOT NULL, reactive_power_kvar: numeric(10,3)?, power_factor: numeric(5,3)?, frequency_hz: numeric(6,3)?, energy_kwh_total: numeric(14,3) NOT NULL acumulativo, thd_voltage_pct: numeric(5,2)?, thd_current_pct: numeric(5,2)?, phase_imbalance_pct: numeric(5,2)?, breaker_status: varchar(10)?, digital_input_1/2: smallint?, digital_output_1/2: smallint?, alarm: varchar(50)?, modbus_crc_errors: integer?

**hierarchy_nodes** — id: varchar(20) PK (e.g. 'TG-PAC4220'), parent_id: varchar(20) FK→self?, building_id: varchar(50), name: varchar(100), level: smallint [1=Building,2=Panel,3=Subpanel,4=Circuit], node_type: varchar(20) ['building'|'panel'|'subpanel'|'circuit'], meter_id: varchar(10) FK→meters? (solo leaf), sort_order: smallint default 0

**alerts** — id: uuid PK auto, type: varchar(50) ['METER_OFFLINE'], severity: varchar(20) default 'high', status: varchar(20) ['active'|'acknowledged'|'resolved'], meter_id: varchar(10) FK→meters?, building_id: varchar(50)?, title: varchar(200), message: text, triggered_at: timestamptz default now(), acknowledged_at/resolved_at: timestamptz?, metadata: jsonb default '{}'

### Relations
```
roles 1──N users, roles 1──N role_permissions
users 1──N user_sites
buildings 1──N meters
meters 1──N readings, meters 1──N alerts
hierarchy_nodes N──1 self (parent), hierarchy_nodes N──1 meters (leaf only)
```

### SQL Migrations
`sql/001_schema.sql` → users, roles | `002_seed.sql` → seed 7 roles, catálogo de vistas implementadas y acciones | `003_buildings_locals.sql` → buildings | `004_meters_readings.sql` → meters, readings, seed 15 meters | `005_hierarchy_nodes.sql` → hierarchy tree | `006_alerts.sql` → alerts | `007_invite_first_users.sql` → usuarios preprovisionados sin provider/external_id | `008_views_catalog.sql` → migra modules a catálogo de vistas reales y reseedea role_permissions

## TypeScript Types

### Frontend types/index.ts
```
Building { id, name, address, totalArea, metersCount }
Meter { id, buildingId, model, phaseType, busId, modbusAddress, uplinkRoute, status, lastReadingAt }
Reading { timestamp, voltageL1-3, currentL1-3, powerKw, reactivePowerKvar, powerFactor, frequencyHz, energyKwhTotal, thdVoltagePct, thdCurrentPct, phaseImbalancePct, breakerStatus, digitalInput1-2, digitalOutput1-2, alarm, modbusCrcErrors }
ConsumptionPoint { timestamp, totalPowerKw, avgPowerKw, peakPowerKw }
HierarchyNode { id, parentId, buildingId, name, level, nodeType, meterId, sortOrder }
HierarchyChildSummary extends HierarchyNode { totalKwh, avgPowerKw, peakPowerKw, meterCount, status }
HierarchyNodeWithPath { node, path }
UptimeSummary { period, totalSeconds, uptimeSeconds, downtimeSeconds, uptimePercent, downtimeEvents }
UptimeAll { daily, weekly, monthly }
DowntimeEvent { downtimeStart, downtimeEnd, durationSeconds }
AlarmEvent { timestamp, alarm, voltageL1, currentL1, powerFactor, thdCurrentPct, modbusCrcErrors }
AlarmSummary { total, byType: { alarm, count }[] }
MeterOverview { id, buildingId, model, phaseType, busId, status, lastReadingAt, uptime24h, alarmCount30d }
AlertSeverity = 'critical' | 'high' | 'medium' | 'low'
AlertStatus = 'active' | 'acknowledged' | 'resolved'
Alert { id, type, severity, status, meterId, buildingId, title, message, triggeredAt, acknowledgedAt, resolvedAt, metadata }
AlertsSyncSummary { scannedMeters, createdAlerts, resolvedAlerts, activeOfflineAlerts, scannedAt }
AdminUserAccount { id, email, name, roleId, role, roleLabel, provider, isActive, siteIds, invitationStatus, createdAt, updatedAt }
RoleOption { id, name, labelEs, requiresSiteScope }
ViewOption { id, code, label, routePath, navigationGroup, showInNav, sortOrder, isPublic }
Invoice { id, siteId, tenantId, period, kWh, kW, kVArh, energyCharge, demandCharge, reactiveCharge, fixedCharge, netTotal, tax, total, status }
Tenant { id, siteId, name, rut, localId, meterId, contractStart, contractEnd, status }
Integration { id, name, type, status, lastSyncAt, recordsSynced, errors }
AuditLog { id, userId, action, resource, resourceId, detail, ip, timestamp }
- Frontend implementado hoy: `/login`, `/unauthorized`, `/context/select`, `/`, `/buildings/:id`, `/meters/:meterId`, `/monitoring/realtime`, `/monitoring/devices`, `/alerts`, `/alerts/:id`, `/monitoring/drilldown/:siteId`, `/admin/sites`, `/admin/users`, `/admin/meters`, `/admin/hierarchy/:siteId`.
```

### Frontend types/auth.ts
```
AuthProvider = 'microsoft' | 'google'
Role = 'SUPER_ADMIN' | 'CORP_ADMIN' | 'SITE_ADMIN' | 'OPERATOR' | 'ANALYST' | 'TENANT_USER' | 'AUDITOR'
AuthUser { id, email, name, role, provider, avatar?, siteIds }
AuthState { user, isAuthenticated, isLoading, error }
```

- No existe hoy un tipo `Resolution` compartido en `frontend/src/types`; las resoluciones se manejan como unions literales por endpoint.

## UI Components (components/ui/)

**Card** — contenedor base con borde; si recibe `onClick`, resalta hover.

**DataTable** — wrapper de TanStack Table con sorting y row highlight.

**PageHeader** — H1 + breadcrumbs + botón volver.

**Chart** — wrapper Highcharts simple con hover sync.

**StockChart** — wrapper Highcharts Stock con navigator, range selector y `onRangeChange`.

**ErrorBoundary** — fallback con reintento y salida al inicio.

**Skeleton** — placeholders base y presets de páginas principales.

**Layout** — shell principal con sidebar, banner de alertas y navegación por rol.

## Frontend Patterns

**API layer (3-file):** `services/routes.ts` (URL builders) → `services/endpoints.ts` (Axios calls) → `hooks/queries/use<Entity>.ts` (TanStack Query)

**State:** TanStack Query (server, staleTime: Infinity static / 30s live / 0+keepPreviousData charts) | Zustand useAuthStore (sessionStorage persist) | Zustand useAppStore (sessionStorage persist para contexto de sitio)

**Cache strategy:** buildings/building detail/auth me → `Infinity`; meters overview/alerts → `30s` + `30s`; consumption/readings → `0` + `keepPreviousData`.

**Routing:** `appRoutes.ts` (centralized + allowedRoles alineados con `auth/permissions.ts`) → `router.tsx` (lazy(() => import().then(m => ({default: m.Page})))). Cada ruta: ErrorBoundary + Suspense(Skeleton) + ProtectedRoute. `ProtectedRoute` también fuerza selección de sitio cuando el usuario tiene múltiples sites. Links internos y CTAs deben respetar la misma matriz para no empujar usuarios a `403` evitables.

**Feature folders:** `features/<domain>/<Domain>Page.tsx` (named export) + `components/` subdirectory.

**React patterns:** `useParams<{id: string}>()` con `!` cuando la ruta garantiza el param; `useRef` para guards mutables (`resolving`, `initialSelected`); `useMemo` para valores derivados; `useCallback` solo para handlers pasados a children; `import type` para type-only imports.

**Styling:** Tailwind v4 tokens: `text-text`, `text-muted`, `text-subtle`, `bg-base`, `bg-raised`, `bg-accent`, `border-border`. Grid: `grid-cols-1 sm:2 lg:3 xl:4`.

**Resolución dinámica:** StockChart afterSetExtremes → pickResolution(rangeMs): ≤36h→15min, ≤7d→hourly, >7d→daily. keepPreviousData evita flash.

**Error handling:** ErrorBoundary por ruta; Axios 401 limpia auth store; TanStack Query maneja retry/error per query; auth usa try/catch manual con mensajes en español; `catch (err: unknown)` y cast explícito.

**Tablas interactivas:** usar `DataTable` con `onRowClick` cuando la fila completa navega o dispara una acción; evitar wrappers `div` con `onClick` alrededor de la tabla.

## Backend Patterns

**NestJS module (4-file):** `<entity>.entity.ts` (@ApiProperty) → `<domain>.service.ts` (@Injectable) → `<domain>.controller.ts` (Swagger decorators) → `<domain>.module.ts` (TypeOrmModule.forFeature). Registrar en app.module.ts.

**TypeORM:** autoLoadEntities: true, synchronize: false. Entities con `!` assertion. Raw SQL: `this.repo.query(sql, [params])`. Manual camelCase mapping: `rows.map(r => ({ field: Number(r.field) }))`.

**SQL patterns:** date_trunc aggregation, WITH RECURSIVE CTE (hierarchy), LATERAL subqueries (overview).

**Auth:** Guard reusable valida Bearer token y adjunta payload al request. `@CurrentUser()` permite leerlo en controllers. `verifyToken()` retorna null on failure.
**RBAC backend:** `@RequirePermissions(module, action)` define el permiso requerido por endpoint; `RolesGuard` global resuelve permisos efectivos desde DB y rechaza `403` cuando falta el permiso.

**Interpretación RBAC:** para diseño funcional, `module` equivale a `view`. Si una vista nueva del frontend pasa a ser parte del producto, debe existir una representación explícita en el catálogo RBAC y en su matriz de acciones por rol.

**Validation:** Global ValidationPipe({ whitelist: true, transform: true }). DTOs con class-validator.

**Swagger:** @ApiOperation (español), @ApiOkResponse, @ApiParam, @ApiQuery. Entities con @ApiProperty({ example }).

**Lambda:** serverless.ts cachea bootstrap. offline-alerts.ts NO cachea (tech debt). Infra lambdas (synthetic-generator, backfill-gap) usan pg directo, independientes de NestJS.

**Error handling:** service retorna `null` para not-found y controller lanza `NotFoundException`; auth `verifyToken()` retorna `null` en failure; Nest maneja el resto como 500.

## Data Flow (end-to-end)
```
1. routes.ts        → URL builder con params
2. endpoints.ts     → fetchX() → api.get<Type>(url)
3. useX.ts          → useQuery({ queryKey, queryFn })
4. Axios Bearer     → CloudFront /api/* → API Gateway → Lambda
5. controller.ts    → @Get() → service method
6. service.ts       → raw SQL / QueryBuilder → PostgreSQL
7. Return JSON      → TanStack Query cache → React render → Highcharts/Table
```

## CI/CD & Infra Essentials
```
Trigger deploy: push to main

Frontend:
  npm ci → tsc --noEmit → vite build → aws s3 sync --delete → CloudFront invalidation

Backend:
  npm ci → tsc --noEmit → nest build → npx sls deploy --stage dev

PRs:
  type-check + build only
```

- Runtime base: Node 20, npm.
- Serverless: `power-digital-api`, Lambda API `256MB/10s`, `offlineAlerts` `30s`, VPC con 3 subnets.
- API docs: Swagger en `/api/docs`.
- Logs: CloudWatch + NestJS Logger.
- Error tracking externo: no hay Sentry/Datadog.

## Environment Variables

**Backend Lambda:** `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD`, `GOOGLE_CLIENT_ID`, `MICROSOFT_CLIENT_ID`, `NODE_ENV=production`

**Frontend (`VITE_*`):** `VITE_AUTH_MODE`, `VITE_MICROSOFT_CLIENT_ID`, `VITE_MICROSOFT_TENANT_ID`, `VITE_GOOGLE_CLIENT_ID`

**Infra Lambdas:** `DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME`

**VPC:** `VPC_SECURITY_GROUP_ID`, `VPC_SUBNET_ID_1`, `VPC_SUBNET_ID_2`, `VPC_SUBNET_ID_3`

Secrets en GitHub Actions, `.env` local gitignored y Lambda env vars.

## Standalone Infra Scripts
```
infra/
  synthetic-generator/   → EventBridge 1/min, pg directo, TEMPORAL
  reimport-readings/     → one-off CSV import + regen synthetic
  backfill-gap/          → one-off gap backfill
```

No forman parte del build NestJS. Cada uno tiene `package.json` propio y usa `pg` directo.

## Development
```bash
cd frontend && npm ci && npm run dev
cd backend && npm ci && npm run start:dev
cd backend && npx sls offline
```

## Conventions
- **Idioma:** Español en UI/labels/changelog. Inglés en código/variables/commits.
- **Frontend files:** PascalCase componentes, camelCase hooks/services
- **Backend files:** kebab-case con sufijo (.service.ts, .entity.ts, .dto.ts)
- **Exports:** Named exports everywhere (excepto `api` Axios default)
- **Imports:** Relative paths, no aliases. Orden: framework → libs → local
- **TypeScript:** strict ambos. Backend: experimentalDecorators. Frontend: verbatimModuleSyntax
- **Formatting:** 2-space, single quotes, semicolons, trailing commas. No Prettier.
- **Logging:** Backend Logger NestJS. Frontend console.error('[Component]', err).

## Key Files
| Archivo | Propósito |
|---|---|
| `backend/src/serverless.ts` | Entry point Lambda (cached bootstrap) |
| `backend/src/offline-alerts.ts` | Lambda scheduled: offline meter detection |
| `backend/src/meters/meters.service.ts` | Core: lecturas, uptime, alarmas y consumo |
| `backend/src/hierarchy/hierarchy.service.ts` | CTE recursivos de drill-down |
| `backend/src/auth/auth.service.ts` | JWT/JWKS verification y binding de usuarios invitados |
| `backend/src/users/users.controller.ts` | Administración base de invitaciones y usuarios |
| `backend/serverless.yml` | Lambda 256MB/10s, VPC, env vars |
| `frontend/src/components/ui/StockChart.tsx` | Highcharts Stock wrapper |
| `frontend/src/features/admin/AdminUsersPage.tsx` | Alta base de invitaciones con rol y sitios |
| `frontend/src/features/drilldown/DrilldownPage.tsx` | Drill-down jerárquico |
| `frontend/src/hooks/auth/useAuth.ts` | Fachada auth |
| `frontend/src/services/api.ts` | Axios Bearer + 401 interceptor |
| `frontend/src/store/useAuthStore.ts` | Zustand persist → sessionStorage |
| `frontend/src/store/useAppStore.ts` | Estado UI + contexto de sitio |
| `frontend/src/app/appRoutes.ts` | Rutas + RBAC roles |
| `frontend/src/features/auth/ContextSelectPage.tsx` | Selección de sitio post-login |
| `frontend/src/features/alerts/AlertDetailPage.tsx` | Detalle operativo de alerta |
| `infra/synthetic-generator/index.mjs` | TEMPORAL: lecturas sintéticas 1/min |

## Known Issues & Tech Debt
- **Sin scoping fino por recurso:** Ya existe enforcement RBAC por módulo/acción en API, pero todavía falta restringir por site/building/meter según pertenencia o contexto del usuario.
- **Invitación sin token/link firmado todavía:** el baseline actual ya es invite-first por registro previo en admin/users, pero el link transaccional y su expiración todavía no existen.
- **Contexto frontend sin enforcement backend:** la selección de sitio mejora UX y navegación, pero todavía no restringe datos en API por recurso.
- **Cobertura baja:** ya existen tests de guards y controllers, pero la suite sigue siendo mínima y sin servicios/integración.
- **N+1 queries:** `findChildrenWithConsumption` 3N+1 queries.
- **offlineAlerts cold start:** Bootstrap NestJS completo cada invocación.
- **Readings sin retention:** ~21,600 filas/día, sin partitioning.
- **SSL rejectUnauthorized: false** en todas las conexiones DB.
- **Token en sessionStorage:** Vulnerable a XSS.
- **Sin rate limiting, sin security headers, sin structured logging.**

## Deploy
- **Usar:** [AWS Runbook](docs/aws-runbook.md) + [Deploy Skill](skills/deploy.md)
- **NO usar:** cpanel-runbook.md, git-deploy.md, server-runbook.md

## References
- [CHANGELOG](CHANGELOG.md) | [Issues & Fixes](docs/ISSUES_&_FIXES.md) | [Perfil de Datos](scripts/perfil_datos.py)
- `CLAUDE.md` debe mantenerse autocontenido; no depender de `patterns/` para contexto operativo base.

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
- Frontend implementado hoy: `/login`, `/invite/:token`, `/unauthorized`, `/context/select`, `/`, `/buildings/:id`, `/meters/:meterId`, `/monitoring/realtime`, `/monitoring/devices`, `/alerts`, `/alerts/:id`, `/monitoring/drilldown/:siteId`, `/admin/sites`, `/admin/users`, `/admin/meters`, `/admin/hierarchy/:siteId`.
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
- **Infra:** AWS Lambda (Node 20, Serverless Framework v3), ECS Fargate, API Gateway HTTP, RDS PostgreSQL, S3+CloudFront, EventBridge, Secrets Manager
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
EventBridge (daily 06:00 UTC) → ECS Fargate drive-pipeline →
  1. Detecta cambios driveModifiedTime vs manifest S3
  2. Descarga solo archivos nuevos/modificados desde Google Drive → S3 raw/
  3. Importa S3 raw/ → readings_import_staging (INSERT ON CONFLICT DO NOTHING)
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

## Bulk CSV Ingest — Sistema Incremental Automatizado

- **Alcance:** La carga desde Google Drive es un **mecanismo de ingesta de datos** (puntual u ocasional), no un puente operativo permanente. Sirve para tener datos históricos o masivos en RDS; una vez cargados, el producto opera sobre lo que ya está en `readings`, `meters`, `buildings` y `hierarchy_nodes`. La telemetría en vivo y el uso normal de la app no dependen de Drive.
- Última actualización operativa validada: `2026-03-11`.
- **Pipeline incremental activo:** `infra/drive-pipeline/` orquesta el flujo completo en un único proceso.
- **Detección de cambios:** compara `driveModifiedTime` del manifest S3 más reciente contra el valor actual en Drive antes de descargar. Si no hubo cambios → `[skip]`. Soporta `FORCE_DOWNLOAD=true` para forzar descarga completa.
- **Importación idempotente:** `INSERT ... ON CONFLICT (meter_id, timestamp, source_file) DO NOTHING` — re-correr no duplica filas; solo inserta datos nuevos.
- **Runtime:** ECS Fargate dentro del VPC — S3→RDS sin latencia local, sin túnel SSH.
- **Schedule:** EventBridge `cron(0 6 * * ? *)` = **03:00 Chile** diariamente.
- **CI/CD imagen Docker:** `.github/workflows/drive-pipeline.yml` → build+push a ECR en cada push a main con cambios en `infra/drive-pipeline/**`.
- **Corrida manual bajo demanda:**
  ```bash
  aws ecs run-task --cluster energy-monitor-drive-ingest \
    --task-definition energy-monitor-drive-pipeline:1 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[subnet-07b8c60f262ea05f8,subnet-00ebf6d39c526567f,subnet-058418d1bc1a8adfa],securityGroups=[sg-0adda6a999e8d5d9a],assignPublicIp=DISABLED}"
  ```
- **Ver logs:** `aws logs tail /ecs/energy-monitor-drive-pipeline --follow`
- Bucket de ingesta: `energy-monitor-ingest-058310292956`.
- Secrets en AWS Secrets Manager: `energy-monitor/drive-ingest/db`, `energy-monitor/drive-ingest/google-service-account`.
- Cluster ECS: `energy-monitor-drive-ingest`. Task Definition: `energy-monitor-drive-pipeline:1`.
- ECR: `energy-monitor-drive-pipeline`. CloudWatch log group: `/ecs/energy-monitor-drive-pipeline`.
- Roles IAM: `energy-monitor-drive-ingest-task-execution-role`, `energy-monitor-drive-ingest-task-role`, `energy-monitor-eventbridge-drive-pipeline`.
- Restricción operativa: no usar Lambda para mover CSV de 1.5 GB a 3.15 GB; el baseline aprobado es Fargate.
- Objetos ya presentes en `raw/`: `MALL_GRANDE_446_completo.csv`, `MALL_MEDIANO_254_completo.csv`, `OUTLET_70_anual.csv`, `SC52_StripCenter_anual.csv`, `SC53_StripCenter_anual.csv`.

### Promotion pipeline: staging → readings
- El task Fargate ejecuta en secuencia: `index.mjs` (Drive → S3 → staging) y luego `promote.mjs` (staging → readings). Tras cada corrida diaria, la data queda en `readings` lista para NestJS/Lambda.
- Script de promoción: `infra/drive-pipeline/promote.mjs` (mismo contenedor) y `infra/drive-import-staging/promote.mjs` (ejecución manual local).
- Fases: `validate` → `catalog` → `promote` → `verify` (ejecutables independientemente con `PHASE=<fase>`). Si staging está vacío, promote sale en 0 sin error.
- Estrategia de `meter_id` resuelta: expansión directa del catálogo — los meter_ids fuente (`MG-001`, `MM-045`, `OT-012`, `SC52-*`, `SC53-*`) se insertan tal cual en `meters` y `buildings`.
- Los medidores existentes (`M001`–`M015`) y sus edificios (`pac4220`, `s7-1200`) no se tocan; los nuevos coexisten.
- `promote.mjs` auto-descubre `center_name` → crea buildings slugificados, auto-descubre meters → crea catalog entries.
- Promotion usa `INSERT INTO readings SELECT FROM staging` con `NOT EXISTS` para idempotencia, batch por `source_file`.
- Soporta `DRY_RUN=true` para inspección sin escritura.
- Base de especificación del import: `docs/drive-csv-import-spec.md`. Plan de negocio para consumo backend de datos nuevos: `docs/plan-negocio-consumo-datos-rds.md`. Jerarquía para sitios Drive: script `infra/drive-import-staging/hierarchy-from-staging.mjs` (lee staging: center_type, store_type, store_name, meter_id → escribe hierarchy_nodes en 4 niveles); uso `npm run hierarchy-from-staging`; ver `docs/hierarchy-from-staging.md`.

### Ejecución de la promotion
```bash
# 1. Solo validar staging (sin escritura)
PHASE=validate npm --prefix infra/drive-import-staging run promote

# 2. Dry run completo (inspección sin escritura)
DRY_RUN=true npm --prefix infra/drive-import-staging run promote

# 3. Ejecución completa (validate → catalog → promote → verify)
npm --prefix infra/drive-import-staging run promote

# 4. Con SSH tunnel local
DB_HOST=127.0.0.1 DB_PORT=5433 npm --prefix infra/drive-import-staging run promote
```

### Antes del corte real
- Snapshot RDS recomendado antes de correr `PHASE=promote`.
- Considerar pausar `synthetic-readings-generator` y `offlineAlerts` durante la promotion para evitar contención.
- Post-promotion: validar con `PHASE=verify` y reactivar procesos.

### Fuente de lecturas para el frontend (READINGS_SOURCE)
- **Variable de entorno:** `READINGS_SOURCE=readings` (default) | `staging`. Si es `staging`, las APIs de lecturas y consumo leen desde `readings_import_staging` en lugar de `readings`, con límites estrictos para no colapsar el servicio.
- **Límites cuando READINGS_SOURCE=staging:** máximo 5000 filas por defecto por consulta, hasta 50000 si el cliente envía `limit`; rango `from`/`to` obligatorio y máximo 90 días. Endpoints afectados: `GET /meters/:id/readings`, `GET /buildings/:id/consumption`, `GET /hierarchy/node/:nodeId/consumption` y niños del drill-down (consumo por nodo).
- **Implementación:** `backend/src/readings-source.config.ts` (constantes y `useStaging()`); en `MetersService` y `HierarchyService` se comprueba `useStaging()` y, si aplica, se consulta `readings_import_staging` con subconsultas limitadas (LIMIT) y from/to obligatorios. Staging no tiene thd/alarm: esos campos se devuelven null.

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
  → resolveUser(): enlaza identidad OAuth contra un usuario invitado/preprovisionado por email y luego carga permisos; soporta re-binding si el usuario cambia de provider (mismo email)
  → Frontend: Zustand useAuthStore.setUser() + contexto de sitio en Zustand useAppStore
  → ProtectedRoute checks roles y fuerza selección de sitio cuando aplica
  → 401 Axios interceptor → limpia auth store + sessionStorage
```
- RBAC: 7 roles (`SUPER_ADMIN`, `CORP_ADMIN`, `SITE_ADMIN`, `OPERATOR`, `ANALYST`, `TENANT_USER`, `AUDITOR`), 16 vistas, 3 acciones
- Regla funcional vigente: `módulo = vista`; los permisos deben interpretarse como acceso a vistas y acciones disponibles dentro de esas vistas.
- La tabla `modules` ya persiste el catálogo de vistas/rutas reales implementadas con metadata de navegación (`route_path`, `navigation_group`, `show_in_nav`, `sort_order`, `is_public`).
- Backend exige JWT válido en endpoints API mediante guard global y aplica RBAC por módulo/acción con metadata `@RequirePermissions(...)`
- Mapeo RBAC actual backend: `BUILDINGS_OVERVIEW.view` para `GET /buildings`, `BUILDING_DETAIL.view` para `/buildings/:id*`, `MONITORING_DEVICES.view` para `GET /meters/overview`, `METER_DETAIL.view` para `/meters/:id*`, `MONITORING_DRILLDOWN.view` para `/hierarchy*`, `ALERTS_OVERVIEW.view/manage` para `/alerts` y `sync-offline`, `ALERT_DETAIL.view/manage` para `/alerts/:id*`
- Catálogo de vistas implementadas hoy en DB: `LOGIN`, `INVITATION_ACCEPT`, `UNAUTHORIZED`, `CONTEXT_SELECT`, `BUILDINGS_OVERVIEW`, `BUILDING_DETAIL`, `METER_DETAIL`, `MONITORING_REALTIME`, `MONITORING_DEVICES`, `ALERTS_OVERVIEW`, `ALERT_DETAIL`, `MONITORING_DRILLDOWN`, `ADMIN_SITES`, `ADMIN_USERS`, `ADMIN_METERS`, `ADMIN_HIERARCHY`.
- Base vigente de onboarding: el login ya no autocrea usuarios no invitados; el acceso requiere un registro previo en `users` con rol preasignado y sitios opcionales/preasignados.
- Admin base disponible: `/admin/users` permite provisionar invitaciones con rol y sitios, devolver un link firmado de activación y exponer su expiración; `GET /roles` expone el catálogo para esa vista.
- Catálogo de vistas disponible por API: `GET /views` para inspeccionar las vistas persistidas en DB.
- Migraciones `006_alerts.sql`, `008_views_catalog.sql` y `009_invitation_links.sql` ya aplicadas en producción (2026-03-10).
- Scoping vigente en backend: buildings, meters, hierarchy, alerts y `sync-offline` ya restringen datos por `siteIds` asignados; los roles globales mantienen acceso total.
- Contexto activo vigente: cuando el frontend tiene un `selectedSiteId`, el interceptor Axios envía `X-Site-Context` y `RolesGuard` estrecha el scope server-side adicionalmente para ese request.

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
| POST | `/users` | `{ email, name, roleId, siteIds, isActive? }` | `AdminUserSummary & { invitationToken }` |

### Roles (`/roles`) — requiere Bearer + `ADMIN_USERS.view`
| Method | Path | Params | Response |
|---|---|---|---|
| GET | `/roles` | — | `RoleOption[]` |

### Invitations (`/invitations`) — público
| Method | Path | Params | Response |
|---|---|---|---|
| GET | `/invitations/:token` | — | `{ email, name, role, roleLabel, invitationStatus, invitationExpiresAt }` |

### Views (`/views`) — requiere Bearer + `CONTEXT_SELECT.view`
| Method | Path | Params | Response |
|---|---|---|---|
| GET | `/views` | — | `ViewOption[]` |

### Admin / Diagnóstico — requiere Bearer + `ADMIN_USERS.view`
| Method | Path | Params | Response |
|---|---|---|---|
| GET | `/db-verify` | — | Conteos (readings, meters, buildings, staging), stagingCentersCount (DISTINCT center_name en staging), metersPerBuilding, timeRanges, hierarchy, buildings; opcional `errors[]` si alguna query falla (respuesta siempre 200). |
| GET | `/db-verify/local` | — | Mismo payload sin auth; solo cuando NODE_ENV !== production. |
| GET | `/ingest/diagnostic` | — | Diagnóstico Drive→RDS: staging vs readings, conclusion (full_match \| partial_match \| mismatch \| no_staging_data), perFileMatch, message. |
| GET | `/ingest/diagnostic/local` | — | Mismo payload sin auth; solo cuando NODE_ENV !== production. |

Resolutions: `raw`, `15min`, `hourly`, `daily`. Fechas ISO 8601.
**users** — id: uuid PK auto, external_id: varchar(255)?, provider: varchar(20)? ['microsoft'|'google'|'invitation'], email: varchar(255), name: varchar(255), avatar_url: text?, role_id: smallint FK→roles default 4, is_active: bool default true, created_at/updated_at: timestamptz

- Invitaciones: si en prod `external_id`/`provider` son NOT NULL, el backend usa centinela `provider='invitation'` y `external_id='inv:<hex>'` al crear la invitación; el primer login OAuth reemplaza por el valor real. La API sigue exponiendo `provider: null` para invitados pendientes.
`sql/001_schema.sql` → users, roles | `002_seed.sql` → seed 7 roles, catálogo de vistas implementadas y acciones | `003_buildings_locals.sql` → buildings | `004_meters_readings.sql` → meters, readings, seed 15 meters | `005_hierarchy_nodes.sql` → hierarchy tree | `006_alerts.sql` → alerts | `007_invite_first_users.sql` → permite usuarios preprovisionados sin provider/external_id | `008_views_catalog.sql` → migra modules a catálogo de vistas reales | `009_invitation_links.sql` → agrega token/link firmado y expiración de invitación

## Database Schema

### Tables
**roles** — id: smallint PK, name: varchar(30) unique, label_es: varchar(50), is_active: bool, created_at: timestamptz

**modules** — id: smallint PK, code: varchar(40) unique, label: varchar(60), route_path: varchar(120) unique, navigation_group: varchar(40), show_in_nav: bool, sort_order: smallint, is_public: bool, is_active: bool

**actions** — id: smallint PK, code: varchar(20) unique

**role_permissions** — PK(role_id, module_id, action_id), FK role_id → roles

**users** — id: uuid PK auto, external_id: varchar(255)?, provider: varchar(20)? ['microsoft'|'google'], email: varchar(255), name: varchar(255), avatar_url: text?, role_id: smallint FK→roles default 4, is_active: bool default true, created_at/updated_at: timestamptz

**user_sites** — PK(user_id, site_id), FK user_id → users CASCADE

**buildings** — id: varchar(50) PK (e.g. 'pac4220'), name: varchar(200), address: varchar(300), center_type: varchar(100) NULL (docx: categoría del centro; migración 013), total_area: numeric(10,2)

**meters** — id: varchar(10) PK (e.g. 'M001'), building_id: varchar(50) FK→buildings, model: varchar(20) ['PAC1670'|'PAC1651'], phase_type: varchar(5) ['1P'|'3P'], bus_id: varchar(30), modbus_address: smallint, uplink_route: varchar(100), store_type: varchar(100) NULL, store_name: varchar(200) NULL (docx: tienda/local; migración 013), status: varchar(10) default 'online', last_reading_at: timestamptz?

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
`sql/001_schema.sql` → users, roles | `002_seed.sql` → seed 7 roles, catálogo de vistas implementadas y acciones | `003_buildings_locals.sql` → buildings | `004_meters_readings.sql` → meters, readings, seed 15 meters | `005_hierarchy_nodes.sql` → hierarchy tree | `006_alerts.sql` → alerts | `007_invite_first_users.sql` → usuarios preprovisionados sin provider/external_id | `008_views_catalog.sql` → migra modules a catálogo de vistas reales y reseedea role_permissions | `009_invitation_links.sql` → agrega token/link firmado y expiración de invitación | `010_readings_import_staging.sql` → tabla staging para importación CSV | `013_center_and_store_fields.sql` → center_type en buildings, store_type/store_name en meters (docx)
Todas las migraciones hasta `010` ya están aplicadas en producción (2026-03-10). Si `013` no está aplicada, `GET /buildings` y `GET /buildings/:id` siguen funcionando (BuildingsService usa raw query sin esas columnas; `centerType` se devuelve null).

## TypeScript Types

### Frontend types/index.ts
```
Building { id, name, address, centerType?, totalArea, metersCount }
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
- Frontend implementado hoy: `/login`, `/invite/:token`, `/unauthorized`, `/context/select`, `/`, `/buildings/:id`, `/meters/:meterId`, `/monitoring/realtime`, `/monitoring/devices`, `/alerts`, `/alerts/:id`, `/monitoring/drilldown/:siteId`, `/admin/sites`, `/admin/users`, `/admin/meters`, `/admin/hierarchy/:siteId`.
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

**Layout** — shell principal con sidebar, banner de alertas y navegación por rol. Sidebar resuelve dinámicamente `:siteId` en rutas que lo requieren usando `selectedSiteId` o el primer building disponible.

## Frontend: vistas, gráficos, datos y flujo

### Catálogo de vistas (rutas y permisos)
| Ruta | Vista | Permiso | En nav | Datos principales |
|------|--------|---------|--------|--------------------|
| `/login` | Login | público | — | — |
| `/invite/:token` | Aceptar invitación | público | — | GET /invitations/:token |
| `/unauthorized` | Sin acceso | público | — | — |
| `/context/select` | Selección de sitio | CONTEXT_SELECT | — | GET /auth/me, GET /buildings |
| `/` | Edificios | BUILDINGS_OVERVIEW | sí | GET /buildings, GET /alerts (activas, limit 12) |
| `/buildings/:id` | Detalle edificio | BUILDING_DETAIL | — | GET /buildings/:id, GET /buildings/:id/consumption, GET /buildings/:id/meters, GET /alerts (activas, buildingId) |
| `/meters/:meterId` | Detalle medidor | METER_DETAIL | — | GET /meters/:id, GET /meters/:id/readings, GET /meters/:id/alarm-events (30d) |
| `/monitoring/realtime` | Monitoreo tiempo real | MONITORING_REALTIME | sí | GET /meters/overview, GET /alerts (activas, limit 20) |
| `/monitoring/devices` | Dispositivos | MONITORING_DEVICES | sí | GET /meters/overview (tabla con más columnas que Realtime) |
| `/alerts` | Alertas | ALERTS_OVERVIEW | sí | GET /alerts (filtro status), POST sync-offline |
| `/alerts/:id` | Detalle alerta | ALERT_DETAIL | — | GET /alerts/:id, PATCH acknowledge |
| `/monitoring/drilldown/:siteId` | Drill-down jerárquico | MONITORING_DRILLDOWN | sí | GET /hierarchy/node/:nodeId, GET /hierarchy/node/:nodeId/children |
| `/admin/sites` | Admin sitios | ADMIN_SITES | sí | GET /buildings (CRUD según implementación) |
| `/admin/users` | Admin usuarios | ADMIN_USERS | sí | GET /users, POST /users, GET /roles |
| `/admin/meters` | Admin medidores | ADMIN_METERS | sí | GET /meters/overview + edificios |
| `/admin/hierarchy/:siteId` | Admin jerarquía | ADMIN_HIERARCHY | sí | GET /hierarchy/:buildingId (árbol) |

- Todas las vistas protegidas usan Bearer (JWT o session token). El contexto de sitio (`selectedSiteId` en useAppStore) filtra alertas y listas cuando el usuario no tiene acceso global; el backend aplica scope con `X-Site-Context` cuando se envía.
- Rutas con `:siteId` (drilldown, admin hierarchy): el frontend usa `selectedSiteId` o el primer building del usuario para construir el link del sidebar.

### Gráficos y visualizaciones
| Ubicación | Componente | Datos | Tipo | Resolución dinámica |
|-----------|------------|--------|------|---------------------|
| **BuildingDetailPage** | BuildingConsumptionChart (StockChart) | ConsumptionPoint[] (totalPowerKw, peakPowerKw) | área + línea | Sí: pickResolution(rangeMs) → 15min / hourly / daily; keepPreviousData |
| **MeterDetailPage** | 6× StockChart | Reading[] (powerKw, voltageL1–L3, currentL1–L3, pf, frequencyHz, energyKwhTotal, thd, phaseImbalance) | series temporales + flags de alarmas | Sí: misma lógica; alarmEvents últimos 30d |
| **DrilldownPage** | DrilldownBars (Highcharts bar) | HierarchyChildSummary[] (totalKwh por hijo) | barras horizontales por nodo | No (children sin from/to en la llamada actual) |
| **RealtimePage** | — | DataTable de MeterOverview | tabla | — |
| **AlertsPage** | — | Tabla HTML de Alert[] | tabla | — |

- **StockChart**: Highcharts Stock con navigator, range selector (1D / 1S / 1M / Todo), tema oscuro. `onRangeChange(min, max)` → padre actualiza resolución → refetch con nueva resolución; `placeholderData: keepPreviousData` evita flash.
- **BuildingConsumptionChart**: una serie área (total edificio) y una línea (pico); backend `/buildings/:id/consumption` con `resolution`; no se pasan `from`/`to` desde el frontend (backend usa rango por defecto).
- **MeterDetailPage**: gráficos de Potencia (kW + kVAR), Voltaje L1/L2/L3, Corriente, PF+Frecuencia, Energía acumulada, Calidad (THD/desequilibrio solo 3P). Eventos de alarma como flags sobre las series.
- **DrilldownBars**: Highcharts bar no-Stock; click en barra → navegación a nodo hijo (setCurrentNodeId); datos de hijos con totalKwh, avgPowerKw, peakPowerKw, meterCount.

### Datos por dominio y hooks
- **Buildings**: useBuildings (lista), useBuilding(id), useBuildingConsumption(buildingId, resolution, from?, to?). Consumption siempre con from/to: rango por defecto últimos 7 días; onRangeChange actualiza range y resolution. Query enabled solo si buildingId + from + to.
- **Meters**: useMetersOverview (staleTime 30s), useMeter(id), useMeterReadings(id, resolution, from?, to?) (keepPreviousData), useMeterUptime (60s), useMeterDowntimeEvents/AlarmEvents/AlarmSummary(from, to). Readings siempre con from/to: rango por defecto 7 días; onRangeChange actualiza range y resolution. Query enabled solo si meterId + from + to. Alarm events 30d fijo en MeterDetailPage.
- **Hierarchy**: useHierarchy(buildingId), useHierarchyNode(nodeId), useHierarchyChildren(nodeId, from?, to?), useHierarchyConsumption(nodeId, resolution, from?, to?). Drilldown no usa consumption en la UI actual; solo node + children.
- **Alerts**: useAlerts(filters, options). Opciones típicas: refetchInterval 30–60s, staleTime 10–15s; filtro por status, buildingId, limit. useAcknowledgeAlert, useSyncOfflineAlerts invalidan ['alerts'].
- **Auth**: useAuth (Zustand + useAuthQuery para GET /auth/me). useBuildings en Layout para visibleBuildings y selector de contexto.

### Patrones de consumo (cache y refetch)
| Query / vista | staleTime | refetchInterval | placeholderData | Notas |
|---------------|-----------|------------------|-----------------|--------|
| buildings, building, auth/me | default (0) | — | — | Listas estáticas; auth 5min en useAuthQuery |
| buildingConsumption, meterReadings | 0 | — | keepPreviousData | Refetch al cambiar resolution; mantener datos previos en pantalla |
| metersOverview | 30_000 | — | — | Dispositivos y Realtime |
| alerts (Layout, BuildingDetail, BuildingsPage) | 10_000–15_000 | 60_000 | — | Banner y listas |
| alerts (RealtimePage, AlertsPage) | 10_000 | 30_000 | — | Actualización frecuente |
| meterUptime, meterAlarmSummary | 60_000 | — | — | Menos volátil |
| admin users/roles | Infinity | — | — | Catálogo administrativo |

- Mutaciones (acknowledge, sync-offline, createUser): onSuccess → invalidateQueries(['alerts']) o equivalente para refrescar listas.

### Flujo resumido
1. **Entrada**: Login / Invite → sessionStorage token → GET /auth/me → useAuthStore + useAppStore (selectedSiteId según user.siteIds).
2. **Navegación**: appRoutes + ProtectedRoute por rol; Layout sidebar con getNavItems(role) y links con :siteId reemplazado por selectedSiteId o primer building.
3. **Vistas con series temporales**: Estado local range (from/to, default 7 días). StockChart dispara onRangeChange → se actualiza range y resolution → useBuildingConsumption(id, resolution, from, to) o useMeterReadings(id, resolution, from, to) → backend recibe from/to siempre; keepPreviousData evita parpadeo.
4. **Alertas**: Filtro por selectedSiteId (buildingId) cuando no es "*"; refetch periódico; mutaciones invalidan cache.
5. **Drill-down**: Nodo raíz B-{siteId}; navegación por nodo actual → useHierarchyNode + useHierarchyChildren; tabla + barras por hijo; circuito con meterId → link a /meters/:meterId.

## Frontend Patterns

**API layer (3-file):** `services/routes.ts` (URL builders) → `services/endpoints.ts` (Axios calls) → `hooks/queries/use<Entity>.ts` (TanStack Query)

**State:** TanStack Query (server; ver tabla "Patrones de consumo" en sección Frontend: vistas, gráficos, datos y flujo) | Zustand useAuthStore (sessionStorage persist) | Zustand useAppStore (sessionStorage persist para contexto de sitio).

**Cache strategy:** Listas estáticas y auth sin staleTime explícito (auth 5–10 min en useAuthQuery); meters overview 30s; alerts 10–15s + refetch 30–60s; consumption/readings sin staleTime + keepPreviousData para gráficos; admin users/roles Infinity.

**Routing:** `appRoutes.ts` (centralized + allowedRoles alineados con `auth/permissions.ts`) → `router.tsx` (lazy(() => import().then(m => ({default: m.Page})))). Cada ruta: ErrorBoundary + Suspense(Skeleton) + ProtectedRoute. `ProtectedRoute` también fuerza selección de sitio cuando el usuario tiene múltiples sites. Links internos y CTAs deben respetar la misma matriz para no empujar usuarios a `403` evitables. Sidebar muestra 9 ítems para `SUPER_ADMIN`: Edificios, Monitoreo en Tiempo Real, Dispositivos, Alertas, Drill-down, Admin Sitios, Admin Usuarios, Admin Medidores, Admin Jerarquía.

**Feature folders:** `features/<domain>/<Domain>Page.tsx` (named export) + `components/` subdirectory.

**React patterns:** `useParams<{id: string}>()` con `!` cuando la ruta garantiza el param; `useRef` para guards mutables (`resolving`, `initialSelected`); `useMemo` para valores derivados; `useCallback` solo para handlers pasados a children; `import type` para type-only imports.

**Styling:** Tailwind v4 tokens: `text-text`, `text-muted`, `text-subtle`, `bg-base`, `bg-raised`, `bg-accent`, `border-border`. Grid: `grid-cols-1 sm:2 lg:3 xl:4`.

**Resolución dinámica:** StockChart afterSetExtremes → pickResolution(rangeMs): ≤36h→15min, ≤7d→hourly, >7d→daily. keepPreviousData evita flash.

**Error handling:** ErrorBoundary por ruta; Axios 401 limpia auth store; TanStack Query maneja retry/error per query; auth usa try/catch manual con mensajes en español; `catch (err: unknown)` y cast explícito.

**Tablas interactivas:** usar `DataTable` con `onRowClick` cuando la fila completa navega o dispara una acción; evitar wrappers `div` con `onClick` alrededor de la tabla.

## Backend Patterns

**NestJS module (4-file):** `<entity>.entity.ts` (@ApiProperty) → `<domain>.service.ts` (@Injectable) → `<domain>.controller.ts` (Swagger decorators) → `<domain>.module.ts` (TypeOrmModule.forFeature). Registrar en app.module.ts.

**TypeORM:** autoLoadEntities: true, synchronize: false. Entities con `!` assertion. Raw SQL: `this.repo.query(sql, [params])` o `this.dataSource.query()`. Manual camelCase mapping: `rows.map(r => ({ field: Number(r.field) }))`. BuildingsService.findAll/findOne: raw query (id, name, address, total_area + subquery count) para compatibilidad con BD sin migración 013; evita 500 por columnas center_type/store_type/store_name ausentes.

**SQL patterns:** date_trunc aggregation, WITH RECURSIVE CTE (hierarchy), LATERAL subqueries (overview).

**Auth:** Guard reusable valida Bearer token y adjunta payload al request. `@CurrentUser()` permite leerlo en controllers. `verifyToken()` retorna null on failure.
**RBAC backend:** `@RequirePermissions(module, action)` define el permiso requerido por endpoint; `RolesGuard` global resuelve permisos efectivos desde DB y rechaza `403` cuando falta el permiso.

**Interpretación RBAC:** para diseño funcional, `module` equivale a `view`. Si una vista nueva del frontend pasa a ser parte del producto, debe existir una representación explícita en el catálogo RBAC y en su matriz de acciones por rol.

**Validation:** Global ValidationPipe({ whitelist: true, transform: true }). DTOs con class-validator.

**Swagger:** @ApiOperation (español), @ApiOkResponse, @ApiParam, @ApiQuery. Entities con @ApiProperty({ example }).

**Lambda:** serverless.ts cachea bootstrap; función `api` timeout 30s (cold start + consultas). offline-alerts.ts NO cachea (tech debt). db-verify-lambda.ts: invocable con AWS CLI. DbVerifyService e IngestDiagnosticService con consultas defensivas (try/catch; opcional `errors[]`). IngestDiagnosticService procesa por tramos (por source_file) para no hacer JOINs sobre millones de filas; cada archivo se consulta con WHERE source_file = $1 usando idx_readings_import_staging_source_file. Infra lambdas (synthetic-generator, backfill-gap) usan pg directo, independientes de NestJS.

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

**Backend Lambda:** `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD`, `GOOGLE_CLIENT_ID`, `MICROSOFT_CLIENT_ID`, `NODE_ENV=production`, `READINGS_SOURCE` (opcional: `readings` | `staging`; default `readings`)

**Frontend (`VITE_*`):** `VITE_AUTH_MODE`, `VITE_MICROSOFT_CLIENT_ID`, `VITE_MICROSOFT_TENANT_ID`, `VITE_GOOGLE_CLIENT_ID`

**Infra Lambdas:** `DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME`

**VPC:** `VPC_SECURITY_GROUP_ID`, `VPC_SUBNET_ID_1`, `VPC_SUBNET_ID_2`, `VPC_SUBNET_ID_3`

Secrets en GitHub Actions, `.env` local gitignored y Lambda env vars.

## Standalone Infra Scripts
```
infra/
  drive-ingest/          → Google Drive CSV ingest → S3 raw/manifests (con detección de cambios driveModifiedTime)
  drive-import-staging/  → S3 raw CSV → staging RDS con parseo streaming y validaciones base
  drive-pipeline/        → Orquestador unificado: detecta cambios + descarga Drive→S3 + importa S3→staging (Fargate)
  db-verify/             → Verificación RDS: script local (npm run verify) o Lambda invocable con AWS CLI (dbVerify)
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

**Backend local y RDS:** Por defecto el backend local **no** tiene acceso a AWS RDS (subnets privadas). Túnel listo: ejecutar `./scripts/tunnel-rds.sh` (bastion EC2 `energy-monitor-rds-tunnel`, key `scripts/energy-monitor-tunnel.pem`; la clave está en .gitignore). Con el túnel abierto, en backend `.env`: `DB_HOST=127.0.0.1`, `DB_PORT=5433`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD` (mismos valores que Lambda/Secrets Manager). Alternativa: RDS "Publicly accessible" + SG con tu IP.

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
| `backend/serverless.yml` | Lambda 256MB, api timeout 30s, VPC, env vars (api, offlineAlerts, dbVerify) |
| `backend/src/ingest-diagnostic/ingest-diagnostic.service.ts` | Diagnóstico staging vs readings (Drive→RDS); consultas por tramo por source_file para no colapsar con millones de filas |
| `backend/src/db-verify-lambda.ts` | Lambda invocable con AWS CLI: consultas de verificación RDS (conteos, distribución, jerarquía); consulta meters por columna `id` |
| `frontend/src/components/ui/StockChart.tsx` | Highcharts Stock wrapper |
| `infra/drive-ingest/index.mjs` | Ingesta por streaming desde Google Drive hacia S3 + manifests (con detección de cambios) |
| `infra/drive-import-staging/index.mjs` | Importación streaming desde S3 hacia `readings_import_staging` |
| `infra/drive-pipeline/index.mjs` | **Orquestador Fargate**: detecta cambios + ingest Drive→S3 + import S3→staging |
| `infra/drive-pipeline/Dockerfile` | Imagen Docker del pipeline para ECS Fargate |
| `infra/drive-pipeline/task-definition.json` | Task Definition ECS (`energy-monitor-drive-pipeline:1`) |
| `frontend/src/features/admin/AdminUsersPage.tsx` | Alta base de invitaciones con rol y sitios |
| `frontend/src/features/drilldown/DrilldownPage.tsx` | Drill-down jerárquico |
| `frontend/src/hooks/auth/useAuth.ts` | Fachada auth |
| `frontend/src/services/api.ts` | Axios Bearer + 401 interceptor |
| `frontend/src/store/useAuthStore.ts` | Zustand persist → sessionStorage |
| `frontend/src/store/useAppStore.ts` | Estado UI + contexto de sitio |
| `frontend/src/app/appRoutes.ts` | Rutas + RBAC roles; ver sección "Frontend: vistas, gráficos, datos y flujo" para catálogo completo por vista |
| `frontend/src/features/auth/ContextSelectPage.tsx` | Selección de sitio post-login |
| `frontend/src/features/alerts/AlertDetailPage.tsx` | Detalle operativo de alerta |
| `infra/synthetic-generator/index.mjs` | TEMPORAL: lecturas sintéticas 1/min |
| `infra/db-verify/verify-rds.mjs` | Verificación RDS: modo prueba (.env) o AWS Secrets Manager; carga dotenv; mensajes de error claros |
| `docs/data-drive-aws-review.md` | Revisión: qué hay en RDS, cómo exponer por backend, vistas frontend, verificación (script o aws lambda invoke) |

## Known Issues & Tech Debt
- **Invitación transaccional pendiente:** ya existe link/token firmado con expiración y validación pública, pero todavía no hay envío por email, reemisión ni revocación administrativa completa.
- **Cobertura baja:** ya existen tests de guards y controllers, pero la suite sigue siendo mínima y sin servicios/integración.
- **N+1 queries:** `findChildrenWithConsumption` 3N+1 queries.
- **offlineAlerts cold start:** Bootstrap NestJS completo cada invocación.
- **Readings sin retention:** ~21,600 filas/día, sin partitioning.
- **SSL rejectUnauthorized: false** en todas las conexiones DB.
- **Token en sessionStorage:** Vulnerable a XSS.
- **Producción sin 007:** Si `external_id`/`provider` siguen NOT NULL, las invitaciones usan centinela (`invitation`/`inv:...`); aplicar `sql/007_invite_first_users.sql` para permitir NULL.
- **Sin rate limiting, sin security headers, sin structured logging.**
- **Migraciones manuales:** no hay migration runner; las migraciones SQL se aplican manualmente. Verificar siempre que las tablas y columnas esperadas por el código existan en producción antes de deployar.

## Deploy
- **Usar:** [AWS Runbook](docs/aws-runbook.md) + [Deploy Skill](skills/deploy.md)
- **NO usar:** cpanel-runbook.md, git-deploy.md, server-runbook.md

## References
- [CHANGELOG](CHANGELOG.md) | [Issues & Fixes](docs/ISSUES_&_FIXES.md) | [Revisión APIs vs docx](docs/revision-apis-vs-docx-bd.md) | [Plan negocio consumo datos RDS](docs/plan-negocio-consumo-datos-rds.md). Lectura docx: `node scripts/read-docx.mjs` (requiere `cd scripts && npm install`).
- `CLAUDE.md` debe mantenerse autocontenido; no depender de `patterns/` para contexto operativo base.

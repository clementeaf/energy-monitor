# Changelog

## [0.9.0-alpha.24] - 2026-03-12

### Changed

- **Detalle por local y medidor** — BillingDetailTable deja de repetir la columna Centro en cada fila: agrupa por centerName, ordena por centro/año/mes y muestra Centro una sola vez por bloque (rowSpan). Tabla custom en lugar de DataTable para soportar rowSpan.
- **CLAUDE.md** — Billing: BillingDetailTable agrupación por centro y rowSpan; Key Files BillingDetailTable.

## [0.9.0-alpha.23] - 2026-03-12

### Added

- **Apply 017 y backfill facturación** — Script `apply-017-billing.mjs` aplica migración 017 (módulo BILLING_OVERVIEW y permisos). Script `backfill-summary-from-detail.mjs` rellena `billing_center_summary` desde `billing_monthly_detail` (agregados por centro/año/mes).

### Changed

- **Resumen facturación en pivote** — BillingSummaryTable: una fila por centro y año, columnas por mes (Enero–Diciembre) más Total (kWh); sin repetir nombre de centro.
- **Valores numéricos desde API** — BillingSummaryTable y BillingDetailTable usan toNum() para normalizar valores que llegan como string (pg NUMERIC); formateo correcto de consumo, peak, % punta y CLP.
- **Import XLSX facturación** — Resumen Ejecutivo: detección de fila de encabezados con findHeaderRowWithAll; más variantes de nombres de columna (Consumo Total Centro (kWh), etc.) para coincidir con XLSX.
- **CLAUDE.md** — Facturación: resumen pivote, toNum en tablas; scripts apply-017 y backfill-summary-from-detail; Key Files BillingPage descripción actualizada.

## [0.9.0-alpha.22] - 2026-03-12

### Added

- **Vista Facturación** — Ruta `/billing` con resumen por centro y mes (tabla BillingSummaryTable) y detalle por local y medidor (BillingDetailTable) con paginación (50 por página). Tipos BillingCenterSummary, BillingMonthlyDetail, BillingTariff; rutas y endpoints en `routes.ts` y `endpoints.ts`; hooks useBillingCenters, useBillingSummary, useBillingDetail, useBillingTariffs en `useBilling.ts`. Formato numérico es-CL y CLP en tablas.
- **Paginación detalle facturación** — Backend GET `/billing/detail` acepta `limit` y `offset` (máx 500 por página); frontend usa placeholderData keepPreviousData al cambiar de página.

### Changed

- **CLAUDE.md** — Billing: APIs /billing/centers, /summary, /detail, /tariffs; tipos y hooks; vista Facturación en catálogo; RBAC BILLING_OVERVIEW; Key Files billing service/controller y BillingPage/useBilling; tablas billing_* y migraciones 017–018; sidebar 10 ítems con Facturación.

## [0.9.0-alpha.21] - 2026-03-13

### Added

- **Tablas tiendas y analisis** — Migraciones `sql/015_tiendas.sql` (locales por edificio: building_id, store_type, store_name) y `sql/016_analisis.sql` (agregados por edificio/tienda/medidor y período: consumption_kwh, avg_power_kw, peak_demand_kw). Sin datos; estructura para ingest controlado.
- **Distribución staging → tablas** — Script `distribute-staging-to-tables.mjs`: llena tiendas (GROUP BY desde staging, ensureBuildingsFromStaging) y analisis (por día y batches, ensureMetersFromStaging). FROM_DATE/TO_DATE para ventana de fechas; BATCH_READ, PHASE=tiendas|analisis|all. `docs/distribuir-staging-a-tablas.md` con estrategia por trozos.
- **Staging como buffer** — Doc `docs/staging-buffer-no-almacen.md`: staging no es almacén; tras distribuir se purga. Scripts `purge-staging.mjs` (PURGE_STAGING=1), `rds-free-space.mjs` (tamaños + VACUUM), `truncate-data-keep-tables.mjs` (CONFIRM=1 vacía readings, analisis, tiendas, meters, buildings, staging_centers, alerts, hierarchy_nodes, sessions; conserva users/roles/permisos).
- **Backfill con migración 014** — `backfill-staging-centers.mjs` aplica CREATE TABLE staging_centers si no existe antes de rellenar.
- **Prueba de APIs** — `scripts/test-all-apis.mjs`: llama todas las APIs con Bearer token; BEARER_TOKEN y API_BASE_URL opcionales.
- **Apply 015-016** — `infra/drive-import-staging/apply-015-016.mjs` aplica migraciones tiendas y analisis contra RDS.
- **Lambda CSV ingest (2 meses)** — `infra/csv-ingest-lambda/`: Lambda que consume CSV desde S3 (`raw/`), filtra por ventana fromDate/toDate (2 meses), inserta en `readings_import_staging`, ejecuta catalog (buildings, meters, staging_centers) y promote a `readings`. Invocación manual o EventBridge; payload `key`, `fromDate`, `toDate`. README con deploy e invocación.

### Changed

- **CLAUDE.md** — Tablas tiendas y analisis; relaciones; estrategia de datos (staging buffer, truncate, Lambda 2 meses desde S3); scripts distribute, purge, rds-free-space, truncate-data-keep-tables; referencias a docs staging-buffer y distribuir-staging.

## [0.9.0-alpha.20] - 2026-03-12

### Changed

- **GET /buildings prioriza staging_centers** — BuildingsService.findAll y findOne consultan primero staging_centers; si tiene filas devuelven esos centros (datos del import); si está vacía o no existe, fallback a tabla buildings. Ya no dependen de READINGS_SOURCE para el listado. Scoping por siteIds aplicado en ambos orígenes.
- **Backfill staging_centers** — Script `infra/drive-import-staging/backfill-staging-centers.mjs` (`npm run backfill-staging-centers`): rellena staging_centers desde readings_import_staging (GROUP BY center_name, center_type). Útil cuando la migración 014 se aplicó después del import. DRY_RUN=true para solo inspeccionar.
- **CLAUDE.md** — Listado edificios y staging_centers; backfill documentado; Promotion pipeline menciona staging_centers y backfill.

## [0.9.0-alpha.19] - 2026-03-12

### Changed

- **GET /buildings y GET /buildings/:id devuelven centerType desde BD** — BuildingsService.findAll y findOne intentan primero una query que incluye center_type; si la columna no existe (migración 013 no aplicada) hacen fallback a la query sin ella y devuelven null. Cuando 013 está aplicada, centerType refleja el valor de la base.
- **CLAUDE.md** — BuildingsService: patrón try/fallback para center_type documentado.

## [0.9.0-alpha.18] - 2026-03-12

### Fixed

- **Todos los endpoints de meters en 200 sin migración 013** — MetersService deja de cargar la entidad Meter en findOne y findByBuilding: getMeterRow(id) y getMeterRowsByBuilding(buildingId) con raw query (sin store_type/store_name); findAccessibleMeterEntity devuelve MeterRow. GET /buildings/:id/meters, GET /meters/:id, GET /meters/:id/readings, uptime, downtime-events, alarm-events, alarm-summary responden 200 aunque la migración 013 no esté aplicada.

### Changed

- **CLAUDE.md** — Compatibilidad sin 013: todos los endpoints buildings y meters documentados; patrón MeterRow y getMeterRow/getMeterRowsByBuilding.

## [0.9.0-alpha.17] - 2026-03-12

### Fixed

- **GET /meters/overview 500 sin migración 013** — MetersService.getOverview deja de seleccionar store_type y store_name en la query; usa dataSource.query y devuelve storeType/storeName null. La API responde 200 aunque la migración 013 no esté aplicada.

### Changed

- **CLAUDE.md** — Compatibilidad sin 013: GET /meters/overview incluido; patrón MetersService.getOverview con raw query.

## [0.9.0-alpha.16] - 2026-03-12

### Fixed

- **GET /buildings y GET /buildings/:id 500 sin migración 013** — BuildingsService.findAll y findOne pasan a usar raw query (solo id, name, address, total_area y subquery de conteo de medidores) para no depender de las columnas de la migración 013 (center_type, store_type, store_name). La API responde 200 aunque la migración no esté aplicada en producción; centerType se devuelve null en ese caso.

### Changed

- **CLAUDE.md** — Nota de compatibilidad: GET /buildings funciona sin 013; patrón Backend BuildingsService con raw query.

## [0.9.0-alpha.15] - 2026-03-12

### Added

- **Campos centro y tienda (docx)** — Migración `sql/013_center_and_store_fields.sql`: `buildings.center_type` (categoría del centro: Mall Grande, Outlet, etc.) y `meters.store_type`, `meters.store_name` (rubro y nombre del local). APIs `GET /buildings`, `GET /buildings/:id` devuelven `centerType`; `GET /meters/overview`, `GET /meters/:id` devuelven `storeType`, `storeName`. Null en datos legacy. Promote rellena desde staging en fase catalog.
- **DbVerify stagingCentersCount** — `GET /api/db-verify` incluye `stagingCentersCount` (COUNT(DISTINCT center_name) en readings_import_staging).
- **Script lectura docx** — `scripts/read-docx.mjs` (mammoth) extrae texto de POWER_Digital_Documentacion_BD.docx; uso: `node scripts/read-docx.mjs [--out=archivo.txt]`.
- **Revisión APIs vs docx** — `docs/revision-apis-vs-docx-bd.md`: mapeo modelo docx → backend y brechas resueltas (centerType, storeType, storeName).

### Changed

- **Promote (catalog)** — Inserción de buildings con `center_type`; inserción de meters con `store_type`, `store_name` desde staging. ON CONFLICT actualiza esos campos.
- **CLAUDE.md** — Schema buildings/meters con nuevos campos; migración 013 en lista; tipo Building con centerType.

## [0.9.0-alpha.14] - 2026-03-12

### Added

- **Fuente de lecturas configurable (READINGS_SOURCE)** — Con `READINGS_SOURCE=staging`, las APIs de lecturas y consumo leen desde `readings_import_staging` en lugar de `readings`. Límites por consulta: 5000 filas por defecto, hasta 50000 con query `limit`; rango `from`/`to` obligatorio y máximo 90 días. Endpoints: `GET /meters/:id/readings`, `GET /buildings/:id/consumption`, consumo por nodo en hierarchy (drill-down). Config en `backend/src/readings-source.config.ts`; MetersService y HierarchyService consultan staging con subconsultas limitadas (thd/alarm null en staging).

### Changed

- **MetersController** — Parámetro opcional `limit` en `GET /meters/:id/readings`; documentación Swagger para uso con READINGS_SOURCE=staging.
- **BuildingsController** — ApiOperation de consumption actualizado: from/to obligatorios cuando READINGS_SOURCE=staging.

## [0.9.0-alpha.13] - 2026-03-12

### Added

- **Diagnóstico Drive → RDS (API)** — `GET /api/ingest/diagnostic`: compara `readings_import_staging` con `readings` y devuelve conclusion (full_match | partial_match | mismatch | no_staging_data), perFileMatch, stagingFiles, message. Requiere ADMIN_USERS.view. `GET /api/ingest/diagnostic/local` sin auth en desarrollo.
- **DbVerifyService defensivo** — Cada bloque de consultas en try/catch; si una query falla se devuelven valores por defecto y opcionalmente `errors[]` en la respuesta (nunca 500 en este endpoint).

### Changed

- **Lambda API timeout** — Aumentado a 30s en serverless.yml para evitar 500 por timeout en cold start (bootstrap Nest + TypeORM ~8s).
- **Invitaciones sin NULL en external_id** — Si en producción `external_id`/`provider` son NOT NULL, al crear invitación se usan centinelas `provider='invitation'` y `external_id='inv:<hex>'`; el primer login OAuth reemplaza por el valor real. La API sigue exponiendo `provider: null` para invitados pendientes.

## [0.9.0-alpha.12] - 2026-03-12

### Added

- **CLAUDE.md** — Sección "Frontend: vistas, gráficos, datos y flujo": catálogo de vistas (rutas, permisos, datos por vista), gráficos y visualizaciones (StockChart en edificio/medidor, DrilldownBars, tablas), datos por dominio y hooks, patrones de consumo (cache/refetch por query), flujo resumido. Patrones de frontend actualizados con referencia a la nueva sección y detalle de cache strategy.
- **Jerarquía desde staging (Opción A)** — Script `infra/drive-import-staging/hierarchy-from-staging.mjs`: lee `readings_import_staging` (center_type, store_type, store_name, meter_id) y escribe `hierarchy_nodes` en 4 niveles (Building → Panel → Subpanel → Circuit) para edificios Drive sin jerarquía. Uso: `npm run hierarchy-from-staging`; mismo env que promote. Documentación en `docs/hierarchy-from-staging.md`.
- **Plan de negocio consumo RDS** — `docs/plan-negocio-consumo-datos-rds.md`: contexto, brechas, fases (validación from/to, jerarquía Drive, escala/reporting), riesgos. Referencia a hierarchy-from-staging como Opción A implementada.

### Changed

- **Frontend consumo y lecturas** — Las llamadas a consumo (edificio) y lecturas (medidor) envían siempre `from` y `to` al backend. Rango por defecto: últimos 7 días; al cambiar el rango en el gráfico (StockChart) se actualiza el estado y se refetcha con el nuevo intervalo. Hooks useBuildingConsumption y useMeterReadings requieren from/to (enabled solo con rango); evita peticiones sin acotar con muchos datos en RDS.
- **CLAUDE.md Bulk CSV Ingest** — Alcance explícito: la carga desde Google Drive es un mecanismo de ingesta de datos (puntual u ocasional), no un puente operativo permanente; el producto opera sobre datos ya cargados en RDS.

## [0.9.0-alpha.11] - 2026-03-11

### Fixed

- **dbVerify Lambda y script verify-rds.mjs** — La tabla `meters` tiene columna PK `id`, no `meter_id`. Corregida la consulta de muestra de medidores: `SELECT id AS meter_id FROM meters` en ambos (Lambda y script local).

## [0.9.0-alpha.10] - 2026-03-11

### Added

- **Promoción automática en pipeline Fargate** — tras importar a staging, el contenedor ejecuta `promote.mjs` (validate → catalog → promote → verify). La data de Drive queda en `readings` lista para NestJS. Si staging está vacío, promote sale en 0 sin error.
- **Lambda dbVerify** — función invocable con AWS CLI para verificación RDS sin túnel ni token. `aws lambda invoke --function-name power-digital-api-dev-dbVerify --region us-east-1 out.json`. Devuelve JSON con conteos, medidores por edificio, muestra de meter_id, rangos temporales, jerarquía y listado de edificios. Misma VPC y env que la API.
- **Script infra/db-verify** — verificación RDS con dos modos: (1) modo prueba con `.env` (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME); carga automática con dotenv; (2) sin credenciales locales usa AWS Secrets Manager. Mensajes de error claros en español (ECONNREFUSED, ETIMEDOUT, fallo de autenticación). README y `.env.example` en `infra/db-verify/`.
- **Documento docs/data-drive-aws-review.md** — revisión de qué hay en RDS tras la carga Drive, cómo exponer por backend, consumo en frontend y vistas; verificación vía AWS CLI (Lambda) o script local.

### Changed

- **drive-pipeline Dockerfile** — CMD ejecuta `node index.mjs && node promote.mjs` en secuencia.
- **drive-pipeline/promote.mjs** — cuando staging está vacío retorna null y sale en 0 en vez de lanzar error.

## [0.9.0-alpha.9] - 2026-03-11

### Added

- **Ingesta incremental automatizada Drive → Fargate → RDS** — reemplaza el proceso manual de tunneling SSH (~2.5 horas) por un flujo autónomo, rápido y sin intervención
  - `infra/drive-ingest/index.mjs`: detección de cambios por `driveModifiedTime` — compara el manifest S3 más reciente con el valor actual en Drive antes de descargar; archivos sin cambios se saltan con `[skip]`. Variable `FORCE_DOWNLOAD=true` disponible para forzar descarga completa
  - `infra/drive-pipeline/` (nueva carpeta): orquestador unificado que encadena detección → descarga Drive→S3 → importación S3→`readings_import_staging` en un único proceso Fargate-ready
    - `index.mjs`: lógica completa del pipeline con validación de registros, batching y `INSERT ON CONFLICT DO NOTHING` idempotente
    - `Dockerfile`: imagen `node:20-alpine` lista para ECS Fargate
    - `package.json`: dependencias unificadas (googleapis, csv-parse, pg, @aws-sdk/*)
    - `task-definition.json`: Task Definition para `energy-monitor-drive-pipeline:1` (1 vCPU, 2 GB, subnets privadas, SG RDS)
  - EventBridge Scheduler `energy-monitor-drive-pipeline-daily`: cron `0 6 * * ? *` UTC = **03:00 Chile** diariamente
  - CloudWatch log group `/ecs/energy-monitor-drive-pipeline` para auditoría de corridas
  - `.github/workflows/drive-pipeline.yml`: CI/CD que hace build + push de la imagen Docker a ECR en cada push a `main` con cambios en `infra/drive-pipeline/**`

### Infrastructure

| Recurso | Valor |
|---|---|
| Task Definition | `energy-monitor-drive-pipeline:1` |
| ECR Repository | `energy-monitor-drive-pipeline` |
| EventBridge Schedule | `energy-monitor-drive-pipeline-daily` (`cron(0 6 * * ? *)`) |
| CloudWatch Log Group | `/ecs/energy-monitor-drive-pipeline` |
| IAM Role (EventBridge) | `energy-monitor-eventbridge-drive-pipeline` |

## [0.9.0-alpha.8] - 2026-03-10

### Changed

- **Contexto activo ahora sí estrecha el backend** — cuando el usuario selecciona un sitio en frontend, el cliente envía `X-Site-Context` y `RolesGuard` reduce el scope efectivo de ese request
  - Usuarios multisite ya no reciben sólo filtro visual local; el narrowing también ocurre server-side
  - Un sitio activo fuera del alcance asignado ahora devuelve `403`
  - Los roles globales conservan vista portafolio cuando el contexto es `*`, y pueden estrecharse a un sitio concreto cuando lo eligen

## [0.9.0-alpha.7] - 2026-03-10

### Added

- **Invitación con link firmado operativa** — el primer acceso SSO ya puede exigir un token de invitación con expiración cuando la cuenta fue provisionada por `/admin/users`
  - Backend: `users` ahora persiste `invitation_token_hash`, `invitation_expires_at` e `invitation_sent_at`
  - Backend: nuevo endpoint público `GET /invitations/:token` para validar la invitación antes del login
  - Backend: `GET /auth/me` acepta `X-Invitation-Token` para enlazar identidades en el primer acceso y limpiar el token al activarse
  - Frontend: nueva vista pública `/invite/:token` para validar la invitación y continuar con Microsoft/Google
  - Frontend: `/admin/users` ahora devuelve y muestra un link de invitación copiable con fecha de expiración
  - SQL: nueva migración `sql/009_invitation_links.sql`

### Changed

- **Onboarding invite-first endurecido** — una invitación emitida con link firmado ya no depende sólo del match por email; el primer enlace SSO puede requerir el token válido y vigente
- **Backlog de invitaciones reducido** — el pendiente ya no es el token firmado, sino el envío transaccional por email y el lifecycle administrativo de reemisión o revocación

## [0.9.0-alpha.6] - 2026-03-10

### Added

- **Scoping backend por sitio operativo** — los endpoints de datos ya no exponen información global a usuarios limitados a uno o más sitios
  - `authContext` ahora resuelve `siteIds` y alcance global reutilizable para guards y controllers
  - Buildings, meters, hierarchy y alerts filtran datos por sitios asignados; los roles globales conservan acceso transversal
  - `POST /alerts/sync-offline` ahora evalúa sólo el subconjunto de medidores visible para el usuario que ejecuta la acción
  - Nuevas tests backend para helpers de scoping y wiring de controllers

### Changed

- **Recursos fuera de alcance devuelven 404** — detalle de building, meter, hierarchy y alert ya no filtra sólo por permiso; también oculta recursos fuera del scope asignado
- **Known gap reducido** — el pendiente de acceso ya no es el scoping por sitio, sino usar el sitio seleccionado en frontend como filtro server-side adicional para usuarios multisite

## [0.9.0-alpha.5] - 2026-03-10

### Added

- **Baseline invite-first operativo** — el backend ya no autocrea accesos abiertos; el primer login SSO sólo enlaza identidades contra usuarios preprovisionados por email
  - SQL: nueva migración `sql/007_invite_first_users.sql` para permitir `provider` y `external_id` nulos hasta el primer login
  - Backend: `GET /users`, `POST /users` y `GET /roles` para provisionar invitaciones con rol y sitios preasignados
  - Frontend: nueva vista `/admin/users` para crear invitaciones y revisar estado (`invited`, `active`, `disabled`)
  - Tests backend agregados para el binding invite-first y el flujo RBAC actualizado
- **Catálogo persistido de vistas reales** — la tabla `modules` ahora representa vistas navegables del producto y no módulos abstractos
  - SQL: nueva migración `sql/008_views_catalog.sql` para migrar `modules` al catálogo real y reseedear `role_permissions`
  - Backend: nuevo endpoint `GET /views` para inspeccionar el catálogo persistido de vistas
  - RBAC backend y frontend alineados a códigos de vista reales como `BUILDINGS_OVERVIEW`, `ALERTS_OVERVIEW`, `METER_DETAIL` y `ADMIN_USERS`

### Changed

- **Matriz de acceso normalizada a `rol -> vistas -> acciones`** — rutas protegidas, guards backend, navegación y CTAs quedaron alineados al catálogo real de vistas para reducir `403` evitables
- **Mensajes de acceso no invitado** — el frontend ahora informa explícitamente cuando una cuenta no tiene invitación activa en vez de tratarlo como activación pendiente genérica

## [0.9.0-alpha.4] - 2026-03-06

### Fixed

- **Gráfico "Calidad Eléctrica" vacío en medidores 3P** — Los campos THD voltaje, THD corriente y desbalance de fases se insertaban como NULL porque `profiles.json` no tenía perfiles estadísticos para esos campos
  - Agregados perfiles `thdV`, `thdI`, `phImb` para los 6 medidores 3P (M001, M002, M003, M011, M012, M013) con variación día/noche
  - Backfill de 35,738 readings históricos con datos realistas (THD-V ~2-4%, THD-I ~5-12%, desbalance ~0.8-2.5%)
  - Lambda del generador sintético re-desplegada con nuevos perfiles

### Changed

- **Drill-down: removido treemap** — Se eliminó el gráfico treemap "Distribución de consumo" del drill-down jerárquico, dejando solo el gráfico de barras horizontales + tabla

---

## [0.9.0-alpha.3] - 2026-03-06

### Changed

- **Loading state en charts al cambiar zoom** — Al cambiar resolución (ej. Todo→1D), el gráfico anterior permanece visible con un spinner overlay semitransparente en vez de desaparecer y mostrar un skeleton vacío
  - `keepPreviousData` en `useBuildingConsumption` y `useMeterReadings` (TanStack Query)
  - Prop `loading` en `StockChart` con overlay spinner animado
- **Separación visual de badges** — `UptimeBadges` y `AlarmSummaryBadges` ahora tienen margen inferior (`mb-3`) para no pegarse al primer gráfico

---

## [0.9.0-alpha.2] - 2026-03-06

### Added

- **Página Estado de Dispositivos IoT** (`/iot-devices`) — vista global de todos los medidores con status, uptime y alarmas
  - Backend: `GET /meters/overview` — query eficiente con LATERAL JOIN para uptime 24h y subquery para alarmas 30d (sin N+1)
  - Frontend: `IoTDevicesPage` con DataTable (TanStack Table), 8 columnas: Medidor, Edificio, Modelo, Fase, Estado (badge), Última Lectura (relativo), Uptime 24h (coloreado), Alarmas 30d (badge)
  - Resumen: badges Total/Online/Offline en header
  - Click en fila navega a `/meters/:id`
  - Sorting por cualquier columna
  - Nuevo item "Dispositivos" en sidebar (visible para todos los roles)

### Fixed

- **Zoom "Todo" → "1D" bloqueado** — Highcharts auto-calculaba `minRange` basado en densidad de datos diarios, impidiendo zoom a rangos <1 día. Fix: `minRange: 3600000` (1 hora) explícito en xAxis
- **`rangeSelector.selected` reseteaba zoom en re-render** — Removido `selected` del theme global. Ahora se gestiona via `initialSelected` ref que aplica `selected: 2` (1M) solo en el primer render y se limpia después

---

## [0.9.0-alpha.1] - 2026-03-06

### Added

- **Visualización de alarmas en MeterDetailPage** — 8 tipos de alarma (HIGH_DEMAND, LOW_POWER_FACTOR, BREAKER_OPEN, UNDERVOLTAGE, OVERVOLTAGE, HIGH_THD, PHASE_IMBALANCE, MODBUS_CRC_ERROR)
  - Backend: `GET /meters/:id/alarm-events?from=&to=` y `GET /meters/:id/alarm-summary?from=&to=`
  - Frontend: `AlarmSummaryBadges` — badges coloreados por tipo (últimos 30 días)
  - Frontend: `AlarmEventsTable` — tabla de eventos con fecha, tipo, voltaje, FP, THD
  - Highcharts `flags` series en 4 charts: Potencia (CRC/DEM/BRK), Voltaje (UV/OV), PF (PF), Calidad (THD/IMB)
- **Resolución 15 min en gráfico de edificio** — `BuildingDetailPage` ahora cambia resolución dinámicamente al hacer zoom: ≤36h→15min, ≤7d→hourly, >7d→daily
  - Backend: `findBuildingConsumption` soporta `resolution=15min` con truncación manual `date_trunc('hour') + interval '15 min' * floor(...)`
  - Frontend: `pickResolution` + `handleRangeChange` via `afterSetExtremes`

### Changed

- **Range selector buttons** — Cambiados a `1D` (día), `1S` (semana), `1M` (mes), `Todo`. Default: 1M
- **Labels de charts** — "Voltaje (V)" → "Voltaje Fase (V)", "THD Voltaje (%)" → "THD Voltaje Fase (%)"

### Fixed

- **Jerarquía inventada eliminada** — Removidos subtableros y circuitos ficticios (Iluminación, Climatización, Fuerza, etc.). Jerarquía aplanada a Gateway → Medidor (17 nodos reales)
- **CSV reimportado (v2)** — Corregidos valores de `energy_kWh_total` (antes ~5-8 kWh, ahora 0→3,031 kWh acumulativo). Perfiles estadísticos y datos sintéticos regenerados
- **Highcharts `hoverPoint` crash** — Parchado `Pointer.onContainerClick` con try-catch para evitar `TypeError: Cannot read properties of undefined (reading 'hoverPoint')` al hacer click en áreas vacías del chart o navigator

---

## [0.8.0-alpha.5] - 2026-03-06

### Added

- **7 columnas faltantes en readings** — Agregadas `breaker_status`, `digital_input_1/2`, `digital_output_1/2`, `alarm`, `modbus_crc_errors` a la tabla `readings` (21/21 columnas del CSV)
  - SQL migration, backend entity, frontend types, import script actualizados
  - Re-importación completa: 86,104 filas con las 21 columnas

### Changed

- **Generador sintético basado en perfiles reales** — Reemplazado `Math.random()` con rangos inventados por distribución normal (Box-Muller) usando media + desviación estándar por medidor, por hora, extraídos del CSV histórico (13 campos × 15 medidores × 24 horas)
  - Perfiles embebidos como `profiles.json` (58KB) en la Lambda
  - Datos sintéticos regenerados: 4,065 readings "alucinadas" eliminadas, 1,650 nuevas con patrones estadísticos reales

---

## [0.8.0-alpha.4] - 2026-03-06

### Added

- **Uptime tracking por medidor** — Historial de disponibilidad IoT derivado de gaps en readings via `LAG()` window function (sin nuevas tablas)
  - Backend: `GET /meters/:id/uptime` (resumen 24h/7d/30d) y `GET /meters/:id/downtime-events` (eventos con duración)
  - Frontend: `UptimeBadges` — 3 badges coloreados (verde ≥99.5%, amarillo ≥95%, rojo <95%) con conteo de eventos
  - Frontend: `DowntimeEventsTable` — tabla de downtime últimos 30 días con inicio, fin y duración
  - Threshold: 90 min (compatible con datos históricos 15min, backfill horario y sintéticos 1min)

---

## [0.8.0-alpha.3] - 2026-03-06

### Changed

- **Range selector buttons** — Cambiados de `1d, 1s, 1m` a `1D` (1 día), `1H` (1 hora), `1M` (1 minuto), `Todo`. Default: 1D

---

## [0.8.0-alpha.2] - 2026-03-06

### Added

- **Resolución 15 minutos** — Zoom 1D ahora muestra puntos cada 15 min. Resolución dinámica: ≤36h→15min, ≤7d→hourly, >7d→daily via `afterSetExtremes` de Highcharts Stock
- **6 gráficos por medidor** — MeterDetailPage ahora muestra: Potencia (kW + kVAR dual-axis), Voltaje (L1/L2/L3), Corriente (L1/L2/L3), Factor de Potencia & Frecuencia (dual-axis), Energía Acumulada (area), Calidad Eléctrica (THD + Desbalance, solo 3P). Series toggleables via legend

### Fixed

- **Spike consumo edificio (~550 kW → ~13 kW)** — Query `findBuildingConsumption` usaba `SUM(power_kw)` directo, inflado 60× por múltiples readings/hora. Fix: agregación en dos pasos (AVG por medidor por bucket, luego SUM entre medidores)
- **Highcharts error #18 (dual-axis)** — StockChart mergeaba `yAxis` como objeto cuando charts pasan array. Fix: detecta `Array.isArray` y aplica theme styles a cada eje

---

## [0.8.0-alpha.1] - 2026-03-06

### Added

- **Drill-down jerárquico 5 niveles** — Edificio → Tablero General → Subtablero → Circuito → Medidor
  - SQL migration: tabla `hierarchy_nodes` con `parent_id` auto-referencial + seed 24 nodos (2 edificios)
  - Backend `HierarchyModule`: queries CTE recursivos para árbol, path ancestros, hijos con consumo agregado, time-series por nodo
  - `DrilldownPage`: estado `currentNodeId` con drill-down in-page
  - `DrilldownTreemap`: Highcharts treemap con `colorAxis` (verde→rojo por consumo), click = drill
  - `DrilldownBars`: barras horizontales kWh por hijo, ordenadas descendente
  - `DrilldownChildrenTable`: tabla con nombre, tipo, kWh, %, medidores, estado; click = drill o navegar a medidor
  - `DrilldownBreadcrumb`: breadcrumb clickeable con badges de nivel
  - Ruta `/monitoring/drilldown/:buildingId` con lazy loading + Suspense + ErrorBoundary + DrilldownSkeleton
  - Botón "Drill-down Jerárquico" en `BuildingDetailPage`

### Fixed

- **Gap de datos Mar 2-5**: backfill de 1,440 readings sintéticas (15 medidores × 24 hrs × 4 días) para cerrar el hueco entre datos históricos (→Mar 1) y generador sintético (Mar 6→)
- **Synthetic generator inflado**: `power_kw` se compounding exponencialmente (1.4→1550 kW) porque usaba `last_power` como base. Fix: rango nominal fijo por tipo de medidor (3P ~2.5 kW, 1P ~0.85 kW). Purgados 1,200 readings corruptos de Mar 6 y regenerados con magnitudes correctas
- **Highcharts treemap ESM/CJS**: fix inicialización del módulo treemap compatible con ambos formatos de export

---

## [0.7.0-alpha.6] - 2026-03-06

### Added

- **ErrorBoundary** (`ErrorBoundary.tsx`): class component con `getDerivedStateFromError` + `componentDidCatch` que captura errores de rendering
  - UI de error con mensaje, botón "Reintentar" (resetea estado) y "Ir al inicio"
  - Logs de error en consola con component stack
- **Per-route error boundaries**: cada página (Buildings, BuildingDetail, MeterDetail, Login, Unauthorized) envuelta en `<ErrorBoundary>` individual — un error en una página no tumba la app completa
- **`errorElement`** en layout route como fallback de último recurso para errores de routing

---

## [0.7.0-alpha.5] - 2026-03-06

### Added

- **React Suspense + Lazy Loading** (`router.tsx`): todas las páginas se cargan con `React.lazy()` + `Suspense` con skeleton como fallback
  - Code splitting: cada página es un chunk separado (BuildingsPage 1.1KB, BuildingDetailPage 2.6KB, MeterDetailPage 2KB, LoginPage 3.3KB)
  - StockChart (Highcharts 388KB) solo se descarga cuando se navega a una vista con gráficos
- **Skeletons inline**: `ChartSkeleton` y `MetersGridSkeleton` para secciones que cargan después del componente principal (consumption, meters, readings)
  - `BuildingDetailPage`: skeleton para chart mientras `consumption` carga + skeleton grid mientras `meters` carga
  - `MeterDetailPage`: skeleton para charts mientras `readings` carga

### Fixed

- **`border-radius: 0 !important` global eliminado** (`index.css`): reset CSS que anulaba `rounded-lg` en Cards y `borderRadius: 8` en charts
- **Navigator rango por defecto**: cambiado de "Todo" a "1 semana" (`selected: 1`) para vista inicial razonable

---

## [0.7.0-alpha.4] - 2026-03-06

### Added

- **Skeleton loading states** (`Skeleton.tsx`): componentes `animate-pulse` que replican el layout de cada página durante la carga
  - `BuildingsPageSkeleton`: título + grid de 4 cards fantasma
  - `BuildingDetailSkeleton`: header + chart 380px + 6 meter cards
  - `MeterDetailSkeleton`: header + metadata + 2 charts
  - `ProtectedRoute`: sidebar fantasma + layout con chart y cards (reemplaza "Cargando..." a pantalla completa)

---

## [0.7.0-alpha.3] - 2026-03-06

### Changed

- **Sidebar**: removido bloque de usuario (avatar, nombre, rol) del fondo — solo queda botón "Cerrar sesión"
- **Botón "Volver"**: sin bordes, texto plano con hover sutil
- **BuildingDetailPage**: gráfico de consumo siempre visible (fijo); solo la sección de medidores hace scroll
- **Bordes redondeados** (`rounded-lg` / `borderRadius: 8`): aplicado a `Card`, `StockChart` y `Chart`

---

## [0.7.0-alpha.2] - 2026-03-06

### Added

- **Highcharts Stock Navigator**: nuevo componente `StockChart.tsx` usando `highcharts/highstock` — gráfico detallado arriba + mini-chart con handles arrastrables abajo para seleccionar rango temporal
  - Range Selector con botones rápidos: 1d, 1s, 1m, Todo
  - Dark theme con navigator estilizado (mask fill azul, handles azules, scrollbar deshabilitado)
- **Filtrado temporal from/to**: endpoints `GET /meters/:id/readings` y `GET /buildings/:id/consumption` ahora aceptan parámetros opcionales `from` y `to` (ISO 8601) para limitar el rango de datos retornado

### Changed

- `BuildingConsumptionChart.tsx`: migrado de `Chart` a `StockChart` con navigator
- `MeterDetailPage.tsx`: gráficos de potencia y voltaje migrados a `StockChart`
- `meters.service.ts`: `findReadings()` y `findBuildingConsumption()` filtran por `from`/`to` via QueryBuilder
- `buildings.service.ts`: `findConsumption()` pasa `from`/`to` al service
- `endpoints.ts`: `fetchBuildingConsumption` y `fetchMeterReadings` aceptan `from`/`to`

---

## [0.7.0-alpha.1] - 2026-03-06

### Added

- **Synthetic data generator** (`infra/synthetic-generator/`): Lambda standalone que inserta 15 readings (1 por medidor) cada 1 minuto con `timestamp = NOW()` y valores realistas (variación ±10%, factor hora del día, energía acumulativa)
  - `index.mjs`: handler Lambda con LATERAL JOIN para leer última lectura + batch INSERT
  - `package.json`: dependencia `pg`
  - `teardown.sh`: script para eliminar Lambda + EventBridge rule
  - `.gitignore`: excluye `node_modules/`
- **EventBridge rule** `synthetic-readings-every-1min`: dispara la Lambda cada 1 minuto
- **Swagger / OpenAPI** (`@nestjs/swagger`): documentación interactiva del API
  - `swagger.ts`: setup centralizado (título, versión, Bearer auth)
  - Swagger UI disponible en `/api/docs`
  - `@ApiTags`, `@ApiOperation`, `@ApiParam`, `@ApiQuery`, `@ApiOkResponse` en los 3 controllers
  - `@ApiProperty` con ejemplos en entities: Building, Meter, Reading
  - DTOs de respuesta: `MeResponseDto`, `PermissionsResponseDto`, `BuildingSummaryDto`, `ConsumptionPointDto`

### Changed

- **Dynamic meter status**: `meters.service.ts` calcula `online`/`offline` según `lastReadingAt` (< 5 min = online) en vez de usar el valor estático de la DB
- **Raw readings query**: cambiado de `ORDER BY timestamp ASC LIMIT 2000` (más viejas) a `DESC LIMIT 2000 + reverse` (más recientes)
- **serverless.ts**: incluye `setupSwagger(app)` para que Swagger funcione en Lambda

### Removed

- **Frontend mocks eliminados**: `src/mocks/` (5 archivos), `useDemoAuth.ts`, `DemoRoleSelector.tsx`
- **Demo mode**: removido `'demo'` de `AuthProvider`, `VITE_AUTH_MODE`, `validateEnv`, `LoginPage`, `useAuth`
- Mock interceptor ya no intercepta rutas de datos — frontend consume API real directamente

### Infrastructure

| Recurso | Valor |
|---|---|
| Lambda (synthetic) | `synthetic-readings-generator` (Node 20, 128MB, 15s timeout) |
| EventBridge | `synthetic-readings-every-1min` (rate: 1 minute) |
| Costo estimado | ~$0.01/mes (free tier) |

---

## [0.6.0-alpha.1] - 2026-03-05

### Breaking — Schema migration: locals → meters/readings

Reemplazado el schema dummy (5 buildings, 10 locals, monthly_consumption) por data real de telemetría: 15 medidores Siemens (PAC1670/PAC1651) con 86,104 lecturas cada 15 min (Ene-Feb 2026).

### Added

- **SQL migration** (`sql/004_meters_readings.sql`): DROP locals/monthly_consumption, CREATE meters (15 rows) + readings (86K rows), index `(meter_id, timestamp)`
- **Backend MetersModule** (`backend/src/meters/`): entity Meter + Reading, service con `date_trunc` aggregation (hourly/daily), controller `GET /meters/:id`, `GET /meters/:id/readings?resolution=hourly`
- **Building consumption endpoint** mejorado: `GET /buildings/:id/consumption?resolution=hourly` — area chart con potencia total por hora (suma de todos los medidores), pico instantáneo
- **Frontend MeterDetailPage** (`/meters/:meterId`): gráficos de potencia (kW) y voltaje trifásico (V) con data real horaria
- **MeterCard component**: status badge (online/offline), modelo, fase, bus, última lectura
- **Frontend hooks**: `useMetersByBuilding`, `useMeter`, `useMeterReadings`
- **Mock data actualizada**: 2 buildings reales, 15 meters, readings generadas para demo mode
- **User upsert fallback**: búsqueda por email cuando `external_id` no matchea (permite pre-registrar usuarios sin conocer su Google/Microsoft ID)
- **Usuario darwin@hoktus.com** registrado como SUPER_ADMIN (Google login)

### Removed

- `backend/src/locals/` (5 archivos): entity Local, MonthlyConsumption, controller, service, module
- `frontend/src/features/locals/` (3 archivos): LocalDetailPage, LocalCard, LocalConsumptionTable
- `frontend/src/hooks/queries/useLocals.ts`
- `frontend/src/mocks/locals.ts`, `consumption.ts`
- Tipos `Local`, `MonthlyConsumption`, `HierarchyNode` del frontend

### Changed

- **Buildings**: `localsCount` → `metersCount`, `/locals` → `/meters` endpoint
- **BuildingDetailPage**: muestra MeterCards en vez de LocalCards
- **BuildingConsumptionChart**: area chart con potencia total + pico (era line chart de kWh mensuales)
- **Router**: `meterDetail` (`/meters/:meterId`) reemplaza `localDetail`
- **Types**: `Building.metersCount`, nuevo `Meter`, `Reading`, `ConsumptionPoint`
- **Mock interceptor**: rutas meters/readings en vez de locals/consumption

### Database (RDS)

| Tabla | Filas |
|---|---|
| buildings | 2 (PAC4220 Gateway, S7-1200 PLC) |
| meters | 15 (M001-M015) |
| readings | 86,104 (15-min intervals, Jan-Feb 2026) |
| locals | DROPPED |
| monthly_consumption | DROPPED |

---

## [0.5.0-alpha.8] - 2026-03-05

### Fixed

- **Microsoft login**: cambiado de `loginPopup()` a `loginRedirect()` — el popup flow de MSAL v5 no cerraba el popup (la SPA completa se cargaba dentro del popup y React Router tomaba control antes de que MSAL procesara el hash)
- **Backend routes 404**: `dist/` estaba desactualizado — `BuildingsModule` y `LocalsModule` no estaban compilados. Rebuild + redeploy corrige todas las rutas
- **React setState-during-render**: movido el side effect de `resolveBackendUser` a un `useEffect` con ref guard en vez de ejecutarlo durante el render del hook `useAuth`

### Added

- **Vite dev proxy**: proxy `/api` → API Gateway para desarrollo local (no requiere CORS en dev)
- **Frontend `.env`** (gitignored): credenciales OAuth + API base URL para dev local

### Changed

- `frontend/src/hooks/auth/useMicrosoftAuth.ts`: `loginRedirect()` + `logoutRedirect()` en vez de popup
- `frontend/src/hooks/auth/useAuth.ts`: `useEffect` para detectar MSAL redirect flow post-autenticación, error messages detallados con status code
- `frontend/vite.config.ts`: proxy `/api` → API Gateway (sin `/dev/` stage prefix)
- Backend redeployado con `BuildingsModule` + `LocalsModule` compilados — endpoints `/api/buildings`, `/api/locals` funcionan
- Usuario Microsoft (`carriagadafalcone@gmail.com`) activado como SUPER_ADMIN en RDS

---

## [0.5.0-alpha.6] - 2026-03-05

### Added

- **Frontend → Backend auth integrado**: login con Microsoft/Google ahora envía el ID token (JWT) a `GET /api/auth/me`, recibe user + permissions reales desde RDS
- **Google credential flow**: cambiado de `useGoogleLogin({ flow: 'implicit' })` (access_token opaco) a `<GoogleLogin>` component (ID token JWT verificable por JWKS)
- **Microsoft ID token**: `loginPopup()` ahora guarda `idToken` en `sessionStorage` para envío automático como Bearer
- **`resolveBackendUser()`**: helper en `useAuth` que llama `/api/auth/me` post-login y maneja 401/403 con mensajes claros
- **Mock interceptor inteligente**: en modo no-demo, rutas `/auth/*` pasan al backend real; rutas de datos siguen mock. Rutas sin handler pasan al backend (no 404 falso)
- **Backend `.env`**: archivo local con credenciales RDS + OAuth client IDs para `sls offline`

### Changed

- `frontend/src/hooks/auth/useMicrosoftAuth.ts`: guarda `idToken` en sessionStorage post-login
- `frontend/src/hooks/auth/useGoogleAuth.ts`: exporta `onGoogleSuccess(credential)` en vez de implicit flow
- `frontend/src/features/auth/components/GoogleLoginButton.tsx`: usa `<GoogleLogin>` de `@react-oauth/google`
- `frontend/src/hooks/auth/useAuth.ts`: `loginMicrosoft()` y `loginGoogle()` llaman `resolveBackendUser()` post-token
- `frontend/src/mocks/mockInterceptor.ts`: handlers separados en `dataHandlers` + `authHandlers`, con passthrough para rutas sin mock
- Frontend desplegado a producción con `VITE_AUTH_MODE=microsoft`

---

## [0.5.0-alpha.5] - 2026-03-05

### Added

- **CI/CD backend deploy**: nuevo job `deploy-backend` en GitHub Actions — build + `sls deploy` con secrets
- **GitHub Secrets**: `DB_PASSWORD`, `DB_HOST`, `DB_USERNAME`, `VPC_SECURITY_GROUP_ID`, `VPC_SUBNET_ID_1/2/3` (reutiliza `VITE_*` para OAuth client IDs)

### Security

- **CORS restringido**: `localhost:5173` solo se incluye cuando `NODE_ENV !== 'production'` (en `main.ts` y `serverless.ts`)
- **Credenciales y IDs de infra externalizados**: `DB_HOST`, `DB_USERNAME`, SG y subnet IDs movidos de valores hardcoded a `${env:...}` en `serverless.yml`

### Fixed

- **Mock interceptor**: rutas desconocidas ahora retornan 404 en vez de `{ data: null, status: 200 }`

### Changed

- `backend/serverless.yml`: todos los valores sensibles vía env vars con defaults seguros para dev local
- `.github/workflows/deploy.yml`: jobs `build-backend` + `deploy-backend` agregados
- `backend/src/main.ts`, `backend/src/serverless.ts`: CORS condicional por entorno
- `frontend/src/mocks/mockInterceptor.ts`: reject con 404 para rutas sin handler

---

## [0.5.0-alpha.4] - 2026-03-05

### Security (Critical Fixes)

- **JWT audience validation**: `jwtVerify` ahora valida `audience` para ambos providers (Google y Microsoft). Si falta el client ID en env, el token es rechazado
- **OAuth env vars**: `GOOGLE_CLIENT_ID` y `MICROSOFT_CLIENT_ID` agregados a `serverless.yml` (vía `${env:...}`, no hardcoded)
- **Endpoint `/api/roles` eliminado**: `RolesController` borrado — el endpoint público ya no existe, permisos solo accesibles vía `/api/auth/*` autenticado
- **Auto-provisioning desactivado**: nuevos usuarios se crean con `isActive: false` — requieren activación manual por admin

### Changed

- `backend/src/auth/auth.service.ts`: audience validation per-provider, fail-closed si falta client ID
- `backend/src/roles/roles.module.ts`: removido `RolesController` del módulo
- `backend/src/roles/roles.controller.ts`: archivo eliminado
- `backend/src/users/users.service.ts`: `isActive: false` en `upsert()` para usuarios nuevos

---

## [0.5.0-alpha.3] - 2026-03-05

### Added

- **CloudFront `/api/*` behavior**: requests a `energymonitor.click/api/*` se rutean a API Gateway (origin `626lq125eh.execute-api.us-east-1.amazonaws.com`)
  - Cache policy: `CachingDisabled` (no cache para API)
  - Origin request policy: `AllViewerExceptHostHeader` (forward headers, query strings, cookies)
  - Viewer protocol: HTTPS-only
  - Allowed methods: GET, HEAD, OPTIONS, PUT, PATCH, POST, DELETE

### Verified

| Test | URL | Resultado |
|---|---|---|
| Roles desde RDS | `https://energymonitor.click/api/roles` | 7 roles OK |
| Auth sin token | `https://energymonitor.click/api/auth/me` | 401 Unauthorized |
| Frontend SPA | `https://energymonitor.click` | Sin cambios, sigue sirviendo desde S3 |

---

## [0.5.0-alpha.2] - 2026-03-05

### Added

- **RDS PostgreSQL 16** provisionado en AWS (`db.t3.micro`, 20GB gp3, encrypted, single-AZ, subnets privadas)
  - Instancia: `energy-monitor-db`
  - Security Group: `energy-monitor-rds-sg` (TCP 5432 desde VPC)
  - DB subnet group con 3 subnets privadas (us-east-1a/c/d)
- **SQL migrations ejecutadas** via Lambda temporal en VPC: 6 tablas creadas, 7 roles + 10 módulos + 3 acciones + 67 permisos insertados
- **Backend desplegado** con Serverless Framework V3 a AWS Lambda + HTTP API Gateway
  - Endpoint: `https://626lq125eh.execute-api.us-east-1.amazonaws.com`
  - `GET /api/auth/me` → 401 sin token (correcto)
  - `GET /api/roles` → 7 roles desde RDS (verificado)

### Changed

- `backend/serverless.yml`: credenciales RDS, VPC config (SG + 3 subnets privadas), `NODE_ENV: production`
- `backend/src/app.module.ts`: SSL `rejectUnauthorized: false` para compatibilidad con RDS CA
- Downgrade a `serverless@3` (V4 requiere licencia)

### Infrastructure

| Recurso | Valor |
|---|---|
| RDS Instance | `energy-monitor-db` (PostgreSQL 16, db.t3.micro) |
| RDS Endpoint | `energy-monitor-db.ci1q4okokkkd.us-east-1.rds.amazonaws.com` |
| Security Group | `sg-0adda6a999e8d5d9a` |
| API Gateway | `626lq125eh.execute-api.us-east-1.amazonaws.com` |
| Lambda | `power-digital-api-dev-api` (256MB, Node 20, VPC) |

---

## [0.5.0-alpha.1] - 2026-03-05

### Added

- **Monorepo structure**: proyecto separado en `frontend/` y `backend/`
- **NestJS backend** (`backend/`): API REST con NestJS + TypeORM + PostgreSQL
  - `AuthModule`: endpoints `GET /api/auth/me` y `GET /api/auth/permissions` (decode JWT, upsert user, return permissions)
  - `RolesModule`: entities `Role`, `Module_`, `Action`, `RolePermission` con service para consultar permisos por role_id
  - `UsersModule`: entities `User`, `UserSite` con upsert y lookup por OAuth provider
  - `serverless.ts`: handler Lambda via `@vendia/serverless-express`
  - `serverless.yml`: deploy a AWS Lambda + HTTP API Gateway con `serverless-offline` para dev local
- **SQL migrations** (`sql/`): `001_schema.sql` (6 tablas) y `002_seed.sql` (7 roles con IDs numéricos, 10 módulos, 3 acciones, matriz completa de permisos)
- **Frontend auth hooks**: `useMe()`, `usePermissions()` (TanStack Query) en `frontend/src/hooks/queries/useAuthQuery.ts`
- **Frontend auth routes**: `routes.getMe()`, `routes.getPermissions()` + endpoints `fetchMe()`, `fetchPermissions()`
- **Mock auth responses**: `/auth/me` y `/auth/permissions` en mock interceptor

### Changed

- `frontend/` ahora contiene todo el código React (movido desde raíz)
- `.github/workflows/deploy.yml`: actualizado con `working-directory: frontend` y `cache-dependency-path`
- CDK stack eliminado (`infra/`): reemplazado por NestJS + Serverless Framework

### Database Schema

| Tabla | Descripción |
|---|---|
| `roles` | 7 roles con IDs numéricos (1=SUPER_ADMIN ... 7=AUDITOR) |
| `modules` | 10 módulos del sistema (Dashboard, Buildings, Alerts, etc.) |
| `actions` | 3 acciones (view, manage, export) |
| `role_permissions` | Matriz many-to-many role↔module↔action |
| `users` | Usuarios OAuth con `external_id`, `provider`, `role_id` |
| `user_sites` | Acceso por sitio/edificio por usuario |

---

## [0.4.0-alpha.1] - 2026-03-05

### Added

- **GitHub Actions CI/CD** (`.github/workflows/deploy.yml`): build + typecheck en PRs, deploy a S3 + CloudFront invalidation en push a main
- **CDK stack** (`infra/`): S3 bucket (privado, OAC), CloudFront distribution con security headers policy (CSP, HSTS, X-Frame-Options), SPA routing (404→index.html), HTTP/2+3, TLS 1.2
- **Cache strategy**: assets hasheados con `max-age=31536000,immutable`; `index.html` con `no-cache`
- **GitHub Secrets/Variables**: OAuth credentials, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET`, `CLOUDFRONT_DISTRIBUTION_ID`, `AWS_REGION`

### Fixed

- Errores TypeScript en CI: `appRoutes.ts` (cast a `AppRoute[]`), `msalConfig.ts` (`storeAuthStateInCookie` removido), `useGoogleAuth.ts` (import no usado)

### Pipeline

- Build: `npm ci` → `tsc --noEmit` → `vite build` → artifact upload
- Deploy: S3 sync (assets immutable + index.html no-cache) → CloudFront invalidation
- Primer deploy exitoso a `energymonitor.click` vía CI/CD

---

## [0.3.0-alpha.4] - 2026-03-05

### Added

- **CSP + security headers** (`index.html`): `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`
- **Auth token interceptor** (`src/services/api.ts`): inyecta `Bearer` token en cada request, redirect a `/login` en 401
- **Validación de env vars** (`src/validateEnv.ts`): valida `VITE_AUTH_MODE` y credenciales requeridas según el modo al iniciar la app

### Changed

- `src/main.tsx`: mock interceptor protegido con `import.meta.env.DEV`; `validateEnv()` ejecutado al startup
- `src/features/auth/LoginPage.tsx`: demo login restringido a `VITE_AUTH_MODE === 'demo'` (ya no visible en cualquier build dev)
- `src/components/ui/Layout.tsx`: avatar URL validada con protocolo `https:` antes de renderizar
- `index.html`: título actualizado a "POWER Digital® — Energy Monitor"

### Security

- Mock interceptor ya no se activa en builds de producción
- Demo role selector inaccesible fuera de modo demo
- Avatar URLs con protocolo inseguro (`http:`, `javascript:`, etc.) son rechazadas
- Requests API llevan token de autenticación automáticamente

---

## [0.3.0-alpha.3] - 2026-03-05

### Added

- **Mapa de rutas API** (`src/services/routes.ts`): objeto `routes` con helpers parametrizados (`routes.getBuilding(id)`, etc.)
- **Mock interceptor** (`src/mocks/mockInterceptor.ts`): interceptor axios que sirve datos mock; se desactiva eliminando una línea en `main.tsx`
- **Mapa de rutas de navegación** (`src/app/appRoutes.ts`): objeto `appRoutes` con path, label, `allowedRoles` y `showInNav`; helpers `buildPath()` y `getNavItems(role)`
- **Barrel de hooks** (`src/hooks/index.ts`): re-exporta todos los hooks desde un solo import path

### Changed

- `src/services/endpoints.ts`: refactorizado a `api.get(routes.xxx())` — listo para API real
- `src/app/router.tsx`: paths y `allowedRoles` consumidos desde `appRoutes`
- `src/components/ui/Layout.tsx`: sidebar generado dinámicamente con `getNavItems(user.role)`
- `src/features/buildings/components/BuildingConsumptionChart.tsx`: gráfico cambiado de `column` a `line`

---

## [0.3.0-alpha.2] - 2026-03-05

### Changed

- **Tipografía Inter**: instalado `@fontsource-variable/inter` (self-hosted), aplicado en `index.css` y en Highcharts theme
- **Header desktop eliminado**: removida la barra superior en desktop; nombre del usuario ahora aparece bajo "Energy Monitor" en el sidebar
- **Header mobile**: se mantiene solo el hamburger menu en móvil

---

## [0.3.0-alpha.1] - 2026-03-04

### Added

- **Dark theme** con 8 tokens semánticos CSS (`@theme {}` en Tailwind v4): `base`, `surface`, `raised`, `border`, `text`, `muted`, `subtle`, `accent`
- **Scrollbar oscuro** global: thin, colores `--color-border` / `--color-subtle`
- **Series de gráficos coloreadas**: azul (`#388bfd`), naranja (`#f78166`), teal (`#3dc9b0`), amarillo (`#d29922`), rojo (`#f85149`) — reemplaza la paleta monocromática

### Changed

- **18 archivos** migrados de colores hardcoded light-theme a tokens dark-theme
- `src/index.css`: body bg/color usa CSS variables, scrollbar styles
- `src/components/ui/Chart.tsx`: `monochromeTheme` → `darkTheme` con fondos oscuros y series coloreadas
- `src/components/ui/DataTable.tsx`: headers sticky (`top-0`), acepta `className` prop
- `src/components/ui/Card.tsx`, `PageHeader.tsx`, `Layout.tsx`: tokens dark
- `src/features/buildings/BuildingDetailPage.tsx`: layout vertical (gráfico arriba, locales abajo)
- `src/features/locals/LocalDetailPage.tsx`: tabla con scroll interno y headers fijos, fill gradient azul
- `src/features/buildings/components/BuildingConsumptionChart.tsx`: removido `color: '#333'` inline (hereda azul del theme)
- Auth pages (LoginPage, UnauthorizedPage, botones OAuth, DemoRoleSelector): tokens dark
- Feature pages (BuildingsPage, BuildingCard, LocalCard): tokens dark
- `src/components/auth/ProtectedRoute.tsx`: texto loading con token `text-subtle`

---

## [0.2.0-alpha.2] - 2026-03-04

### Added

- **Permisos** (`src/auth/permissions.ts`): matriz `PERMISSIONS` por módulo/acción con helper `hasPermission(role, module, action)`
- **ProtectedRoute** (`src/components/auth/ProtectedRoute.tsx`): wrapper que redirige a `/login` si no autenticado, a `/unauthorized` si rol no permitido
- **UnauthorizedPage** (`src/features/auth/UnauthorizedPage.tsx`): página "Acceso denegado" con botón volver al inicio
- **Ruta `/unauthorized`**: registrada como ruta pública en el router

### Changed

- `src/app/router.tsx`: rutas protegidas envueltas en `<ProtectedRoute><Layout /></ProtectedRoute>`
- `src/components/ui/Layout.tsx`: sidebar muestra avatar + nombre + rol del usuario + botón "Cerrar sesión"; header muestra nombre en desktop

---

## [0.2.0-alpha.1] - 2026-03-04

### Added

- **Dependencias MSAL**: `@azure/msal-browser`, `@azure/msal-react` para autenticación Microsoft
- **Tipos de autenticación** (`src/types/auth.ts`): `AuthProvider`, `Role` (7 roles), `AuthUser`, `AuthState`
- **Tipos de dominio** (`src/types/index.ts`): `Meter`, `HierarchyNode`, `Reading`, `Alert`, `Invoice`, `AuditLog`, `Tenant`, `Integration`
- **Variables de entorno**: `.env` y `.env.example` con config para Microsoft Entra y modo auth
- **Tipado de env vars** (`src/env.d.ts`): `ImportMetaEnv` con las 4 variables VITE\_
- **Configuración MSAL** (`src/auth/`): `msalConfig.ts`, `msalInstance.ts`, `microsoftAuth.ts` — config, singleton y helpers de login/logout Microsoft
- **Hook `useMicrosoftAuth`** (`src/hooks/auth/useMicrosoftAuth.ts`): login/logout popup Microsoft, estado de autenticación
- **Auth Store** (`src/store/useAuthStore.ts`): Zustand con persist en sessionStorage para mantener sesión al refrescar
- **Usuarios demo** (`src/mocks/users.ts`): 7 usuarios mock, uno por rol (SUPER_ADMIN → AUDITOR)
- **Hook `useDemoAuth`** (`src/hooks/auth/useDemoAuth.ts`): login instantáneo por rol para desarrollo
- **Hook `useAuth`** (`src/hooks/auth/useAuth.ts`): fachada unificada que abstrae Microsoft, Google y Demo
- **LoginPage** (`src/features/auth/LoginPage.tsx`): página de login con botones Microsoft/Google + selector de roles demo
- **MicrosoftLoginButton**: botón con logo Microsoft SVG, abre popup OAuth
- **GoogleLoginButton**: botón con logo Google SVG, abre popup OAuth
- **DemoRoleSelector**: grid de 7 roles para login rápido en desarrollo
- **Ruta `/login`**: registrada fuera del Layout (standalone, sin sidebar)
- **Dependencia `@react-oauth/google`**: provider y hooks para Google OAuth
- **Google Auth** (`src/auth/googleAuth.ts`, `src/auth/googleConfig.ts`): config y helper para parsear credenciales Google
- **Hook `useGoogleAuth`** (`src/hooks/auth/useGoogleAuth.ts`): login popup Google con implicit flow

### Changed

- `src/main.tsx`: `MsalProvider` + `GoogleOAuthProvider` envuelven `<App />`
- `src/app/router.tsx`: ruta `/login` agregada fuera del layout principal
- `src/types/auth.ts`: `AuthProvider` incluye `'google'`
- `.gitignore` actualizado para excluir `.env` y `.env.local`

### Configuración Azure

- App Registration "POWER Digital" en Microsoft Entra (multi-tenant + personal accounts)
- Redirect URIs: `http://localhost:5173` (dev), `https://energymonitor.click` (prod)
- API Permission: `User.Read` (Delegated) con admin consent

### Configuración Google

- OAuth Client ID reutilizado de banados-fullstack
- Authorized JavaScript origins: `http://localhost:5173`, `https://energymonitor.click`

---

## [0.1.0] - 2026-02-17

### Added

- **Scaffold del proyecto** con React 19 + Vite + TypeScript
- **Dependencias**: React Router v7, TanStack Query v5, TanStack Table v8, Highcharts, Axios, Zustand, Tailwind CSS v4
- **Tipos**: interfaces `Building`, `Local`, `MonthlyConsumption`
- **Datos mock**: 5 edificios, 10 locales, 12 meses de consumo por local
- **Capa de servicios**: mock API con delays simulados (`endpoints.ts`)
- **Query hooks**: `useBuildings`, `useBuilding`, `useBuildingConsumption`, `useLocalsByBuilding`, `useLocal`, `useLocalConsumption`
- **Store Zustand**: estado de sidebar (abierto/cerrado)
- **Componentes UI reutilizables**:
  - `Layout` — shell responsive con sidebar colapsable y header
  - `Card` — card genérica con slot de children
  - `PageHeader` — título, breadcrumbs y botón volver
  - `Chart` — wrapper de Highcharts con tema monocromático
  - `DataTable` — wrapper genérico de TanStack Table con sorting
- **Páginas**:
  - `BuildingsPage` (`/`) — grid responsive de edificios
  - `BuildingDetailPage` (`/buildings/:id`) — gráfico de columnas con consumo total + grid de locales
  - `LocalDetailPage` (`/buildings/:buildingId/locals/:localId`) — gráfico de área + tabla de consumo
- **Componentes de dominio**: `BuildingCard`, `BuildingConsumptionChart`, `LocalCard`, `LocalConsumptionTable`
- **Router**: 3 rutas con layout envolvente
- **Diseño low-fidelity**: paleta monocromática, sin border-radius, bordes sólidos 1px, tipografía system
- **Responsividad**: mobile (1 col, sidebar oculta), tablet (2 cols), desktop (3-4 cols, sidebar visible)
- **Sin scrollbar vertical** en ninguna vista; solo scroll horizontal en tablas
- **Interacción bidireccional gráfico-tabla**: hover en un punto del gráfico destaca la fila en la tabla y viceversa (con tooltip sincronizado)

## Estructura del Proyecto

```
energy-monitor/
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts
├── eslint.config.js
├── public/
│   └── vite.svg
└── src/
    ├── main.tsx                          # Entry point
    ├── index.css                         # Tailwind + estilos globales
    ├── app/
    │   ├── App.tsx                       # QueryClientProvider + RouterProvider
    │   └── router.tsx                    # Definición de rutas (3 rutas)
    ├── components/
    │   └── ui/
    │       ├── Card.tsx                  # Card genérica reutilizable
    │       ├── Chart.tsx                 # Wrapper Highcharts (tema mono, hover sync)
    │       ├── DataTable.tsx             # Wrapper TanStack Table (sorting, row highlight)
    │       ├── Layout.tsx                # Shell: sidebar + header + main
    │       └── PageHeader.tsx            # Título + breadcrumbs + botón volver
    ├── features/
    │   ├── buildings/
    │   │   ├── BuildingsPage.tsx         # Grid de edificios (/)
    │   │   ├── BuildingDetailPage.tsx    # Detalle edificio (/buildings/:id)
    │   │   └── components/
    │   │       ├── BuildingCard.tsx      # Card de edificio
    │   │       └── BuildingConsumptionChart.tsx  # Gráfico columnas consumo
    │   └── locals/
    │       ├── LocalDetailPage.tsx       # Detalle local (/buildings/:id/locals/:id)
    │       └── components/
    │           ├── LocalCard.tsx         # Card de local
    │           └── LocalConsumptionTable.tsx     # Tabla consumo mensual
    ├── hooks/
    │   └── queries/
    │       ├── useBuildings.ts           # Queries: buildings, building, consumption
    │       └── useLocals.ts             # Queries: locals, local, consumption
    ├── mocks/
    │   ├── buildings.ts                  # 5 edificios
    │   ├── locals.ts                    # 10 locales
    │   └── consumption.ts              # Consumo mensual por local (12 meses)
    ├── services/
    │   ├── api.ts                       # Instancia Axios
    │   └── endpoints.ts                 # Funciones mock API con delay
    ├── store/
    │   └── useAppStore.ts               # Zustand: sidebar state
    └── types/
        └── index.ts                     # Building, Local, MonthlyConsumption
```

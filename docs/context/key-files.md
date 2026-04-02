# Key Files

## Backend
| Archivo | Propósito |
|---|---|
| `backend/src/serverless.ts` | Entry point Lambda (cached bootstrap) |
| `backend/src/offline-alerts.ts` | Lambda scheduled: offline meter detection |
| `backend/src/auth/auth.service.ts` | JWT/JWKS verification, binding usuarios invitados |
| `backend/src/auth/auth.controller.ts` | GET /auth/me, GET /auth/permissions |
| `backend/src/common/range-guard.ts` | from/to obligatorios, max 31 días |
| `backend/src/common/utf8-json.interceptor.ts` | Content-Type utf-8 en respuestas |
| `backend/src/users/users.controller.ts` | Admin invitaciones y usuarios |
| `backend/src/meters/meters.service.ts` | Listado medidores por edificio + última lectura (DISTINCT ON) |
| `backend/src/alerts/alerts.controller.ts` | GET /alerts con filtros opcionales severity/meter_id |
| `backend/src/comparisons/comparisons.service.ts` | Comparativas: by-store-type, by-store-name, filters (raw SQL) |
| `backend/src/comparisons/comparisons.controller.ts` | GET /comparisons/* (3 endpoints) |
| `backend/serverless.yml` | Lambda 256MB, VPC, env vars |
| `backend/billing-pdf-lambda/handler.py` | Lambda Python: genera PDF billing Globe Power |
| `backend/billing-pdf-lambda/deploy.sh` | Deploy script Lambda Python (Docker build + AWS CLI) |

## Frontend
| Archivo | Propósito |
|---|---|
| `frontend/src/lib/formatters.ts` | Formatters compartidos: `fmt`, `fmtNum`, `fmtClp`, `fmtAxis`, `monthLabel`, `monthName`, `fmtDate` |
| `frontend/src/lib/constants.ts` | Constantes: `MONTH_NAMES_SHORT`, `MONTH_NAMES_FULL`, `SHORT_BUILDING_NAMES` |
| `frontend/src/lib/aggregations.ts` | Agregaciones null-safe: `sumNonNull`, `maxNonNull`, `avgNonNull`, `sumByKey`, `maxByKey` |
| `frontend/src/lib/chartConfig.ts` | Config charts: `ChartType`, `CHART_COLORS`, `LIGHT_PLOT_OPTIONS`, `LIGHT_TOOLTIP_STYLE` |
| `frontend/src/hooks/useClickOutside.ts` | Hook click-outside: ref único o array, parámetro `active` |
| `frontend/src/components/ui/DataTable.tsx` | Tabla genérica: Column<T> con ReactNode, headerRender, cellClassName, className, footer, bg-surface sticky |
| `frontend/src/components/ui/PillButton.tsx` | Botón pill PA reutilizable |
| `frontend/src/components/ui/SectionBanner.tsx` | Banner título PA con controles opcionales |
| `frontend/src/components/ui/TogglePills.tsx` | Toggle genérico pill PA |
| `frontend/src/components/ui/PillDropdown.tsx` | Dropdown genérico pill PA con `onHover` |
| `frontend/src/components/ui/PaginatedTable.tsx` | Wrapper DataTable con paginación client-side |
| `frontend/src/components/ui/MultiSelect.tsx` | Dropdown búsqueda + checkboxes multi-selección |
| `frontend/src/hooks/auth/useAuth.ts` | Fachada auth |
| `frontend/src/services/api.ts` | Axios Bearer + 401 interceptor |
| `frontend/src/services/endpoints.ts` | Todas las llamadas API (auth, buildings, meters, billing) |
| `frontend/src/services/routes.ts` | Paths de API centralizados |
| `frontend/src/store/useAuthStore.ts` | Zustand persist → sessionStorage |
| `frontend/src/store/useAppStore.ts` | Estado UI + contexto de sitio |
| `frontend/src/app/appRoutes.ts` | Rutas + RBAC roles |
| `frontend/src/features/dashboard/DashboardPage.tsx` | Dashboard: gráfico combo + tablas + cards pago + drawers |
| `frontend/src/features/dashboard/mockData.ts` | Data mock: 15 edificios, 3 cards resumen, 5 períodos vencidos |
| `frontend/src/features/monitoring/RealtimePage.tsx` | Monitoreo: DataTable última lectura por medidor |
| `frontend/src/features/alerts/AlertsPage.tsx` | Alertas: DataTable con filtros checkbox + fecha avanzado |
| `frontend/src/features/alerts/AlertDetailPage.tsx` | Detalle alerta |
| `frontend/src/hooks/queries/useAlerts.ts` | Hook TanStack Query para alertas |
| `frontend/src/hooks/queries/useComparisons.ts` | Hooks TanStack Query para comparativas (filters, by-type, by-name) |

## Infra
| Archivo | Propósito |
|---|---|
| `infra/aggregate-builder/build-aggregates.mjs` | Población completa agregados |
| `infra/aggregate-builder/incremental-hourly.mjs` | Actualización incremental (Lambda) |
| `infra/drive-pipeline/index.mjs` | Orquestador Fargate |
| `infra/drive-pipeline/Dockerfile` | Imagen Docker pipeline |
| `infra/drive-import-staging/index.mjs` | S3 → staging |
| `infra/drive-import-staging/ingest-two-months.sh` | Ingesta por ventana temporal |
| `infra/billing-xlsx-import/index.mjs` | XLSX billing → RDS |
| `infra/db-verify/billing-vs-consumption.mjs` | Cruce billing vs consumo |
| `infra/db-verify/verify-rds.mjs` | Verificación RDS |
| `infra/synthetic-generator/index.mjs` | TEMPORAL: lecturas sintéticas 1/min |
| `scripts/test-all-apis.mjs` | Prueba APIs con Bearer token |
| `scripts/tunnel-rds.sh` | Túnel SSH a RDS |

## monitoreo-v2 Backend
| Archivo | Propósito |
|---|---|
| `monitoreo-v2/backend/src/app.module.ts` | Root module: DB, rate limiting, guards globales (JWT, permissions, throttler, audit) |
| `monitoreo-v2/backend/src/modules/auth/` | OAuth login → JWT httpOnly cookies, refresh rotation, `/auth/me` |
| `monitoreo-v2/backend/src/modules/buildings/` | CRUD edificios con tenant + buildingIds RBAC |
| `monitoreo-v2/backend/src/modules/meters/` | CRUD medidores con tenant + buildingIds + filtro buildingId |
| `monitoreo-v2/backend/src/modules/readings/` | Read-only: time-series, latest, aggregated. `time_bucket` para downsampling |
| `monitoreo-v2/backend/src/modules/alerts/` | Alertas: list, detail, acknowledge, resolve |
| `monitoreo-v2/backend/src/modules/hierarchy/` | CRUD jerarquía eléctrica (nodos + medidores por nodo) |
| `monitoreo-v2/backend/src/modules/concentrators/` | CRUD concentradores + gestión medidores asociados |
| `monitoreo-v2/backend/src/modules/tenant-units/` | CRUD locatarios + gestión medidores asociados |
| `monitoreo-v2/backend/src/modules/tariffs/` | CRUD tarifas + bloques horarios |
| `monitoreo-v2/backend/src/modules/invoices/` | CRUD facturas + line items + approve/void |
| `monitoreo-v2/backend/src/modules/reports/` | CRUD reportes + generate + export + scheduled + `ReportsSchedulerService` (cron 5 min) |
| `monitoreo-v2/backend/src/modules/integrations/` | CRUD integraciones + sync-logs + sync stub |
| `monitoreo-v2/backend/src/modules/fault-events/` | Read-only eventos de fallo con filtros |
| `monitoreo-v2/backend/src/modules/platform/entities/` | Entidades dominio (incl. Report, ScheduledReport, Integration, IntegrationSyncLog) |
| `monitoreo-v2/backend/src/common/guards/` | `JwtAuthGuard`, `PermissionsGuard` (globales) |
| `monitoreo-v2/backend/src/common/decorators/` | `@CurrentUser()`, `@Public()`, `@RequirePermission()` |

## monitoreo-v2 Frontend
| Archivo | Propósito |
|---|---|
| `monitoreo-v2/frontend/src/services/routes.ts` | Rutas API centralizadas (+ `reports`; `integrations` reservado en constantes) |
| `monitoreo-v2/frontend/src/services/endpoints.ts` | Llamadas API tipadas (+ `reportsEndpoints`) |
| `monitoreo-v2/frontend/src/services/api.ts` | Axios con cookies, refresh token rotation, 401 retry queue |
| `monitoreo-v2/frontend/src/types/` | Tipos espejo del backend (+ `report.ts`, etc.) |
| `monitoreo-v2/frontend/src/hooks/queries/` | Query hooks TanStack (+ `useReportsQuery` y mutaciones programados/generar) |
| `monitoreo-v2/frontend/src/hooks/usePermissions.ts` | `has(module, action)`, `hasAny()`, `isAdmin` desde JWT permissions |
| `monitoreo-v2/frontend/src/hooks/useQueryState.ts` | Reduce `useQuery` a fase UI: loading/error/empty/ready |
| `monitoreo-v2/frontend/src/components/charts/` | `Chart`, `StockChart`, `MonthlyChart` — agnósticos, colores via CSS vars |
| `monitoreo-v2/frontend/src/components/ui/Modal.tsx` | Dialog nativo HTML con backdrop |
| `monitoreo-v2/frontend/src/components/ui/ConfirmDialog.tsx` | Confirmación eliminar (reutiliza Modal) |
| `monitoreo-v2/frontend/src/components/ui/QueryStateView.tsx` | Estados query; acepta `onRetry` o `refetch`, `emptyDescription` o `emptyMessage` |
| `monitoreo-v2/frontend/src/components/ui/DataWidget.tsx` | Wrapper loading/error/empty/ready (delega en `QueryStateView`) |
| `monitoreo-v2/frontend/src/lib/chart-config.ts` | Config central charts: `baseChartOptions()`, `stockChartExtras()` |
| `monitoreo-v2/frontend/src/store/` | `useAuthStore` (user + tenant + buildings), `useAppStore` (sidebar + selectedBuildingId) |
| `monitoreo-v2/frontend/src/features/auth/LoginPage.tsx` | Login Microsoft + Google |
| `monitoreo-v2/frontend/src/features/dashboard/DashboardPage.tsx` | KPIs, StockChart time-series, alertas activas, resumen edificios |
| `monitoreo-v2/frontend/src/features/dashboard/executive/ExecutiveDashboardPage.tsx` | `/dashboard/executive`: KPIs portfolio, tendencias, ranking, críticas |
| `monitoreo-v2/frontend/src/features/dashboard/compare/CompareDashboardPage.tsx` | `/dashboard/compare`: edificios y/o periodo actual vs anterior |
| `monitoreo-v2/frontend/src/features/dashboard/dashboardAggregations.ts` | Agregaciones cliente para dashboards (preset, periodo previo, series por edificio) |
| `monitoreo-v2/frontend/src/features/buildings/` | `BuildingsPage` (tabla + CRUD), `BuildingForm` (modal crear/editar) |
| `monitoreo-v2/frontend/src/features/meters/` | `MetersPage` (tabla + filtro + CRUD), `MeterForm` (modal crear/editar) |
| `monitoreo-v2/frontend/src/features/alerts/AlertsPage.tsx` | Tabla alertas con filtros + acciones acknowledge/resolve |
| `monitoreo-v2/frontend/src/features/monitoring/realtime/RealtimePage.tsx` | Tabla lecturas en vivo, auto-refresh 30s, status online/offline/alarma |
| `monitoreo-v2/frontend/src/features/monitoring/drilldown/DrilldownPage.tsx` | Vista jerárquica: edificio → concentradores → medidores |
| `monitoreo-v2/frontend/src/features/monitoring/demand/DemandPage.tsx` | StockChart demanda + peak vs contratada + Top 10 peaks |
| `monitoreo-v2/frontend/src/features/monitoring/quality/QualityPage.tsx` | 4 charts calidad eléctrica + umbrales normativos |
| `monitoreo-v2/frontend/src/features/monitoring/devices/DevicesPage.tsx` | Tabla unificada medidores + concentradores con filtros |
| `monitoreo-v2/frontend/src/features/monitoring/meters-by-type/MetersByTypePage.tsx` | `/monitoring/meters/type`: agrupación por tipo, KPIs últimas lecturas |
| `monitoreo-v2/frontend/src/features/monitoring/generation/GenerationSitePage.tsx` | `/monitoring/generation`: gen vs carga, energía, autoconsumo (readings aggregated) |
| `monitoreo-v2/frontend/src/features/monitoring/modbus-map/ModbusMapPage.tsx` | `/monitoring/modbus-map`: buses Modbus, concentradores, CRC/uplink |
| `monitoreo-v2/frontend/src/features/monitoring/lib/meterClassification.ts` | `isGenerationMeterType`, `formatMeterTypeLabel` |
| `monitoreo-v2/frontend/src/features/monitoring/fault-history/FaultHistoryPage.tsx` | Timeline eventos de fallo por medidor |
| `monitoreo-v2/frontend/src/features/reports/ReportsPage.tsx` | Reportes generados + programados (`/reports`) |
| `monitoreo-v2/frontend/src/app/router.tsx` | Router: login, `/`, dashboards, buildings, meters, alerts, monitoring/* (incl. meters/type, generation, modbus-map), billing, reports, admin, components |
| `monitoreo-v2/frontend/src/components/layout/Sidebar.tsx` | Nav con permisos RBAC + badge alertas; entradas monitoreo ampliadas (`end` en `/`) |

## Standalone Infra Scripts
```
infra/
  csv-ingest-lambda/     → Lambda opcional: S3 CSV → staging → readings
  drive-import-staging/  → S3 → staging, promote, backfill, distribute, purge
  drive-ingest/          → Google Drive → S3 raw/manifests
  drive-pipeline/        → Orquestador Fargate unificado
  billing-xlsx-import/   → XLSX billing → RDS
  aggregate-builder/     → Población y actualización incremental de agregados
  db-verify/             → Verificación y diagnóstico RDS
  synthetic-generator/   → EventBridge 1/min, TEMPORAL
  reimport-readings/     → one-off CSV import
  backfill-gap/          → one-off gap backfill
```
No forman parte del build NestJS. Cada uno tiene `package.json` propio y usa `pg` directo.

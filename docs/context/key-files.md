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

# Key Files

## Backend
| Archivo | Propósito |
|---|---|
| `backend/src/serverless.ts` | Entry point Lambda (cached bootstrap) |
| `backend/src/offline-alerts.ts` | Lambda scheduled: offline meter detection |
| `backend/src/meters/meters.service.ts` | Listado medidores por edificio + última lectura por medidor (DISTINCT ON) |
| `backend/src/hierarchy/hierarchy.service.ts` | Drill-down: children con consumo, node consumption |
| `backend/src/common/range-guard.ts` | from/to obligatorios, max 31 días |
| `backend/src/auth/auth.service.ts` | JWT/JWKS verification, binding usuarios invitados |
| `backend/src/common/utf8-json.interceptor.ts` | Content-Type utf-8 en respuestas |
| `backend/src/users/users.controller.ts` | Admin invitaciones y usuarios |
| `backend/src/billing/billing.service.ts` | Consultas billing; scope por siteIds |
| `backend/src/billing/billing.controller.ts` | GET /billing/* |
| `backend/serverless.yml` | Lambda 256MB, VPC, env vars |
| `backend/src/ingest-diagnostic/ingest-diagnostic.service.ts` | Diagnóstico staging vs readings |
| `backend/src/db-verify-lambda.ts` | Lambda verificación RDS |

## Frontend
| Archivo | Propósito |
|---|---|
| `frontend/src/components/ui/StockChart.tsx` | Highcharts Stock wrapper |
| `frontend/src/hooks/auth/useAuth.ts` | Fachada auth |
| `frontend/src/services/api.ts` | Axios Bearer + 401 interceptor |
| `frontend/src/store/useAuthStore.ts` | Zustand persist → sessionStorage |
| `frontend/src/store/useAppStore.ts` | Estado UI + contexto de sitio |
| `frontend/src/app/appRoutes.ts` | Rutas + RBAC roles |
| `frontend/src/features/drilldown/DrilldownPage.tsx` | Drill-down jerárquico |
| `frontend/src/features/billing/BillingPage.tsx` | Facturación: resumen pivote + detalle paginado |
| `frontend/src/features/billing/components/BillingDetailTable.tsx` | Detalle por local/medidor con rowSpan |
| `frontend/src/hooks/queries/useBilling.ts` | Hooks billing |
| `frontend/src/features/admin/AdminUsersPage.tsx` | Alta invitaciones |
| `frontend/src/features/auth/ContextSelectPage.tsx` | Selección de sitio |
| `frontend/src/features/alerts/AlertDetailPage.tsx` | Detalle alerta |
| `frontend/src/features/monitoring/RealtimePage.tsx` | Monitoreo: tabla última lectura por medidor |
| `frontend/src/components/ui/DataTable.tsx` | Tabla declarativa genérica con Column<T> |
| `frontend/src/components/ui/PaginatedTable.tsx` | Wrapper DataTable con paginación client-side |

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

# Ingest Pipeline & Aggregates

## Bulk CSV Ingest — Sistema Incremental

- **Alcance:** ingesta de datos puntual/ocasional desde Google Drive. No es puente operativo permanente.
- **Pipeline:** `infra/drive-pipeline/` — Fargate. CMD: `index.mjs` (Drive → S3 → staging) → `promote.mjs` (staging → readings + catalog) → `hierarchy-from-staging.mjs` (nodos jerarquía).
- **Detección de cambios:** compara `driveModifiedTime` del manifest S3. Si no hubo cambios → skip. `FORCE_DOWNLOAD=true` para forzar.
- **Importación idempotente:** `INSERT ... ON CONFLICT (meter_id, timestamp, source_file) DO NOTHING`.
- **Codificación CSV:** `CSV_ENCODING=latin1` en task definition ECS.
- **Runtime:** ECS Fargate dentro del VPC.
- **Schedule:** EventBridge `cron(0 6 * * ? *)` = 03:00 Chile diariamente.
- **CI/CD:** `.github/workflows/drive-pipeline.yml` → build+push ECR en push a main.

### Corrida manual
```bash
aws ecs run-task --cluster energy-monitor-drive-ingest \
  --task-definition energy-monitor-drive-pipeline:1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-07b8c60f262ea05f8,subnet-00ebf6d39c526567f,subnet-058418d1bc1a8adfa],securityGroups=[sg-0adda6a999e8d5d9a],assignPublicIp=DISABLED}"
```
Logs: `aws logs tail /ecs/energy-monitor-drive-pipeline --follow`

### Infra IDs
- Bucket: `energy-monitor-ingest-058310292956`
- Secrets: `energy-monitor/drive-ingest/db`, `energy-monitor/drive-ingest/google-service-account`
- Cluster ECS: `energy-monitor-drive-ingest`. Task: `energy-monitor-drive-pipeline:1`
- ECR: `energy-monitor-drive-pipeline`. Log group: `/ecs/energy-monitor-drive-pipeline`
- Roles IAM: `energy-monitor-drive-ingest-task-execution-role`, `energy-monitor-drive-ingest-task-role`
- IAM S3 policy: `infra/drive-pipeline/task-role-s3-policy.json`
- Restricción: no usar Lambda para CSV de 1.5–3.15 GB; usar Fargate.

### Objetos en S3 raw/
`MALL_GRANDE_446_completo.csv`, `MALL_MEDIANO_254_completo.csv`, `OUTLET_70_anual.csv`, `SC52_StripCenter_anual.csv`, `SC53_StripCenter_anual.csv`
Rango temporal: 2026-01-01 a 2026-12-31.

### Promotion pipeline: staging → readings
- Fases: `validate` → `catalog` → `promote` → `verify` (ejecutables con `PHASE=<fase>`)
- `promote.mjs` auto-descubre centers y meters, crea buildings/meters, inserta readings con `NOT EXISTS`.
- Soporta `DRY_RUN=true`.
- **staging_centers** se actualiza en fase catalog.
- Estrategia meter_id: expansión directa (MG-001, MM-045, OT-012, SC52-*, SC53-*).

### Ejecución local
```bash
# Validar solo
PHASE=validate npm --prefix infra/drive-import-staging run promote
# Dry run completo
DRY_RUN=true npm --prefix infra/drive-import-staging run promote
# Ejecución completa
npm --prefix infra/drive-import-staging run promote
# Con túnel
DB_HOST=127.0.0.1 DB_PORT=5433 npm --prefix infra/drive-import-staging run promote
```

### GET /buildings y staging_centers
GET /buildings prioriza staging_centers si tiene filas; fallback a buildings si está vacía.

## Tablas agregadas (agg_meter_hourly, agg_node_daily) — MIGRACIÓN 019 PENDIENTE

- **Objetivo:** pre-agregar readings para queries eficientes. Elimina temp files de 18 GB en db.t3.micro.
- **agg_meter_hourly** (PK: meter_id, bucket): por hora por medidor. ~1.2M filas.
- **agg_node_daily** (PK: node_id, bucket DATE): por día por nodo jerarquía. ~146K filas.
- **Migración:** `sql/019_aggregates.sql`.
- **Población:** `infra/aggregate-builder/build-aggregates.mjs` (fases: hourly → daily → monthly → node).
- **Incremental:** `infra/aggregate-builder/incremental-hourly.mjs` (cada hora, 2h overlap).

### Qué lee de dónde (cuando 019 esté aplicada)
- `findReadings(raw/15min)` → `readings`
- `findReadings(hourly)` → `agg_meter_hourly`
- `findReadings(daily)` → `analisis` (period_type=day)
- `findBuildingConsumption` → `agg_meter_hourly` JOIN meters
- `getOverview/Uptime/Downtime` → `agg_meter_hourly`
- `getAlarmEvents/Summary` → `readings` (partial index)
- `findChildrenWithConsumption` → `agg_node_daily`
- `findNodeConsumption(daily)` → `agg_node_daily`
- `findNodeConsumption(hourly)` → `agg_meter_hourly` JOIN subtree

### Range guard
`backend/src/common/range-guard.ts` — from/to obligatorios (excepto raw), max 31 días.

## Billing XLSX Import
- Script: `infra/billing-xlsx-import/index.mjs`
- Lee XLSX desde S3 `billing/`, parsea 3 sheets → billing_monthly_detail, billing_tariffs, billing_center_summary
- Idempotente: ON CONFLICT DO UPDATE
- Backfill summary: `backfill-summary-from-detail.mjs`

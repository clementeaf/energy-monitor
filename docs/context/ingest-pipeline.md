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

## Ingesta Local pg-arauco — Scripts Python

### Scripts disponibles
| Script | Edificio | Fuente | Tablas destino |
|--------|----------|--------|----------------|
| `ingest-403-meter-readings.py` | MG (446) | CSV | raw_readings, store, meter_readings |
| `ingest-403-stores-monthly.py` | MG (446) | CSV | meter_monthly |
| `ingest-billing-xlsx.py` | MG (446) | XLSX Resumen Mensual | meter_monthly_billing (base) |
| `ingest-kpis-xlsx.py` | MG (446) | XLSX Resumen Mensual | meter_monthly_billing (KPIs: peak, demanda, pct, promedio) |
| `ingest-sc53-arauco-express.py` | SC53 (53) | XLSX Consumo por Local | meter_monthly_billing, building_summary, store |
| `ingest-mm254-full.py` | MM (254) | CSV + XLSX | raw_readings, store, meter_monthly, meter_readings, meter_monthly_billing, tariff, building_summary |
| `ingest-ot70-outlet.py` | OT (70) | CSV + XLSX | raw_readings, store, meter_monthly, meter_readings, meter_monthly_billing, tariff (Quilicura), building_summary |
| `ingest-sc52-sc53-strip-centers.py` | SC52 (52) + SC53 (53) | CSV + XLSX | raw_readings, store, meter_monthly, meter_readings, meter_monthly_billing (SC52), tariff (Huechuraba), building_summary (SC52) |
| `ingest-tariffs.py` | — | XLSX Pliegos | tariff |

### Checklist de ingesta para un edificio nuevo

**Archivos requeridos:**
1. `{PREFIJO}_{N}_completo.csv` — lecturas brutas (latin1, 35K filas/medidor/año)
2. `{PREFIJO}{N}_KPIs_mensuales_{YEAR}_M.xlsx` — billing + KPIs mensuales

**Pasos obligatorios (en orden):**

| # | Paso | Tabla destino | Fuente | Notas |
|---|------|--------------|--------|-------|
| 1 | CSV → raw_readings | `raw_readings` | CSV | Batch 5000. Encoding: `latin1` (MG, MM) o `utf-8-sig` (OT, SC52, SC53) |
| 2 | CSV → store + store_type | `store`, `store_type` | CSV | Extraer tipos únicos, MAX(id)+1 para store_type.id |
| 3 | raw_readings → meter_monthly | `meter_monthly` | SQL aggregation | `SUM(kwh)`, `AVG(power_kw)`, `MAX(power_kw)`, `AVG(power_factor)` agrupado por (meter_id, month) |
| 4 | raw_readings → meter_readings | `meter_readings` | SQL particionado | Crear partición LIST por meter_id, INSERT desde raw |
| 5 | XLSX → meter_monthly_billing (base) | `meter_monthly_billing` | XLSX Resumen Mensual | Columnas CLP + energía |
| 6 | XLSX → meter_monthly_billing (KPIs) | `meter_monthly_billing` | XLSX Resumen Mensual | UPDATE: peak_mensual_kw, demanda_hora_punta_kwh, pct_punta_consumo, promedio_diario_kwh |
| 7 | XLSX → tariff (si location nueva) | `tariff` | XLSX Pliegos Tarifarios | PK (month, location) — solo si comuna nueva |
| 8 | Agregar building_summary | `building_summary` | SQL aggregation | Ver fórmulas abajo |
| **9** | **Calcular KPIs building_summary** | `building_summary` | SQL UPDATE | **CRÍTICO — sin esto las cards frontend muestran "—"** |

### Cálculo KPIs building_summary (paso 9)

Las 3 columnas `peak_demand_kw`, `avg_power_kw`, `avg_power_factor` en `building_summary` alimentan las cards "Demanda Peak", "Potencia prom." y "Factor potencia" en la vista Edificio.

**Si el edificio tiene `meter_monthly` (CSV ingestado):**
```sql
UPDATE building_summary bs SET
  peak_demand_kw = sub.sum_peak,
  avg_power_kw   = sub.avg_pw,
  avg_power_factor = sub.avg_pf
FROM (
  SELECT mm.month,
    SUM(mm.peak_power_kw)    AS sum_peak,
    AVG(mm.avg_power_kw)     AS avg_pw,
    AVG(mm.avg_power_factor)  AS avg_pf
  FROM meter_monthly mm
  WHERE mm.meter_id LIKE '{PREFIX}%'
  GROUP BY mm.month
) sub
WHERE bs.building_name = '{BUILDING_NAME}'
  AND bs.month = sub.month;
-- Nota: si meter_monthly usa fechas +1 año respecto a building_summary,
-- usar: bs.month = sub.month - INTERVAL '1 year'
```

**Si el edificio NO tiene `meter_monthly` (solo billing):**
```sql
UPDATE building_summary bs SET
  peak_demand_kw   = sub.sum_peak,
  avg_power_kw     = sub.avg_kw,
  avg_power_factor = 0.920
FROM (
  SELECT month,
    SUM(peak_mensual_kw) AS sum_peak,
    AVG(total_kwh / (EXTRACT(DAY FROM (month + INTERVAL '1 month') - month) * 24.0)) AS avg_kw
  FROM meter_monthly_billing
  WHERE building_name = '{BUILDING_NAME}'
    AND total_kwh > 0
  GROUP BY month
) sub
WHERE bs.building_name = '{BUILDING_NAME}'
  AND bs.month = sub.month;
```

**Fórmulas:**
- `peak_demand_kw` = SUM de peak_power_kw (meter_monthly) o SUM de peak_mensual_kw (billing)
- `avg_power_kw` = AVG de avg_power_kw (meter_monthly) o AVG de (total_kwh / horas_del_mes) por medidor (billing)
- `avg_power_factor` = AVG de avg_power_factor (meter_monthly) o 0.920 constante (billing, cuando no hay dato real)

### Offset de fechas
- CSV/meter_monthly/meter_readings usan rango **2026** (sintético)
- XLSX/billing/building_summary usan rango **2025** (real)
- Al cruzar meter_monthly con building_summary, ajustar con `- INTERVAL '1 year'`

### Errores conocidos en ingestas pasadas
- `ingest-mm254-full.py` paso 8: insertó building_summary **sin** peak_demand_kw, avg_power_kw, avg_power_factor → se corrigió manualmente con UPDATE desde meter_monthly
- `ingest-sc53-arauco-express.py`: insertó building_summary **sin** los 3 KPIs → se corrigió con UPDATE desde meter_monthly_billing
- **`ingest-sc53-arauco-express.py` línea 11: leía del XLSX equivocado** (`MG446_KPIs_mensuales_2025_M.xlsx` en vez de `SC53_KPIs_mensuales_2025_M.xlsx`). Solo parseaba "Consumo por Local (Pivot)" (3 métricas: kWh, Peak, Demanda Punta). Resultado: meter_monthly_billing con 10 columnas CLP/demanda en NULL (energia_clp, dda_max_kw, dda_max_punta_kw, kwh_troncal, kwh_serv_publico, cargo_fijo_clp, total_neto_clp, iva_clp, monto_exento_clp, total_con_iva_clp). **Corregido 2026-03-15:** re-ingesta desde XLSX correcto usando sheet "Resumen Mensual" (22 columnas completas, 636 filas).
- **Lección:** cada edificio tiene su propio XLSX (`{PREFIJO}{N}_KPIs_mensuales_{YEAR}_M.xlsx`). NUNCA reutilizar el XLSX de otro edificio — las sheets pueden tener estructura similar pero datos distintos o parciales.

### Verificación post-ingesta
```sql
-- Verificar que NO haya NULLs en las 3 columnas KPI
SELECT building_name, COUNT(*) as months,
  COUNT(peak_demand_kw) as has_peak,
  COUNT(avg_power_kw) as has_avg,
  COUNT(avg_power_factor) as has_pf
FROM building_summary
GROUP BY building_name;
-- Las 3 columnas has_* deben ser = months para cada edificio
```

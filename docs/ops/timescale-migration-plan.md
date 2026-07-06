# Plan de migración: RDS PostgreSQL → Timescale Cloud

## Problema

RDS PostgreSQL 16 (`db.t3.small`, `energy-monitor-db`) no soporta la extensión TimescaleDB.
El backend depende de:

| Recurso | Tipo | Uso |
|---------|------|-----|
| `readings_15min` | Continuous Aggregate | Queries agregadas largo plazo |
| `readings_hourly` | Continuous Aggregate | Sparklines 24h, diagnóstico comms |
| `readings_daily` | Continuous Aggregate | Variación %, tendencias, comparaciones |
| `portfolio_summary` | Materialized View (depende de `readings_daily`) | KPIs portafolio ~5ms |
| `building_summary` | Materialized View (depende de `readings_daily`) | KPIs por edificio |
| Compression policies | TimescaleDB feature | Chunks >7d comprimidos |
| Retention policies | TimescaleDB feature | Drop chunks >5 años |

Sin TimescaleDB, todas las queries de agregación caen a full scan sobre `readings` (2.6M+ rows) → 504 timeout.

## Destino

**Timescale Cloud** (https://www.timescale.com/cloud)

- PostgreSQL managed con TimescaleDB preinstalado
- Compatible con todas las extensiones que usamos (`pgcrypto`, `uuid-ossp`)
- Connection string drop-in (host + port + user + password)
- Regiones AWS disponibles (us-east-1)
- Pricing: ~$28/mes (4GB RAM, 25GB storage, compute-optimized)

## Pre-requisitos

- [ ] Cuenta en Timescale Cloud (https://console.cloud.timescale.com)
- [ ] Service creado en región `us-east-1` (misma región que ECS/Lambda)
- [ ] Security group / IP allowlist configurado para acceso desde ECS VPC
- [ ] Connection string obtenido: `postgresql://tsdbadmin:<password>@<host>.tsdb.cloud.timescale.com:5432/tsdb?sslmode=require`

## Pasos de migración

### Paso 1 — Snapshot y dump de RDS actual

```bash
# Dump completo (schema + data) desde RDS actual
pg_dump \
  --host=energy-monitor-db.ci1q4okokkkd.us-east-1.rds.amazonaws.com \
  --username=postgres \
  --format=custom \
  --no-owner \
  --no-privileges \
  --exclude-table-data='audit_logs' \
  --file=energy-monitor-dump.custom \
  monitoreo_v2

# Dump audit_logs por separado (puede ser grande)
pg_dump \
  --host=energy-monitor-db.ci1q4okokkkd.us-east-1.rds.amazonaws.com \
  --username=postgres \
  --format=custom \
  --no-owner \
  --table=audit_logs \
  --file=energy-monitor-audit-logs.custom \
  monitoreo_v2
```

### Paso 2 — Restore en Timescale Cloud

```bash
# Conectar a Timescale Cloud y crear la DB
psql "postgresql://tsdbadmin:<password>@<host>.tsdb.cloud.timescale.com:5432/tsdb?sslmode=require" \
  -c "CREATE DATABASE monitoreo_v2;"

# Restore schema + data
pg_restore \
  --host=<host>.tsdb.cloud.timescale.com \
  --username=tsdbadmin \
  --dbname=monitoreo_v2 \
  --no-owner \
  --no-privileges \
  --single-transaction \
  energy-monitor-dump.custom

# Restore audit_logs
pg_restore \
  --host=<host>.tsdb.cloud.timescale.com \
  --username=tsdbadmin \
  --dbname=monitoreo_v2 \
  --no-owner \
  --no-privileges \
  --single-transaction \
  energy-monitor-audit-logs.custom
```

### Paso 3 — Habilitar TimescaleDB y crear hypertables

```sql
-- Conectar a monitoreo_v2 en Timescale Cloud
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Convertir readings a hypertable
SELECT create_hypertable('readings', 'timestamp',
  migrate_data => true,
  chunk_time_interval => INTERVAL '7 days'
);

-- Convertir audit_logs a hypertable
SELECT create_hypertable('audit_logs', 'created_at',
  migrate_data => true,
  chunk_time_interval => INTERVAL '30 days'
);

-- Convertir integration_sync_logs a hypertable (si tiene datos)
SELECT create_hypertable('integration_sync_logs', 'created_at',
  migrate_data => true,
  chunk_time_interval => INTERVAL '7 days'
);
```

### Paso 4 — Aplicar optimizaciones TimescaleDB

Ejecutar el script existente que crea CAGGs, compression y retention:

```bash
psql "postgresql://tsdbadmin:<password>@<host>.tsdb.cloud.timescale.com:5432/monitoreo_v2?sslmode=require" \
  -f monitoreo-v2/database/init/09-timescaledb-optimize.sql
```

Esto crea:
- `readings_15min`, `readings_hourly`, `readings_daily` (CAGGs con refresh policies)
- Compression policies (readings 7d, audit_logs 30d, sync_logs 7d)
- Retention policies (readings 5y, audit_logs 5y, sync_logs 1y)

### Paso 5 — Aplicar migraciones pendientes

```bash
# Migraciones que dependen de TimescaleDB
psql "postgresql://...monitoreo_v2?sslmode=require" \
  -f monitoreo-v2/database/migrations/22-retention-5y.sql
psql "postgresql://...monitoreo_v2?sslmode=require" \
  -f monitoreo-v2/database/migrations/23-cagg-15min.sql
psql "postgresql://...monitoreo_v2?sslmode=require" \
  -f monitoreo-v2/database/migrations/47-portfolio-summary-energy.sql
psql "postgresql://...monitoreo_v2?sslmode=require" \
  -f monitoreo-v2/database/migrations/48-building-summary.sql
```

### Paso 6 — Backfill CAGGs

```sql
-- Forzar materialización de todo el historial
CALL refresh_continuous_aggregate('readings_15min', NULL, NULL);
CALL refresh_continuous_aggregate('readings_hourly', NULL, NULL);
CALL refresh_continuous_aggregate('readings_daily', NULL, NULL);

-- Verificar
SELECT count(*) FROM readings_daily;
SELECT count(*) FROM readings_hourly;

-- Refresh portfolio_summary (depende de readings_daily)
REFRESH MATERIALIZED VIEW portfolio_summary;
REFRESH MATERIALIZED VIEW building_summary;
```

### Paso 7 — Verificar queries

```sql
-- Debe retornar datos (~5ms)
SELECT * FROM portfolio_summary ORDER BY bucket DESC LIMIT 5;

-- CAGG hourly debe retornar datos
SELECT bucket, count(*) FROM readings_hourly
WHERE bucket >= NOW() - INTERVAL '24 hours'
GROUP BY bucket ORDER BY bucket;

-- Daily por building
SELECT bucket, meter_id, avg_power_kw FROM readings_daily
WHERE bucket >= NOW() - INTERVAL '7 days'
LIMIT 10;
```

### Paso 8 — Cambiar connection string en prod

Actualizar variables de entorno en ECS Task Definition:

```bash
# ECS — actualizar task definition
aws ecs describe-task-definition --task-definition energy-monitor-api --query 'taskDefinition' > task-def.json

# Editar task-def.json:
# DB_HOST → <host>.tsdb.cloud.timescale.com
# DB_PORT → 5432 (o el puerto asignado)
# DB_USERNAME → tsdbadmin
# DB_PASSWORD → <password>
# DB_NAME → monitoreo_v2
# Remover RDS_CA_BUNDLE_PATH (Timescale Cloud usa SSL por defecto, confiable sin bundle custom)

# Registrar nueva task definition y update service
aws ecs register-task-definition --cli-input-json file://task-def.json
aws ecs update-service --cluster energy-monitor --service energy-monitor-api --force-new-deployment
```

Actualizar también:
- Lambda `iot-ingest` — env vars `DB_HOST`, `DB_PASSWORD`
- Lambda `offlineAlerts` — env vars `DB_HOST`, `DB_PASSWORD`
- Lambda `drive-pipeline` (si aplica)
- Scripts en `infra/` y `scripts/` que conectan a RDS

### Paso 9 — Verificar E2E

```bash
# Health check
curl https://power-monitor.cloud/api/health

# Endpoint que antes daba 504
curl https://power-monitor.cloud/api/readings/aggregated?from=2026-07-05T00:00:00Z&to=2026-07-06T00:00:00Z&interval=daily&groupBy=portfolio

# Frontend — Panel Consolidado carga sin 504
# Frontend — Consumo Jerárquico carga sin 504
```

### Paso 10 — Reactivar queries en frontend

Revertir los stubs en:
- `ConsumoJerarquicoPage.tsx` — descomentar `useAggregatedReadingsQuery` para yesterday
- Verificar que todas las vistas con aggregated queries funcionan

### Paso 11 — Apagar RDS antiguo

Solo después de 48h de operación estable en Timescale Cloud:

```bash
# Snapshot final de RDS (por si acaso)
aws rds create-db-snapshot \
  --db-instance-identifier energy-monitor-db \
  --db-snapshot-identifier energy-monitor-pre-timescale-final

# Apagar instancia (no eliminar hasta 30 días después)
aws rds stop-db-instance --db-instance-identifier energy-monitor-db
```

## Rollback

Si algo falla después del Paso 8:
1. Revertir ECS task definition a la versión anterior (apunta a RDS)
2. Revertir Lambdas a env vars RDS
3. Force new deployment

No se pierde data: RDS sigue vivo hasta Paso 11.

## Estimación de costos

| Recurso | Actual (RDS) | Nuevo (Timescale Cloud) |
|---------|-------------|------------------------|
| DB | db.t3.small ~$29/mes | Compute-optimized 4GB ~$28/mes |
| Storage | 20GB gp3 ~$3/mes | 25GB incluido |
| Backup | Automático RDS | Automático Timescale |
| **Total** | **~$32/mes** | **~$28/mes** |

Costo neutro o menor. Performance 10-100x en queries agregadas.

## Checklist

- [ ] Cuenta Timescale Cloud creada
- [ ] Service creado en us-east-1
- [ ] IP allowlist configurado
- [ ] Dump de RDS completado
- [ ] Restore en Timescale Cloud completado
- [ ] Hypertables creadas
- [ ] 09-timescaledb-optimize.sql aplicado
- [ ] Migraciones 22, 23, 47, 48 aplicadas
- [ ] CAGGs backfilled
- [ ] portfolio_summary + building_summary refreshed
- [ ] Queries verificadas
- [ ] ECS connection string actualizado
- [ ] Lambdas connection string actualizado
- [ ] Health check OK
- [ ] Aggregated queries OK (no 504)
- [ ] Frontend verificado (Consolidado + Consumo)
- [ ] Queries frontend reactivadas
- [ ] 48h estable
- [ ] RDS snapshot final
- [ ] RDS stopped

# Roadmap técnico — gaps EMS (multi-tenant)

**Baseline:** [`MATRIZ-CUMPLIMIENTO-EMS.md`](MATRIZ-CUMPLIMIENTO-EMS.md)  
**Alcance:** `monitoreo-v2/backend` + `monitoreo-v2/database/` (+ infra mínima cuando el task lo indica)  
**Principio:** PASA es un tenant más. Nada hardcodeado a PASA en schema/API (usar `tenant.settings`, códigos ISO, IDs externos por tenant).

## Convenciones

| Campo | Significado |
|-------|-------------|
| **ID** | `GAP-###` — ticket atómico (ideal: 0.5–1.5 días dev) |
| **PASA** | IDs Anexo 07 que cierra (parcial o total) |
| **Deps** | IDs GAP bloqueantes |
| **Done** | Criterio verificable |

**Orden:** ejecutar por olas (0→9). Dentro de cada ola, respetar deps.

---

## Ola 0 — Correcciones rápidas (conflictos actuales)

| ID | Tarea | Archivos / área | PASA | Done |
|----|-------|-----------------|------|------|
| GAP-001 | Eliminar purge `audit_logs` a 2 años en `DataRetentionService` | `backend/src/modules/auth/data-retention.service.ts` | CYB-10 | Cron ya no borra audit; retención la maneja solo Timescale policy |
| GAP-002 | Documentar en código que `audit_logs` retention = policy SQL (5y) | `database/init/09-timescaledb-optimize.sql` + comentario en service | CYB-10 | Comentario + test unitario que purge audit count = 0 |
| GAP-003 | Añadir test: `data-retention` no toca `readings` ni `audit_logs` | `data-retention.service.spec.ts` (nuevo) | — | Test verde |
| GAP-004 | Health check: añadir query `SELECT 1` a DB en `/health` | `health.controller.ts` | ARQ-08 | Response incluye `db: ok|fail` |
| GAP-005 | Health check: incluir versión migración/schema (tabla `schema_migrations`) | `database/migrations/` + health | ARQ-08 | Campo `schemaVersion` en JSON |
| GAP-006 | Crear tabla `schema_migrations (version, applied_at)` | `database/migrations/15-schema-migrations.sql` | ARQ-15 | Tabla existe; script apply registra versión |
| GAP-007 | Registrar `portfolio_summary` en repo si falta en prod | buscar SQL en prod / crear `migrations/16-portfolio-summary.sql` | ARQ-07 | ✅ `database/migrations/16-portfolio-summary.sql` |

### Ola 0 — estado

| ID | Estado |
|----|--------|
| GAP-001 – GAP-007 | ✅ Completado 2026-06-06 |

## Ola 1 — Modelo geográfico multi-tenant (no “solo PASA”)

> Jerarquía genérica: **tenant → región (opcional) → site/building → unidad/locatario → medidor**.

| ID | Tarea | Archivos / área | PASA | Deps | Done |
|----|-------|-----------------|------|------|------|
| GAP-010 | Migración: `tenants.default_country_code CHAR(2)` nullable | `migrations/17-tenant-geography.sql` | ARQ-01 | — | Columna + seed null OK |
| GAP-011 | Migración: `tenants.default_currency CHAR(3)` nullable | misma migración | ARQ-01 | — | Columna ISO 4217 |
| GAP-012 | Migración: `tenants.default_timezone VARCHAR(50)` (ya existe; validar NOT NULL) | `02-schema.sql` doc + migration si falta | ARQ-01 | — | Todo tenant tiene timezone |
| GAP-013 | Migración: tabla `regions (id, tenant_id, code, name, country_code)` | `17-tenant-geography.sql` | ARQ-05 | — | CRUD SQL OK |
| GAP-014 | Migración: `buildings.region_id UUID FK` nullable | misma | ARQ-05 | GAP-013 | FK + index |
| GAP-015 | Migración: `buildings.country_code CHAR(2)` nullable | misma | ARQ-01 | — | Index `(tenant_id, country_code)` |
| GAP-016 | Migración: `buildings.timezone VARCHAR(50)` nullable | misma | ARQ-01, DAT-04 | — | Fallback a tenant.default_timezone en app |
| GAP-017 | Migración: `buildings.external_site_id VARCHAR(100)` nullable | misma | DAT-11 | — | Unique `(tenant_id, external_site_id)` where not null |
| GAP-018 | Migración: `buildings.site_kind VARCHAR(30)` enum (`mall`, `outlet`, `strip`, `office`, `other`) | misma | DAT-11 | — | Check constraint |
| GAP-019 | Entity `Region` + relación en TypeORM | `backend/.../entities/` | ARQ-05 | GAP-013 | Entity compila |
| GAP-020 | Extender `Building` entity con nuevos campos | `building.entity.ts` | ARQ-05 | GAP-014–018 | Types + columns |
| GAP-021 | Extender `Tenant` entity: country, currency defaults | `tenant.entity.ts` | ARQ-01 | GAP-010–011 | DTO update tenant |
| GAP-022 | `PATCH /tenants/:id` acepta default_country, default_currency | `tenants.controller.ts` | ARQ-01 | GAP-021 | Test controller |
| GAP-023 | `POST/PATCH /buildings` acepta region_id, country_code, timezone, external_site_id, site_kind | `buildings` module | DAT-11 | GAP-020 | Validación `@IsISO31661Alpha2()` etc. |
| GAP-024 | Seed: región “Chile Central” solo para tenant demo (no hardcode PASA) | `init/04-seed.sql` o seed script | — | GAP-013 | Seed idempotente |
| GAP-025 | Migración: `tenant_units.external_unit_id VARCHAR(100)` nullable | `18-tenant-units-external.sql` | DAT-11 | — | Unique per building |
| GAP-026 | Exponer `external_unit_id` en CRUD tenant-units | `tenant-units` module | DAT-11 | GAP-025 | API + test |
| GAP-027 | Migración: `meters.load_category VARCHAR(30)` (`hvac`, `lighting`, `tenant`, `main`, `other`) | `19-meter-metadata.sql` | DAT-11 | — | Nullable; enum check |
| GAP-028 | Migración: ampliar `meters.metadata` documentado; índice GIN opcional | docs + migration comment | DAT-11 | — | Comentario en schema doc |
| GAP-029 | CRUD meters: aceptar `load_category` | `meters` module | DAT-11 | GAP-027 | DTO + test |
| GAP-030 | Vista SQL `v_sites_enriched`: building + tenant country + region name | `migrations/20-views-enriched.sql` | DAT-11 | GAP-014–017 | Vista selectable |
| GAP-031 | External API: `GET /v1/buildings` incluye country_code, timezone, external_site_id | `external-api.controller.ts` | DAT-04, DAT-11 | GAP-023 | Response documentado OpenAPI |

### Ola 1 — estado

| ID | Estado |
|----|--------|
| GAP-010 – GAP-031 | ✅ Completado 2026-06-06 |

### Ola 2 — estado

| ID | Estado |
|----|--------|
| GAP-040 – GAP-050 | ✅ Completado 2026-06-06 |

### Ola 3 — estado

| ID | Estado |
|----|--------|
| GAP-060 – GAP-069 | ✅ Completado 2026-06-06 |

### Ola 4 — estado

| ID | Estado |
|----|--------|
| GAP-070 – GAP-081 | ✅ Completado 2026-06-06 |

---

| ID | Tarea | Archivos / área | PASA | Deps | Done |
|----|-------|-----------------|------|------|------|
| GAP-040 | Enum SQL `reading_quality AS ENUM ('measured','estimated','invalid','unknown')` | `21-reading-quality.sql` | DAT-06 | — | Tipo creado |
| GAP-041 | Columna `readings.quality reading_quality DEFAULT 'unknown'` | misma | DAT-06 | GAP-040 | Columna en hypertable |
| GAP-042 | Columna `readings.ingested_at TIMESTAMPTZ DEFAULT NOW()` | misma | DAT-19 | — | Distinguir event time vs ingest time |
| GAP-043 | Columna `readings.source VARCHAR(30)` (`modbus`, `mqtt`, `api_ingress`, `backfill`, …) | misma | DAT-19 | — | Nullable OK histórico |
| GAP-044 | Actualizar `Reading` entity TypeORM | `reading.entity.ts` | DAT-06 | GAP-041–043 | sync entity |
| GAP-045 | `ReadingsService`: incluir quality, source en SELECT list | `readings.service.ts` | DAT-06 | GAP-044 | Tests actualizados |
| GAP-046 | Helper `resolveBuildingTimezone(buildingId)` con fallback tenant | `lib/timezone.ts` nuevo | DAT-04 | GAP-016 | Unit test |
| GAP-047 | API readings: añadir campos `timestampUtc`, `timezone`, `timestampLocal` en JSON | `readings.service.ts` + DTO | DAT-04 | GAP-046 | ISO8601 ambos |
| GAP-048 | External API readings: mismos campos timezone | `external-api` | DAT-04 | GAP-047 | Test e2e |
| GAP-049 | Backfill script: set `quality='unknown'` en filas existentes | `scripts/backfill-reading-quality.mjs` | DAT-06 | GAP-041 | One-shot idempotente |
| GAP-050 | IoT path: mapear `iot_readings.quality` numérico → enum al unificar (doc only si no unifica aún) | `iot-readings.service.ts` | DAT-06 | — | Tabla mapping documentada |

---

## Ola 3 — Retención TimescaleDB (5 años, 15 min)

| ID | Tarea | Archivos / área | PASA | Deps | Done |
|----|-------|-----------------|------|------|------|
| GAP-060 | Config tenant: `tenants.settings.retentionYears` default 5 (JSON) | tenant settings doc + validation | ARQ-12, DAT-08 | — | Leíble en app |
| GAP-061 | Documento sizing: filas estimadas por medidor/15min/5y | `docs/PASA/` o `docs/ops/storage-sizing.md` | ARQ-12 | — | Markdown con fórmula |
| GAP-062 | Migration: `remove_retention_policy` readings 3y | `22-retention-5y.sql` | ARQ-12 | — | Policy vieja drop |
| GAP-063 | Migration: `add_retention_policy('readings', INTERVAL '5 years')` | misma | ARQ-12, DAT-08 | GAP-062 | Policy activa |
| GAP-064 | Migration: alinear `iot_readings` retention 3y → 5y (o unificar paths) | misma | ARQ-12 | — | Policy actualizada |
| GAP-065 | CAGG `readings_15min` (avg/max power, energy delta, count) | `23-cagg-15min.sql` | ARQ-12 | GAP-041 | MV + policy refresh |
| GAP-066 | Añadir `readings_15min` a `SAFE_VIEW_NAMES` en readings.service | `readings.service.ts` | ARQ-12 | GAP-065 | Aggregated endpoint usa CAGG |
| GAP-067 | Test: query aggregated 15min usa CAGG cuando rango > 7 días | `readings.service.spec.ts` | ARQ-12 | GAP-066 | Test verde |
| GAP-068 | Compression policy readings: validar chunk 7d sigue OK con 5y | `09-timescaledb-optimize.sql` review | ARQ-12 | GAP-063 | Nota en migration |
| GAP-069 | Cron/documento: no borrar raw 15min antes de 5y (solo Timescale policy) | ops doc | DAT-08 | GAP-063 | Sin job contradictorio |

---

## Ola 4 — Trazabilidad de ingestión (multi-tenant)

| ID | Tarea | Archivos / área | PASA | Deps | Done |
|----|-------|-----------------|------|------|------|
| GAP-070 | Tabla `meter_reading_status (meter_id PK, tenant_id, last_reading_at, last_ingested_at, last_source, updated_at)` | `24-meter-reading-status.sql` | DAT-19 | — | Tabla + FK meters |
| GAP-071 | Index `(tenant_id, last_reading_at)` en meter_reading_status | misma | DAT-24 | — | Index creado |
| GAP-072 | Trigger o job: upsert status post-insert readings (SQL function) | `25-fn-upsert-meter-status.sql` | DAT-19 | GAP-070, GAP-042 | Insert reading actualiza status |
| GAP-073 | Servicio `MeterReadingStatusService.getStaleMeters(tenantId, thresholdHours)` | backend module | DAT-24 | GAP-070 | Unit test |
| GAP-074 | Tabla `ingest_gaps (id, tenant_id, meter_id, gap_start, gap_end, detected_at, resolved_at, status)` | `26-ingest-gaps.sql` | DAT-10 | — | Enum status open/resolved |
| GAP-075 | Cron cada 15min: detectar gaps > 1 bucket sin lectura por medidor activo | `IngestGapDetectorService` | DAT-10 | GAP-070 | Log + filas ingest_gaps |
| GAP-076 | Cron: marcar medidor stale si `last_reading_at` > 4h (configurable per tenant settings) | mismo | DAT-24 | GAP-073 | Crea alerta o fault_event |
| GAP-077 | Tabla `backfill_jobs (id, tenant_id, meter_id, from_ts, to_ts, status, rows_inserted, error)` | `27-backfill-jobs.sql` | DAT-10 | — | CRUD admin |
| GAP-078 | API interna `POST /admin/backfill-jobs` (super_admin) encola job | controller + guard | DAT-10 | GAP-077 | 202 Accepted |
| GAP-079 | Worker stub: backfill job lee fuente externa placeholder (interface) | `BackfillWorker` interface | DAT-10 | GAP-077 | No-op implementación + test |
| GAP-080 | `GET /v1/meters/:id/status` lectura last_reading_at, lag | external-api | DAT-19 | GAP-070 | JSON documentado |
| GAP-081 | Dashboard query: count stale meters per tenant (SQL view) | `v_stale_meters_by_tenant` | DAT-24 | GAP-073 | Vista usable |

---

## Ola 5 — API ingress (medidores virtuales / terceros)

| ID | Tarea | Archivos / área | PASA | Deps | Done |
|----|-------|-----------------|------|------|------|
| GAP-090 | DTO `CreateMeasurementDto` (meterId, timestamp, metrics, quality, externalRef) | `readings/dto/` | INT-03 | GAP-041 | class-validator |
| GAP-091 | Unique constraint lógico: `(meter_id, timestamp, source)` o idempotency key | migration + doc | INT-03 | — | Duplicados rechazados 409 |
| GAP-092 | `POST /v1/measurements` con API key + tenant scope | `external-api` | INT-03 | GAP-090 | Test insert |
| GAP-093 | Validar meter pertenece a tenant de la API key | guard | INT-03 | GAP-092 | 403 cross-tenant |
| GAP-094 | Insert setea `source='api_ingress'`, `quality` del payload | service | DAT-06 | GAP-092 | Filas correctas |
| GAP-095 | Rate limit específico ingress (más alto que UI) | `api-key.guard` settings | DAT-15 | — | Config per key |
| GAP-096 | OpenAPI document ingress endpoint | swagger | INT-07 | GAP-092 | Spec publicada dev |
| GAP-097 | Postman collection fragment ingress | `docs/api/postman/` | INT-07 | GAP-096 | Archivo JSON |

### Ola 5 — estado

| ID | Estado |
|----|--------|
| GAP-090 – GAP-097 | ✅ Completado 2026-06-06 |

---

## Ola 6 — ETL / réplica / export (multi-tenant)

| ID | Tarea | Archivos / área | PASA | Deps | Done |
|----|-------|-----------------|------|------|------|
| GAP-100 | Env `DB_READ_REPLICA_HOST` opcional en database.config | `database.config.ts` | DAT-01 | — | App arranca sin réplica |
| GAP-101 | DataSource readonly para queries ETL (decorator `@UseReadReplica()`) | `database/` module | DAT-01 | GAP-100 | Solo SELECT routes marcados |
| GAP-102 | `GET /v1/readings/export?format=csv&from&to&cursor` streaming | external-api | DAT-12, DAT-21 | GAP-101 | CSV chunked |
| GAP-103 | Tabla `etl_watermarks (consumer_id, tenant_id, stream, last_cursor, updated_at)` | `28-etl-watermarks.sql` | DAT-21 | — | PK composite |
| GAP-104 | Export endpoint actualiza watermark opcional header `X-Consumer-Id` | service | DAT-21 | GAP-103 | Watermark persistido |
| GAP-105 | Tabla `data_export_jobs (id, tenant_id, format, status, s3_key, …)` | `29-export-jobs.sql` | DAT-12 | — | Enum format csv/parquet |
| GAP-106 | Job async: export parquet con `@dsnp/parquetjs` o similar (chunked) | service | DAT-12 | GAP-105 | File en S3/local dev |
| GAP-107 | `GET /v1/exports/:id` status download URL | external-api | DAT-12 | GAP-105 | Signed URL o stream |
| GAP-108 | Infra doc: crear RDS read replica + security group | `docs/ops/rds-replica.md` | DAT-01 | — | Runbook |
| GAP-109 | Script terraform/ecs: second DB host secret | infra (fuera repo ok) | DAT-01 | GAP-108 | Secret en prod |

### Ola 6 — estado

| ID | Estado |
|----|--------|
| GAP-100 – GAP-109 | ✅ Completado 2026-06-06 |

---

## Ola 7 — Normalización protocolos (agnóstico hardware)

> BACnet/SNMP en sub-olas separadas; no mezclar con Modbus.

### 7A — Mapping genérico

| ID | Tarea | Archivos / área | PASA | Deps | Done |
|----|-------|-----------------|------|------|------|
| GAP-110 | Tabla `protocol_types (code)` seed: modbus, mqtt, bacnet, snmp, api | `30-protocol-mapping.sql` | INT-01 | — | Seed |
| GAP-111 | Tabla `register_mappings (tenant_id, protocol, device_profile, register_key, target_field, scale_factor, unit)` | misma | INT-05, INT-14 | — | Index tenant+protocol |
| GAP-112 | CRUD admin `register_mappings` (super_admin + tenant admin) | module | INT-05 | GAP-111 | Tests |
| GAP-113 | Servicio `NormalizationService.apply(mapping, raw) → reading fields` | lib | INT-05 | GAP-111 | Unit tests |
| GAP-114 | Export CSV mappings por tenant (matriz equivalencia) | endpoint | INT-14 | GAP-112 | Download CSV |
| GAP-115 | Documentar device_profile convención (`pac1670`, `siemens-poc3000`) | docs | INT-14 | — | Markdown |

### Ola 7A — estado

| ID | Estado |
|----|--------|
| GAP-110 – GAP-115 | ✅ Completado 2026-06-06 |

### 7B — Modbus (cerrar gap parcial)

| ID | Tarea | Archivos / área | PASA | Deps | Done |
|----|-------|-----------------|------|------|------|
| GAP-120 | Seed register_mappings default Modbus PAC (tenant null = global template) | seed SQL | INT-01 | GAP-111 | Template copiable al crear tenant |
| GAP-121 | Copiar templates al onboarding tenant (`TenantsService.create`) | tenants.service | — | GAP-120 | Nuevo tenant tiene mappings |

### Ola 7B — estado

| ID | Estado |
|----|--------|
| GAP-120 – GAP-121 | ✅ Completado 2026-06-06 |

### 7C — MQTT (ya parcial)

| ID | Tarea | Archivos / área | PASA | Deps | Done |
|----|-------|-----------------|------|------|------|
| GAP-125 | Unificar conversión W→kW en NormalizationService (no duplicada IoT) | iot-readings + lib | INT-05 | GAP-113 | Single path |
| GAP-126 | MQTT connector escribe `source='mqtt'` en readings unificados (si aplica) | integrations | INT-01 | GAP-043 | Trazabilidad |

### Ola 7C — estado

| ID | Estado |
|----|--------|
| GAP-125 – GAP-126 | ✅ Completado 2026-06-06 |

### 7D — BACnet (spike → micro tasks)

| ID | Tarea | Archivos / área | PASA | Deps | Done |
|----|-------|-----------------|------|------|------|
| GAP-130 | Spike doc: librería Node BACnet evaluada (1 página) | `docs/spikes/bacnet.md` | ARQ-03 | — | Go/no-go |
| GAP-131 | Tabla `bacnet_devices (id, tenant_id, building_id, device_id, ip, port)` | migration | ARQ-03 | GAP-130 | Schema only |
| GAP-132 | Stub connector `BacnetConnector` read-only ping | integrations | ARQ-03 | GAP-131 | Registrado en registry |
| GAP-133 | BACnet → register_mappings → readings (happy path 1 device) | integration test | ARQ-03 | GAP-113, GAP-132 | Test con mock |

### Ola 7D — estado

| ID | Estado |
|----|--------|
| GAP-130 – GAP-133 | ✅ Completado 2026-06-06 |

### 7E — SNMP (spike → micro tasks)

| ID | Tarea | Archivos / área | PASA | Deps | Done |
|----|-------|-----------------|------|------|------|
| GAP-140 | Spike doc SNMP OID mapping | `docs/spikes/snmp.md` | INT-01 | — | Go/no-go |
| GAP-141 | Tabla `snmp_devices` análoga bacnet | migration | INT-01 | GAP-140 | Schema |
| GAP-142 | Stub `SnmpConnector` | integrations | INT-01 | GAP-141 | Registry |

### Ola 7E — estado

| ID | Estado |
|----|--------|
| GAP-140 – GAP-142 | ✅ Completado 2026-06-06 |

---

## Ola 8 — Webhooks y eventos (salida)

| ID | Tarea | Archivos / área | PASA | Deps | Done |
|----|-------|-----------------|------|------|------|
| GAP-150 | Tabla `webhook_subscriptions (tenant_id, event_type, url, secret, active)` | `31-webhooks.sql` | ARQ-04, DAT-03 | — | event_type enum |
| GAP-151 | Enum eventos: `reading.stale`, `alert.created`, `meter.offline`, `gap.detected` | misma | DAT-03 | — | Extensible |
| GAP-152 | CRUD subscriptions tenant admin | module | ARQ-04 | GAP-150 | Tests |
| GAP-153 | Dispatcher: firma HMAC + retry exponencial (reuse retry.util) | service | INT-10 | GAP-150 | Unit test |
| GAP-154 | Emit webhook on stale meter (integrar GAP-076) | ingest cron | DAT-24 | GAP-153 | Log notification_logs |
| GAP-155 | `GET /v1/integrations/health` latencia últimas sync + webhooks | controller | INT-13 | GAP-150 | JSON por integration |

### Ola 8 — estado

| ID | Estado |
|----|--------|
| GAP-150 – GAP-155 | ✅ Completado 2026-06-06 |

---

## Ola 9 — Validación datos y gobernanza

| ID | Tarea | Archivos / área | PASA | Deps | Done |
|----|-------|-----------------|------|------|------|
| GAP-160 | Vista `v_meter_balance_daily (parent_meter_id, day, sum_children, parent_kwh, delta)` | SQL | DAT-16 | — | Vista definida |
| GAP-161 | Job diario: insert discrepancies > threshold en `balance_anomalies` | table + cron | DAT-16 | GAP-160 | Filas alertables |
| GAP-162 | Tabla `data_quality_daily (tenant_id, building_id, day, measured_pct, estimated_pct, invalid_pct, total)` | migration | DAT-17 | GAP-041 | Aggregated nightly |
| GAP-163 | Cron rollup calidad desde readings.quality | service | DAT-17 | GAP-162 | Job verde |
| GAP-164 | `GET /admin/data-quality/report?tenant&from&to` JSON | controller | DAT-17 | GAP-162 | Super_admin |
| GAP-165 | Tabla `data_contracts (id, tenant_id, name, version, schema_json, effective_from)` | migration | DAT-25 | — | Version semver |
| GAP-166 | Validador payload export vs contract version header | middleware | DAT-25 | GAP-165 | 400 si mismatch |
| GAP-167 | Tabla `data_slo_breaches (tenant_id, slo_type, breached_at, detail)` | migration | DAT-26 | GAP-162 | Insert on breach |
| GAP-168 | SLO: frescura — breach si stale meters > 0 por building | cron | DAT-26 | GAP-076, GAP-167 | Breach row |
| GAP-169 | Audit config changes: trigger log en meters/tariffs UPDATE | SQL trigger → audit_logs | DAT-23 | — | details JSON diff |

### Ola 9 — estado

| ID | Estado |
|----|--------|
| GAP-160 – GAP-169 | ✅ Completado 2026-06-06 |

---

## Ola 10 — Auth enterprise (opcional por tenant)

> Cualquier tenant puede activar SSO; PASA usa Azure AD.

| ID | Tarea | Archivos / área | PASA | Deps | Done |
|----|-------|-----------------|------|------|------|
| GAP-180 | `tenants.settings.ssoProvider` null \| `azure_ad` \| `oidc` | tenant settings | CYB-01 | — | Validación DTO |
| GAP-181 | Tabla `tenant_sso_config (tenant_id, issuer, client_id, metadata_url, encrypted_secret)` | migration | CYB-01 | — | Secrets encrypted |
| GAP-182 | Login route: si tenant SSO → redirect OIDC (feature flag) | auth | CYB-01 | GAP-181 | Dev con mock IdP |
| GAP-183 | JIT user provisioning on first SSO login | auth.service | CYB-01 | GAP-182 | User row created |
| GAP-184 | Webhook/poll SCIM stub: deactivate user on IdP delete | auth | ARQ-10 | GAP-182 | is_active=false |
| GAP-185 | Session idle 15min configurable per tenant (`maxSessionMinutes`) | roles/tenant settings | CYB-06 | — | Override global |
| GAP-186 | Block concurrent sessions flag per tenant | sessions | CYB-06 | — | Second login kills first |

### Ola 10 — estado

| ID | Estado |
|----|--------|
| GAP-180 – GAP-186 | ✅ Completado 2026-06-06 |

## Ola 11 — OAuth2 para ETL (complemento API keys)

| ID | Tarea | Archivos / área | PASA | Deps | Done |
|----|-------|-----------------|------|------|------|
| GAP-190 | Tabla `oauth_clients (tenant_id, client_id, secret_hash, scopes)` | migration | INT-02 | — | Admin CRUD |
| GAP-191 | Endpoint `POST /oauth/token` client_credentials | auth module | INT-02 | GAP-190 | JWT scoped |
| GAP-192 | External API acepta Bearer OAuth además de API key | guard | INT-02 | GAP-191 | Test ambos |
| GAP-193 | Scope `readings:export` requerido en export endpoint | guard | INT-02 | GAP-102 | 403 sin scope |

### Ola 11 — estado

| ID | Estado |
|----|--------|
| GAP-190 – GAP-193 | ✅ Completado 2026-06-06 |

---

## Ola 12 — Documentación derivada (cierra reqs “proceso”)

| ID | Tarea | Archivos / área | PASA | Done |
|----|-------|-----------------|------|------|
| GAP-200 | DER Mermaid auto desde entities (script) | `scripts/generate-der.mjs` | DAT-18 | PNG/md generado |
| GAP-201 | Data dictionary CSV desde entities + comments | script | DAT-05 | CSV en docs |
| GAP-202 | Catálogo errores API desde enum central | `common/errors/` | ARQ-24 | Markdown |
| GAP-203 | Runbook RTO/RPO 4h/1h (RDS snapshot restore) | docs/ops | ARQ-11 | Checklist |
| GAP-204 | Reglas negocio KPIs (markdown desde invoice formulas) | docs | DAT-22 | Doc publicado |

### Ola 12 — estado

| ID | Estado |
|----|--------|
| GAP-200 – GAP-204 | ✅ Completado 2026-06-06 |

---

## Dependencias entre olas (resumen)

```
Ola 0 ──► Ola 1 (geo) ──► Ola 2 (quality/ts) ──► Ola 3 (retention)
                              │
                              ├──► Ola 4 (ingest trace)
                              │         └──► Ola 8 (webhooks)
                              ├──► Ola 5 (ingress API)
                              └──► Ola 6 (ETL/replica)

Ola 7 (protocols) ── paralelo tras Ola 2
Ola 9 (governance) ── tras Ola 2 + 4
Ola 10–11 (auth) ── paralelo, sin blocker DB
Ola 12 ── continuo
```

---

## Conteo

| Ola | Micro-tareas |
|-----|--------------|
| 0 | 7 |
| 1 | 22 |
| 2 | 11 |
| 3 | 10 |
| 4 | 12 |
| 5 | 8 |
| 6 | 10 |
| 7A–7E | 16 |
| 8 | 6 |
| 9 | 10 |
| 10 | 7 |
| 11 | 4 |
| 12 | 5 |
| **Total** | **~128** |

---

## Notas multi-tenant (aplicar en cada PR)

1. **Nunca** columnas `pasa_*` — usar `external_site_id`, `external_unit_id`, settings JSON.
2. **Toda** tabla nueva con `tenant_id` + FK cascade.
3. **Templates globales** (register_mappings) con `tenant_id IS NULL` copiados al onboarding.
4. **Límites** (retention, stale hours, session) en `tenants.settings`, no env global.
5. **super_admin** cross-tenant solo admin; tenants normales aislados.

---

## Próximo paso sugerido

Roadmap técnico **completo** (Olas 0–12). Siguiente: aplicar migraciones pendientes en prod (39–40), deploy ECS+frontend, y validación UAT contra `MATRIZ-CUMPLIMIENTO-EMS.md`.

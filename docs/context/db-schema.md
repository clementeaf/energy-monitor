# Database Schema

## Tables

**roles** — id: smallint PK, name: varchar(30) unique, label_es: varchar(50), is_active: bool, created_at: timestamptz

**modules** — id: smallint PK, code: varchar(40) unique, label: varchar(60), route_path: varchar(120) unique, navigation_group: varchar(40), show_in_nav: bool, sort_order: smallint, is_public: bool, is_active: bool

**actions** — id: smallint PK, code: varchar(20) unique

**role_permissions** — PK(role_id, module_id, action_id), FK role_id → roles

**users** — id: uuid PK auto, external_id: varchar(255)?, provider: varchar(20)? ['microsoft'|'google'|'invitation'], email: varchar(255), name: varchar(255), avatar_url: text?, role_id: smallint FK→roles default 4, is_active: bool default true, created_at/updated_at: timestamptz

**user_sites** — PK(user_id, site_id), FK user_id → users CASCADE

**buildings** — id: varchar(50) PK (e.g. 'parque-arauco-kennedy'), name: varchar(200), address: varchar(300), total_area: numeric(10,2). Nota: columna center_type no existe en producción (migración 013 no aplicada).

**meters** — id: varchar(10) PK (e.g. 'MG-001'), building_id: varchar(50) FK→buildings, model: varchar(20) ['PAC1670'|'PAC1651'], phase_type: varchar(5) ['1P'|'3P'], bus_id: varchar(30), modbus_address: smallint, uplink_route: varchar(100), store_type: varchar(100) NULL, store_name: varchar(200) NULL (poblados desde billing_monthly_detail 2026-03-13), status: varchar(10) default 'online', last_reading_at: timestamptz?

**readings** — id: integer PK auto, meter_id: varchar(10) FK→meters, timestamp: timestamptz, voltage_l1/l2/l3: numeric(7,2)?, current_l1/l2/l3: numeric(8,3)?, power_kw: numeric(10,3) NOT NULL, reactive_power_kvar: numeric(10,3)?, power_factor: numeric(5,3)?, frequency_hz: numeric(6,3)?, energy_kwh_total: numeric(14,3) NOT NULL acumulativo, thd_voltage_pct: numeric(5,2)?, thd_current_pct: numeric(5,2)?, phase_imbalance_pct: numeric(5,2)?, breaker_status: varchar(10)?, digital_input_1/2: smallint?, digital_output_1/2: smallint?, alarm: varchar(50)?, modbus_crc_errors: integer?

**hierarchy_nodes** — id: varchar(20) PK (e.g. 'TG-PAC4220'), parent_id: varchar(20) FK→self?, building_id: varchar(50), name: varchar(100), level: smallint [1=Building,2=Panel,3=Subpanel,4=Circuit], node_type: varchar(20) ['building'|'panel'|'subpanel'|'circuit'], meter_id: varchar(10) FK→meters? (solo leaf), sort_order: smallint default 0

**alerts** — id: uuid PK auto, type: varchar(50) ['METER_OFFLINE'], severity: varchar(20) default 'high', status: varchar(20) ['active'|'acknowledged'|'resolved'], meter_id: varchar(10) FK→meters?, building_id: varchar(50)?, title: varchar(200), message: text, triggered_at: timestamptz default now(), acknowledged_at/resolved_at: timestamptz?, metadata: jsonb default '{}'

**tiendas** — id: serial PK, building_id: varchar(50) FK→buildings, store_type: varchar(100), store_name: varchar(200), created_at, updated_at. UNIQUE(building_id, store_type, store_name). Migración 015.

**analisis** — id: serial PK, building_id/tienda_id/meter_id (uno no null), period_type, period_start, period_end, consumption_kwh, avg_power_kw, peak_demand_kw, num_readings, created_at. Agregados precalculados por edificio/tienda/medidor y período. Migración 016. Actualmente vacía.

**billing_center_summary** — resumen por centro, año, mes (totalConsumptionKwh, peakMaxKw, topConsumerLocal, etc.). Migración 018. Rellenable desde detalle con `backfill-summary-from-detail.mjs`.

**billing_monthly_detail** — PK(center_name, year, month, meter_id). consumptionKwh, peakKw, cargos CLP, totalNetClp, totalWithIvaClp. 10,636 filas.

**billing_tariffs** — PK(tariff_name, year, month). Pliegos tarifarios por comuna/mes. Datos desde XLSX en S3 `billing/`; import con `infra/billing-xlsx-import`.

**staging_centers** — 5 filas. Centros del import Drive.

### pg-arauco (docker local)

**store_type** — id: serial PK, name: varchar(100) unique. 42 tipos.

**store** — meter_id: varchar(10) PK, store_type_id: int FK→store_type, store_name: varchar(200), is_three_phase: boolean default false. 875 filas (MG 446 + MM 254 + OT 70 + SC52 52 + SC53 53). Columna `is_three_phase` pre-computada desde meter_readings (migración 020).

**meter_latest_reading** — meter_id: varchar(10) PK, power_kw: numeric(10,3), voltage_l1: numeric(7,2), current_l1: numeric(8,3), power_factor: numeric(5,4), timestamp: timestamptz. Cache de última lectura por medidor, refrescada cada 15 min por synthetic generator. Migración 020.

**building_summary** — building_name: text NOT NULL, month: date NOT NULL, PK(building_name, month). Stats agregados: total_stores, store_types, total_meters, assigned_meters, unassigned_meters, area_sqm, total_kwh, total_power_kw, avg_power_kw, peak_power_kw, total_reactive_kvar, avg_power_factor, peak_demand_kw, demanda_punta_kwh, pct_punta, promedio_diario_kwh. 60 filas (12 × 5 edificios). **Columnas KPI críticas para cards frontend:** `peak_demand_kw`, `avg_power_kw`, `avg_power_factor` — ver sección "Cálculo KPIs building_summary" en ingest-pipeline.md.

**meter_monthly** — PK(meter_id varchar(10), month date), FK meter_id → store. total_kwh, avg_power_kw, peak_power_kw, total_reactive_kvar, avg_power_factor. 10,500 filas (MG 446 + MM 254 + OT 70 + SC52 52 + SC53 53 = 875 medidores × 12 meses).

**meter_monthly_billing** — PK(meter_id varchar(10), month date). building_name varchar(100), total_kwh, energia_clp, dda_max_kw, dda_max_punta_kw, kwh_troncal, kwh_serv_publico, cargo_fijo_clp, total_neto_clp, iva_clp, monto_exento_clp, total_con_iva_clp, peak_mensual_kw, demanda_hora_punta_kwh, pct_punta_consumo, promedio_diario_kwh. Todos numeric, nullable. 10,500 filas (MG 5,352 + MM 3,048 + OT 840 + SC52 624 + SC53 636). Fuente: XLSX KPIs.

**tariff** — PK(month date, location varchar(50)). consumo_energia_kwh, dda_max_suministrada_kw, dda_max_hora_punta_kw, kwh_sistema_troncal, kwh_serv_publico_iva1..5, cargo_fijo_clp. Todos numeric(10,3). 48 filas (12 × 4 locations: Las Condes, Santiago, Quilicura, Huechuraba). Fuente: XLSX Pliegos Tarifarios.

**meter_readings** — particionada por meter_id (LIST). 875 particiones, 30.7M filas. Índice: `meter_readings_ts_desc (meter_id, timestamp DESC)`.

**alerts** (pg-arauco) — id: serial PK, meter_id: varchar(20), timestamp: timestamptz, alert_type: varchar(50) ['CURRENT_HIGH'|'CURRENT_NEGATIVE'|'VOLTAGE_OUT_OF_RANGE'|'POWER_FACTOR_LOW'], severity: varchar(10) ['critical'|'warning'|'info'], field: varchar(30), value: numeric(12,4), threshold: numeric(12,4), message: text, created_at: timestamptz. Índices: meter_id, alert_type, severity. 182 filas (detectadas desde meter_readings).

**billing_document** — id: serial PK, building_name: varchar(100), month: date, doc_number: varchar(20), doc_type: varchar(20) default 'factura', issue_date: date, due_date: date, total_neto_clp: numeric(16,2), iva_clp: numeric(16,2), total_clp: numeric(16,2), status: varchar(20) ['pagado'|'por_vencer'|'vencido'], payment_date: date?, payment_amount: numeric(16,2)?, days_overdue: int default 0, meter_count: int. UNIQUE(building_name, month). 60 filas (5 edificios × 12 meses). Generada sintéticamente desde meter_monthly_billing.

**raw_readings** — 30.6M filas (875 medidores completo CSV).

### Tablas que NO existen en producción (migraciones pendientes)

**agg_meter_hourly** — PK(meter_id, bucket TIMESTAMPTZ). Agregado por hora por medidor. Migración 019.

**agg_node_daily** — PK(node_id VARCHAR(20), bucket DATE). Agregado diario por nodo de jerarquía. Migración 019.

### Tablas eliminadas
- `readings_import_staging` — eliminada 2026-03-13 (vacía, staging promovido a readings).

## Relations
```
roles 1──N users, roles 1──N role_permissions
users 1──N user_sites
buildings 1──N meters, buildings 1──N tiendas
meters 1──N readings, meters 1──N alerts
tiendas 1──N analisis (scope tienda), meters 1──N analisis (scope meter), buildings 1──N analisis (scope building)
hierarchy_nodes N──1 self (parent), hierarchy_nodes N──1 meters (leaf only)
```

## SQL Migrations
`sql/001_schema.sql` → users, roles | `002_seed.sql` → seed 7 roles, catálogo de vistas | `003_buildings_locals.sql` → buildings | `004_meters_readings.sql` → meters, readings, seed 15 meters | `005_hierarchy_nodes.sql` → hierarchy tree | `006_alerts.sql` → alerts | `007_invite_first_users.sql` → permite usuarios preprovisionados sin provider/external_id | `008_views_catalog.sql` → migra modules a catálogo de vistas reales | `009_invitation_links.sql` → agrega token/link firmado y expiración de invitación | … | `016_analisis.sql` → analisis | `017_billing.sql` → módulo BILLING_OVERVIEW y permisos | `018_billing_tables.sql` → billing_center_summary, billing_monthly_detail, billing_tariffs | `019_aggregates.sql` → agg_meter_hourly, agg_node_daily (NO APLICADA AÚN) | `020_meter_optimizations.sql` → store.is_three_phase, meter_latest_reading, fn_latest_readings_by_building.

Migraciones manuales: no hay migration runner; se aplican manualmente. Verificar siempre que tablas/columnas existan en producción antes de deployar.

## Invitaciones
Si en prod `external_id`/`provider` son NOT NULL, el backend usa centinela `provider='invitation'` y `external_id='inv:<hex>'` al crear la invitación; el primer login OAuth reemplaza por el valor real.

## monitoreo-v2 (Timescale / init)
Tablas `reports`, `scheduled_reports`, `integrations`, `integration_sync_logs` definidas en `monitoreo-v2/database/init/05-modules.sql`. Valor `quality` en `reports.report_type`: patch `monitoreo-v2/database/patches/2026-04-02-reports-add-quality-type.sql` para BDs ya creadas.

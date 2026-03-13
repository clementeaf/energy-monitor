-- Tablas para datos de facturación (XLSX porCargar: Resumen Mensual, Pliegos Tarifarios, Resumen Ejecutivo).
-- Origen: s3://bucket/billing/*.xlsx → Lambda/script de importación.

BEGIN;

-- 1. Detalle mensual por centro, mes y medidor (hoja Resumen Mensual).
CREATE TABLE IF NOT EXISTS billing_monthly_detail (
  id                    BIGSERIAL    PRIMARY KEY,
  center_name           TEXT         NOT NULL,
  year                  SMALLINT     NOT NULL,
  month                 SMALLINT     NOT NULL,
  meter_id              VARCHAR(20)  NOT NULL,
  store_type            VARCHAR(100),
  store_name            VARCHAR(200),
  phase                 VARCHAR(5),
  consumption_kwh       NUMERIC(14,4),
  peak_kw               NUMERIC(12,4),
  demand_punta_kwh      NUMERIC(14,4),
  pct_punta             NUMERIC(8,6),
  avg_daily_kwh         NUMERIC(14,4),
  energy_charge_clp     NUMERIC(16,2),
  demand_max_kw         NUMERIC(12,4),
  demand_punta_kw       NUMERIC(12,4),
  kwh_troncal           NUMERIC(14,4),
  kwh_servicio_publico  NUMERIC(14,4),
  fixed_charge_clp      NUMERIC(12,2),
  total_net_clp         NUMERIC(16,2),
  iva_clp               NUMERIC(16,2),
  exempt_amount         NUMERIC(16,2),
  total_with_iva_clp    NUMERIC(16,2),
  source_file           TEXT,
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_billing_monthly_detail
  ON billing_monthly_detail (center_name, year, month, meter_id);

CREATE INDEX IF NOT EXISTS idx_billing_monthly_detail_center_period
  ON billing_monthly_detail (center_name, year, month);

CREATE INDEX IF NOT EXISTS idx_billing_monthly_detail_meter
  ON billing_monthly_detail (meter_id, year, month);

COMMENT ON TABLE billing_monthly_detail IS 'Detalle facturación por centro, año, mes y medidor (hoja Resumen Mensual de XLSX porCargar).';

-- 2. Pliegos tarifarios por comuna y mes (hoja Pliegos Tarifarios).
CREATE TABLE IF NOT EXISTS billing_tariffs (
  id                    BIGSERIAL    PRIMARY KEY,
  tariff_name           VARCHAR(80)  NOT NULL,
  year                  SMALLINT     NOT NULL,
  month                 SMALLINT     NOT NULL,
  consumption_energy_kwh NUMERIC(12,4),
  demand_max_kw         NUMERIC(12,4),
  demand_punta_kw       NUMERIC(12,4),
  kwh_troncal           NUMERIC(12,4),
  kwh_serv_iva_1        NUMERIC(10,6),
  kwh_serv_iva_2        NUMERIC(10,6),
  kwh_serv_iva_3        NUMERIC(10,6),
  kwh_serv_iva_4        NUMERIC(10,6),
  kwh_serv_iva_5        NUMERIC(10,6),
  fixed_charge_clp      NUMERIC(12,2),
  source_file            TEXT,
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_billing_tariffs
  ON billing_tariffs (tariff_name, year, month);

CREATE INDEX IF NOT EXISTS idx_billing_tariffs_period
  ON billing_tariffs (year, month);

COMMENT ON TABLE billing_tariffs IS 'Tarifas de referencia por pliego/comuna y mes (hoja Pliegos Tarifarios).';

-- 3. Resumen ejecutivo por centro y mes (hoja Resumen Ejecutivo).
CREATE TABLE IF NOT EXISTS billing_center_summary (
  id                      BIGSERIAL   PRIMARY KEY,
  center_name             TEXT        NOT NULL,
  year                    SMALLINT    NOT NULL,
  month                   SMALLINT    NOT NULL,
  total_consumption_kwh   NUMERIC(16,4),
  peak_max_kw             NUMERIC(12,4),
  demand_punta_kwh        NUMERIC(16,4),
  pct_punta               NUMERIC(8,6),
  avg_daily_kwh           NUMERIC(14,4),
  top_consumer_local      TEXT,
  source_file             TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_billing_center_summary
  ON billing_center_summary (center_name, year, month);

CREATE INDEX IF NOT EXISTS idx_billing_center_summary_period
  ON billing_center_summary (year, month);

COMMENT ON TABLE billing_center_summary IS 'Resumen mensual por centro (hoja Resumen Ejecutivo).';

COMMIT;

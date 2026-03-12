-- Resumen de centros desde readings_import_staging para GET /buildings sin escanear millones de filas.
-- Debe refrescarse tras cada carga a staging (p. ej. en promote o pipeline).

BEGIN;

CREATE TABLE IF NOT EXISTS staging_centers (
  id             VARCHAR(100) PRIMARY KEY,
  center_name    TEXT         NOT NULL,
  center_type    TEXT         NOT NULL,
  meters_count   INTEGER      NOT NULL DEFAULT 0,
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE staging_centers IS 'Resumen de centros (DISTINCT center_name) para API buildings cuando READINGS_SOURCE=staging. Refrescar tras import a readings_import_staging.';

COMMIT;

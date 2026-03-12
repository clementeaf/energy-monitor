-- ============================================================
-- POWER Digital® — Campos de centro (locación) y tienda/local
-- Alineado con docx: center_type en edificio; store_type, store_name en medidor
-- ============================================================

BEGIN;

-- buildings: tipo de centro (Mall Grande, Outlet, Strip Center, etc.)
ALTER TABLE buildings
  ADD COLUMN IF NOT EXISTS center_type VARCHAR(100) NULL;

COMMENT ON COLUMN buildings.center_type IS 'Categoría del centro (docx: center_type). Ej: Mall Grande, Outlet, Strip Center. Null para edificios legacy.';

-- meters: tienda/local al que pertenece el medidor (docx: store_type, store_name)
ALTER TABLE meters
  ADD COLUMN IF NOT EXISTS store_type VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS store_name VARCHAR(200) NULL;

COMMENT ON COLUMN meters.store_type IS 'Rubro/categoría del local (docx: store_type). Ej: Retail, SSCC, Café. Null para medidores legacy.';
COMMENT ON COLUMN meters.store_name IS 'Nombre comercial del local (docx: store_name). Null para medidores legacy.';

COMMIT;

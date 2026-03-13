-- ============================================================
-- POWER Digital® — Tabla Tiendas (locales dentro de un edificio)
-- Modelo lógico: Edificio → Tienda → Medidor. Sin datos, solo estructura.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS tiendas (
  id          SERIAL         PRIMARY KEY,
  building_id VARCHAR(50)    NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  store_type  VARCHAR(100)   NOT NULL,
  store_name  VARCHAR(200)   NOT NULL,
  created_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  UNIQUE (building_id, store_type, store_name)
);

CREATE INDEX IF NOT EXISTS idx_tiendas_building ON tiendas(building_id);

COMMENT ON TABLE tiendas IS 'Locales/tiendas dentro de un edificio. Una fila por combinación (edificio, tipo, nombre). Medidores se vinculan opcionalmente vía meters.tienda_id (futuro).';

COMMIT;

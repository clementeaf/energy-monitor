-- ============================================================
-- POWER Digital® — Energy Monitor
-- Migration: Add hierarchy_nodes for 5-level electrical drill-down
-- ============================================================

BEGIN;

-- 1. Create hierarchy_nodes table
CREATE TABLE IF NOT EXISTS hierarchy_nodes (
  id          VARCHAR(20)   PRIMARY KEY,
  parent_id   VARCHAR(20)   REFERENCES hierarchy_nodes(id),
  building_id VARCHAR(50)   NOT NULL REFERENCES buildings(id),
  name        VARCHAR(100)  NOT NULL,
  level       SMALLINT      NOT NULL,      -- 1=Edificio, 2=Tablero, 3=Subtablero, 4=Circuito
  node_type   VARCHAR(20)   NOT NULL,      -- 'building','panel','subpanel','circuit'
  meter_id    VARCHAR(10)   REFERENCES meters(id),  -- only on leaf (circuit) nodes
  sort_order  SMALLINT      DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_hierarchy_parent   ON hierarchy_nodes(parent_id);
CREATE INDEX IF NOT EXISTS idx_hierarchy_building ON hierarchy_nodes(building_id);
CREATE INDEX IF NOT EXISTS idx_hierarchy_meter    ON hierarchy_nodes(meter_id);

-- 2. Seed hierarchy for pac4220 (8 meters)
-- Level 1: Edificio
INSERT INTO hierarchy_nodes (id, parent_id, building_id, name, level, node_type, meter_id, sort_order) VALUES
  ('B-PAC4220',   NULL,          'pac4220', 'PAC4220 Gateway',          1, 'building',  NULL,   0),
  ('TG-PAC4220',  'B-PAC4220',   'pac4220', 'Tablero General',          2, 'panel',     NULL,   0),
  ('ST-ILUM',     'TG-PAC4220',  'pac4220', 'Subtablero Iluminación',   3, 'subpanel',  NULL,   0),
  ('ST-CLIMA',    'TG-PAC4220',  'pac4220', 'Subtablero Climatización', 3, 'subpanel',  NULL,   1),
  ('ST-FUERZA',   'TG-PAC4220',  'pac4220', 'Subtablero Fuerza',        3, 'subpanel',  NULL,   2),
  ('C-ILUM-P1',   'ST-ILUM',     'pac4220', 'Circuito Ilum. Piso 1',   4, 'circuit',   'M001', 0),
  ('C-ILUM-P2',   'ST-ILUM',     'pac4220', 'Circuito Ilum. Piso 2',   4, 'circuit',   'M002', 1),
  ('C-HVAC-1',    'ST-CLIMA',    'pac4220', 'Circuito HVAC Zona 1',    4, 'circuit',   'M004', 0),
  ('C-HVAC-2',    'ST-CLIMA',    'pac4220', 'Circuito HVAC Zona 2',    4, 'circuit',   'M005', 1),
  ('C-TOMAC-1',   'ST-FUERZA',   'pac4220', 'Circuito Tomacorr. P1',   4, 'circuit',   'M008', 0),
  ('C-TOMAC-2',   'ST-FUERZA',   'pac4220', 'Circuito Tomacorr. P2',   4, 'circuit',   'M009', 1),
  ('C-ASCENSOR',  'ST-FUERZA',   'pac4220', 'Circuito Ascensor',       4, 'circuit',   'M012', 2),
  ('C-BOMBA',     'ST-FUERZA',   'pac4220', 'Circuito Bomba',          4, 'circuit',   'M014', 3)
ON CONFLICT (id) DO NOTHING;

-- 3. Seed hierarchy for s7-1200 (7 meters)
INSERT INTO hierarchy_nodes (id, parent_id, building_id, name, level, node_type, meter_id, sort_order) VALUES
  ('B-S7-1200',   NULL,          's7-1200', 'S7-1200 PLC',              1, 'building',  NULL,   0),
  ('TG-S7',       'B-S7-1200',   's7-1200', 'Tablero General',          2, 'panel',     NULL,   0),
  ('ST-PROD',     'TG-S7',       's7-1200', 'Subtablero Producción',    3, 'subpanel',  NULL,   0),
  ('ST-AUX',      'TG-S7',       's7-1200', 'Subtablero Auxiliar',      3, 'subpanel',  NULL,   1),
  ('C-LINEA-1',   'ST-PROD',     's7-1200', 'Circuito Línea 1',        4, 'circuit',   'M003', 0),
  ('C-LINEA-2',   'ST-PROD',     's7-1200', 'Circuito Línea 2',        4, 'circuit',   'M006', 1),
  ('C-LINEA-3',   'ST-PROD',     's7-1200', 'Circuito Línea 3',        4, 'circuit',   'M007', 2),
  ('C-OFICINAS',  'ST-AUX',      's7-1200', 'Circuito Oficinas',       4, 'circuit',   'M010', 0),
  ('C-COMPRES',   'ST-AUX',      's7-1200', 'Circuito Compresor',      4, 'circuit',   'M011', 1),
  ('C-CALDERAS',  'ST-AUX',      's7-1200', 'Circuito Calderas',       4, 'circuit',   'M013', 2),
  ('C-EMERG',     'ST-AUX',      's7-1200', 'Circuito Emergencia',     4, 'circuit',   'M015', 3)
ON CONFLICT (id) DO NOTHING;

COMMIT;

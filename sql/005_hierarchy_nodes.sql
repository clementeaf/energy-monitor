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

-- 2. Seed hierarchy for pac4220 (8 meters) — Gateway → Medidor (flat, no invented subpanels)
INSERT INTO hierarchy_nodes (id, parent_id, building_id, name, level, node_type, meter_id, sort_order) VALUES
  ('B-PAC4220',  NULL,         'pac4220', 'PAC4220 Gateway',  1, 'building', NULL,   0),
  ('M001',       'B-PAC4220', 'pac4220', 'Medidor M001',     2, 'circuit',  'M001', 0),
  ('M002',       'B-PAC4220', 'pac4220', 'Medidor M002',     2, 'circuit',  'M002', 1),
  ('M004',       'B-PAC4220', 'pac4220', 'Medidor M004',     2, 'circuit',  'M004', 2),
  ('M005',       'B-PAC4220', 'pac4220', 'Medidor M005',     2, 'circuit',  'M005', 3),
  ('M008',       'B-PAC4220', 'pac4220', 'Medidor M008',     2, 'circuit',  'M008', 4),
  ('M009',       'B-PAC4220', 'pac4220', 'Medidor M009',     2, 'circuit',  'M009', 5),
  ('M012',       'B-PAC4220', 'pac4220', 'Medidor M012',     2, 'circuit',  'M012', 6),
  ('M014',       'B-PAC4220', 'pac4220', 'Medidor M014',     2, 'circuit',  'M014', 7)
ON CONFLICT (id) DO NOTHING;

-- 3. Seed hierarchy for s7-1200 (7 meters) — Gateway → Medidor (flat, no invented subpanels)
INSERT INTO hierarchy_nodes (id, parent_id, building_id, name, level, node_type, meter_id, sort_order) VALUES
  ('B-S7-1200',  NULL,         's7-1200', 'S7-1200 PLC',     1, 'building', NULL,   0),
  ('M003',       'B-S7-1200', 's7-1200', 'Medidor M003',     2, 'circuit',  'M003', 0),
  ('M006',       'B-S7-1200', 's7-1200', 'Medidor M006',     2, 'circuit',  'M006', 1),
  ('M007',       'B-S7-1200', 's7-1200', 'Medidor M007',     2, 'circuit',  'M007', 2),
  ('M010',       'B-S7-1200', 's7-1200', 'Medidor M010',     2, 'circuit',  'M010', 3),
  ('M011',       'B-S7-1200', 's7-1200', 'Medidor M011',     2, 'circuit',  'M011', 4),
  ('M013',       'B-S7-1200', 's7-1200', 'Medidor M013',     2, 'circuit',  'M013', 5),
  ('M015',       'B-S7-1200', 's7-1200', 'Medidor M015',     2, 'circuit',  'M015', 6)
ON CONFLICT (id) DO NOTHING;

COMMIT;

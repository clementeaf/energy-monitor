-- ============================================================
-- POWER Digital® — Energy Monitor
-- Schema + seed: buildings, locals, monthly_consumption
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS buildings (
  id         VARCHAR(50)    PRIMARY KEY,
  name       VARCHAR(200)   NOT NULL,
  address    VARCHAR(300)   NOT NULL,
  total_area NUMERIC(10,2)  NOT NULL
);

CREATE TABLE IF NOT EXISTS locals (
  id          VARCHAR(50)    PRIMARY KEY,
  building_id VARCHAR(50)    NOT NULL REFERENCES buildings(id),
  name        VARCHAR(200)   NOT NULL,
  floor       SMALLINT       NOT NULL,
  area        NUMERIC(10,2)  NOT NULL,
  type        VARCHAR(100)   NOT NULL
);

CREATE TABLE IF NOT EXISTS monthly_consumption (
  id       SERIAL          PRIMARY KEY,
  local_id VARCHAR(50)     NOT NULL REFERENCES locals(id),
  month    VARCHAR(10)     NOT NULL,
  consumption NUMERIC(12,2) NOT NULL,
  unit     VARCHAR(10)     NOT NULL DEFAULT 'kWh'
);

CREATE INDEX IF NOT EXISTS idx_locals_building ON locals(building_id);
CREATE INDEX IF NOT EXISTS idx_consumption_local ON monthly_consumption(local_id);

-- Seed buildings
INSERT INTO buildings (id, name, address, total_area) VALUES
  ('1', 'Torre Central',       'Av. Providencia 1234',    5200),
  ('2', 'Edificio Norte',      'Calle Los Leones 567',    3800),
  ('3', 'Plaza Sur',           'Av. Apoquindo 890',       7100),
  ('4', 'Centro Empresarial',  'Av. Las Condes 321',      4500),
  ('5', 'Edificio Poniente',   'Calle Nueva York 456',    2900)
ON CONFLICT (id) DO NOTHING;

-- Seed locals
INSERT INTO locals (id, building_id, name, floor, area, type) VALUES
  ('L1',  '1', 'Local 101',    1, 120, 'Comercial'),
  ('L2',  '1', 'Local 201',    2,  95, 'Oficina'),
  ('L3',  '1', 'Local 301',    3, 150, 'Oficina'),
  ('L4',  '2', 'Local A',      1, 200, 'Comercial'),
  ('L5',  '2', 'Local B',      2, 180, 'Restaurante'),
  ('L6',  '3', 'Local 1',      1, 300, 'Supermercado'),
  ('L7',  '3', 'Local 2',      1, 110, 'Farmacia'),
  ('L8',  '4', 'Oficina 401',  4,  85, 'Oficina'),
  ('L9',  '4', 'Oficina 501',  5,  90, 'Oficina'),
  ('L10', '5', 'Local Único',  1, 250, 'Cowork')
ON CONFLICT (id) DO NOTHING;

-- Seed monthly consumption (10 locals × 12 months)
INSERT INTO monthly_consumption (local_id, month, consumption) VALUES
  ('L1','Ene',420),('L1','Feb',390),('L1','Mar',450),('L1','Abr',410),('L1','May',470),('L1','Jun',520),('L1','Jul',550),('L1','Ago',530),('L1','Sep',480),('L1','Oct',440),('L1','Nov',400),('L1','Dic',460),
  ('L2','Ene',310),('L2','Feb',290),('L2','Mar',330),('L2','Abr',300),('L2','May',350),('L2','Jun',380),('L2','Jul',400),('L2','Ago',390),('L2','Sep',360),('L2','Oct',320),('L2','Nov',300),('L2','Dic',340),
  ('L3','Ene',500),('L3','Feb',480),('L3','Mar',520),('L3','Abr',490),('L3','May',540),('L3','Jun',580),('L3','Jul',610),('L3','Ago',590),('L3','Sep',550),('L3','Oct',510),('L3','Nov',470),('L3','Dic',530),
  ('L4','Ene',680),('L4','Feb',650),('L4','Mar',710),('L4','Abr',670),('L4','May',730),('L4','Jun',780),('L4','Jul',800),('L4','Ago',790),('L4','Sep',740),('L4','Oct',700),('L4','Nov',660),('L4','Dic',720),
  ('L5','Ene',890),('L5','Feb',850),('L5','Mar',920),('L5','Abr',870),('L5','May',940),('L5','Jun',1010),('L5','Jul',1050),('L5','Ago',1020),('L5','Sep',960),('L5','Oct',900),('L5','Nov',860),('L5','Dic',930),
  ('L6','Ene',1200),('L6','Feb',1150),('L6','Mar',1250),('L6','Abr',1180),('L6','May',1300),('L6','Jun',1380),('L6','Jul',1420),('L6','Ago',1400),('L6','Sep',1320),('L6','Oct',1230),('L6','Nov',1170),('L6','Dic',1280),
  ('L7','Ene',350),('L7','Feb',330),('L7','Mar',370),('L7','Abr',340),('L7','May',380),('L7','Jun',410),('L7','Jul',430),('L7','Ago',420),('L7','Sep',390),('L7','Oct',360),('L7','Nov',340),('L7','Dic',375),
  ('L8','Ene',280),('L8','Feb',260),('L8','Mar',300),('L8','Abr',270),('L8','May',310),('L8','Jun',340),('L8','Jul',360),('L8','Ago',350),('L8','Sep',320),('L8','Oct',290),('L8','Nov',270),('L8','Dic',305),
  ('L9','Ene',290),('L9','Feb',275),('L9','Mar',310),('L9','Abr',285),('L9','May',320),('L9','Jun',350),('L9','Jul',370),('L9','Ago',355),('L9','Sep',330),('L9','Oct',300),('L9','Nov',280),('L9','Dic',315),
  ('L10','Ene',750),('L10','Feb',720),('L10','Mar',780),('L10','Abr',740),('L10','May',800),('L10','Jun',860),('L10','Jul',890),('L10','Ago',870),('L10','Sep',820),('L10','Oct',760),('L10','Nov',730),('L10','Dic',790);

COMMIT;

-- Correct PASA buildings to match real Parque Arauco portfolio.
-- Links buildings to MapVx malls via external_site_id for indoor planimetry.

-- 1. Parque Arauco Kennedy (indoor, 16 floors)
UPDATE buildings SET
  name = 'Parque Arauco',
  code = 'PAK',
  address = 'Av. Presidente Kennedy 5413, Las Condes',
  area_sqm = 242000,
  latitude = -33.4006301,
  longitude = -70.5768400,
  external_site_id = '-Ok-yw5e32hv59dxorcN'
WHERE id = 'b0000001-0000-0000-0000-000000000001';

-- 2. Arauco Maipú (indoor, 2 floors)
UPDATE buildings SET
  name = 'Arauco Maipú',
  code = 'AMP',
  address = 'Av. Américo Vespucio 399, Maipú',
  area_sqm = 80000,
  latitude = -33.4820002,
  longitude = -70.7509647,
  external_site_id = '-OsXmx3WlJMjxVbQ5q-f'
WHERE id = 'b0000001-0000-0000-0000-000000000002';

-- 3. Arauco Quilicura (no indoor)
UPDATE buildings SET
  name = 'Arauco Quilicura',
  code = 'AQU',
  address = 'Av. Manuel Antonio Matta 301, Quilicura',
  area_sqm = 55000,
  latitude = -33.3709,
  longitude = -70.7177,
  external_site_id = 'parauco-MAQ'
WHERE id = 'b0000001-0000-0000-0000-000000000003';

-- 4. Arauco Estación (no indoor)
UPDATE buildings SET
  name = 'Arauco Estación',
  code = 'AES',
  address = 'Av. Lib. Bernardo O''Higgins 3470, Estación Central',
  area_sqm = 92000,
  latitude = -33.4527,
  longitude = -70.6799,
  external_site_id = 'parauco-MAE'
WHERE id = 'b0000001-0000-0000-0000-000000000004';

-- 5. Arauco El Bosque (no indoor)
UPDATE buildings SET
  name = 'Arauco El Bosque',
  code = 'ABO',
  address = 'Av. Gran Avenida José Miguel Carrera 6925, El Bosque',
  area_sqm = 60000,
  latitude = -33.5535,
  longitude = -70.6781,
  external_site_id = 'parauco-AEB'
WHERE id = 'b0000001-0000-0000-0000-000000000005';

INSERT INTO schema_migrations (version)
VALUES ('61-pasa-buildings-real')
ON CONFLICT (version) DO NOTHING;

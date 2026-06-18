-- Add geographic coordinates to buildings for map rendering.
-- latitude: -90 to 90, longitude: -180 to 180. Precision: ~1.1cm.

ALTER TABLE buildings ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 7) DEFAULT NULL;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS longitude DECIMAL(10, 7) DEFAULT NULL;

-- Seed PASA building coordinates (real locations)
UPDATE buildings SET latitude = -33.3953, longitude = -70.5875
  WHERE id = 'b0000001-0000-0000-0000-000000000001'; -- Mallplaza Gestión, Kennedy, Las Condes

UPDATE buildings SET latitude = -32.9507, longitude = -71.5509
  WHERE id = 'b0000001-0000-0000-0000-000000000002'; -- Mall del Mar, Viña del Mar

UPDATE buildings SET latitude = -38.7359, longitude = -72.5904
  WHERE id = 'b0000001-0000-0000-0000-000000000003'; -- Open Temuco

UPDATE buildings SET latitude = -33.4489, longitude = -70.6693
  WHERE id = 'b0000001-0000-0000-0000-000000000004'; -- SC52, Santiago Centro

UPDATE buildings SET latitude = -33.4500, longitude = -70.6680
  WHERE id = 'b0000001-0000-0000-0000-000000000005'; -- SC53, Santiago Centro

INSERT INTO schema_migrations (version)
VALUES ('50-building-coordinates')
ON CONFLICT (version) DO NOTHING;

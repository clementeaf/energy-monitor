\set ON_ERROR_STOP 1
BEGIN;
\ir ../migrations/63-varelectric-inbox.sql

DELETE FROM varelectric.ingest_tenant;
INSERT INTO varelectric.ingest_tenant (tenant_id) SELECT id FROM tenants ORDER BY created_at LIMIT 1;
SET LOCAL timezone = 'America/Santiago';

INSERT INTO varelectric.var_electric (idvar_electric, estado, edificio, id_remarcador, fecha, tag1, tag16, tag12, tag14)
VALUES
  (1, 1, 'zz-test', 7, '2000-01-01 10:00:00', 220.5, 99, 0.9, 10),
  (1, 1, 'zz-test', 7, '2000-01-01 10:00:00', 220.5, 99, 0.9, 10),
  (2, 1, 'zz-test', 8, '2000-01-01T13:00:00Z', NULL, NULL, NULL, 20),
  (3, 1, 'zz-test', 7, '2000-01-01 10:15:00', NULL, NULL, NULL, 12.5),
  (4, 1, 'zz-test', 8, '2000-01-01 10:40:00', NULL, NULL, NULL, 21),
  (7, 1, 'zz-test', 9, '2000-01-01 10:00:00', NULL, NULL, NULL, 100),
  (8, 1, 'zz-test', 9, '2000-01-01 10:05:00', NULL, NULL, NULL, 101),
  (5, 1, 'zz-skip', 1, '2000-01-01 10:00:00', NULL, 5, NULL, NULL);

DO $$
DECLARE
  building_count INTEGER;
  meter_count INTEGER;
  reading_count INTEGER;
  first_reading readings%ROWTYPE;
  demand_after_15_min NUMERIC;
  demand_after_gap NUMERIC;
  demand_after_5_min NUMERIC;
BEGIN
  SELECT count(*) INTO building_count FROM buildings WHERE external_site_id = 'zz-test' AND code = 'VE-zz-test';
  IF building_count <> 1 THEN RAISE EXCEPTION 'expected 1 auto-created building, got %', building_count; END IF;

  SELECT count(*) INTO meter_count FROM meters m JOIN buildings b ON b.id = m.building_id WHERE b.external_site_id = 'zz-test';
  IF meter_count <> 3 THEN RAISE EXCEPTION 'expected 3 auto-created meters, got %', meter_count; END IF;

  SELECT count(*) INTO reading_count FROM readings r JOIN meters m ON m.id = r.meter_id JOIN buildings b ON b.id = m.building_id WHERE b.external_site_id = 'zz-test';
  IF reading_count <> 6 THEN RAISE EXCEPTION 'expected 6 readings after duplicate insert, got %', reading_count; END IF;

  SELECT r.* INTO first_reading FROM readings r JOIN meters m ON m.id = r.meter_id WHERE m.code = 'VE-zz-test-7' ORDER BY r.timestamp LIMIT 1;
  IF first_reading.timestamp <> '2000-01-01T13:00:00Z'::timestamptz THEN RAISE EXCEPTION 'expected Santiago local time 10:00 = 13:00Z, got %', first_reading.timestamp; END IF;
  IF first_reading.voltage_l1 <> 220.5 OR first_reading.power_kw <> 99 OR first_reading.power_factor <> 0.9 OR first_reading.energy_kwh_total <> 10 THEN
    RAISE EXCEPTION 'tag mapping wrong: %', first_reading;
  END IF;

  SELECT r.power_kw INTO demand_after_15_min FROM readings r JOIN meters m ON m.id = r.meter_id WHERE m.code = 'VE-zz-test-7' AND r.timestamp = '2000-01-01T13:15:00Z';
  IF demand_after_15_min <> 10 THEN RAISE EXCEPTION 'expected demand (12.5 - 10) * 4 = 10, got %', demand_after_15_min; END IF;

  SELECT r.power_kw INTO demand_after_gap FROM readings r JOIN meters m ON m.id = r.meter_id WHERE m.code = 'VE-zz-test-8' AND r.timestamp = '2000-01-01T13:40:00Z';
  IF demand_after_gap <> 0 THEN RAISE EXCEPTION 'expected demand 0 when previous energy is older than 20 min, got %', demand_after_gap; END IF;

  SELECT r.power_kw INTO demand_after_5_min FROM readings r JOIN meters m ON m.id = r.meter_id WHERE m.code = 'VE-zz-test-9' AND r.timestamp = '2000-01-01T13:05:00Z';
  IF demand_after_5_min <> 12 THEN RAISE EXCEPTION 'expected demand (101 - 100) kWh / (5/60) h = 12, got %', demand_after_5_min; END IF;

  IF EXISTS (SELECT 1 FROM buildings WHERE external_site_id = 'zz-skip') THEN RAISE EXCEPTION 'row without tag14 must not create a building'; END IF;
END $$;

INSERT INTO buildings (tenant_id, name, code) VALUES ((SELECT tenant_id FROM varelectric.ingest_tenant), 'Clash', 'VE-zz-clash');
DO $$
BEGIN
  INSERT INTO varelectric.var_electric (idvar_electric, estado, edificio, id_remarcador, fecha, tag16, tag14)
  VALUES (6, 1, 'zz-clash', 1, '2000-01-01 10:00:00', 1, 1);
  RAISE EXCEPTION 'expected code clash to be rejected';
EXCEPTION WHEN raise_exception THEN
  IF SQLERRM NOT LIKE 'Building code VE-zz-clash is taken%' THEN RAISE; END IF;
END $$;

SELECT 'varelectric inbox: all checks passed' AS result;
ROLLBACK;

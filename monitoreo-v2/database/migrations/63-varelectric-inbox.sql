CREATE SCHEMA IF NOT EXISTS varelectric;

CREATE TABLE IF NOT EXISTS varelectric.var_electric (
  idvar_electric BIGINT,
  estado INTEGER NOT NULL,
  edificio VARCHAR(46) NOT NULL CHECK (edificio ~ '^[A-Za-z0-9_-]+$'),
  id_remarcador INTEGER NOT NULL,
  fecha TIMESTAMPTZ NOT NULL,
  tag1 DOUBLE PRECISION, tag2 DOUBLE PRECISION, tag3 DOUBLE PRECISION, tag4 DOUBLE PRECISION,
  tag5 DOUBLE PRECISION, tag6 DOUBLE PRECISION, tag7 DOUBLE PRECISION, tag8 DOUBLE PRECISION,
  tag9 DOUBLE PRECISION, tag10 DOUBLE PRECISION, tag11 DOUBLE PRECISION, tag12 DOUBLE PRECISION,
  tag13 DOUBLE PRECISION, tag14 DOUBLE PRECISION, tag15 DOUBLE PRECISION, tag16 DOUBLE PRECISION,
  tag17 DOUBLE PRECISION, tag18 DOUBLE PRECISION, tag19 DOUBLE PRECISION, tag20 DOUBLE PRECISION,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_var_electric_meter_fecha
  ON varelectric.var_electric (edificio, id_remarcador, fecha DESC);

CREATE OR REPLACE FUNCTION varelectric.derive_demand_from_energy() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = varelectric AS $$
DECLARE
  previous_energy DOUBLE PRECISION;
  previous_fecha TIMESTAMPTZ;
BEGIN
  SELECT v.tag14, v.fecha INTO previous_energy, previous_fecha
  FROM var_electric v
  WHERE v.edificio = NEW.edificio
    AND v.id_remarcador = NEW.id_remarcador
    AND v.fecha >= NEW.fecha - INTERVAL '20 minutes'
    AND v.fecha < NEW.fecha
  ORDER BY v.fecha DESC
  LIMIT 1;

  NEW.tag16 := CASE
    WHEN previous_energy > 0 AND NEW.tag14 > 0 THEN round(((NEW.tag14 - previous_energy) * 3600 / extract(epoch FROM NEW.fecha - previous_fecha))::numeric, 2)
    ELSE 0
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_var_electric_derive_demand ON varelectric.var_electric;
CREATE TRIGGER trg_var_electric_derive_demand
  BEFORE INSERT ON varelectric.var_electric
  FOR EACH ROW WHEN (NEW.tag16 IS NULL) EXECUTE FUNCTION varelectric.derive_demand_from_energy();

CREATE TABLE IF NOT EXISTS varelectric.ingest_tenant (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  is_singleton BOOLEAN NOT NULL DEFAULT TRUE UNIQUE CHECK (is_singleton)
);

CREATE OR REPLACE FUNCTION varelectric.ingest_var_electric() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  tenant UUID := (SELECT tenant_id FROM varelectric.ingest_tenant);
  resolved_building_id UUID;
  resolved_building_code VARCHAR(50);
  resolved_meter_id UUID;
BEGIN
  IF tenant IS NULL THEN
    RAISE EXCEPTION 'varelectric.ingest_tenant is empty: run database/rds/create-varelectric-user.sh';
  END IF;

  IF NEW.tag14 IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO buildings (tenant_id, name, code, external_site_id)
  VALUES (tenant, NEW.edificio, 'VE-' || NEW.edificio, NEW.edificio)
  ON CONFLICT DO NOTHING;

  SELECT b.id, b.code INTO resolved_building_id, resolved_building_code
  FROM buildings b
  WHERE b.tenant_id = tenant AND b.external_site_id = NEW.edificio;
  IF resolved_building_id IS NULL THEN
    RAISE EXCEPTION 'Building code VE-% is taken by another building; set external_site_id = % on it', NEW.edificio, NEW.edificio;
  END IF;

  INSERT INTO meters (tenant_id, building_id, name, code, metadata)
  SELECT tenant, resolved_building_id, 'Remarcador ' || NEW.id_remarcador, resolved_building_code || '-' || NEW.id_remarcador,
         jsonb_build_object('source', 'varelectric', 'id_remarcador', NEW.id_remarcador)
  WHERE NOT EXISTS (
    SELECT 1 FROM meters m
    WHERE m.building_id = resolved_building_id
      AND m.metadata->>'id_remarcador' = NEW.id_remarcador::text
  )
  ON CONFLICT (tenant_id, code) DO NOTHING;

  SELECT m.id INTO resolved_meter_id
  FROM meters m
  WHERE m.building_id = resolved_building_id
    AND m.metadata->>'id_remarcador' = NEW.id_remarcador::text;

  INSERT INTO readings (
    tenant_id, meter_id, timestamp, source, ingested_at,
    voltage_l1, voltage_l2, voltage_l3, current_l1, current_l2, current_l3,
    power_kw, power_factor, energy_kwh_total
  )
  VALUES (
    tenant, resolved_meter_id, NEW.fecha, 'varelectric', NOW(),
    NEW.tag1, NEW.tag2, NEW.tag3, NEW.tag4, NEW.tag5, NEW.tag6,
    NEW.tag16, NEW.tag12, NEW.tag14
  )
  ON CONFLICT DO NOTHING;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_var_electric_ingest ON varelectric.var_electric;
CREATE TRIGGER trg_var_electric_ingest
  AFTER INSERT ON varelectric.var_electric
  FOR EACH ROW EXECUTE FUNCTION varelectric.ingest_var_electric();

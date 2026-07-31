-- Migration 60: emission_factors table for carbon footprint module
-- Factor source: Coordinador Eléctrico Nacional (Chile) — grid emission factors

CREATE TABLE IF NOT EXISTS emission_factors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code CHAR(2) NOT NULL,
  year SMALLINT NOT NULL,
  factor_tco2e_per_mwh DECIMAL(8,4) NOT NULL,
  source VARCHAR(255),
  UNIQUE (country_code, year)
);

-- Seed Chile grid emission factors (tCO2e/MWh) — Coordinador Eléctrico Nacional
INSERT INTO emission_factors (country_code, year, factor_tco2e_per_mwh, source) VALUES
  ('CL', 2019, 0.4206, 'Coordinador Eléctrico Nacional'),
  ('CL', 2020, 0.3994, 'Coordinador Eléctrico Nacional'),
  ('CL', 2021, 0.3811, 'Coordinador Eléctrico Nacional'),
  ('CL', 2022, 0.3742, 'Coordinador Eléctrico Nacional'),
  ('CL', 2023, 0.3651, 'Coordinador Eléctrico Nacional'),
  ('CL', 2024, 0.3867, 'Coordinador Eléctrico Nacional'),
  ('CL', 2025, 0.3750, 'Coordinador Eléctrico Nacional (estimado)')
ON CONFLICT (country_code, year) DO NOTHING;

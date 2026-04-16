CREATE TEMP TABLE v1_iot (
  id integer, device_id uuid, device_name text, ts timestamptz, s3_key text,
  voltage_l1 double precision, voltage_l2 double precision, voltage_l3 double precision, voltage_avg double precision,
  current_l1 double precision, current_l2 double precision, current_l3 double precision, current_avg double precision,
  active_power_w double precision, active_power_l1_w double precision, active_power_l2_w double precision, active_power_l3_w double precision,
  reactive_power_var double precision, apparent_power_va double precision,
  power_factor double precision, power_factor_l1 double precision, power_factor_l2 double precision, power_factor_l3 double precision,
  frequency_hz double precision,
  energy_import_wh double precision, energy_export_wh double precision, reactive_energy_import_varh double precision,
  thd_voltage_l1_pct double precision, thd_voltage_l2_pct double precision, thd_voltage_l3_pct double precision,
  thd_current_l1_pct double precision, thd_current_l2_pct double precision, thd_current_l3_pct double precision,
  peak_demand_w double precision, raw_json text, created_at timestamptz
);

\copy v1_iot FROM '/tmp/iot-data.tsv'

INSERT INTO iot_readings (time, tenant_id, meter_id, variable_name, value, quality)
SELECT ts, '84adf8d4-830d-46e1-bef5-e2eac6a19014'::uuid, device_id, var_name, var_value, 0
FROM v1_iot,
LATERAL (VALUES
  ('voltage_l1', voltage_l1), ('voltage_l2', voltage_l2), ('voltage_l3', voltage_l3),
  ('current_l1', current_l1), ('current_l2', current_l2), ('current_l3', current_l3),
  ('active_power_w', active_power_w), ('reactive_power_var', reactive_power_var),
  ('apparent_power_va', apparent_power_va),
  ('power_factor', power_factor), ('frequency_hz', frequency_hz),
  ('energy_import_wh', energy_import_wh), ('energy_export_wh', energy_export_wh),
  ('thd_voltage_l1_pct', thd_voltage_l1_pct), ('thd_voltage_l2_pct', thd_voltage_l2_pct), ('thd_voltage_l3_pct', thd_voltage_l3_pct),
  ('thd_current_l1_pct', thd_current_l1_pct), ('thd_current_l2_pct', thd_current_l2_pct), ('thd_current_l3_pct', thd_current_l3_pct),
  ('peak_demand_w', peak_demand_w)
) AS unpivot(var_name, var_value)
WHERE var_value IS NOT NULL
ON CONFLICT DO NOTHING;

DROP TABLE v1_iot;

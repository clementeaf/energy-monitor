-- GAP-125: Global siemens-poc3000 MQTT variable mappings (IoT EAV → readings).

INSERT INTO register_mappings (tenant_id, protocol, device_profile, register_key, target_field, scale_factor, unit)
SELECT NULL, 'mqtt', 'siemens-poc3000', v.register_key, v.target_field, v.scale_factor, v.unit
FROM (
    VALUES
        ('voltage_l1', 'voltage_l1', 1, 'V'),
        ('voltage_l2', 'voltage_l2', 1, 'V'),
        ('voltage_l3', 'voltage_l3', 1, 'V'),
        ('current_l1', 'current_l1', 1, 'A'),
        ('current_l2', 'current_l2', 1, 'A'),
        ('current_l3', 'current_l3', 1, 'A'),
        ('active_power_w', 'power_kw', 0.001, 'kW'),
        ('reactive_power_var', 'reactive_power_kvar', 0.001, 'kVAR'),
        ('power_factor', 'power_factor', 1, NULL),
        ('frequency_hz', 'frequency_hz', 1, 'Hz'),
        ('energy_import_wh', 'energy_kwh_total', 0.001, 'kWh'),
        ('thd_voltage_l1_pct', 'thd_voltage_pct', 1, '%'),
        ('thd_current_l1_pct', 'thd_current_pct', 1, '%'),
        ('peak_demand_w', 'peak_demand_kw', 0.001, 'kW')
) AS v(register_key, target_field, scale_factor, unit)
WHERE NOT EXISTS (
    SELECT 1
    FROM register_mappings m
    WHERE m.tenant_id IS NULL
      AND m.protocol = 'mqtt'
      AND m.device_profile = 'siemens-poc3000'
      AND m.register_key = v.register_key
);

INSERT INTO schema_migrations (version, description) VALUES
    ('34-seed-siemens-poc3000-mqtt', 'global siemens-poc3000 mqtt register_mappings template')
ON CONFLICT (version) DO NOTHING;

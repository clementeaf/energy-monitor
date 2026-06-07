-- GAP-120: Global Modbus PAC1670 register mapping template (tenant_id NULL).

INSERT INTO register_mappings (tenant_id, protocol, device_profile, register_key, target_field, scale_factor, unit)
SELECT NULL, 'modbus', 'pac1670', v.register_key, v.target_field, v.scale_factor, v.unit
FROM (
    VALUES
        ('40001', 'power_kw', 0.001, 'kW'),
        ('40003', 'reactive_power_kvar', 0.001, 'kVAR'),
        ('40005', 'power_factor', 0.001, NULL),
        ('40007', 'frequency_hz', 0.01, 'Hz'),
        ('40009', 'energy_kwh_total', 0.001, 'kWh'),
        ('40101', 'voltage_l1', 0.1, 'V'),
        ('40103', 'voltage_l2', 0.1, 'V'),
        ('40105', 'voltage_l3', 0.1, 'V'),
        ('40107', 'current_l1', 0.001, 'A'),
        ('40109', 'current_l2', 0.001, 'A'),
        ('40111', 'current_l3', 0.001, 'A'),
        ('40201', 'thd_voltage_pct', 0.01, '%'),
        ('40203', 'thd_current_pct', 0.01, '%'),
        ('40205', 'phase_imbalance_pct', 0.01, '%')
) AS v(register_key, target_field, scale_factor, unit)
WHERE NOT EXISTS (
    SELECT 1
    FROM register_mappings m
    WHERE m.tenant_id IS NULL
      AND m.protocol = 'modbus'
      AND m.device_profile = 'pac1670'
      AND m.register_key = v.register_key
);

INSERT INTO schema_migrations (version, description) VALUES
    ('33-seed-pac1670-modbus', 'global pac1670 modbus register_mappings template')
ON CONFLICT (version) DO NOTHING;

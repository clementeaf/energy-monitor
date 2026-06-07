-- GAP-065: 15-minute continuous aggregate for long-range aggregated queries.

CREATE MATERIALIZED VIEW IF NOT EXISTS readings_15min
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('15 minutes', timestamp) AS bucket,
    tenant_id,
    meter_id,
    AVG(power_kw::double precision)          AS avg_power_kw,
    MAX(power_kw::double precision)          AS max_power_kw,
    MIN(power_kw::double precision)          AS min_power_kw,
    AVG(power_factor::double precision)      AS avg_power_factor,
    AVG(voltage_l1::double precision)        AS avg_voltage_l1,
    MAX(energy_kwh_total::double precision)  AS max_energy_kwh_total,
    MIN(energy_kwh_total::double precision)  AS min_energy_kwh_total,
    COUNT(*)                                 AS reading_count
FROM readings
GROUP BY bucket, tenant_id, meter_id
WITH NO DATA;

SELECT add_continuous_aggregate_policy('readings_15min',
    start_offset      => INTERVAL '3 days',
    end_offset        => INTERVAL '15 minutes',
    schedule_interval => INTERVAL '15 minutes'
);

INSERT INTO schema_migrations (version, description) VALUES
    ('23-cagg-15min', 'readings_15min continuous aggregate + refresh policy')
ON CONFLICT (version) DO NOTHING;

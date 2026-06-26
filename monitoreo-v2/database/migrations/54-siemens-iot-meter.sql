-- Migration 54: Register Siemens IoT building + meter
-- The iot-ingest Lambda inserts into iot_readings with these IDs.
-- Without a matching row in meters, the backend JOINs return nothing.

-- Siemens building under Globe Power tenant
INSERT INTO buildings (id, tenant_id, name, code, address, area_sqm)
VALUES (
    'b0000001-0000-0000-0000-000000000010',
    '84adf8d4-830d-46e1-bef5-e2eac6a19014',
    'Siemens POC3000',
    'SIEM-01',
    'Siemens Chile',
    0
) ON CONFLICT DO NOTHING;

-- Siemens meter (must match device-map in iot-ingest Lambda)
INSERT INTO meters (id, tenant_id, building_id, name, code, meter_type, metadata)
VALUES (
    '6ab27db7-0a61-40c2-8a93-35e9e2376683',
    '84adf8d4-830d-46e1-bef5-e2eac6a19014',
    'b0000001-0000-0000-0000-000000000010',
    'SENTRON POC3000',
    'POC3000-001',
    'electrical',
    '{"source": "iot", "protocol": "mqtt", "device": "siemens-poc3000"}'
) ON CONFLICT DO NOTHING;

-- Grant super_admin access to the new building
INSERT INTO user_building_access (user_id, building_id)
VALUES ('d141ad74-9d5d-4a5c-81ea-2bfa7d97ce6f', 'b0000001-0000-0000-0000-000000000010')
ON CONFLICT DO NOTHING;

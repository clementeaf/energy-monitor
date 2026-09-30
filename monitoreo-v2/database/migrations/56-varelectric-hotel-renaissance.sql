-- Migration 56: Registra HOTEL RENAISSANCE + su remarcador general (Varelectric)
--
-- Origen: dump MySQL `renaissance` de db-varlectric-base.varelectric.cl
-- (docs/Dump20260727.sql). Los datos de identificacion salen de la tabla
-- `configuracion`, fila remarcador_id=10:
--   edificio='HOTEL RENAISSANCE', piso=-2, fases=3, tipo='CONTAXD',
--   nombre='R1 - ID010 - TRAFO GENERAL HOTEL', puerto='/dev/ttyUSB0' 4800 baud.
--
-- Sin estas dos filas, el INSERT de lecturas generado por
-- scripts/convert-varelectric-dump.mjs falla por FK.

INSERT INTO buildings (id, tenant_id, name, code, address, area_sqm)
VALUES (
    'b0000001-0000-0000-0000-000000000011',
    '84adf8d4-830d-46e1-bef5-e2eac6a19014',
    'Hotel Renaissance',
    'VE-REN',
    'Santiago, Chile',
    0
) ON CONFLICT DO NOTHING;

-- Remarcador de cabecera: mide el trafo general del hotel, no un local.
INSERT INTO meters (id, tenant_id, building_id, name, code, meter_type, metadata)
VALUES (
    'b0000001-0000-0000-0000-000000000012',
    '84adf8d4-830d-46e1-bef5-e2eac6a19014',
    'b0000001-0000-0000-0000-000000000011',
    'R1 - ID010 - TRAFO GENERAL HOTEL',
    'VE-010',
    'electrical',
    '{"source": "varelectric", "id_remarcador": 10, "tipo": "CONTAXD",
      "fases": 3, "piso": -2, "protocolo": "modbus-rtu", "baud_rate": 4800}'
) ON CONFLICT DO NOTHING;

INSERT INTO user_building_access (user_id, building_id)
VALUES ('d141ad74-9d5d-4a5c-81ea-2bfa7d97ce6f', 'b0000001-0000-0000-0000-000000000011')
ON CONFLICT DO NOTHING;

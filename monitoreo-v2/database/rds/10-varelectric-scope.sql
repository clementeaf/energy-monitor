DELETE FROM tenants WHERE id = 'b0000002-0000-0000-0000-000000000001';
DELETE FROM buildings WHERE code = 'SIEM-01';

INSERT INTO buildings (id, tenant_id, name, code, address, area_sqm)
VALUES ('b0000003-0000-0000-0000-000000000000', '84adf8d4-830d-46e1-bef5-e2eac6a19014', 'Quilicura', 'VE-QUILICURA', 'Quilicura, Santiago, Chile', 0)
ON CONFLICT DO NOTHING;

INSERT INTO meters (id, tenant_id, building_id, name, code, meter_type, metadata)
SELECT
  ('b0000003-0000-0000-0000-' || lpad(remarcador.id::text, 12, '0'))::uuid,
  '84adf8d4-830d-46e1-bef5-e2eac6a19014',
  'b0000003-0000-0000-0000-000000000000',
  remarcador.name,
  'VE-QUILICURA-' || remarcador.id,
  'electrical',
  jsonb_build_object('source', 'varelectric', 'id_remarcador', remarcador.id, 'protocolo', 'modbus', 'dump', 'quilicura')
FROM (VALUES
  (1, 'LOCAL 01'), (2, 'LOCAL 02'), (3, 'LOCAL 03'), (4, 'LOCAL 04'), (5, 'LOCAL 05'),
  (6, 'LOCAL 06'), (7, 'LOCAL 07'), (8, 'LOCAL 08'), (9, 'LOCAL 09'), (10, 'LOCAL 10'),
  (31, 'TRAFO GEN')
) AS remarcador(id, name)
ON CONFLICT DO NOTHING;

INSERT INTO user_building_access (user_id, building_id)
SELECT u.id, b.id
FROM users u CROSS JOIN buildings b
WHERE u.tenant_id = b.tenant_id
ON CONFLICT DO NOTHING;

INSERT INTO schema_migrations (version, description)
VALUES ('rds-10-varelectric-scope', 'Fresh account: Varelectric buildings only (Alto Penalolen, Quilicura, Renaissance)')
ON CONFLICT (version) DO NOTHING;

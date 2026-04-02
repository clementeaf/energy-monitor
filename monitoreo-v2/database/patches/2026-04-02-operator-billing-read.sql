-- Operador técnico: lectura de tarifas/facturación (alineado a 04-seed.sql).
INSERT INTO role_permissions (role_id, permission_id, access_level)
SELECT 'a0000001-0000-0000-0000-000000000004', p.id, 'R'
FROM permissions p
WHERE p.module = 'billing' AND p.action = 'read'
ON CONFLICT DO NOTHING;

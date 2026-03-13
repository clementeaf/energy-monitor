-- Vista Facturación: módulo y permisos para SUPER_ADMIN, CORP_ADMIN, SITE_ADMIN
BEGIN;

INSERT INTO modules (id, code, label, route_path, navigation_group, show_in_nav, sort_order, is_public, is_active)
VALUES (17, 'BILLING_OVERVIEW', 'Facturación', '/billing', 'Facturación', true, 10, false, true)
ON CONFLICT (id) DO UPDATE SET
  code = EXCLUDED.code,
  label = EXCLUDED.label,
  route_path = EXCLUDED.route_path,
  navigation_group = EXCLUDED.navigation_group,
  show_in_nav = EXCLUDED.show_in_nav,
  sort_order = EXCLUDED.sort_order,
  is_public = EXCLUDED.is_public,
  is_active = EXCLUDED.is_active;

-- view (action_id 1): SUPER_ADMIN, CORP_ADMIN, SITE_ADMIN
INSERT INTO role_permissions (role_id, module_id, action_id)
VALUES (1, 17, 1), (2, 17, 1), (3, 17, 1)
ON CONFLICT (role_id, module_id, action_id) DO NOTHING;

COMMIT;

BEGIN;

ALTER TABLE modules
  ADD COLUMN IF NOT EXISTS route_path VARCHAR(120),
  ADD COLUMN IF NOT EXISTS navigation_group VARCHAR(40),
  ADD COLUMN IF NOT EXISTS show_in_nav BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sort_order SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

DELETE FROM role_permissions;
DELETE FROM modules;

INSERT INTO modules (id, code, label, route_path, navigation_group, show_in_nav, sort_order, is_public, is_active) VALUES
  (1,  'LOGIN',                'Iniciar sesión',              '/login',                        'Acceso y contexto', false, 10, true,  true),
  (2,  'UNAUTHORIZED',         'Sin acceso',                  '/unauthorized',                 'Acceso y contexto', false, 20, true,  true),
  (3,  'CONTEXT_SELECT',       'Seleccionar sitio',           '/context/select',               'Acceso y contexto', false, 30, false, true),
  (16, 'INVITATION_ACCEPT',    'Aceptar invitación',          '/invite/:token',                'Acceso y contexto', false, 25, true,  true),
  (4,  'BUILDINGS_OVERVIEW',   'Edificios',                   '/',                             'Dashboard',         true,  10, false, true),
  (5,  'BUILDING_DETAIL',      'Detalle de edificio',         '/buildings/:id',                'Dashboard',         false, 20, false, true),
  (6,  'METER_DETAIL',         'Detalle de medidor',          '/meters/:meterId',              'Monitoreo',         false, 10, false, true),
  (7,  'MONITORING_REALTIME',  'Monitoreo en tiempo real',    '/monitoring/realtime',          'Monitoreo',         true,  20, false, true),
  (8,  'MONITORING_DEVICES',   'Dispositivos',                '/monitoring/devices',           'Monitoreo',         true,  30, false, true),
  (9,  'ALERTS_OVERVIEW',      'Alertas',                     '/alerts',                       'Alertas',           true,  10, false, true),
  (10, 'ALERT_DETAIL',         'Detalle de alerta',           '/alerts/:id',                   'Alertas',           false, 20, false, true),
  (11, 'MONITORING_DRILLDOWN', 'Drill-down',                  '/monitoring/drilldown/:siteId', 'Monitoreo',         false, 40, false, true),
  (12, 'ADMIN_SITES',          'Administrar sitios',          '/admin/sites',                  'Administración',    true,  10, false, true),
  (13, 'ADMIN_USERS',          'Administrar usuarios',        '/admin/users',                  'Administración',    true,  20, false, true),
  (14, 'ADMIN_METERS',         'Administrar medidores',       '/admin/meters',                 'Administración',    true,  30, false, true),
  (15, 'ADMIN_HIERARCHY',      'Administrar jerarquía',       '/admin/hierarchy/:siteId',      'Administración',    false, 40, false, true);

INSERT INTO role_permissions (role_id, module_id, action_id) VALUES
  (1, 3, 1), (2, 3, 1), (3, 3, 1), (4, 3, 1), (5, 3, 1), (6, 3, 1), (7, 3, 1),
  (1, 4, 1), (2, 4, 1), (3, 4, 1), (4, 4, 1), (5, 4, 1), (6, 4, 1), (7, 4, 1),
  (1, 5, 1), (2, 5, 1), (3, 5, 1), (4, 5, 1), (5, 5, 1), (6, 5, 1), (7, 5, 1),
  (1, 6, 1), (2, 6, 1), (3, 6, 1), (4, 6, 1), (5, 6, 1),
  (1, 7, 1), (2, 7, 1), (3, 7, 1), (4, 7, 1), (5, 7, 1),
  (1, 8, 1), (2, 8, 1), (3, 8, 1), (4, 8, 1), (5, 8, 1),
  (1, 9, 1), (2, 9, 1), (3, 9, 1), (4, 9, 1), (5, 9, 1), (7, 9, 1),
  (1, 9, 2), (2, 9, 2), (3, 9, 2),
  (1, 10, 1), (2, 10, 1), (3, 10, 1), (4, 10, 1), (5, 10, 1), (7, 10, 1),
  (1, 10, 2), (2, 10, 2), (3, 10, 2),
  (1, 11, 1), (2, 11, 1), (3, 11, 1), (4, 11, 1), (5, 11, 1),
  (1, 12, 1), (2, 12, 1), (3, 12, 1),
  (1, 13, 1), (2, 13, 1),
  (1, 13, 2),
  (1, 14, 1), (2, 14, 1), (3, 14, 1),
  (1, 15, 1), (2, 15, 1), (3, 15, 1);

COMMIT;
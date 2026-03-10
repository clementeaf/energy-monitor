-- ============================================================
-- POWER Digital® — Energy Monitor
-- Seed data: roles, modules, actions, role_permissions
-- Mirrors src/auth/permissions.ts
-- ============================================================

BEGIN;

-- ── Roles ────────────────────────────────────────────────────
INSERT INTO roles (id, name, label_es) VALUES
  (1, 'SUPER_ADMIN',  'Super Administrador'),
  (2, 'CORP_ADMIN',   'Administrador Corporativo'),
  (3, 'SITE_ADMIN',   'Administrador de Sitio'),
  (4, 'OPERATOR',     'Operador'),
  (5, 'ANALYST',      'Analista'),
  (6, 'TENANT_USER',  'Usuario Inquilino'),
  (7, 'AUDITOR',      'Auditor');

-- ── Views (persisted in modules table) ───────────────────────
INSERT INTO modules (id, code, label, route_path, navigation_group, show_in_nav, sort_order, is_public) VALUES
  (1,  'LOGIN',                'Iniciar sesión',              '/login',                           'Acceso y contexto', false, 10, true),
  (2,  'UNAUTHORIZED',         'Sin acceso',                  '/unauthorized',                    'Acceso y contexto', false, 20, true),
  (3,  'CONTEXT_SELECT',       'Seleccionar sitio',           '/context/select',                  'Acceso y contexto', false, 30, false),
  (4,  'BUILDINGS_OVERVIEW',   'Edificios',                   '/',                                'Dashboard',         true,  10, false),
  (5,  'BUILDING_DETAIL',      'Detalle de edificio',         '/buildings/:id',                   'Dashboard',         false, 20, false),
  (6,  'METER_DETAIL',         'Detalle de medidor',          '/meters/:meterId',                 'Monitoreo',         false, 10, false),
  (7,  'MONITORING_REALTIME',  'Monitoreo en tiempo real',    '/monitoring/realtime',             'Monitoreo',         true,  20, false),
  (8,  'MONITORING_DEVICES',   'Dispositivos',                '/monitoring/devices',              'Monitoreo',         true,  30, false),
  (9,  'ALERTS_OVERVIEW',      'Alertas',                     '/alerts',                          'Alertas',           true,  10, false),
  (10, 'ALERT_DETAIL',         'Detalle de alerta',           '/alerts/:id',                      'Alertas',           false, 20, false),
  (11, 'MONITORING_DRILLDOWN', 'Drill-down',                  '/monitoring/drilldown/:siteId',    'Monitoreo',         false, 40, false),
  (12, 'ADMIN_SITES',          'Administrar sitios',          '/admin/sites',                     'Administración',    true,  10, false),
  (13, 'ADMIN_USERS',          'Administrar usuarios',        '/admin/users',                     'Administración',    true,  20, false),
  (14, 'ADMIN_METERS',         'Administrar medidores',       '/admin/meters',                    'Administración',    true,  30, false),
  (15, 'ADMIN_HIERARCHY',      'Administrar jerarquía',       '/admin/hierarchy/:siteId',         'Administración',    false, 40, false);

-- ── Actions ──────────────────────────────────────────────────
INSERT INTO actions (id, code) VALUES
  (1, 'view'),
  (2, 'manage'),
  (3, 'export');

-- ── Role Permissions ─────────────────────────────────────────
-- Format: (role_id, module_id, action_id)

INSERT INTO role_permissions (role_id, module_id, action_id) VALUES
  -- CONTEXT_SELECT.view → all invited roles
  (1, 3, 1), (2, 3, 1), (3, 3, 1), (4, 3, 1), (5, 3, 1), (6, 3, 1), (7, 3, 1),

  -- BUILDINGS_OVERVIEW.view → all invited roles
  (1, 4, 1), (2, 4, 1), (3, 4, 1), (4, 4, 1), (5, 4, 1), (6, 4, 1), (7, 4, 1),

  -- BUILDING_DETAIL.view → all invited roles
  (1, 5, 1), (2, 5, 1), (3, 5, 1), (4, 5, 1), (5, 5, 1), (6, 5, 1), (7, 5, 1),

  -- METER_DETAIL.view → technical roles
  (1, 6, 1), (2, 6, 1), (3, 6, 1), (4, 6, 1), (5, 6, 1),

  -- MONITORING_REALTIME.view → technical roles
  (1, 7, 1), (2, 7, 1), (3, 7, 1), (4, 7, 1), (5, 7, 1),

  -- MONITORING_DEVICES.view → technical roles
  (1, 8, 1), (2, 8, 1), (3, 8, 1), (4, 8, 1), (5, 8, 1),

  -- ALERTS_OVERVIEW.view/manage
  (1, 9, 1), (2, 9, 1), (3, 9, 1), (4, 9, 1), (5, 9, 1), (7, 9, 1),
  (1, 9, 2), (2, 9, 2), (3, 9, 2),

  -- ALERT_DETAIL.view/manage
  (1, 10, 1), (2, 10, 1), (3, 10, 1), (4, 10, 1), (5, 10, 1), (7, 10, 1),
  (1, 10, 2), (2, 10, 2), (3, 10, 2),

  -- MONITORING_DRILLDOWN.view → technical roles
  (1, 11, 1), (2, 11, 1), (3, 11, 1), (4, 11, 1), (5, 11, 1),

  -- ADMIN_SITES.view → site administration roles
  (1, 12, 1), (2, 12, 1), (3, 12, 1),

  -- ADMIN_USERS.view/manage
  (1, 13, 1), (2, 13, 1),
  (1, 13, 2),

  -- ADMIN_METERS.view → site administration roles
  (1, 14, 1), (2, 14, 1), (3, 14, 1),

  -- ADMIN_HIERARCHY.view → site administration roles
  (1, 15, 1), (2, 15, 1), (3, 15, 1);

COMMIT;

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

-- ── Modules ──────────────────────────────────────────────────
INSERT INTO modules (id, code, label) VALUES
  (1,  'DASHBOARD_EXECUTIVE', 'Dashboard Ejecutivo'),
  (2,  'DASHBOARD_TECHNICAL', 'Dashboard Técnico'),
  (3,  'BUILDINGS',           'Edificios'),
  (4,  'LOCALS',              'Locales'),
  (5,  'METERS',              'Medidores'),
  (6,  'ALERTS',              'Alertas'),
  (7,  'BILLING',             'Facturación'),
  (8,  'REPORTS',             'Reportes'),
  (9,  'ADMIN_USERS',         'Administración de Usuarios'),
  (10, 'AUDIT',               'Auditoría');

-- ── Actions ──────────────────────────────────────────────────
INSERT INTO actions (id, code) VALUES
  (1, 'view'),
  (2, 'manage'),
  (3, 'export');

-- ── Role Permissions ─────────────────────────────────────────
-- Format: (role_id, module_id, action_id)

-- DASHBOARD_EXECUTIVE.view_portfolio → mapped to (module=1, action=1 view)
--   SUPER_ADMIN(1), CORP_ADMIN(2), ANALYST(5), AUDITOR(7)
INSERT INTO role_permissions (role_id, module_id, action_id) VALUES
  (1, 1, 1), (2, 1, 1), (5, 1, 1), (7, 1, 1),

-- DASHBOARD_TECHNICAL.view_realtime → (module=2, action=1)
--   SUPER_ADMIN(1), CORP_ADMIN(2), SITE_ADMIN(3), OPERATOR(4), ANALYST(5)
  (1, 2, 1), (2, 2, 1), (3, 2, 1), (4, 2, 1), (5, 2, 1),

-- BUILDINGS.view → (module=3, action=1)
--   ALL 7 roles
  (1, 3, 1), (2, 3, 1), (3, 3, 1), (4, 3, 1), (5, 3, 1), (6, 3, 1), (7, 3, 1),
-- BUILDINGS.manage → (module=3, action=2)
--   SUPER_ADMIN(1), CORP_ADMIN(2), SITE_ADMIN(3)
  (1, 3, 2), (2, 3, 2), (3, 3, 2),

-- LOCALS.view → (module=4, action=1)
  (1, 4, 1), (2, 4, 1), (3, 4, 1), (4, 4, 1), (5, 4, 1), (6, 4, 1), (7, 4, 1),
-- LOCALS.manage → (module=4, action=2)
  (1, 4, 2), (2, 4, 2), (3, 4, 2),

-- METERS.view → (module=5, action=1)
  (1, 5, 1), (2, 5, 1), (3, 5, 1), (4, 5, 1), (5, 5, 1),
-- METERS.manage → (module=5, action=2)
  (1, 5, 2), (2, 5, 2), (3, 5, 2),

-- ALERTS.view → (module=6, action=1)
  (1, 6, 1), (2, 6, 1), (3, 6, 1), (4, 6, 1), (5, 6, 1), (7, 6, 1),
-- ALERTS.manage → (module=6, action=2)
  (1, 6, 2), (2, 6, 2), (3, 6, 2),

-- BILLING.view → (module=7, action=1)
  (1, 7, 1), (2, 7, 1), (3, 7, 1), (5, 7, 1), (6, 7, 1), (7, 7, 1),
-- BILLING.manage → (module=7, action=2)
  (1, 7, 2), (2, 7, 2),

-- REPORTS.view → (module=8, action=1)
  (1, 8, 1), (2, 8, 1), (3, 8, 1), (5, 8, 1), (7, 8, 1),
-- REPORTS.export → (module=8, action=3)
  (1, 8, 3), (2, 8, 3), (5, 8, 3),

-- ADMIN_USERS.view → (module=9, action=1)
  (1, 9, 1), (2, 9, 1),
-- ADMIN_USERS.manage → (module=9, action=2)
  (1, 9, 2),

-- AUDIT.view → (module=10, action=1)
  (1, 10, 1), (7, 10, 1);

COMMIT;

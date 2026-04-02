-- ============================================================
-- Seed: Globe Power tenant + admin user + PASA roles
-- ============================================================

-- Tenant
INSERT INTO tenants (id, name, slug, primary_color, secondary_color, timezone)
VALUES (
    '84adf8d4-830d-46e1-bef5-e2eac6a19014',
    'Globe Power',
    'globe-power',
    '#3D3BF3',
    '#1E1E2F',
    'America/Santiago'
);

-- PASA roles (7 roles from platform spec)
INSERT INTO roles (id, tenant_id, name, slug, description, max_session_minutes, is_default) VALUES
    ('a0000001-0000-0000-0000-000000000001', '84adf8d4-830d-46e1-bef5-e2eac6a19014', 'Super Admin', 'super_admin', 'Administrador global de la plataforma. Acceso total a todos los tenants y configuraciones.', 30, false),
    ('a0000001-0000-0000-0000-000000000002', '84adf8d4-830d-46e1-bef5-e2eac6a19014', 'Admin Corporativo', 'corp_admin', 'Gerente o director corporativo. Ve todos los edificios, dashboards ejecutivos, benchmarking.', 15, false),
    ('a0000001-0000-0000-0000-000000000003', '84adf8d4-830d-46e1-bef5-e2eac6a19014', 'Admin de Edificio', 'site_admin', 'Administrador de edificio especifico. Gestiona usuarios, configura tarifas, aprueba facturas.', 15, false),
    ('a0000001-0000-0000-0000-000000000004', '84adf8d4-830d-46e1-bef5-e2eac6a19014', 'Operador Tecnico', 'operator', 'Tecnico de mantenimiento. Monitorea en tiempo real, gestiona alertas, dashboards tecnicos.', 30, false),
    ('a0000001-0000-0000-0000-000000000005', '84adf8d4-830d-46e1-bef5-e2eac6a19014', 'Analista', 'analyst', 'Consulta avanzada. Genera reportes, exporta datos, ve tendencias y benchmarking.', 30, false),
    ('a0000001-0000-0000-0000-000000000006', '84adf8d4-830d-46e1-bef5-e2eac6a19014', 'Locatario', 'tenant_user', 'Locatario (tienda). Ve su consumo, facturas y alertas propias.', 60, true),
    ('a0000001-0000-0000-0000-000000000007', '84adf8d4-830d-46e1-bef5-e2eac6a19014', 'Auditor', 'auditor', 'Solo lectura con acceso amplio para auditorias. Ve logs, reportes, configuraciones.', 15, false);

-- Admin user (linked to super_admin role)
INSERT INTO users (id, tenant_id, email, display_name, auth_provider, auth_provider_id, role_id, is_active)
VALUES (
    'd141ad74-9d5d-4a5c-81ea-2bfa7d97ce6f',
    '84adf8d4-830d-46e1-bef5-e2eac6a19014',
    'carriagadafalcone@gmail.com',
    'Clemente Falcone',
    'google',
    'google-seed',
    'a0000001-0000-0000-0000-000000000001',
    true
);

-- ============================================================
-- Assign permissions to PASA roles
-- Uses iteration over permissions table — no hardcoded IFs
-- ============================================================

-- SUPER_ADMIN: all permissions with CRUD
INSERT INTO role_permissions (role_id, permission_id, access_level)
SELECT 'a0000001-0000-0000-0000-000000000001', id, 'CRUD'
FROM permissions;

-- Helper: create a temp mapping table for bulk assignment
CREATE TEMP TABLE _role_perm_map (
    role_id UUID,
    module VARCHAR(100),
    action VARCHAR(50),
    access_level VARCHAR(10)
);

-- CORP_ADMIN permissions
INSERT INTO _role_perm_map VALUES
    ('a0000001-0000-0000-0000-000000000002', 'dashboard_executive', 'read', 'R'),
    ('a0000001-0000-0000-0000-000000000002', 'dashboard_technical', 'read', 'R'),
    ('a0000001-0000-0000-0000-000000000002', 'billing', 'read', 'R'),
    ('a0000001-0000-0000-0000-000000000002', 'billing', 'update', 'CRU'),
    ('a0000001-0000-0000-0000-000000000002', 'reports', 'read', 'CRU'),
    ('a0000001-0000-0000-0000-000000000002', 'reports', 'create', 'CRU'),
    ('a0000001-0000-0000-0000-000000000002', 'reports', 'update', 'CRU'),
    ('a0000001-0000-0000-0000-000000000002', 'alerts', 'read', 'R'),
    ('a0000001-0000-0000-0000-000000000002', 'admin_users', 'read', 'CRU'),
    ('a0000001-0000-0000-0000-000000000002', 'admin_users', 'create', 'CRU'),
    ('a0000001-0000-0000-0000-000000000002', 'admin_users', 'update', 'CRU'),
    ('a0000001-0000-0000-0000-000000000002', 'admin_buildings', 'read', 'R'),
    ('a0000001-0000-0000-0000-000000000002', 'diagnostics', 'read', 'R'),
    ('a0000001-0000-0000-0000-000000000002', 'audit', 'read', 'R'),
    ('a0000001-0000-0000-0000-000000000002', 'integrations', 'read', 'R'),
    ('a0000001-0000-0000-0000-000000000002', 'analytics', 'read', 'R');

-- SITE_ADMIN permissions
INSERT INTO _role_perm_map VALUES
    ('a0000001-0000-0000-0000-000000000003', 'dashboard_executive', 'read', 'R'),
    ('a0000001-0000-0000-0000-000000000003', 'dashboard_technical', 'read', 'R'),
    ('a0000001-0000-0000-0000-000000000003', 'billing', 'read', 'CRU'),
    ('a0000001-0000-0000-0000-000000000003', 'billing', 'create', 'CRU'),
    ('a0000001-0000-0000-0000-000000000003', 'billing', 'update', 'CRU'),
    ('a0000001-0000-0000-0000-000000000003', 'reports', 'read', 'CRU'),
    ('a0000001-0000-0000-0000-000000000003', 'reports', 'create', 'CRU'),
    ('a0000001-0000-0000-0000-000000000003', 'reports', 'update', 'CRU'),
    ('a0000001-0000-0000-0000-000000000003', 'alerts', 'read', 'CRU'),
    ('a0000001-0000-0000-0000-000000000003', 'alerts', 'create', 'CRU'),
    ('a0000001-0000-0000-0000-000000000003', 'alerts', 'update', 'CRU'),
    ('a0000001-0000-0000-0000-000000000003', 'admin_users', 'read', 'CRU'),
    ('a0000001-0000-0000-0000-000000000003', 'admin_users', 'create', 'CRU'),
    ('a0000001-0000-0000-0000-000000000003', 'admin_users', 'update', 'CRU'),
    ('a0000001-0000-0000-0000-000000000003', 'admin_buildings', 'read', 'R'),
    ('a0000001-0000-0000-0000-000000000003', 'admin_meters', 'read', 'CRU'),
    ('a0000001-0000-0000-0000-000000000003', 'admin_meters', 'create', 'CRU'),
    ('a0000001-0000-0000-0000-000000000003', 'admin_meters', 'update', 'CRU'),
    ('a0000001-0000-0000-0000-000000000003', 'admin_tenants_units', 'read', 'CRU'),
    ('a0000001-0000-0000-0000-000000000003', 'admin_tenants_units', 'create', 'CRU'),
    ('a0000001-0000-0000-0000-000000000003', 'admin_tenants_units', 'update', 'CRU'),
    ('a0000001-0000-0000-0000-000000000003', 'admin_hierarchy', 'read', 'CRU'),
    ('a0000001-0000-0000-0000-000000000003', 'admin_hierarchy', 'create', 'CRU'),
    ('a0000001-0000-0000-0000-000000000003', 'admin_hierarchy', 'update', 'CRU'),
    ('a0000001-0000-0000-0000-000000000003', 'admin_hierarchy', 'delete', 'CRU'),
    ('a0000001-0000-0000-0000-000000000003', 'diagnostics', 'read', 'R'),
    ('a0000001-0000-0000-0000-000000000003', 'audit', 'read', 'R');

-- OPERATOR permissions
INSERT INTO _role_perm_map VALUES
    ('a0000001-0000-0000-0000-000000000004', 'dashboard_technical', 'read', 'R'),
    ('a0000001-0000-0000-0000-000000000004', 'billing', 'read', 'R'),
    ('a0000001-0000-0000-0000-000000000004', 'alerts', 'read', 'R'),
    ('a0000001-0000-0000-0000-000000000004', 'alerts', 'update', 'CRU'),
    ('a0000001-0000-0000-0000-000000000004', 'alerts', 'receive', 'R'),
    ('a0000001-0000-0000-0000-000000000004', 'reports', 'read', 'R'),
    ('a0000001-0000-0000-0000-000000000004', 'admin_meters', 'read', 'R'),
    ('a0000001-0000-0000-0000-000000000004', 'diagnostics', 'read', 'R');

-- ANALYST permissions
INSERT INTO _role_perm_map VALUES
    ('a0000001-0000-0000-0000-000000000005', 'dashboard_executive', 'read', 'R'),
    ('a0000001-0000-0000-0000-000000000005', 'dashboard_technical', 'read', 'R'),
    ('a0000001-0000-0000-0000-000000000005', 'billing', 'read', 'R'),
    ('a0000001-0000-0000-0000-000000000005', 'reports', 'read', 'CRU'),
    ('a0000001-0000-0000-0000-000000000005', 'reports', 'create', 'CRU'),
    ('a0000001-0000-0000-0000-000000000005', 'reports', 'update', 'CRU'),
    ('a0000001-0000-0000-0000-000000000005', 'diagnostics', 'read', 'R'),
    ('a0000001-0000-0000-0000-000000000005', 'analytics', 'read', 'R');

-- TENANT_USER (locatario) permissions
INSERT INTO _role_perm_map VALUES
    ('a0000001-0000-0000-0000-000000000006', 'billing', 'view_own', 'R'),
    ('a0000001-0000-0000-0000-000000000006', 'reports', 'view_own', 'R'),
    ('a0000001-0000-0000-0000-000000000006', 'alerts', 'receive', 'R');

-- AUDITOR permissions
INSERT INTO _role_perm_map VALUES
    ('a0000001-0000-0000-0000-000000000007', 'dashboard_executive', 'read', 'R'),
    ('a0000001-0000-0000-0000-000000000007', 'dashboard_technical', 'read', 'R'),
    ('a0000001-0000-0000-0000-000000000007', 'billing', 'read', 'R'),
    ('a0000001-0000-0000-0000-000000000007', 'reports', 'read', 'R'),
    ('a0000001-0000-0000-0000-000000000007', 'alerts', 'read', 'R'),
    ('a0000001-0000-0000-0000-000000000007', 'diagnostics', 'read', 'R'),
    ('a0000001-0000-0000-0000-000000000007', 'audit', 'read', 'R'),
    ('a0000001-0000-0000-0000-000000000007', 'audit', 'export', 'R'),
    ('a0000001-0000-0000-0000-000000000007', 'integrations', 'read', 'R');

-- Bulk insert: join temp map against permissions catalog
INSERT INTO role_permissions (role_id, permission_id, access_level)
SELECT m.role_id, p.id, m.access_level
FROM _role_perm_map m
JOIN permissions p ON p.module = m.module AND p.action = m.action;

DROP TABLE _role_perm_map;

-- ============================================================
-- Seed: Buildings (PASA)
-- ============================================================
INSERT INTO buildings (id, tenant_id, name, code, address, area_sqm) VALUES
    ('b0000001-0000-0000-0000-000000000001', '84adf8d4-830d-46e1-bef5-e2eac6a19014', 'Mallplaza Gestión',  'MG',   'Av. Kennedy 9001, Las Condes', 120000),
    ('b0000001-0000-0000-0000-000000000002', '84adf8d4-830d-46e1-bef5-e2eac6a19014', 'Mall del Mar',       'MM',   'Av. Borgoño 12000, Viña del Mar', 68000),
    ('b0000001-0000-0000-0000-000000000003', '84adf8d4-830d-46e1-bef5-e2eac6a19014', 'Open Temuco',        'OT',   'Av. Alemania 0720, Temuco', 50000),
    ('b0000001-0000-0000-0000-000000000004', '84adf8d4-830d-46e1-bef5-e2eac6a19014', 'SC52',               'SC52', 'Santiago Centro', 5302),
    ('b0000001-0000-0000-0000-000000000005', '84adf8d4-830d-46e1-bef5-e2eac6a19014', 'SC53',               'SC53', 'Santiago Centro', 5650);

-- Super Admin gets access to all buildings
INSERT INTO user_building_access (user_id, building_id) VALUES
    ('d141ad74-9d5d-4a5c-81ea-2bfa7d97ce6f', 'b0000001-0000-0000-0000-000000000001'),
    ('d141ad74-9d5d-4a5c-81ea-2bfa7d97ce6f', 'b0000001-0000-0000-0000-000000000002'),
    ('d141ad74-9d5d-4a5c-81ea-2bfa7d97ce6f', 'b0000001-0000-0000-0000-000000000003'),
    ('d141ad74-9d5d-4a5c-81ea-2bfa7d97ce6f', 'b0000001-0000-0000-0000-000000000004'),
    ('d141ad74-9d5d-4a5c-81ea-2bfa7d97ce6f', 'b0000001-0000-0000-0000-000000000005');

-- ============================================================
-- Seed: Sample hierarchy for Mallplaza Gestión
-- ============================================================
INSERT INTO building_hierarchy (id, tenant_id, building_id, parent_id, name, level_type, sort_order) VALUES
    ('a1000001-0000-0000-0000-000000000001', '84adf8d4-830d-46e1-bef5-e2eac6a19014', 'b0000001-0000-0000-0000-000000000001', NULL, 'Piso 1', 'floor', 1),
    ('a1000001-0000-0000-0000-000000000002', '84adf8d4-830d-46e1-bef5-e2eac6a19014', 'b0000001-0000-0000-0000-000000000001', NULL, 'Piso 2', 'floor', 2),
    ('a1000001-0000-0000-0000-000000000003', '84adf8d4-830d-46e1-bef5-e2eac6a19014', 'b0000001-0000-0000-0000-000000000001', 'a1000001-0000-0000-0000-000000000001', 'Zona Norte', 'zone', 1),
    ('a1000001-0000-0000-0000-000000000004', '84adf8d4-830d-46e1-bef5-e2eac6a19014', 'b0000001-0000-0000-0000-000000000001', 'a1000001-0000-0000-0000-000000000001', 'Zona Sur', 'zone', 2),
    ('a1000001-0000-0000-0000-000000000005', '84adf8d4-830d-46e1-bef5-e2eac6a19014', 'b0000001-0000-0000-0000-000000000001', 'a1000001-0000-0000-0000-000000000003', 'Tablero TN-01', 'panel', 1);

-- Now that seed data exists, enforce NOT NULL on users.role_id
ALTER TABLE users ALTER COLUMN role_id SET NOT NULL;

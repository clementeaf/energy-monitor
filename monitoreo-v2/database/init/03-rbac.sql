-- ============================================================
-- RBAC flexible por tenant
-- Cada tenant define sus propios roles y permisos
-- ============================================================

-- Permissions catalog (global — modules + actions available in the platform)
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description TEXT,
    UNIQUE (module, action)
);

-- Roles (per tenant — each tenant defines their own roles)
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description TEXT,
    max_session_minutes INTEGER NOT NULL DEFAULT 30,
    is_default BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, slug)
);

CREATE INDEX idx_roles_tenant ON roles(tenant_id);

-- Role-Permission mapping (N:N)
CREATE TABLE role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    access_level VARCHAR(10) NOT NULL DEFAULT 'R' CHECK (access_level IN ('R', 'CRU', 'CRUD')),
    PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX idx_role_permissions_role ON role_permissions(role_id);

-- User-Building access scoping (N:N — which buildings a user can access)
CREATE TABLE user_building_access (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, building_id)
);

CREATE INDEX idx_user_building_access_user ON user_building_access(user_id);
CREATE INDEX idx_user_building_access_building ON user_building_access(building_id);

-- ============================================================
-- Migrate users: drop old role varchar, add role_id FK
-- role_id is nullable here — 04-seed.sql sets NOT NULL after seeding
-- ============================================================

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users DROP COLUMN IF EXISTS role;
ALTER TABLE users ADD COLUMN role_id UUID REFERENCES roles(id);

-- ============================================================
-- Seed: Platform permissions catalog
-- ============================================================

INSERT INTO permissions (module, action, description) VALUES
    -- Dashboard Ejecutivo
    ('dashboard_executive', 'read', 'Ver dashboard portafolio y por edificio'),
    ('dashboard_executive', 'create', 'Crear configuraciones de dashboard'),
    ('dashboard_executive', 'update', 'Modificar configuraciones de dashboard'),
    ('dashboard_executive', 'delete', 'Eliminar configuraciones de dashboard'),
    -- Dashboard Tecnico
    ('dashboard_technical', 'read', 'Ver monitoreo real-time, drill-down, dispositivos'),
    ('dashboard_technical', 'create', 'Crear configuraciones tecnicas'),
    ('dashboard_technical', 'update', 'Modificar configuraciones tecnicas'),
    ('dashboard_technical', 'delete', 'Eliminar configuraciones tecnicas'),
    -- Facturacion
    ('billing', 'read', 'Ver facturas y configuracion tarifaria'),
    ('billing', 'create', 'Generar facturas'),
    ('billing', 'update', 'Aprobar/modificar facturas y tarifas'),
    ('billing', 'delete', 'Anular facturas'),
    ('billing', 'view_own', 'Ver factura propia (locatario)'),
    -- Reportes
    ('reports', 'read', 'Ver reportes generados'),
    ('reports', 'create', 'Generar y exportar reportes'),
    ('reports', 'update', 'Programar reportes automaticos'),
    ('reports', 'view_own', 'Ver reporte de su local'),
    -- Alertas
    ('alerts', 'read', 'Ver alertas activas e historial'),
    ('alerts', 'create', 'Configurar reglas de alerta'),
    ('alerts', 'update', 'ACK/resolver/escalar alertas'),
    ('alerts', 'delete', 'Eliminar reglas de alerta'),
    ('alerts', 'receive', 'Recibir notificaciones de alertas'),
    -- Administracion — Usuarios
    ('admin_users', 'read', 'Ver listado de usuarios'),
    ('admin_users', 'create', 'Crear usuarios'),
    ('admin_users', 'update', 'Modificar usuarios'),
    ('admin_users', 'delete', 'Eliminar usuarios'),
    -- Administracion — Edificios
    ('admin_buildings', 'read', 'Ver edificios/sites'),
    ('admin_buildings', 'create', 'Crear edificios'),
    ('admin_buildings', 'update', 'Modificar edificios'),
    ('admin_buildings', 'delete', 'Eliminar edificios'),
    -- Administracion — Medidores
    ('admin_meters', 'read', 'Ver medidores y dispositivos'),
    ('admin_meters', 'create', 'Crear medidores'),
    ('admin_meters', 'update', 'Modificar medidores'),
    ('admin_meters', 'delete', 'Eliminar medidores'),
    -- Administracion — Locatarios
    ('admin_tenants_units', 'read', 'Ver locatarios'),
    ('admin_tenants_units', 'create', 'Crear locatarios'),
    ('admin_tenants_units', 'update', 'Modificar locatarios'),
    ('admin_tenants_units', 'delete', 'Eliminar locatarios'),
    -- Administracion — Tenant config
    ('admin_tenant_config', 'read', 'Ver configuracion del tenant'),
    ('admin_tenant_config', 'update', 'Modificar configuracion del tenant'),
    -- Administracion — Jerarquia
    ('admin_hierarchy', 'read', 'Ver arbol electrico'),
    ('admin_hierarchy', 'create', 'Crear nodos de jerarquia'),
    ('admin_hierarchy', 'update', 'Modificar arbol electrico'),
    ('admin_hierarchy', 'delete', 'Eliminar nodos de jerarquia'),
    -- Diagnostico infraestructura
    ('diagnostics', 'read', 'Ver mapa bus Modbus, historial fallos, concentradores'),
    -- Auditoria
    ('audit', 'read', 'Ver logs de auditoria'),
    ('audit', 'export', 'Exportar logs de auditoria'),
    -- Integraciones
    ('integrations', 'read', 'Ver estado de integraciones'),
    ('integrations', 'create', 'Configurar APIs/Datalake'),
    ('integrations', 'update', 'Modificar integraciones'),
    -- Analitica avanzada
    ('analytics', 'read', 'Ver benchmarking, tendencias, patrones');

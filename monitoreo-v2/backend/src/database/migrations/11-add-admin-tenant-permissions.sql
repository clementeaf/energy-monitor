-- Add admin_tenants and admin_tenant_config permissions
-- + assign all permissions to super_admin role for each tenant
-- Idempotent (safe to re-run)

INSERT INTO permissions (module, action, description) VALUES
    ('admin_tenants', 'read', 'Ver empresas/tenants'),
    ('admin_tenants', 'create', 'Crear empresa (onboarding)'),
    ('admin_tenants', 'update', 'Editar empresa'),
    ('admin_tenants', 'delete', 'Desactivar empresa'),
    ('admin_tenant_config', 'read', 'Ver configuración del tenant'),
    ('admin_tenant_config', 'update', 'Editar configuración del tenant'),
    ('admin_tenants_units', 'read', 'Ver locatarios'),
    ('admin_tenants_units', 'create', 'Crear locatario'),
    ('admin_tenants_units', 'update', 'Editar locatario'),
    ('admin_tenants_units', 'delete', 'Eliminar locatario'),
    ('admin_hierarchy', 'read', 'Ver jerarquía'),
    ('admin_hierarchy', 'create', 'Crear nodo jerarquía'),
    ('admin_hierarchy', 'update', 'Editar nodo jerarquía'),
    ('admin_hierarchy', 'delete', 'Eliminar nodo jerarquía')
ON CONFLICT (module, action) DO NOTHING;

-- Assign ALL permissions to every super_admin role (across all tenants)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.slug = 'super_admin'
ON CONFLICT DO NOTHING;

-- Add permissions referenced by role-modules.ts but missing from initial seed
-- Uses ON CONFLICT to be idempotent (safe to re-run)

INSERT INTO permissions (module, action, description) VALUES
    ('readings', 'read', 'Ver lecturas tiempo real, demanda, calidad eléctrica'),
    ('admin_roles', 'read', 'Ver roles y permisos'),
    ('admin_roles', 'create', 'Crear roles'),
    ('admin_roles', 'update', 'Modificar roles y asignar permisos'),
    ('api_keys', 'read', 'Ver API keys'),
    ('api_keys', 'create', 'Crear API keys'),
    ('api_keys', 'update', 'Revocar/modificar API keys'),
    ('monitoring_faults', 'read', 'Ver historial de fallas y eventos')
ON CONFLICT (module, action) DO NOTHING;

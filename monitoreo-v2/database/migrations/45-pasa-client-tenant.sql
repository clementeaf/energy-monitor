-- PASA as selectable client tenant; Globe Power remains platform owner only.
-- Idempotent for local/prod DBs that only had globe-power with PASA buildings under it.

INSERT INTO tenants (id, name, slug, primary_color, secondary_color, sidebar_color, accent_color, timezone, app_title, is_active)
VALUES (
    'b0000002-0000-0000-0000-000000000001',
    'PASA',
    'pasa',
    '#1E40AF',
    '#1E1E2F',
    '#1E1E2F',
    '#10B981',
    'America/Santiago',
    'PASA Energy Monitor',
    true
)
ON CONFLICT (slug) DO NOTHING;

UPDATE buildings
SET tenant_id = 'b0000002-0000-0000-0000-000000000001'
WHERE tenant_id = '84adf8d4-830d-46e1-bef5-e2eac6a19014';

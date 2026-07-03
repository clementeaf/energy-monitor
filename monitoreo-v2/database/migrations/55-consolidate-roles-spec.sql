-- Migration 55: Consolidate roles to match Roles EMS spec (5 profiles)
-- Renames role names + merges analyst→corp_admin, tenant_user→site_admin

BEGIN;

-- 1. Rename role names to spec terminology
UPDATE roles SET name = 'Súper-administrador' WHERE slug = 'super_admin';
UPDATE roles SET name = 'Gerencial'           WHERE slug = 'corp_admin';
UPDATE roles SET name = 'Operacional'         WHERE slug = 'site_admin';
UPDATE roles SET name = 'Técnico'             WHERE slug = 'operator';
UPDATE roles SET name = 'Auditor'             WHERE slug = 'auditor';

-- 2. Migrate users from analyst → corp_admin (same profile: Gerencial)
UPDATE users
SET role_id = (SELECT id FROM roles WHERE slug = 'corp_admin' AND tenant_id = users.tenant_id LIMIT 1)
WHERE role_id IN (SELECT id FROM roles WHERE slug = 'analyst');

-- 3. Migrate users from tenant_user → site_admin (same profile: Operacional)
UPDATE users
SET role_id = (SELECT id FROM roles WHERE slug = 'site_admin' AND tenant_id = users.tenant_id LIMIT 1)
WHERE role_id IN (SELECT id FROM roles WHERE slug = 'tenant_user');

-- 4. Delete orphaned roles (no more users reference them)
DELETE FROM role_permissions WHERE role_id IN (SELECT id FROM roles WHERE slug IN ('analyst', 'tenant_user'));
DELETE FROM roles WHERE slug IN ('analyst', 'tenant_user');

COMMIT;

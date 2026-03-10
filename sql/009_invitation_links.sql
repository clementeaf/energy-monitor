BEGIN;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS invitation_token_hash VARCHAR(64),
  ADD COLUMN IF NOT EXISTS invitation_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS invitation_sent_at TIMESTAMPTZ;

INSERT INTO modules (id, code, label, route_path, navigation_group, show_in_nav, sort_order, is_public, is_active)
VALUES (16, 'INVITATION_ACCEPT', 'Aceptar invitación', '/invite/:token', 'Acceso y contexto', false, 25, true, true)
ON CONFLICT (id) DO UPDATE SET
  code = EXCLUDED.code,
  label = EXCLUDED.label,
  route_path = EXCLUDED.route_path,
  navigation_group = EXCLUDED.navigation_group,
  show_in_nav = EXCLUDED.show_in_nav,
  sort_order = EXCLUDED.sort_order,
  is_public = EXCLUDED.is_public,
  is_active = EXCLUDED.is_active;

COMMIT;
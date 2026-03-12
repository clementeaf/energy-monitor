-- Usuario de prueba y sesión con token conocido para consumo API (sin OAuth).
-- Token en claro: test-token-energy-monitor
-- Uso: Authorization: Bearer test-token-energy-monitor
-- Aplicar después de 011_sessions.sql

BEGIN;

-- Usuario de prueba (SUPER_ADMIN); external_id/provider sentinela por si la columna es NOT NULL
INSERT INTO users (id, email, name, role_id, is_active, external_id, provider)
VALUES (
  'a0000000-0000-4000-8000-000000000001',
  'test@energy-monitor.local',
  'Usuario Prueba',
  1,
  true,
  'session-test',
  'session'
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  role_id = EXCLUDED.role_id,
  is_active = EXCLUDED.is_active,
  external_id = EXCLUDED.external_id,
  provider = EXCLUDED.provider;

-- Sesión con token conocido (SHA256 de 'test-token-energy-monitor')
-- Requiere extensión pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO sessions (user_id, token_hash, expires_at)
VALUES (
  'a0000000-0000-4000-8000-000000000001',
  encode(digest('test-token-energy-monitor', 'sha256'), 'hex'),
  now() + interval '1 year'
)
ON CONFLICT (token_hash) DO UPDATE SET
  expires_at = now() + interval '1 year';

COMMIT;

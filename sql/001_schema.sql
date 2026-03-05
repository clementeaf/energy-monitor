-- ============================================================
-- POWER Digital® — Energy Monitor
-- Database schema: roles, permissions, users
-- ============================================================

BEGIN;

-- 1. Roles (numeric IDs for fast, secure mapping)
CREATE TABLE roles (
  id         SMALLINT    PRIMARY KEY,
  name       VARCHAR(30) NOT NULL UNIQUE,
  label_es   VARCHAR(50) NOT NULL,
  is_active  BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Modules (permission scopes from the spec)
CREATE TABLE modules (
  id    SMALLINT    PRIMARY KEY,
  code  VARCHAR(40) NOT NULL UNIQUE,
  label VARCHAR(60) NOT NULL
);

-- 3. Actions (granular operations)
CREATE TABLE actions (
  id   SMALLINT    PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE
);

-- 4. Role ↔ Module ↔ Action (many-to-many)
CREATE TABLE role_permissions (
  role_id   SMALLINT NOT NULL REFERENCES roles(id),
  module_id SMALLINT NOT NULL REFERENCES modules(id),
  action_id SMALLINT NOT NULL REFERENCES actions(id),
  PRIMARY KEY (role_id, module_id, action_id)
);

-- 5. Users (linked to OAuth providers)
CREATE TABLE users (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id VARCHAR(255) NOT NULL,
  provider    VARCHAR(20)  NOT NULL,
  email       VARCHAR(255) NOT NULL,
  name        VARCHAR(255) NOT NULL,
  avatar_url  TEXT,
  role_id     SMALLINT     NOT NULL REFERENCES roles(id) DEFAULT 4,
  is_active   BOOLEAN      NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE(provider, external_id)
);

CREATE INDEX idx_users_email ON users(email);

-- 6. User ↔ Site access (which buildings a user can see)
CREATE TABLE user_sites (
  user_id UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  site_id VARCHAR(50) NOT NULL,
  PRIMARY KEY (user_id, site_id)
);

COMMIT;

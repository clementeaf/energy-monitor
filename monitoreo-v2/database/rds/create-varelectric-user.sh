#!/usr/bin/env bash
set -euo pipefail

: "${PGHOST:?PGHOST required}" "${PGUSER:?PGUSER required}" "${PGPASSWORD:?PGPASSWORD required}" "${PGDATABASE:?PGDATABASE required}"
TENANT_SLUG="${1:?usage: create-varelectric-user.sh <tenant slug, e.g. globe-power>}"

tenant_id="$(psql -X -tA -v slug="$TENANT_SLUG" <<'SQL'
SELECT id FROM tenants WHERE slug = :'slug';
SQL
)"
if [ -z "$tenant_id" ]; then
  echo "Tenant with slug $TENANT_SLUG not found in $PGDATABASE on $PGHOST" >&2
  exit 1
fi

password="$(openssl rand -base64 36 | tr '+/' '-_' | tr -d '=')"

psql -X -q -v ON_ERROR_STOP=1 -v password="$password" -v tenant_id="$tenant_id" -v database="$PGDATABASE" <<'SQL'
SELECT format('CREATE ROLE varelectric LOGIN PASSWORD %L', :'password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'varelectric') \gexec
ALTER ROLE varelectric WITH LOGIN PASSWORD :'password';
ALTER ROLE varelectric SET search_path = varelectric;
ALTER ROLE varelectric SET timezone = 'America/Santiago';
GRANT CONNECT ON DATABASE :"database" TO varelectric;
GRANT USAGE ON SCHEMA varelectric TO varelectric;
GRANT INSERT ON varelectric.var_electric TO varelectric;
INSERT INTO varelectric.ingest_tenant (tenant_id) VALUES (:'tenant_id')
ON CONFLICT (is_singleton) DO UPDATE SET tenant_id = EXCLUDED.tenant_id;
SQL

echo "Varelectric connection (password shown once, store it in a secret manager):"
echo "host=$PGHOST port=${PGPORT:-5432} dbname=$PGDATABASE user=varelectric sslmode=require"
echo "password=$password"

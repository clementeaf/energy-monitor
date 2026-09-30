#!/usr/bin/env bash
set -euo pipefail

: "${PGHOST:?PGHOST required}" "${PGUSER:?PGUSER required}" "${PGPASSWORD:?PGPASSWORD required}" "${PGDATABASE:?PGDATABASE required}"
BUILDING_CODE="${1:?usage: create-varelectric-key.sh <building code, e.g. VE-ALTOPENA>}"

building_row="$(psql -X -tA -F ' ' -v code="$BUILDING_CODE" <<'SQL'
SELECT id, tenant_id FROM buildings WHERE code = :'code';
SQL
)"
if [ -z "$building_row" ]; then
  echo "Building with code $BUILDING_CODE not found in $PGDATABASE on $PGHOST" >&2
  exit 1
fi
read -r building_id tenant_id <<<"$building_row"

api_key="emk_$(openssl rand -base64 36 | tr '+/' '-_' | tr -d '=')"
key_hash="$(printf '%s' "$api_key" | shasum -a 256 | cut -d' ' -f1)"

psql -X -q -v ON_ERROR_STOP=1 \
  -v tenant_id="$tenant_id" -v building_id="$building_id" -v name="Varelectric $BUILDING_CODE" \
  -v key_hash="$key_hash" -v key_prefix="${api_key:0:8}" <<'SQL'
INSERT INTO api_keys (tenant_id, name, key_hash, key_prefix, permissions, building_ids, rate_limit_per_minute, ingress_rate_limit_per_minute)
VALUES (:'tenant_id', :'name', :'key_hash', :'key_prefix', ARRAY['varelectric:create'], ARRAY[:'building_id']::uuid[], 120, 600);
SQL

echo "API key for $BUILDING_CODE (shown once, store it in a secret manager):"
echo "$api_key"

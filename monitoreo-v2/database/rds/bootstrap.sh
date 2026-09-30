#!/usr/bin/env bash
set -euo pipefail

: "${PGHOST:?PGHOST required}" "${PGUSER:?PGUSER required}" "${PGPASSWORD:?PGPASSWORD required}" "${PGDATABASE:?PGDATABASE required}"

DATABASE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SKIPPED_MIGRATIONS='^(58-create-monitoreo-v3-db|59-check-v3|check-.*)\.sql$'

rewrite_timescale_ddl() {
  perl -0pe '
    s/^CREATE EXTENSION IF NOT EXISTS timescaledb;\s*$//mg;
    s/ALTER\s+(TABLE|MATERIALIZED VIEW)\s+\w+\s+SET\s*\(\s*timescaledb\.[^;]*;//g;
    s/CREATE MATERIALIZED VIEW\s+(?:IF NOT EXISTS\s+)?(\w+)\s+WITH\s*\(\s*timescaledb\.continuous[^)]*\)\s+AS(.*?)\s*WITH NO DATA;/CREATE OR REPLACE VIEW $1 AS$2;/gs;
  ' "$1"
}

apply_sql() {
  echo "==> $(basename "$1")"
  rewrite_timescale_ddl "$1" | psql -v ON_ERROR_STOP=1 -q -X -o /dev/null -f -
}

ordered_sql_files() {
  ls "$DATABASE_DIR"/init/*.sql | sort | grep -v seed
  ls "$DATABASE_DIR"/init/*seed*.sql | sort
  ls "$DATABASE_DIR"/migrations/*.sql | sort -V | while read -r file; do
    [[ "$(basename "$file")" =~ $SKIPPED_MIGRATIONS ]] || echo "$file"
  done
  find "$DATABASE_DIR/rds" -name "[1-9]*.sql" | sort -V
}

if [ "$(psql -X -tA -c "SELECT to_regclass('public.tenants') IS NOT NULL")" = "t" ]; then
  echo "Database $PGDATABASE on $PGHOST already has a schema; bootstrap only runs on an empty database" >&2
  exit 1
fi

apply_sql "$DATABASE_DIR/rds/00-timescale-compat.sql"
ordered_sql_files | while read -r file; do apply_sql "$file"; done
echo "==> bootstrap complete"

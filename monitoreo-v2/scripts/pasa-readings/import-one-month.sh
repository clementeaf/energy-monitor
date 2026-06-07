#!/usr/bin/env bash
# Import one month from each PASA CSV in CSV_DIR into monitoreo_v2.
#
# Prereqs:
#   docker compose up -d timescaledb   # monitoreo-v2/
#   Download CSVs from Drive → CSV_DIR:
#     https://drive.google.com/drive/folders/1VwbEPmoB1fXvhJTDMaP_6m3bBMYLi0-V
#
# Usage:
#   CSV_DIR=~/Downloads/pasa ./import-one-month.sh
#   CSV_DIR=../../../docs ./import-one-month.sh   # uses repo sample CSVs (MG + MM)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

export DB_HOST="${DB_HOST:-127.0.0.1}"
export DB_PORT="${DB_PORT:-5434}"
export DB_NAME="${DB_NAME:-monitoreo_v2}"
export DB_USERNAME="${DB_USERNAME:-postgres}"
export DB_PASSWORD="${DB_PASSWORD:-monitoreo2026}"
export FROM_DATE="${FROM_DATE:-2026-01-01T00:00:00.000Z}"
export TO_DATE="${TO_DATE:-2026-01-31T23:59:59.999Z}"
export CSV_ENCODING="${CSV_ENCODING:-latin1}"
export BATCH_SIZE="${BATCH_SIZE:-2000}"

CSV_DIR="${CSV_DIR:-../../../docs}"

FILES=(
  "latin1|MALL_GRANDE_446_completo.csv"
  "latin1|MALL_MEDIANO_254_completo.csv"
  "utf8|OUTLET_70_anual.csv"
  "utf8|SC52_StripCenter_anual.csv"
  "utf8|SC53_StripCenter_anual.csv"
)

if [[ ! -d "$CSV_DIR" ]]; then
  echo "CSV_DIR not found: $CSV_DIR" >&2
  echo "Download CSVs from Drive and set CSV_DIR" >&2
  exit 1
fi

if [[ ! -d node_modules ]]; then
  npm ci --silent
fi

for entry in "${FILES[@]}"; do
  encoding="${entry%%|*}"
  file="${entry#*|}"
  path="$CSV_DIR/$file"
  if [[ ! -f "$path" ]]; then
    echo "[skip] missing $path"
    continue
  fi
  echo "=== $file (encoding=$encoding) ==="
  CSV_ENCODING="$encoding" node import-pasa-csv.mjs --file "$path" --no-refresh
done

echo "=== Refreshing aggregates + portfolio_summary ==="
node -e "
import { connectDb } from './lib/db.mjs';
import { refreshAggregates, printSummary } from './lib/refresh-aggregates.mjs';
import { PASA_TENANT_ID, DEFAULT_FROM_DATE, DEFAULT_TO_DATE } from './lib/constants.mjs';
const fromDate = process.env.FROM_DATE ?? DEFAULT_FROM_DATE;
const toDate = process.env.TO_DATE ?? DEFAULT_TO_DATE;
const client = await connectDb();
try {
  await refreshAggregates(client, fromDate, toDate);
  await printSummary(client, PASA_TENANT_ID);
} finally {
  await client.end();
}
"

echo "=== All available CSVs processed ==="

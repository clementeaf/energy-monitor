#!/usr/bin/env bash
# Ingesta 2 meses de CSV desde S3 a staging y luego catalog + promote a readings.
# Uso: FROM_DATE=... TO_DATE=... [S3_KEY=raw/archivo.csv] ./ingest-two-months.sh
# Requiere: AWS credenciales (S3 + Secrets Manager), acceso a RDS (túnel o DB_HOST/DB_PORT).

set -e

export AWS_REGION=${AWS_REGION:-us-east-1}
export S3_BUCKET=${S3_BUCKET:-energy-monitor-ingest-058310292956}
export FROM_DATE=${FROM_DATE:-2026-01-01T00:00:00.000Z}
export TO_DATE=${TO_DATE:-2026-02-28T23:59:59.999Z}
export BATCH_SIZE=${BATCH_SIZE:-2000}
export TRUNCATE_BEFORE_LOAD=${TRUNCATE_BEFORE_LOAD:-false}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ -n "$S3_KEY" ]; then
  echo "[ingest-two-months] Un archivo: $S3_KEY ($FROM_DATE -> $TO_DATE)"
  node index.mjs
else
  echo "[ingest-two-months] Todos los CSV en raw/ ($FROM_DATE -> $TO_DATE)"
  for key in raw/MALL_GRANDE_446_completo.csv raw/MALL_MEDIANO_254_completo.csv raw/OUTLET_70_anual.csv raw/SC52_StripCenter_anual.csv raw/SC53_StripCenter_anual.csv; do
    export S3_KEY="$key"
    echo "[ingest-two-months] $S3_KEY"
    node index.mjs
  done
fi

echo "[ingest-two-months] Promoviendo staging -> readings (catalog + promote)..."
PHASE=all node promote.mjs

echo "[ingest-two-months] Listo."

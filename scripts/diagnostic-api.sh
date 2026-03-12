#!/usr/bin/env bash
#
# Llama a db-verify e ingest/diagnostic y muestra el resultado.
# Por defecto usa el usuario de prueba: Bearer test-token-energy-monitor (tras apply-auth-migrations).
# Uso: ./scripts/diagnostic-api.sh
#      ACCESS_TOKEN=<jwt-o-otro> [BASE_URL=<url>] ./scripts/diagnostic-api.sh
#
set -e
BASE_URL="${BASE_URL:-https://energymonitor.click}"
TOKEN="${ACCESS_TOKEN:-test-token-energy-monitor}"

echo "=== GET $BASE_URL/api/db-verify ==="
curl -sS -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/db-verify"
echo ""
echo "=== GET $BASE_URL/api/ingest/diagnostic ==="
curl -sS -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/ingest/diagnostic"
echo ""

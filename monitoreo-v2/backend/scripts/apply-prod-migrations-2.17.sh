#!/usr/bin/env bash
# Apply monitoreo-v2 2.17.0 migration chain on prod RDS via ECS Exec.
# Prereq: AWS CLI + session-manager-plugin, account 058310292956.
#
# Usage:
#   cd monitoreo-v2/backend
#   ./scripts/apply-prod-migrations-2.17.sh
#   ./scripts/apply-prod-migrations-2.17.sh 22-retention-5y   # single migration

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$BACKEND_DIR"

apply_one() {
  echo ">>> Applying $1"
  node scripts/apply-migration-ecs.mjs "$1"
}

if [[ $# -gt 0 ]]; then
  for migration in "$@"; do
    apply_one "$migration"
  done
  exit 0
fi

# Core 2.17 chain (idempotent). Timescale 22/23 optional — run separately if extension ready.
CHAIN=(
  43-meter-import
  44-tenant-contact-fields
  45-pasa-client-tenant
  46-portfolio-summary-refresh
)

for migration in "${CHAIN[@]}"; do
  apply_one "$migration"
done

echo "=== Done. Verify: GET /api/health schemaVersion or schema_migrations ==="

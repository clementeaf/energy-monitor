#!/usr/bin/env bash
# Apply migrations 47–49 on prod RDS via ECS Exec.
# Prereq: AWS CLI + session-manager-plugin, account 058310292956.
#
# Usage:
#   cd monitoreo-v2/backend
#   ./scripts/apply-prod-migrations-2.21.sh
#   ./scripts/apply-prod-migrations-2.21.sh 49-session-idle-timeout   # single migration

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

# 47: portfolio_summary with sum_energy_kwh
# 48: building_summary matview
# 49: last_activity_at on refresh_tokens (CRITICAL — fixes mfa/validate 401)
CHAIN=(
  47-portfolio-summary-energy
  48-building-summary
  49-session-idle-timeout
)

for migration in "${CHAIN[@]}"; do
  apply_one "$migration"
done

echo "=== Done. Verify: GET /api/health schemaVersion or schema_migrations ==="
echo "=== CRITICAL: 49 fixes mfa/validate 401 (last_activity_at column) ==="

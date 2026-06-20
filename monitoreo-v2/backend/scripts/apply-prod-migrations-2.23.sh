#!/usr/bin/env bash
# Apply migrations 50–53 on prod RDS via ECS Exec.
# Prereq: AWS CLI + session-manager-plugin, account 058310292956.
#
# Usage:
#   cd monitoreo-v2/backend
#   ./scripts/apply-prod-migrations-2.23.sh
#   ./scripts/apply-prod-migrations-2.23.sh 53-mapvx-mall-metadata   # single migration

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

# 50: building coordinates (lat/lng on buildings table)
# 51: mapvx_malls, mapvx_floors, mapvx_stores, mapvx_geometries tables
# 52: mapvx_tiles table (PBF blobs)
# 53: has_indoor, address, size_text, image_url on mapvx_malls
CHAIN=(
  50-building-coordinates
  51-mapvx-cache
  52-mapvx-tiles
  53-mapvx-mall-metadata
)

for migration in "${CHAIN[@]}"; do
  apply_one "$migration"
done

echo "=== Done. Migrations 50–53 applied. ==="
echo "=== Next: seed mapvx data, then deploy backend + frontend ==="

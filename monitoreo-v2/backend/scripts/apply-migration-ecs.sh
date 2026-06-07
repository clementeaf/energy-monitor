#!/usr/bin/env bash
# Wrapper for apply-migration-ecs.mjs (prod RDS via ECS Exec).
exec node "$(dirname "$0")/apply-migration-ecs.mjs" "$@"

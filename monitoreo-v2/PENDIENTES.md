# Pendientes — Monitoreo V2

> Actualizado: 2026-04-15. Excluye tareas de deploy AWS (ECS Fargate, DNS, SES sandbox, billing cuenta).

---

## Desarrollo

### ~~1. Conectores reales — Integrations~~ COMPLETADO
- Strategy pattern: 4 conectores (rest_api, webhook, mqtt, ftp) + ConnectorRegistry
- Config validation por tipo, retry con exponential backoff
- triggerSync real con logging y status lifecycle
- 114 tests nuevos (8 suites)

### ~~2. API externa para terceros~~ COMPLETADO
- API keys: entity + SHA-256 hash + CRUD admin + rotación + expiración
- ApiKeyGuard global: X-API-Key header → JwtPayload-compatible
- ExternalApiController: 9 endpoints read-only bajo /api/v1/ (buildings, meters, readings, alerts)
- Swagger/OpenAPI en /api/v1/docs
- 44 tests nuevos (4 suites)

### ~~3. Multi-tenancy escalable~~ COMPLETADO
- Tenant entity extendido: appTitle, sidebarColor, accentColor, settings (jsonb)
- CRUD admin: GET/POST/PATCH/DELETE /tenants (super_admin)
- Onboarding transaccional: POST /tenants → crea tenant + clona 7 roles + permisos + primer admin
- Backend getTheme() retorna 7 campos (primary, secondary, sidebar, accent, appTitle, logo, favicon)
- Frontend: applyTenantTheme() centralizado — CSS vars, document.title, favicon dinámico
- Sidebar muestra logoUrl + appTitle del tenant
- Migration 08-tenant-theme-extend.sql
- 17 tests nuevos (25 total en tenants)

### ~~4. TimescaleDB — features avanzados~~ COMPLETADO
- Migration 09-timescaledb-optimize.sql:
  - `readings`: compression (7d, segmentby tenant_id/meter_id), retention (3y), continuous aggregates (readings_hourly, readings_daily)
  - `audit_logs`: compression (30d), retention (5y — ISO 27001)
  - `integration_sync_logs`: compression (7d), retention (1y)
- ReadingsService refactored: findAggregated queries continuous aggregates (hourly→readings_hourly, daily→readings_daily, monthly→re-bucket daily)
- Weighted average re-aggregation for monthly (SUM(avg * count) / SUM(count))
- Raw time_bucket fallback preserved in findFromRawBucket
- 28 readings tests (rewritten for aggregate paths)

### ~~5. Tests frontend~~ COMPLETADO
- Infra: @testing-library/react + jest-dom + user-event + jsdom, vitest setup con globals
- 10 suites, 73 tests (antes 3 suites / 20 tests) — +7 suites, +53 tests
- **Nuevos tests:**
  - `tenant-theme.test.ts` — CSS vars, document.title, favicon dinámico (5 tests)
  - `useAuthStore.test.ts` — setSession/clearSession/setLoading/setError (7 tests)
  - `useAppStore.test.ts` — sidebar toggle, building selection (5 tests)
  - `Button.test.tsx` — variants, sizes, loading, disabled, onClick (14 tests)
  - `Toggle.test.tsx` — aria-checked, onChange, disabled, label (9 tests)
  - `Card.test.tsx` — variants, title/subtitle/action slots, onClick, noPadding (9 tests)
  - `usePermissions.test.ts` — has/hasAny, isAdmin por role, roleSlug (11 tests)
- E2E pendiente para fase posterior (requiere Playwright + server running)

### ~~6. ISO 27001 — hardening pendiente~~ COMPLETADO
- **Config encryption:** AES-256-GCM para secrets en integration config (token, password, apiKey, secret). Encrypt on save, decrypt on sync. Env var `CONFIG_ENCRYPTION_KEY`.
- **Env validation:** `validateEnv()` en bootstrap — JWT_SECRET, COOKIE_SECRET, FRONTEND_URL, DB_HOST, DB_PASSWORD requeridos en produccion (exit 1 si faltan)
- **API key rate limiting:** In-memory per-key rate counter en ApiKeyGuard. 429 Too Many Requests cuando excede `rateLimitPerMinute`.
- **Tenant guard validation:** PermissionsGuard verifica que tenantId en params/query/body coincida con JWT tenantId (previene cross-tenant access). Skip para super_admin.
- **PII redaction:** `maskEmail()` y `maskProviderId()` en auth.service.ts logs. "user@example.com" → "u***@example.com"
- **Security headers:** Helmet explícito — HSTS (1 year + includeSubDomains), Referrer-Policy (strict-origin-when-cross-origin), CSP delegado a frontend
- 22 tests nuevos (3 suites: config-encryption, pii-redaction, env-validation + guard actualizado)

---

## Data / Ops

### 7. Backfill MG + dbVerify `is_three_phase`
- Verificar que backfill de edificio MG esta completo
- Re-ejecutar dbVerify para calcular `is_three_phase` en medidores

### 8. Redeploy Lambda `iot-ingest`
- VARIABLE_MAP del POC3000 Siemens tiene 10 variables corregidas localmente
- Pendiente redeploy para que Lambda use el mapa actualizado

### 9. Logo Siemens
- Reemplazar SVG placeholder con logo oficial de Siemens

---

## Bloqueado (pendiente cliente)

### 10. Costo por Centro
- Requiere definicion con cliente de como calcular y presentar costos por centro de costo
- Sin spec no se puede avanzar

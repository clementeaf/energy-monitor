# Roadmap frontend — gaps vs backend reciente (monitoreo-v2)

**Baseline backend:** Olas 0–12 completadas (`ROADMAP-TECNICO-GAPS.md`)  
**Baseline frontend:** ~54 páginas en `monitoreo-v2/frontend/src/features/`  
**Principio:** reutilizar patrones existentes (API layer 3-file, `Drawer`, `DataTable`, admin CRUD como `ApiKeysPage` / `IntegrationsPage`).

---

## Lo que el frontend ya cubre (no reimplementar)

| Área | Páginas / rutas | API layer |
|------|-----------------|-----------|
| Auth OAuth MS/Google + MFA | `LoginPage`, `useAuth` | `authEndpoints` |
| Admin usuarios, roles, empresas | `/admin/users`, `/admin/roles`, `/admin/companies` | hooks CRUD |
| API Keys externas | `/admin/api-keys` | `useApiKeysQuery` |
| Integraciones conectores | `/integrations` (+ subrutas en router, misma página) | `useIntegrationsQuery` |
| Ley 21.719 | `/profile`, `/admin/deletion-requests`, `/admin/rectification-requests` | endpoints ARCO |
| Tenant branding | `/admin/settings` (colores, logo, MFA) | `useTenantSettingsQuery` |
| Monitoreo, billing, alertas, dashboards | Rutas bajo `/monitoring`, `/billing`, `/alerts`, `/dashboard` | hooks existentes |
| Reportes | `/reports` | `reportsEndpoints` |

**Patrón admin de referencia:** `ApiKeysPage` (tabla + modal crear + secret once + rotate + permisos checkbox).

---

## Matriz gap: backend implementado → frontend pendiente

Leyenda prioridad: **P0** bloquea PASA/UAT · **P1** operación tenant · **P2** nice-to-have

### Bloque A — Auth enterprise (Ola 10)

| ID | Gap | Backend listo | Frontend hoy | Entrega | P |
|----|-----|---------------|--------------|---------|---|
| FE-180 | Login SSO por tenant | `GET /auth/sso/:slug/config`, `/start`, `/callback` | Solo botones MS/Google | Detectar tenant (slug en URL `/login/:tenantSlug` o selector empresa) → si `ssoRequired`, botón "Iniciar con SSO" → redirect; manejar query `?mfaRequired=&mfaSetupRequired=` post-callback | **P0** |
| FE-181 | Admin config SSO | `GET/PUT /admin/tenant-sso/:tenantId` | No existe | Sección en `/admin/settings` o página `/admin/sso` (super_admin + permiso `sso:update`): issuer, client_id, metadata_url, secret (once), scim webhook secret | **P0** |
| FE-182 | Tenant settings SSO flags | `tenants.settings.ssoProvider`, `maxSessionMinutes`, `blockConcurrentSessions`, `ssoDefaultRoleSlug` | `TenantSettingsPage` solo branding | Panel "Seguridad" en settings: dropdown SSO off/azure_ad/oidc, idle timeout, toggle sesiones concurrentes, rol JIT default | **P1** |
| FE-183 | Permisos RBAC nuevos | `sso:read`, `sso:update` en DB | `role-modules.ts` sin módulo SSO | Añadir grupo permisos en `RolesPage` + `usePermissions` si aplica | **P1** |

**Archivos tocados:** `LoginPage.tsx`, `hooks/auth/useAuth.ts`, `TenantSettingsPage.tsx`, `types/tenant.ts`, `services/routes.ts`, `services/endpoints.ts`, `app/routes.ts`, `Sidebar.tsx`, `role-modules.ts`.

---

### Bloque B — OAuth2 ETL (Ola 11)

| ID | Gap | Backend listo | Frontend hoy | Entrega | P |
|----|-----|---------------|--------------|---------|---|
| FE-190 | CRUD OAuth clients | `GET/POST/PATCH/DELETE /oauth-clients`, rotate | No existe | `OAuthClientsPage` en `/admin/oauth-clients` — clonar `ApiKeysPage`: scopes multi-select (`readings:export`, etc.), secret once, TTL | **P1** |
| FE-191 | Scopes en API Keys | Backend exige `readings:export` en export | `AVAILABLE_PERMISSIONS` sin `readings:export` | Añadir permiso + tooltip "requerido para export ETL" | **P0** |
| FE-192 | Permisos RBAC | `oauth_clients:*` en DB | No en `role-modules.ts` | Módulo OAuth Clients en grid de roles | **P1** |
| FE-193 | Doc in-app ETL | `POST /oauth/token` (público) | No | Panel "Cómo conectar" en OAuthClientsPage con curl ejemplo + link `docs/api-error-catalog.md` | **P2** |

**Nota:** el flujo token es server-to-server; no hace falta UI de token, solo gestión de clientes.

---

### Bloque C — Webhooks salientes (Ola 8)

| ID | Gap | Backend listo | Frontend hoy | Entrega | P |
|----|-----|---------------|--------------|---------|---|
| FE-150 | CRUD suscripciones | `/webhook-subscriptions` CRUD | No existe | `WebhooksPage` `/admin/webhooks` o tab en Integraciones: event_type, URL, secret (once al crear), toggle active | **P1** |
| FE-151 | Logs de entrega | `webhook_delivery_logs` (backend vía dispatcher) | No | Tab "Entregas" con filtros status/fecha (si expone endpoint list logs; si no, FE-151b backend GET logs primero) | **P2** |
| FE-152 | Permisos | `webhooks:read/create/update/delete` | No en roles UI | `role-modules.ts` | **P1** |

**Integración UX:** ampliar `IntegrationsPage` con tabs **Conectores | Webhooks salientes | Salud** evita proliferar entradas sidebar.

---

### Bloque D — Salud integraciones (Ola 8, INT-13)

| ID | Gap | Backend listo | Frontend hoy | Entrega | P |
|----|-----|---------------|--------------|---------|---|
| FE-155 | Dashboard salud | `GET /v1/integrations/health` | Rutas `/integrations/status` existen pero misma página sin health | Tab Salud: KPIs sync latency, webhooks failed 24h, lista conectores degraded | **P1** |

---

### Bloque E — Gobernanza de datos (Ola 9)

| ID | Gap | Backend listo | Frontend hoy | Entrega | P |
|----|-----|---------------|--------------|---------|---|
| FE-164 | Reporte calidad | `GET /admin/data-quality/report?from&to&tenantId` | No | `DataQualityPage` `/admin/data-quality`: rango fechas, tabla building/día, % measured/invalid, summary cards | **P1** |
| FE-161 | Anomalías balance | cron → `balance_anomalies` | No | Tab o página: tabla discrepancias padre/hijos (requiere GET admin si no existe — **FE-161b** endpoint list) | **P2** |
| FE-165 | Contratos export | `DataContractGuard` + tabla `data_contracts` | No UI | Solo admin informativo: versión activa `readings-export@1.0.0` + copy header `X-Data-Contract-Version` en doc ETL | **P2** |
| FE-168 | SLO breaches | `data_slo_breaches` | No | Badge/warning en dashboard o tab calidad (requiere GET list) | **P2** |
| FE-169 | Permisos | `data_quality:read` | No en roles UI | `role-modules.ts` | **P1** |

---

### Bloque F — Protocolos y mappings (Ola 7)

| ID | Gap | Backend listo | Frontend hoy | Entrega | P |
|----|-----|---------------|--------------|---------|---|
| FE-120 | Register mappings CRUD | `/register-mappings` + CSV export | No | `RegisterMappingsPage` `/admin/register-mappings`: filtro protocolo, tabla, drawer edit, botón export CSV | **P1** |
| FE-121 | Protocol types | `GET /register-mappings/protocol-types` | No | Dropdown modbus/mqtt/bacnet/snmp en formulario mapping | **P1** |
| FE-125 | Integraciones BACnet/SNMP | Conectores stub en backend | `IntegrationsPage` tipos limitados | Añadir tipos `bacnet`, `snmp` en form create + badge "stub/dev" | **P2** |
| FE-122 | Permisos | `register_mappings:*` | No en roles UI | `role-modules.ts` | **P1** |

---

### Bloque G — Ingest, gaps y backfill (Olas 4–5)

| ID | Gap | Backend listo | Frontend hoy | Entrega | P |
|----|-----|---------------|--------------|---------|---|
| FE-070 | Ingest gaps | `ingest_gaps`, detector cron | No | Tab en monitoreo o admin: gaps abiertos por building/meter | **P2** |
| FE-071 | Backfill jobs | `/admin/backfill-jobs` | No | Sección en Integraciones o admin: listar jobs, form enqueue rango fechas | **P2** |
| FE-076 | Stale meters | `meter_reading_status`, vistas stale | `RealtimePage` parcial | Columna/badge "stale" + filtro; KPI stale count en dashboard | **P1** |
| FE-102 | Export jobs async | External API `POST /exports` (ETL) | No UI interna | Opcional: página `/admin/exports` para ops (list jobs) — solo si operadores internos lo piden | **P3** |

---

### Bloque H — Modelo geo y metadata (Ola 1)

| ID | Gap | Backend listo | Frontend hoy | Entrega | P |
|----|-----|---------------|--------------|---------|---|
| FE-020 | Building geo fields | `region_id`, `country_code`, `timezone`, `external_site_id`, `site_kind` | `BuildingForm` solo name/code/address | Extender form + tipos `building.ts` + columnas tabla | **P1** |
| FE-021 | Tenant defaults | `default_country_code`, `default_currency`, `settings.retentionYears`, `staleThresholdHours` | Settings solo branding | Panel "Operación" en tenant settings | **P1** |
| FE-025 | Tenant units external | `external_unit_id` | `TenantUnitForm` sin campo | Campo external ID | **P2** |
| FE-027 | Meter load_category | `load_category`, `parent_meter_id` | `MeterForm` sin campos | Dropdown categoría + selector medidor padre (jerarquía balance) | **P1** |
| FE-013 | Regions CRUD | tabla `regions` backend | No | Mínimo: dropdown regiones en building form; ideal: CRUD `/admin/regions` | **P2** |

---

### Bloque I — Calidad de lecturas en UI (Ola 2)

| ID | Gap | Backend listo | Frontend hoy | Entrega | P |
|----|-----|---------------|--------------|---------|---|
| FE-041 | Reading quality enum | `readings.quality`, `source`, `ingested_at` | Tipos/hooks sin campos | Extender `types/reading.ts`, mostrar badge en `MeterReadingsPage` y tooltips en charts | **P1** |
| FE-047 | Timestamps local/UTC | API devuelve `timestampLocal` | Charts solo UTC implícito | Mostrar timezone edificio en detalle lectura | **P2** |

---

### Bloque J — Ajustes menores en lo existente

| ID | Gap | Acción | P |
|----|-----|--------|---|
| FE-001 | `IntegrationsPage` subrutas | `/integrations/status`, `/config`, `/sync-log` no cambian vista — implementar tabs con React Router o unificar rutas | P2 |
| FE-002 | `BreachReports` | Backend `admin/breach-reports` — sin UI (CYB-16 timer 72h) | P2 |
| FE-003 | Sidebar admin | Añadir entradas: OAuth Clients, Webhooks, Data Quality, Register Mappings (con permisos) | P1 |
| FE-004 | Tests | Vitest por página nueva + integration login SSO mock | P1 |

---

## Olas sugeridas (frontend)

Orden por dependencias y valor PASA.

### Ola FE-1 — Auth & ETL credenciales (3–4 días)

| Task | IDs | Done cuando |
|------|-----|-------------|
| SSO login flow | FE-180 | PASA tenant con Azure AD redirige y entra |
| SSO admin + settings flags | FE-181, FE-182, FE-183 | super_admin configura SSO sin SQL |
| API Keys + `readings:export` | FE-191 | Key con export funciona en UAT ETL |
| OAuth Clients page | FE-190, FE-192 | CRUD parity con API Keys |

### Ola FE-2 — Integraciones & webhooks (2–3 días)

| Task | IDs | Done cuando |
|------|-----|-------------|
| Integrations tabs refactor | FE-001, FE-155 | Salud visible con datos reales |
| Webhooks CRUD | FE-150, FE-152 | Suscripción `alert.created` creada desde UI |
| Register mappings | FE-120, FE-121, FE-122 | Export CSV desde botón |

### Ola FE-3 — Datos & monitoreo operativo (3–4 días)

| Task | IDs | Done cuando |
|------|-----|-------------|
| Data quality report | FE-164, FE-169 | Admin ve % measured por edificio |
| Stale meters UX | FE-076 | Realtime filtra stale |
| Reading quality badges | FE-041 | Detalle medidor muestra quality/source |
| Geo/metadata forms | FE-020, FE-021, FE-027 | Building/meter PASA con external IDs |

### Ola FE-4 — Profundización (backlog)

FE-070, FE-071, FE-161, FE-165, FE-168, FE-151, FE-013, FE-047, FE-002, FE-125

---

## Checklist por archivo (convención monitoreo-v2)

Cada feature nueva sigue:

```
types/<entity>.ts
services/routes.ts          → API_ROUTES.*
services/endpoints.ts       → *Endpoints
hooks/queries/use<Entity>.ts
features/admin/<entity>/<Entity>Page.tsx
app/routes.ts + lazyPages.ts + router.tsx
Sidebar.tsx (si aplica)
role-modules.ts (permisos nuevos)
```

---

## Dependencias backend opcionales (desbloquear FE)

| Frontend necesita | Backend hoy | Acción si falta |
|-------------------|-------------|-----------------|
| FE-151 delivery logs | ¿GET webhook delivery logs? | Añadir endpoint paginado |
| FE-161 balance anomalies | ¿GET admin balance? | Añadir controller list |
| FE-168 SLO breaches | ¿GET admin slo breaches? | Añadir controller list |

Verificar con `grep Controller` antes de FE-4; Olas FE-1–3 no requieren backend nuevo.

---

## Resumen ejecutivo

| Pregunta | Respuesta |
|----------|-----------|
| ¿El roadmap GAP backend implica solo frontend? | **No** — queda deploy/migraciones; pero **toda UI admin/SSO de olas 7–11 sí es frontend** |
| ¿Cuánto es net-new UI? | **~8–10 pantallas/secciones** + extensiones forms |
| ¿Qué reutilizar? | `ApiKeysPage`, `IntegrationsPage`, `TenantSettingsPage`, `DeletionRequestsPage` |
| ¿P0 frontend inmediato? | **SSO login (FE-180)**, **SSO admin (FE-181)**, **`readings:export` en API Keys (FE-191)** |

---

## Próximo paso

Ejecutar **Ola FE-1** en un sprint corto; en paralelo aplicar migraciones 39–40 en staging y validar SSO con `MOCK_OIDC=true` antes de Azure AD real.

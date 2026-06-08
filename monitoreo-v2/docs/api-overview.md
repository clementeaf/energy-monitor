# API Overview

Base URL: `/api` (dev: `http://localhost:4000/api`, prod: behind API Gateway/ALB).

Swagger docs: `/api/docs` (development only).

## Auth

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | /auth/login | Public | OAuth login (Microsoft/Google) |
| POST | /auth/refresh | Public | Refresh token rotation |
| POST | /auth/logout | JWT | Logout (revoke tokens) |
| GET | /auth/me | JWT | Current user + permissions |
| POST | /auth/mfa/setup | JWT | Generate MFA QR + secret |
| POST | /auth/mfa/verify | JWT | Enable MFA with TOTP code |
| POST | /auth/mfa/validate | Public (5/min) | Validate MFA during login |
| DELETE | /auth/mfa | JWT | Disable MFA |

## Buildings & Meters

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | /buildings | auto (tenant-scoped) | List buildings |
| POST | /buildings | admin_buildings:create | Create building |
| PATCH | /buildings/:id | admin_buildings:update | Update building |
| DELETE | /buildings/:id | admin_buildings:delete | Delete building |
| GET | /meters | auto (building-scoped) | List meters |
| POST | /meters | admin_meters:create | Create meter |
| PATCH | /meters/:id | admin_meters:update | Update meter |
| DELETE | /meters/:id | admin_meters:delete | Delete meter |

## Readings

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | /readings | readings:read | Time-series with downsampling |
| GET | /readings/latest | readings:read | Latest reading per meter |
| GET | /readings/aggregated | readings:read | Hourly/daily/monthly aggregates |

## Alerts

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | /alerts | alerts:read | List with filters (status, severity, building) |
| GET | /alerts/:id | alerts:read | Alert detail |
| PATCH | /alerts/:id/acknowledge | alerts:update | Acknowledge alert |
| PATCH | /alerts/:id/resolve | alerts:update | Resolve alert |
| GET POST PATCH DELETE | /alert-rules/* | alerts:create/update/delete | CRUD alert rules |
| POST | /alert-engine/evaluate | alerts:update | Trigger evaluation |
| GET | /notification-logs | alerts:read | Notification history |

## Billing

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | /invoices | billing:read | List invoices |
| GET | /invoices/my | billing:view_own | Own invoices (tenant unit) |
| GET | /invoices/:id | billing:read | Invoice detail |
| POST | /invoices/generate | billing:create | Generate invoice |
| PATCH | /invoices/:id/approve | billing:update | Approve invoice |
| PATCH | /invoices/:id/cancel | billing:update | Cancel invoice |
| DELETE | /invoices/:id | billing:delete | Delete invoice |
| GET | /invoices/:id/pdf | billing:read | Download PDF |
| GET POST PATCH DELETE | /tariffs/* | billing:read/create/update/delete | CRUD tariffs + blocks |

## Reports

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | /reports | reports:read | List reports |
| POST | /reports/generate | reports:create | Generate report |
| GET POST PATCH DELETE | /reports/scheduled/* | reports:update | Scheduled reports |

## Admin

| Method | Path | Permission | Description |
|---|---|---|---|
| GET POST PATCH DELETE | /users/* | admin_users:* | User CRUD + building assign |
| GET POST PATCH DELETE | /tenant-units/* | admin_tenants_units:* | Tenant unit CRUD |
| GET POST PATCH DELETE | /hierarchy/* | admin_hierarchy:* | Hierarchy CRUD |
| GET | /audit-logs | audit:read | Audit log with filters |
| GET POST PATCH DELETE | /roles/* | admin_roles:* | Role CRUD + permission assign |
| GET | /roles/permissions-catalog | admin_roles:read | All available permissions |
| GET POST PATCH | /api-keys/* | api_keys:* | API key CRUD |
| GET PATCH | /tenants/settings | admin_tenant_config:* | Tenant config + theme |
| POST | /tenants | admin_tenants:create | Onboard new tenant |

## Integrations

| Method | Path | Permission | Description |
|---|---|---|---|
| GET POST PATCH | /integrations/* | integrations:* | CRUD connectors |
| POST | /integrations/:id/sync | integrations:update | Trigger sync |
| GET | /integrations/:id/logs | integrations:read | Sync logs |

## External API (v1)

Auth: `X-API-Key: emk_...` header (or OAuth2 `client_credentials` → Bearer token). Rate-limited per key/client. Building scope optional on key (`buildingIds` empty = all tenant buildings).

Admin: **Administración → API Keys** (`GET /api/api-keys/scopes/catalog` lists valid permission scopes).

| Scope | Endpoints |
|---|---|
| `buildings:read` | GET `/api/v1/buildings`, `/api/v1/buildings/:id` |
| `meters:read` | GET `/api/v1/meters`, `/api/v1/meters/:id`, `/api/v1/meters/:id/status` |
| `readings:read` | GET `/api/v1/readings`, `/readings/latest`, `/readings/aggregated`, `/readings/latest-anchor`, `/readings/compare-buildings`, `/api/v1/iot-readings*` |
| `readings:export` | GET `/api/v1/readings/export`, POST/GET `/api/v1/exports*` |
| `readings:create` | POST `/api/v1/measurements` (ingress; optional higher `ingressRateLimitPerMinute` on key) |
| `alerts:read` | GET `/api/v1/alerts`, `/api/v1/alerts/:id` |
| `billing:read` | GET `/api/v1/invoices*`, `/api/v1/tariffs*` |
| `tenant_units:read` | GET `/api/v1/tenant-units*` |
| `hierarchy:read` | GET `/api/v1/hierarchy/buildings/:buildingId` |
| `concentrators:read` | GET `/api/v1/concentrators*` |
| `fault_events:read` | GET `/api/v1/fault-events*` |
| `integrations:read` | GET `/api/v1/integrations/health` |

OAuth2 machine-to-machine: `POST /api/oauth/token` with `grant_type=client_credentials`, `client_id`, `client_secret`. Same scopes as API keys.

Example:

```bash
curl -H "X-API-Key: emk_your_key" \
  "https://power-monitor.cloud/api/v1/readings/compare-buildings?days=7"
```

## IoT Readings

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | /iot-readings/buildings | readings:read | Buildings with IoT data |
| GET | /iot-readings/meters-latest | readings:read | Latest by meter |
| GET | /iot-readings/monthly | readings:read | Monthly aggregation |
| GET | /iot-readings/meter-readings | readings:read | Meter time-series |
| GET | /iot-readings/alerts | alerts:read | On-the-fly anomaly alerts |

## Common Patterns

- **Pagination**: `?page=1&limit=20` → `{ data, total, page, limit }`
- **Filtering**: query params per endpoint (buildingId, status, dateRange, etc.)
- **Errors**: `{ statusCode, message, error }` — never leaks internals
- **Dates**: ISO 8601 UTC everywhere

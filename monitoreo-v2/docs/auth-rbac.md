# Auth & RBAC

## Authentication Flow

```
Browser → OAuth Provider (Microsoft/Google) → ID Token
       → POST /api/auth/login { provider, idToken }
       → Backend verifies against JWKS endpoint
       → Finds/creates user by authProviderId
       → Issues JWT access_token + refresh_token in httpOnly cookies
       → Frontend: SessionGate calls GET /api/auth/me → loads user + permissions
```

### Tokens

| Token | Storage | Lifetime | Notes |
|---|---|---|---|
| `access_token` | httpOnly cookie | 15 min | `__Host-` prefix in prod |
| `refresh_token` | httpOnly cookie | 7 days | Rotated on each refresh |
| `has_session` | localStorage | — | Flag only (no secrets), prevents redundant /me calls |

### Refresh Token Rotation

```
Client → POST /api/auth/refresh { refreshToken (from cookie) }
       → Backend: SELECT FOR UPDATE (locks row)
       → If valid & not revoked → issue new pair, revoke old (reason: 'rotated')
       → If already revoked → THEFT DETECTED → revoke ALL user sessions
```

### MFA (TOTP)

Optional per user. Flow:

1. `POST /api/auth/mfa/setup` → QR code + secret (authenticated)
2. `POST /api/auth/mfa/verify` → enable with 6-digit code (authenticated)
3. On next login: backend returns `{ mfaRequired: true, userId }`
4. `POST /api/auth/mfa/validate` → 6-digit code → issues tokens (rate-limited: 5/min)
5. `DELETE /api/auth/mfa` → disable MFA (authenticated)

## RBAC

### Structure

```
Tenant → Roles → Permissions (N:N via role_permissions)
       → Users → Role (1:1) + Building Access (N:N via user_building_access)
```

### Permission Format

```
module:action
```

Examples: `billing:read`, `admin_users:create`, `alerts:update`

### Modules (17)

| Module | Actions | Description |
|---|---|---|
| `dashboard_executive` | read | Executive dashboards, analytics |
| `dashboard_technical` | read | Technical monitoring views |
| `billing` | read, view_own, create, update, delete | Invoices, tariffs |
| `reports` | read, view_own, create, update | Reports, scheduling |
| `alerts` | read, create, update, delete, receive | Alerts, rules, escalation |
| `readings` | read | Time-series data |
| `diagnostics` | read | Device status |
| `monitoring_faults` | read | Fault history |
| `integrations` | read, create, update | External connectors |
| `admin_buildings` | read, create, update, delete | Building management |
| `admin_meters` | read, create, update, delete | Meter management |
| `admin_users` | read, create, update, delete | User management |
| `admin_tenants_units` | read, create, update, delete | Tenant units |
| `admin_hierarchy` | read, create, update, delete | Hierarchy |
| `admin_roles` | read, create, update | Role management |
| `admin_tenant_config` | read, update | Tenant settings |
| `api_keys` | read, create, update | API key management |
| `audit` | read, export | Audit logs |

### Guards

**Backend**: `@RequirePermission('module', 'action')` on every controller method. Global `PermissionsGuard` enforces.

**Frontend**: `<RequirePerms any={['module:action']}>` wraps every route in `router.tsx`. Sidebar hides items without permission via `hasAny()`.

### Building Scoping

Users see only data from buildings assigned via `user_building_access`. Every query includes `buildingIds` filter from JWT payload. Exception: `super_admin` sees all.

### Tenant Isolation

Every query includes `tenant_id` from JWT. `PermissionsGuard` validates that `tenant_id` in request params/body matches JWT. Prevents cross-tenant data access.

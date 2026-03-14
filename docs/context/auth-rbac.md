# Auth & RBAC

## Auth Flow
```
Login → Microsoft (MSAL redirect) | Google (credential/One Tap)
  → JWT id_token → sessionStorage['access_token']
  → Axios interceptor inyecta Bearer → GET /api/auth/me
  → Backend: AuthGuard → detectProvider(iss) → jose.jwtVerify(jwks RS256)
  → RolesGuard global lee @RequirePermissions(module, action) → 403 si falta permiso
  → resolveUser(): enlaza identidad OAuth contra usuario invitado/preprovisionado por email
  → Frontend: Zustand useAuthStore.setUser() + useAppStore (contexto sitio)
  → ProtectedRoute checks roles y fuerza selección de sitio
  → 401 Axios interceptor → limpia auth store + sessionStorage
```

## RBAC
- 7 roles: `SUPER_ADMIN`, `CORP_ADMIN`, `SITE_ADMIN`, `OPERATOR`, `ANALYST`, `TENANT_USER`, `AUDITOR`
- 16 vistas implementadas, 3 acciones (view, manage, export)
- `módulo = vista`: permisos = acceso a vistas y acciones dentro de esas vistas
- `modules` persiste catálogo de vistas/rutas con metadata de navegación

## Mapeo RBAC backend
- `BUILDINGS_OVERVIEW.view` → `GET /buildings`
- `BUILDING_DETAIL.view` → `/buildings/:id*`
- `MONITORING_DEVICES.view` → `GET /meters/overview`
- `METER_DETAIL.view` → `/meters/:id*`
- `MONITORING_DRILLDOWN.view` → `/hierarchy*`
- `ALERTS_OVERVIEW.view/manage` → `/alerts`, `sync-offline`
- `ALERT_DETAIL.view/manage` → `/alerts/:id*`
- `BILLING_OVERVIEW.view` → `/billing/*`

## Vistas implementadas en DB
`LOGIN`, `INVITATION_ACCEPT`, `UNAUTHORIZED`, `CONTEXT_SELECT`, `BUILDINGS_OVERVIEW`, `BUILDING_DETAIL`, `METER_DETAIL`, `MONITORING_REALTIME`, `MONITORING_DEVICES`, `ALERTS_OVERVIEW`, `ALERT_DETAIL`, `MONITORING_DRILLDOWN`, `ADMIN_SITES`, `ADMIN_USERS`, `ADMIN_METERS`, `ADMIN_HIERARCHY`

## Scoping
- buildings, meters, hierarchy, alerts y sync-offline restringen por `siteIds` asignados
- Roles globales mantienen acceso total
- Frontend `selectedSiteId` → Axios header `X-Site-Context` → RolesGuard estrecha scope server-side

## Onboarding
- Login no autocrea usuarios; requiere registro previo en `users` con rol preasignado
- `/admin/users` permite provisionar invitaciones con rol y sitios, link firmado de activación
- Token Microsoft puede no traer `email`; backend usa `preferred_username`/`upn` como fallback
- Migraciones 006, 008, 009 ya aplicadas en producción

## Token Microsoft
Si con Microsoft ves datos vacíos y con Google no: ver `docs/auth-microsoft-data-scope.md` (email/UPN distinto, usuario sin siteIds).

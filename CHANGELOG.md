# Changelog

## [0.5.0-alpha.4] - 2026-03-05

### Security (Critical Fixes)

- **JWT audience validation**: `jwtVerify` ahora valida `audience` para ambos providers (Google y Microsoft). Si falta el client ID en env, el token es rechazado
- **OAuth env vars**: `GOOGLE_CLIENT_ID` y `MICROSOFT_CLIENT_ID` agregados a `serverless.yml` (vía `${env:...}`, no hardcoded)
- **Endpoint `/api/roles` eliminado**: `RolesController` borrado — el endpoint público ya no existe, permisos solo accesibles vía `/api/auth/*` autenticado
- **Auto-provisioning desactivado**: nuevos usuarios se crean con `isActive: false` — requieren activación manual por admin

### Changed

- `backend/src/auth/auth.service.ts`: audience validation per-provider, fail-closed si falta client ID
- `backend/src/roles/roles.module.ts`: removido `RolesController` del módulo
- `backend/src/roles/roles.controller.ts`: archivo eliminado
- `backend/src/users/users.service.ts`: `isActive: false` en `upsert()` para usuarios nuevos

---

## [0.5.0-alpha.3] - 2026-03-05

### Added

- **CloudFront `/api/*` behavior**: requests a `energymonitor.click/api/*` se rutean a API Gateway (origin `626lq125eh.execute-api.us-east-1.amazonaws.com`)
  - Cache policy: `CachingDisabled` (no cache para API)
  - Origin request policy: `AllViewerExceptHostHeader` (forward headers, query strings, cookies)
  - Viewer protocol: HTTPS-only
  - Allowed methods: GET, HEAD, OPTIONS, PUT, PATCH, POST, DELETE

### Verified

| Test | URL | Resultado |
|---|---|---|
| Roles desde RDS | `https://energymonitor.click/api/roles` | 7 roles OK |
| Auth sin token | `https://energymonitor.click/api/auth/me` | 401 Unauthorized |
| Frontend SPA | `https://energymonitor.click` | Sin cambios, sigue sirviendo desde S3 |

---

## [0.5.0-alpha.2] - 2026-03-05

### Added

- **RDS PostgreSQL 16** provisionado en AWS (`db.t3.micro`, 20GB gp3, encrypted, single-AZ, subnets privadas)
  - Instancia: `energy-monitor-db`
  - Security Group: `energy-monitor-rds-sg` (TCP 5432 desde VPC)
  - DB subnet group con 3 subnets privadas (us-east-1a/c/d)
- **SQL migrations ejecutadas** via Lambda temporal en VPC: 6 tablas creadas, 7 roles + 10 módulos + 3 acciones + 67 permisos insertados
- **Backend desplegado** con Serverless Framework V3 a AWS Lambda + HTTP API Gateway
  - Endpoint: `https://626lq125eh.execute-api.us-east-1.amazonaws.com`
  - `GET /api/auth/me` → 401 sin token (correcto)
  - `GET /api/roles` → 7 roles desde RDS (verificado)

### Changed

- `backend/serverless.yml`: credenciales RDS, VPC config (SG + 3 subnets privadas), `NODE_ENV: production`
- `backend/src/app.module.ts`: SSL `rejectUnauthorized: false` para compatibilidad con RDS CA
- Downgrade a `serverless@3` (V4 requiere licencia)

### Infrastructure

| Recurso | Valor |
|---|---|
| RDS Instance | `energy-monitor-db` (PostgreSQL 16, db.t3.micro) |
| RDS Endpoint | `energy-monitor-db.ci1q4okokkkd.us-east-1.rds.amazonaws.com` |
| Security Group | `sg-0adda6a999e8d5d9a` |
| API Gateway | `626lq125eh.execute-api.us-east-1.amazonaws.com` |
| Lambda | `power-digital-api-dev-api` (256MB, Node 20, VPC) |

---

## [0.5.0-alpha.1] - 2026-03-05

### Added

- **Monorepo structure**: proyecto separado en `frontend/` y `backend/`
- **NestJS backend** (`backend/`): API REST con NestJS + TypeORM + PostgreSQL
  - `AuthModule`: endpoints `GET /api/auth/me` y `GET /api/auth/permissions` (decode JWT, upsert user, return permissions)
  - `RolesModule`: entities `Role`, `Module_`, `Action`, `RolePermission` con service para consultar permisos por role_id
  - `UsersModule`: entities `User`, `UserSite` con upsert y lookup por OAuth provider
  - `serverless.ts`: handler Lambda via `@vendia/serverless-express`
  - `serverless.yml`: deploy a AWS Lambda + HTTP API Gateway con `serverless-offline` para dev local
- **SQL migrations** (`sql/`): `001_schema.sql` (6 tablas) y `002_seed.sql` (7 roles con IDs numéricos, 10 módulos, 3 acciones, matriz completa de permisos)
- **Frontend auth hooks**: `useMe()`, `usePermissions()` (TanStack Query) en `frontend/src/hooks/queries/useAuthQuery.ts`
- **Frontend auth routes**: `routes.getMe()`, `routes.getPermissions()` + endpoints `fetchMe()`, `fetchPermissions()`
- **Mock auth responses**: `/auth/me` y `/auth/permissions` en mock interceptor

### Changed

- `frontend/` ahora contiene todo el código React (movido desde raíz)
- `.github/workflows/deploy.yml`: actualizado con `working-directory: frontend` y `cache-dependency-path`
- CDK stack eliminado (`infra/`): reemplazado por NestJS + Serverless Framework

### Database Schema

| Tabla | Descripción |
|---|---|
| `roles` | 7 roles con IDs numéricos (1=SUPER_ADMIN ... 7=AUDITOR) |
| `modules` | 10 módulos del sistema (Dashboard, Buildings, Alerts, etc.) |
| `actions` | 3 acciones (view, manage, export) |
| `role_permissions` | Matriz many-to-many role↔module↔action |
| `users` | Usuarios OAuth con `external_id`, `provider`, `role_id` |
| `user_sites` | Acceso por sitio/edificio por usuario |

---

## [0.4.0-alpha.1] - 2026-03-05

### Added

- **GitHub Actions CI/CD** (`.github/workflows/deploy.yml`): build + typecheck en PRs, deploy a S3 + CloudFront invalidation en push a main
- **CDK stack** (`infra/`): S3 bucket (privado, OAC), CloudFront distribution con security headers policy (CSP, HSTS, X-Frame-Options), SPA routing (404→index.html), HTTP/2+3, TLS 1.2
- **Cache strategy**: assets hasheados con `max-age=31536000,immutable`; `index.html` con `no-cache`
- **GitHub Secrets/Variables**: OAuth credentials, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET`, `CLOUDFRONT_DISTRIBUTION_ID`, `AWS_REGION`

### Fixed

- Errores TypeScript en CI: `appRoutes.ts` (cast a `AppRoute[]`), `msalConfig.ts` (`storeAuthStateInCookie` removido), `useGoogleAuth.ts` (import no usado)

### Pipeline

- Build: `npm ci` → `tsc --noEmit` → `vite build` → artifact upload
- Deploy: S3 sync (assets immutable + index.html no-cache) → CloudFront invalidation
- Primer deploy exitoso a `energymonitor.click` vía CI/CD

---

## [0.3.0-alpha.4] - 2026-03-05

### Added

- **CSP + security headers** (`index.html`): `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`
- **Auth token interceptor** (`src/services/api.ts`): inyecta `Bearer` token en cada request, redirect a `/login` en 401
- **Validación de env vars** (`src/validateEnv.ts`): valida `VITE_AUTH_MODE` y credenciales requeridas según el modo al iniciar la app

### Changed

- `src/main.tsx`: mock interceptor protegido con `import.meta.env.DEV`; `validateEnv()` ejecutado al startup
- `src/features/auth/LoginPage.tsx`: demo login restringido a `VITE_AUTH_MODE === 'demo'` (ya no visible en cualquier build dev)
- `src/components/ui/Layout.tsx`: avatar URL validada con protocolo `https:` antes de renderizar
- `index.html`: título actualizado a "POWER Digital® — Energy Monitor"

### Security

- Mock interceptor ya no se activa en builds de producción
- Demo role selector inaccesible fuera de modo demo
- Avatar URLs con protocolo inseguro (`http:`, `javascript:`, etc.) son rechazadas
- Requests API llevan token de autenticación automáticamente

---

## [0.3.0-alpha.3] - 2026-03-05

### Added

- **Mapa de rutas API** (`src/services/routes.ts`): objeto `routes` con helpers parametrizados (`routes.getBuilding(id)`, etc.)
- **Mock interceptor** (`src/mocks/mockInterceptor.ts`): interceptor axios que sirve datos mock; se desactiva eliminando una línea en `main.tsx`
- **Mapa de rutas de navegación** (`src/app/appRoutes.ts`): objeto `appRoutes` con path, label, `allowedRoles` y `showInNav`; helpers `buildPath()` y `getNavItems(role)`
- **Barrel de hooks** (`src/hooks/index.ts`): re-exporta todos los hooks desde un solo import path

### Changed

- `src/services/endpoints.ts`: refactorizado a `api.get(routes.xxx())` — listo para API real
- `src/app/router.tsx`: paths y `allowedRoles` consumidos desde `appRoutes`
- `src/components/ui/Layout.tsx`: sidebar generado dinámicamente con `getNavItems(user.role)`
- `src/features/buildings/components/BuildingConsumptionChart.tsx`: gráfico cambiado de `column` a `line`

---

## [0.3.0-alpha.2] - 2026-03-05

### Changed

- **Tipografía Inter**: instalado `@fontsource-variable/inter` (self-hosted), aplicado en `index.css` y en Highcharts theme
- **Header desktop eliminado**: removida la barra superior en desktop; nombre del usuario ahora aparece bajo "Energy Monitor" en el sidebar
- **Header mobile**: se mantiene solo el hamburger menu en móvil

---

## [0.3.0-alpha.1] - 2026-03-04

### Added

- **Dark theme** con 8 tokens semánticos CSS (`@theme {}` en Tailwind v4): `base`, `surface`, `raised`, `border`, `text`, `muted`, `subtle`, `accent`
- **Scrollbar oscuro** global: thin, colores `--color-border` / `--color-subtle`
- **Series de gráficos coloreadas**: azul (`#388bfd`), naranja (`#f78166`), teal (`#3dc9b0`), amarillo (`#d29922`), rojo (`#f85149`) — reemplaza la paleta monocromática

### Changed

- **18 archivos** migrados de colores hardcoded light-theme a tokens dark-theme
- `src/index.css`: body bg/color usa CSS variables, scrollbar styles
- `src/components/ui/Chart.tsx`: `monochromeTheme` → `darkTheme` con fondos oscuros y series coloreadas
- `src/components/ui/DataTable.tsx`: headers sticky (`top-0`), acepta `className` prop
- `src/components/ui/Card.tsx`, `PageHeader.tsx`, `Layout.tsx`: tokens dark
- `src/features/buildings/BuildingDetailPage.tsx`: layout vertical (gráfico arriba, locales abajo)
- `src/features/locals/LocalDetailPage.tsx`: tabla con scroll interno y headers fijos, fill gradient azul
- `src/features/buildings/components/BuildingConsumptionChart.tsx`: removido `color: '#333'` inline (hereda azul del theme)
- Auth pages (LoginPage, UnauthorizedPage, botones OAuth, DemoRoleSelector): tokens dark
- Feature pages (BuildingsPage, BuildingCard, LocalCard): tokens dark
- `src/components/auth/ProtectedRoute.tsx`: texto loading con token `text-subtle`

---

## [0.2.0-alpha.2] - 2026-03-04

### Added

- **Permisos** (`src/auth/permissions.ts`): matriz `PERMISSIONS` por módulo/acción con helper `hasPermission(role, module, action)`
- **ProtectedRoute** (`src/components/auth/ProtectedRoute.tsx`): wrapper que redirige a `/login` si no autenticado, a `/unauthorized` si rol no permitido
- **UnauthorizedPage** (`src/features/auth/UnauthorizedPage.tsx`): página "Acceso denegado" con botón volver al inicio
- **Ruta `/unauthorized`**: registrada como ruta pública en el router

### Changed

- `src/app/router.tsx`: rutas protegidas envueltas en `<ProtectedRoute><Layout /></ProtectedRoute>`
- `src/components/ui/Layout.tsx`: sidebar muestra avatar + nombre + rol del usuario + botón "Cerrar sesión"; header muestra nombre en desktop

---

## [0.2.0-alpha.1] - 2026-03-04

### Added

- **Dependencias MSAL**: `@azure/msal-browser`, `@azure/msal-react` para autenticación Microsoft
- **Tipos de autenticación** (`src/types/auth.ts`): `AuthProvider`, `Role` (7 roles), `AuthUser`, `AuthState`
- **Tipos de dominio** (`src/types/index.ts`): `Meter`, `HierarchyNode`, `Reading`, `Alert`, `Invoice`, `AuditLog`, `Tenant`, `Integration`
- **Variables de entorno**: `.env` y `.env.example` con config para Microsoft Entra y modo auth
- **Tipado de env vars** (`src/env.d.ts`): `ImportMetaEnv` con las 4 variables VITE\_
- **Configuración MSAL** (`src/auth/`): `msalConfig.ts`, `msalInstance.ts`, `microsoftAuth.ts` — config, singleton y helpers de login/logout Microsoft
- **Hook `useMicrosoftAuth`** (`src/hooks/auth/useMicrosoftAuth.ts`): login/logout popup Microsoft, estado de autenticación
- **Auth Store** (`src/store/useAuthStore.ts`): Zustand con persist en sessionStorage para mantener sesión al refrescar
- **Usuarios demo** (`src/mocks/users.ts`): 7 usuarios mock, uno por rol (SUPER_ADMIN → AUDITOR)
- **Hook `useDemoAuth`** (`src/hooks/auth/useDemoAuth.ts`): login instantáneo por rol para desarrollo
- **Hook `useAuth`** (`src/hooks/auth/useAuth.ts`): fachada unificada que abstrae Microsoft, Google y Demo
- **LoginPage** (`src/features/auth/LoginPage.tsx`): página de login con botones Microsoft/Google + selector de roles demo
- **MicrosoftLoginButton**: botón con logo Microsoft SVG, abre popup OAuth
- **GoogleLoginButton**: botón con logo Google SVG, abre popup OAuth
- **DemoRoleSelector**: grid de 7 roles para login rápido en desarrollo
- **Ruta `/login`**: registrada fuera del Layout (standalone, sin sidebar)
- **Dependencia `@react-oauth/google`**: provider y hooks para Google OAuth
- **Google Auth** (`src/auth/googleAuth.ts`, `src/auth/googleConfig.ts`): config y helper para parsear credenciales Google
- **Hook `useGoogleAuth`** (`src/hooks/auth/useGoogleAuth.ts`): login popup Google con implicit flow

### Changed

- `src/main.tsx`: `MsalProvider` + `GoogleOAuthProvider` envuelven `<App />`
- `src/app/router.tsx`: ruta `/login` agregada fuera del layout principal
- `src/types/auth.ts`: `AuthProvider` incluye `'google'`
- `.gitignore` actualizado para excluir `.env` y `.env.local`

### Configuración Azure

- App Registration "POWER Digital" en Microsoft Entra (multi-tenant + personal accounts)
- Redirect URIs: `http://localhost:5173` (dev), `https://energymonitor.click` (prod)
- API Permission: `User.Read` (Delegated) con admin consent

### Configuración Google

- OAuth Client ID reutilizado de banados-fullstack
- Authorized JavaScript origins: `http://localhost:5173`, `https://energymonitor.click`

---

## [0.1.0] - 2026-02-17

### Added

- **Scaffold del proyecto** con React 19 + Vite + TypeScript
- **Dependencias**: React Router v7, TanStack Query v5, TanStack Table v8, Highcharts, Axios, Zustand, Tailwind CSS v4
- **Tipos**: interfaces `Building`, `Local`, `MonthlyConsumption`
- **Datos mock**: 5 edificios, 10 locales, 12 meses de consumo por local
- **Capa de servicios**: mock API con delays simulados (`endpoints.ts`)
- **Query hooks**: `useBuildings`, `useBuilding`, `useBuildingConsumption`, `useLocalsByBuilding`, `useLocal`, `useLocalConsumption`
- **Store Zustand**: estado de sidebar (abierto/cerrado)
- **Componentes UI reutilizables**:
  - `Layout` — shell responsive con sidebar colapsable y header
  - `Card` — card genérica con slot de children
  - `PageHeader` — título, breadcrumbs y botón volver
  - `Chart` — wrapper de Highcharts con tema monocromático
  - `DataTable` — wrapper genérico de TanStack Table con sorting
- **Páginas**:
  - `BuildingsPage` (`/`) — grid responsive de edificios
  - `BuildingDetailPage` (`/buildings/:id`) — gráfico de columnas con consumo total + grid de locales
  - `LocalDetailPage` (`/buildings/:buildingId/locals/:localId`) — gráfico de área + tabla de consumo
- **Componentes de dominio**: `BuildingCard`, `BuildingConsumptionChart`, `LocalCard`, `LocalConsumptionTable`
- **Router**: 3 rutas con layout envolvente
- **Diseño low-fidelity**: paleta monocromática, sin border-radius, bordes sólidos 1px, tipografía system
- **Responsividad**: mobile (1 col, sidebar oculta), tablet (2 cols), desktop (3-4 cols, sidebar visible)
- **Sin scrollbar vertical** en ninguna vista; solo scroll horizontal en tablas
- **Interacción bidireccional gráfico-tabla**: hover en un punto del gráfico destaca la fila en la tabla y viceversa (con tooltip sincronizado)

## Estructura del Proyecto

```
energy-monitor/
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts
├── eslint.config.js
├── public/
│   └── vite.svg
└── src/
    ├── main.tsx                          # Entry point
    ├── index.css                         # Tailwind + estilos globales
    ├── app/
    │   ├── App.tsx                       # QueryClientProvider + RouterProvider
    │   └── router.tsx                    # Definición de rutas (3 rutas)
    ├── components/
    │   └── ui/
    │       ├── Card.tsx                  # Card genérica reutilizable
    │       ├── Chart.tsx                 # Wrapper Highcharts (tema mono, hover sync)
    │       ├── DataTable.tsx             # Wrapper TanStack Table (sorting, row highlight)
    │       ├── Layout.tsx                # Shell: sidebar + header + main
    │       └── PageHeader.tsx            # Título + breadcrumbs + botón volver
    ├── features/
    │   ├── buildings/
    │   │   ├── BuildingsPage.tsx         # Grid de edificios (/)
    │   │   ├── BuildingDetailPage.tsx    # Detalle edificio (/buildings/:id)
    │   │   └── components/
    │   │       ├── BuildingCard.tsx      # Card de edificio
    │   │       └── BuildingConsumptionChart.tsx  # Gráfico columnas consumo
    │   └── locals/
    │       ├── LocalDetailPage.tsx       # Detalle local (/buildings/:id/locals/:id)
    │       └── components/
    │           ├── LocalCard.tsx         # Card de local
    │           └── LocalConsumptionTable.tsx     # Tabla consumo mensual
    ├── hooks/
    │   └── queries/
    │       ├── useBuildings.ts           # Queries: buildings, building, consumption
    │       └── useLocals.ts             # Queries: locals, local, consumption
    ├── mocks/
    │   ├── buildings.ts                  # 5 edificios
    │   ├── locals.ts                    # 10 locales
    │   └── consumption.ts              # Consumo mensual por local (12 meses)
    ├── services/
    │   ├── api.ts                       # Instancia Axios
    │   └── endpoints.ts                 # Funciones mock API con delay
    ├── store/
    │   └── useAppStore.ts               # Zustand: sidebar state
    └── types/
        └── index.ts                     # Building, Local, MonthlyConsumption
```

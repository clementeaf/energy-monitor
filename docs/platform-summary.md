# Resumen Ejecutivo — Energy Monitor (Frontend + Backend)

## Overview

Plataforma de monitoreo energético multi-cliente. Dos temas: **PASA** (875 medidores PAC, 5 edificios, billing, drill-down jerárquico) y **Siemens** (POC3000 vía IoT Core MQTT). Mismas vistas, distinta fuente de datos según tema.

---
---

# PARTE 1 — FRONTEND

## Stack Frontend

SPA React 19 + Vite 8 + TypeScript 5.9 + Tailwind v4. RBAC por roles, datos servidos via TanStack Query v5.

---

## Módulos de Feature (9)

| Módulo | Ruta | Descripción |
|--------|------|-------------|
| **Dashboard** | `/` | KPIs por edificio (consumo, costo/m²), resumen de facturación, tabla de documentos con filtros |
| **Buildings** | `/buildings`, `/buildings/:id` | Listado de edificios con KPIs. Detalle: medidores, operadores, billing. CRUD edificios y medidores (incl. bulk CSV) |
| **Meters** | `/meters/:meterId`, `/meters/:meterId/readings/:month` | Detalle de medidor: lectura actual, tabla mensual, gráfico StockChart 15-min con range selector |
| **Monitoring** | `/monitoring/realtime` | Dos tabs: Monitoreo (lecturas en tiempo real, auto-refresh 60s) y Alertas (tabla con severidad/tipo) |
| **Alerts** | `/alerts`, `/alerts/:id` | Tabla de alertas con filtros multi-select. Detalle de alerta individual |
| **Comparisons** | `/comparisons` | Comparación de consumo/costo entre edificios, tipos de tienda y tiendas por mes |
| **Auth** | `/login`, `/invite/:token`, `/unauthorized` | Login Microsoft (redirect) + Google (implicit). Aceptar invitación. Página 403 |
| **Admin** | `/admin/users` | Gestión de usuarios: invitar, asignar roles/sitios, reenviar invitaciones (SUPER_ADMIN) |
| **Settings** | `/settings/profile` | Perfil de usuario (solo lectura) |

---

## Componentes Compartidos (20)

### Layout
- `TempLayout` — Layout principal (sidebar + contenido)
- `PageHeader` — Título + breadcrumbs + acciones
- `Card` — Wrapper con sombra
- `SectionBanner` — Header de sección coloreado

### Datos
- `DataTable` — Tabla TanStack con sorting/filtering
- `ColumnFilterDropdown` — Toggle de visibilidad de columnas
- `Skeleton` — Loading skeletons por tipo de página

### Charts
- `Chart` — Wrapper Highcharts (hover, dark theme)
- `StockChart` — Highcharts Stock (range selector, navigator)
- `MonthlyColumnChart` — Columnas mensuales reutilizable

### Selección / Filtros
- `PillButton`, `PillDropdown`, `PillDropdownMulti` — Botones y dropdowns pill-style
- `TogglePills` — Toggle binario (ej. anual/mensual)
- `MultiSelect` — Selector multi-checkbox
- `DateFilterDropdown` — Selector de rango de fechas
- `RangeFilterDropdown` — Slider de rango numérico

### Diálogos
- `ConfirmDialog` — Modal de confirmación
- `Drawer` — Panel lateral deslizable
- `ContextMenu` — Menú contextual

### Otros
- `ErrorBoundary` — Fallback de errores React
- `ProtectedRoute` — Guard de ruta por rol/permisos

---

## State Management (2 stores Zustand)

| Store | Persistencia | Campos clave |
|-------|-------------|--------------|
| `useAuthStore` | sessionStorage | `user`, `isAuthenticated`, `isLoading`, `error` |
| `useAppStore` | sessionStorage | `theme` (pasa/siemens), `userMode` (holding/multi_operador/operador/tecnico), `selectedOperator`, `selectedBuilding`, `selectedStoreMeterId`, `sidebarOpen`, `selectedSiteId` |

---

## Hooks (40+)

### Auth (3)
`useAuth`, `useMicrosoftAuth`, `useGoogleAuth`

### Query Hooks — 11 módulos
| Módulo | Hooks principales |
|--------|-------------------|
| `useAuthQuery` | `useMe`, `usePermissions` |
| `useBuildings` | `useBuildings`, `useBuilding`, CRUD mutations |
| `useMeters` | `useMeterInfo`, `useMetersByBuilding`, `useMetersLatest`, `useAllMetersLatest`, `useMeterMonthly`, `useMeterReadings` |
| `useBilling` | `useBilling`, `useBillingStores`, `useBillingAllStores` |
| `useDashboard` | `useDashboardSummary`, `useDashboardPayments`, `useDashboardDocuments` |
| `useAlerts` | `useAlerts` (theme-aware: PASA o IoT) |
| `useComparisons` | `useComparisonFilters`, `useComparisonByStore`, `useComparisonGroupedByType`, `useComparisonByStoreType`, `useComparisonByStoreName` |
| `useStores` | `useStores`, `useStoreTypes`, CRUD mutations |
| `useOperators` | `useOperators`, rename/delete mutations |
| `useIotReadings` | `useIotLatest`, `useIotTimeSeries`, `useIotMonthly`, `useIotMeterReadings` |
| `useUsers` | `useUsers`, invite/create/delete mutations |

### Utility Hooks (2)
- `useOperatorFilter` — Filtra medidores/edificios según userMode + operador seleccionado
- `useClickOutside` — Cierra dropdown al clic fuera

---

## Capa de Servicios (3 archivos)

```
routes.ts → endpoints.ts → hooks/queries/use*.ts
```

- **`api.ts`** — Instancia Axios, interceptor Bearer token, redirect 401
- **`routes.ts`** — Builders de URL con params
- **`endpoints.ts`** — Wrappers fetch tipados (GET/POST/PATCH/DELETE)

---

## Auth & RBAC

### Proveedores
- **Microsoft Entra ID** — Redirect flow (MSAL v5), scope `api://energy-monitor/PASA.read`
- **Google** — Implicit flow (credential JWT)

### Roles (7)
`SUPER_ADMIN` → `CORP_ADMIN` → `SITE_ADMIN` → `OPERATOR` → `ANALYST` → `TENANT_USER` → `AUDITOR`

### Permisos por módulo
Dashboard, Buildings, Building Detail, Meter Detail, Monitoring Realtime, Alerts, Alert Detail, Billing, Comparisons, Admin Users, Context Select

### Modos de usuario
| Modo | Comportamiento |
|------|---------------|
| `holding` | Ve todo |
| `multi_operador` | Filtra por store name (operador) |
| `operador` | Filtra por meter ID específico |
| `tecnico` | Ve todo técnico, oculta financiero (Dashboard, CLP, billing) |

---

## Theming

Dos temas via CSS variables en `[data-theme]`:

| | PASA | Siemens |
|--|------|---------|
| Color primario | `#3D3BF3` (azul) | `#009999` (teal) |
| Datos | `/buildings`, `/meters`, `/alerts` | `/iot-readings/*` |
| Logo/Favicon | PASA | Siemens |

Hooks detectan `useAppStore.theme` y cambian endpoint de datos automáticamente.

---

## Lib / Utilidades

| Archivo | Contenido |
|---------|-----------|
| `formatters.ts` | `fmt`, `fmtNum`, `fmtClp`, `fmtAxis`, `monthLabel`, `fmtDate` — todos null-safe |
| `constants.ts` | Meses en español, nombres cortos de edificios |
| `chartConfig.ts` | Colores desde CSS vars, estilos de plot/tooltip |
| `themes.ts` | Config de temas (logo, título, favicon por tema) |
| `aggregations.ts` | Utilidades de agregación de medidores/edificios |

---

## Routing

- **18+ rutas** (3 públicas, 15+ protegidas)
- Lazy loading con `React.lazy` + `Suspense`
- `ErrorBoundary` por ruta
- `ProtectedRoute` valida rol + permisos
- Catch-all redirige a `/`

---

## Métricas

| Métrica | Valor |
|---------|-------|
| Feature modules | 9 |
| Componentes UI compartidos | 20 |
| Query hooks | ~40+ |
| Stores | 2 |
| Rutas | 18+ |
| Roles | 7 |
| Auth providers | 2 |
| Temas | 2 |
| Endpoints cubiertos | 40+ |
| Tests | 0 (pendiente) |

---

## Estructura de Archivos

```
frontend/src/
├── app/                    # Router, rutas, App.tsx
├── auth/                   # MSAL, Google, permisos, tipos (8 archivos)
├── components/
│   ├── auth/               # ProtectedRoute
│   ├── charts/             # MonthlyColumnChart
│   └── ui/                 # 20 componentes reutilizables
├── features/
│   ├── admin/              # AdminUsersPage
│   ├── alerts/             # AlertsPage, AlertDetailPage
│   ├── auth/               # Login, Invitation, Unauthorized
│   ├── buildings/          # 2 pages + 8 components
│   ├── comparisons/        # ComparisonsPage
│   ├── dashboard/          # DashboardPage + 4 components
│   ├── meters/             # 2 pages + 3 components
│   ├── monitoring/         # RealtimePage
│   └── settings/           # ProfilePage
├── hooks/
│   ├── auth/               # 3 auth hooks
│   ├── queries/            # 11 módulos de query hooks
│   ├── useOperatorFilter   # Filtrado por modo
│   └── useClickOutside     # Utilidad
├── lib/                    # constants, formatters, chartConfig, themes
├── services/               # api, routes, endpoints
├── store/                  # useAuthStore, useAppStore
├── types/                  # auth.ts, index.ts
└── main.tsx, index.css
```

---
---

# PARTE 2 — BACKEND

## Stack Backend

NestJS 11 + TypeORM 0.3 + PostgreSQL 16 + AWS Lambda (Serverless v3). Auth JWT via JWKS (Microsoft + Google). Deploy: Lambda + API Gateway + RDS (VPC, 3 subnets).

---

## Módulos NestJS (16)

| Módulo | Entidad | Endpoints | Propósito |
|--------|---------|-----------|-----------|
| **Auth** | — | `/auth/me`, `/auth/permissions` | Verificación JWT/OAuth (JWKS remoto), contexto de autorización |
| **Roles** | Role, ViewModule, Action, RolePermission | `/roles` | Definiciones RBAC (7 roles × 15 módulos × 2 acciones) |
| **Users** | User, UserSite | `/users` (5 endpoints) | Provisioning, invitaciones (7d TTL), bind OAuth, CRUD |
| **Session** | Session | `/session` (6 endpoints) | API tokens (SHA256 hash at rest, 365d TTL) |
| **Buildings** | BuildingSummary | `/buildings` (5 endpoints) | KPIs por edificio×mes (consumo, demanda, PF, área m²) |
| **Stores** | Store, StoreType | `/stores` (10 endpoints) | Jerarquía meter→store→building. Bulk create. Operadores |
| **Meters** | — | `/meters` (3 endpoints) | Metadata de medidores, últimas lecturas por edificio |
| **MeterReadings** | MeterReading | `/meter-readings/:meterId` | Series de tiempo 15-min (V, A, kW, kVAR, PF, Hz, kWh) |
| **MeterMonthly** | MeterMonthly | `/meter-monthly` (3 endpoints) | Agregados mensuales (kWh, avg/peak power, PF) |
| **RawReadings** | RawReading | `/raw-readings/:meterId` | Lecturas sin procesar |
| **Billing** | MeterMonthlyBilling | `/billing` (3 endpoints) | Docs de facturación + generación PDF |
| **Alerts** | Alert | `/alerts` | Alertas con derivación de edificio por prefijo meter ID |
| **Dashboard** | — | `/dashboard` (3 endpoints) | Summary KPIs, pagos, documentos por estado |
| **Comparisons** | — | `/comparisons` (5 endpoints) | Comparaciones cross-building por store/tipo/nombre |
| **IotReadings** | IotReading | `/iot-readings` (9 endpoints) | Siemens IoT: PASA-compatible + alertas on-the-fly + conversión W→kW |
| **Email** | — | — (servicio interno) | AWS SES: emails de invitación |

**Total: ~55 endpoints**

---

## Autenticación & Autorización

### Flujo de Auth
```
Bearer token → AuthGuard → verifyToken() → JWKS (Microsoft/Google)
                                          → fallback: Google userinfo API
                                          → fallback: session table lookup
            → RolesGuard → @RequirePermissions(module, action)
                         → x-site-context header (scoping multi-tenant)
```

### Guards Globales
1. **AuthGuard** — Extrae Bearer token, verifica JWT, adjunta `authUser` al request. Skip con `@Public()`
2. **RolesGuard** — Evalúa `@RequirePermissions(module, action)`, resuelve contexto de autorización, aplica site scoping

### Decoradores
- `@Public()` — Ruta sin auth
- `@CurrentUser()` — Inyecta TokenPayload
- `@CurrentAuthContext()` — Inyecta AuthorizationContext completo
- `@RequirePermissions(module, action)` — Guard de permisos

### Matriz RBAC
- **7 roles**: SUPER_ADMIN, CORP_ADMIN, SITE_ADMIN, OPERATOR, ANALYST, TENANT_USER, AUDITOR
- **15 módulos**: DASHBOARD_OVERVIEW, BUILDINGS_OVERVIEW, BUILDING_DETAIL, ALERTS_OVERVIEW, ADMIN_USERS, ADMIN_SITES, BILLING_OVERVIEW, etc.
- **2 acciones**: view, manage
- Roles globales (SUPER_ADMIN, CORP_ADMIN, AUDITOR) acceden a todos los sitios

---

## Entidades (12)

| Entidad | PK | Columnas clave |
|---------|-----|----------------|
| **User** | uuid | email, externalId, provider, roleId, userMode, invitationTokenHash, invitationExpiresAt |
| **UserSite** | (userId, siteId) | Scope de acceso multi-tenant |
| **Role** | smallint | name, labelEs |
| **ViewModule** | smallint | code, routePath, navigationGroup, sortOrder |
| **Action** | smallint | code (view, manage) |
| **RolePermission** | (roleId, moduleId, actionId) | Matriz role→módulo→acción |
| **Session** | uuid | userId, tokenHash (SHA256), expiresAt |
| **BuildingSummary** | (buildingName, month) | areaSqm, totalKwh, peakDemandKw, avgPowerFactor |
| **Store** | meterId (varchar 10) | storeName, storeTypeId, isThreePhase |
| **StoreType** | smallint (manual) | name, category |
| **MeterReading** | (meterId, timestamp) | voltageL1-L3, currentL1-L3, powerKw, PF, frequencyHz, energyKwhTotal |
| **MeterMonthly** | (meterId, month) | totalKwh, avgPowerKw, peakPowerKw, avgPowerFactor |
| **RawReading** | (meterId, timestamp) | powerKw, reactivePowerKvar, PF, energyKwhTotal |
| **MeterMonthlyBilling** | (meterId, month) | buildingName, totalKwh, energiaClp, ddaMaxKw, totalNetoClp, totalConIvaClp |
| **Alert** | id (auto) | meterId, alertType, severity, field, value, threshold, message |
| **IotReading** | bigint (auto) | deviceId, voltages, currents, activePowerW, PF, energyImport/ExportWh, THD% |

---

## Lambdas Programadas

| Lambda | Trigger | Función |
|--------|---------|---------|
| **api** (1024MB) | API Gateway HTTP | Backend principal (NestJS + serverless-express) |
| **offlineAlerts** | EventBridge 5 min | Detecta medidores sin lectura en 15 min, genera alertas (dedup 60 min) |
| **dbVerify** | Manual | Migraciones: auth tables, building areas, billing docs, meter optimizations, backfill IoT |
| **billing-pdf-generator** | Via API | Python 3.12, genera PDFs de facturación (x86_64) |
| **iot-ingest** | EventBridge 15 min | S3 (IoT Core) → parse → RDS `iot_readings` |
| **synthetic-readings-generator** | EventBridge 15 min | Genera lecturas sintéticas + prune + cache refresh |

---

## Interceptores & Infraestructura

- **Utf8JsonInterceptor** — `Content-Type: application/json; charset=utf-8` en todas las respuestas (excluye `/billing/pdf`)
- **ValidationPipe** global — whitelist + transform. DTOs con class-validator
- **Swagger** — `/api/spec` (JSON), `/api/docs` (Swagger UI)
- **CORS** — `energymonitor.click` (prod) + `localhost:5173` (dev)
- **Binary support** — `@vendia/serverless-express` con binarySettings para PDF

---

## IoT Readings — Detalle

El módulo IoT provee endpoints **PASA-compatibles** para datos Siemens:

| Endpoint IoT | Equivalente PASA | Conversión |
|-------------|-----------------|------------|
| `/iot-readings/buildings` | `/buildings` | Device = building |
| `/iot-readings/meters-latest` | `/meters/building/:name/latest` | W→kW |
| `/iot-readings/monthly` | `/meter-monthly/:meterId` | Wh→kWh |
| `/iot-readings/meter-readings` | `/meter-readings/:meterId` | W→kW, VAR→kVAR |
| `/iot-readings/alerts` | `/alerts` | Generadas on-the-fly por anomalías |

**Alertas generadas on-the-fly:**
- LOW/HIGH_VOLTAGE (< 200V / > 250V)
- LOW_POWER_FACTOR (< 0.85)
- HIGH_POWER (> 50kW)
- HIGH_THD_VOLTAGE/CURRENT (> 8% / > 20%)

---

## Invitaciones — Flujo

```
Admin → POST /users (email, role, sites)
      → genera token base64url(24 bytes)
      → guarda hash SHA256 en DB (TTL 7 días)
      → envía email SES con link /invite/{token}

Usuario → abre link → frontend envía x-invitation-token header
       → GET /auth/me valida token + bind OAuth provider
       → limpia campos de invitación → usuario activo
```

**Estados:** invited → active | expired | disabled

---

## Email (AWS SES)

- **From**: `noreply@energymonitor.click`
- **Template**: HTML con botón de invitación styled
- **Método**: `sendInvitation(to, name, roleLabel, inviteUrl)`
- **Nota**: Pendiente salir de SES sandbox

---

## Tests Backend

**Framework**: Jest 29 + ts-jest

**Specs existentes** (suite mínima):
- `alerts.controller.spec.ts`
- `hierarchy.controller.spec.ts`
- `meters.controller.spec.ts`
- `auth.service.spec.ts`, `auth.controller.spec.ts`
- `invitations.controller.spec.ts`
- `buildings.controller.spec.ts`
- `rbac.spec.ts`, `access-scope.spec.ts`

---

## Variables de Entorno Backend

| Variable | Uso |
|----------|-----|
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD` | Conexión PostgreSQL |
| `DB_SSL` | Forzar SSL en local |
| `NODE_ENV` | production → SSL habilitado |
| `GOOGLE_CLIENT_ID` | Validación JWT Google |
| `MICROSOFT_CLIENT_ID` | Validación JWT Microsoft |
| `EMAIL_FROM` | Remitente SES (default: noreply@energymonitor.click) |
| `AWS_REGION` | Región SES (default: us-east-1) |
| `FRONTEND_URL` | Base URL para links de invitación |

---

## Estructura de Archivos Backend

```
backend/src/
├── app.module.ts              # 16 módulos registrados
├── main.ts                    # Server local (puerto 4000)
├── serverless.ts              # Lambda handler (vendia/serverless-express)
├── swagger.ts                 # OpenAPI config
├── db-verify-lambda.ts        # Migraciones y mantenimiento
├── offline-alerts.ts          # Detección de medidores offline
├── auth/                      # JWT/OAuth, guards, decoradores (8 archivos)
├── roles/                     # RBAC: Role, ViewModule, Action, RolePermission
├── users/                     # User, UserSite, invitaciones
├── session/                   # API tokens (SHA256)
├── buildings/                 # BuildingSummary CRUD
├── stores/                    # Store, StoreType, operadores, bulk
├── meters/                    # Metadata medidores
├── meter-readings/            # Series de tiempo 15-min
├── meter-monthly/             # Agregados mensuales
├── raw-readings/              # Lecturas sin procesar
├── billing/                   # Facturación + PDF
├── alerts/                    # Alertas
├── dashboard/                 # KPIs, pagos, documentos
├── comparisons/               # Comparaciones cross-building
├── iot-readings/              # Siemens IoT (PASA-compatible)
├── email/                     # AWS SES
└── common/                    # Utf8JsonInterceptor, range-guard
```

---
---

# MÉTRICAS GLOBALES

| Métrica | Frontend | Backend | Total |
|---------|----------|---------|-------|
| Módulos | 9 features | 16 NestJS | 25 |
| Componentes/Entidades | 20 UI | 16 entidades | 36 |
| Hooks/Servicios | ~40 hooks | 16 services | ~56 |
| Endpoints | — | ~55 | ~55 |
| Rutas frontend | 18+ | — | 18+ |
| Tests | 0 | ~9 specs | ~9 |
| Auth providers | 2 | 2 + session tokens | 3 |
| Roles | 7 | 7 | 7 |
| Temas | 2 | 2 (IoT endpoints) | 2 |

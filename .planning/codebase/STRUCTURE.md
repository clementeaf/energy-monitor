# Codebase Structure

**Analysis Date:** 2026-03-09

## Directory Layout

```
energy-monitor/
├── backend/                    # NestJS API (Lambda deployment)
│   ├── src/
│   │   ├── alerts/             # Alerts domain module
│   │   ├── auth/               # Authentication module (Microsoft + Google OAuth)
│   │   │   └── dto/            # Auth DTOs
│   │   ├── buildings/          # Buildings domain module
│   │   │   └── dto/            # Building DTOs
│   │   ├── common/             # Shared utilities (currently minimal)
│   │   ├── hierarchy/          # Hierarchy tree module (CTE recursive queries)
│   │   ├── meters/             # Meters + Readings domain module (core)
│   │   ├── roles/              # RBAC roles + permissions module
│   │   ├── users/              # Users + user-site associations module
│   │   ├── app.module.ts       # Root NestJS module
│   │   ├── main.ts             # Local dev entry point (port 4000)
│   │   ├── serverless.ts       # Lambda entry point (cached NestJS bootstrap)
│   │   ├── offline-alerts.ts   # Scheduled Lambda (offline meter detection)
│   │   └── swagger.ts          # Swagger/OpenAPI setup
│   ├── serverless.yml          # Serverless Framework config (Lambda + VPC)
│   ├── nest-cli.json           # NestJS CLI config
│   ├── tsconfig.json           # TypeScript config
│   └── package.json            # Backend dependencies
│
├── frontend/                   # React 19 SPA (Vite + Tailwind v4)
│   ├── public/
│   │   └── auth-redirect.html  # OAuth redirect handler
│   ├── src/
│   │   ├── app/                # App shell: router, routes, root component
│   │   │   ├── App.tsx         # Root component (providers, QueryClient)
│   │   │   ├── router.tsx      # React Router config with lazy-loaded pages
│   │   │   └── appRoutes.ts    # Centralized route definitions + RBAC
│   │   ├── assets/             # Static assets (SVGs)
│   │   ├── auth/               # Auth library code (MSAL, Google OAuth configs)
│   │   │   ├── microsoftAuth.ts
│   │   │   ├── googleAuth.ts
│   │   │   ├── msalConfig.ts
│   │   │   ├── msalInstance.ts
│   │   │   ├── googleConfig.ts
│   │   │   ├── captureGoogleHash.ts
│   │   │   └── permissions.ts  # Permission checking utilities
│   │   ├── components/         # Shared reusable components
│   │   │   ├── auth/
│   │   │   │   └── ProtectedRoute.tsx
│   │   │   └── ui/             # UI primitives
│   │   │       ├── Card.tsx
│   │   │       ├── Chart.tsx
│   │   │       ├── DataTable.tsx    # TanStack Table wrapper
│   │   │       ├── ErrorBoundary.tsx
│   │   │       ├── Layout.tsx       # Main app layout (sidebar + content)
│   │   │       ├── PageHeader.tsx
│   │   │       ├── Skeleton.tsx     # Loading skeletons per page
│   │   │       └── StockChart.tsx   # Highcharts Stock wrapper
│   │   ├── features/           # Feature modules (page + components)
│   │   │   ├── alerts/
│   │   │   │   └── AlertsPage.tsx
│   │   │   ├── auth/
│   │   │   │   ├── LoginPage.tsx
│   │   │   │   ├── UnauthorizedPage.tsx
│   │   │   │   └── components/
│   │   │   │       ├── GoogleLoginButton.tsx
│   │   │   │       └── MicrosoftLoginButton.tsx
│   │   │   ├── buildings/
│   │   │   │   ├── BuildingsPage.tsx
│   │   │   │   ├── BuildingDetailPage.tsx
│   │   │   │   └── components/
│   │   │   │       ├── AlertsOverviewPanel.tsx
│   │   │   │       ├── BuildingAlertsPanel.tsx
│   │   │   │       ├── BuildingCard.tsx
│   │   │   │       └── BuildingConsumptionChart.tsx
│   │   │   ├── drilldown/
│   │   │   │   ├── DrilldownPage.tsx
│   │   │   │   └── components/
│   │   │   │       ├── DrilldownBars.tsx
│   │   │   │       ├── DrilldownBreadcrumb.tsx
│   │   │   │       ├── DrilldownChildrenTable.tsx
│   │   │   │       └── DrilldownTreemap.tsx
│   │   │   ├── iot-devices/
│   │   │   │   └── IoTDevicesPage.tsx
│   │   │   └── meters/
│   │   │       ├── MeterDetailPage.tsx
│   │   │       └── components/
│   │   │           ├── AlarmEventsTable.tsx
│   │   │           ├── AlarmSummaryBadges.tsx
│   │   │           ├── DowntimeEventsTable.tsx
│   │   │           ├── MeterCard.tsx
│   │   │           └── UptimeBadges.tsx
│   │   ├── hooks/              # Custom hooks
│   │   │   ├── auth/           # Auth hooks
│   │   │   │   ├── useAuth.ts          # Unified auth facade
│   │   │   │   ├── useGoogleAuth.ts
│   │   │   │   └── useMicrosoftAuth.ts
│   │   │   ├── queries/        # TanStack Query hooks
│   │   │   │   ├── useAlerts.ts
│   │   │   │   ├── useAuthQuery.ts
│   │   │   │   ├── useBuildings.ts
│   │   │   │   ├── useHierarchy.ts
│   │   │   │   └── useMeters.ts
│   │   │   └── index.ts        # Barrel re-exports
│   │   ├── services/           # API client layer
│   │   │   ├── api.ts          # Axios instance with Bearer token injection
│   │   │   ├── endpoints.ts    # API call functions (fetch*, acknowledge*, sync*)
│   │   │   └── routes.ts       # API route builder functions
│   │   ├── store/              # Zustand stores
│   │   │   ├── useAppStore.ts  # App-level state
│   │   │   └── useAuthStore.ts # Auth state (token, user, provider)
│   │   ├── types/              # TypeScript type definitions
│   │   │   ├── index.ts        # Domain types (Building, Meter, Reading, etc.)
│   │   │   └── auth.ts         # Auth types (Role, AuthUser, etc.)
│   │   ├── env.d.ts            # Vite env type declarations
│   │   ├── validateEnv.ts      # Runtime env validation
│   │   ├── index.css           # Tailwind CSS entry
│   │   └── main.tsx            # App entry point
│   ├── vite.config.ts          # Vite config (proxy /api to API Gateway)
│   ├── eslint.config.js        # ESLint config
│   ├── tsconfig.json           # Root TS config
│   ├── tsconfig.app.json       # App TS config
│   ├── tsconfig.node.json      # Node/Vite TS config
│   └── package.json            # Frontend dependencies
│
├── infra/                      # Infrastructure scripts (standalone Lambdas/tools)
│   ├── synthetic-generator/    # EventBridge Lambda: generates synthetic readings (1/min)
│   │   ├── index.mjs           # Lambda handler
│   │   ├── profiles.json       # Statistical profiles per meter/hour
│   │   └── package.json
│   ├── reimport-readings/      # One-off: reimport CSV readings + regen synthetic
│   │   ├── index.mjs           # CSV importer
│   │   ├── regen-synthetic.mjs # Regenerate synthetic readings
│   │   ├── profiles.json       # Statistical profiles
│   │   ├── energy_meters_15devices_2months.csv
│   │   └── package.json
│   └── backfill-gap/           # One-off: backfill gaps in readings
│       ├── index.mjs
│       └── package.json
│
├── sql/                        # Database migrations (numbered, sequential)
│   ├── 001_schema.sql          # Initial schema (users, roles, permissions)
│   ├── 002_seed.sql            # Seed data (roles, modules, actions)
│   ├── 003_buildings_locals.sql # Buildings + locals schema
│   ├── 004_meters_readings.sql # Meters + readings + seed 15 meters
│   ├── 005_hierarchy_nodes.sql # Hierarchy tree schema
│   ├── 006_alerts.sql          # Alerts schema
│   └── import-readings.mjs     # Script to import CSV readings to DB
│
├── docs/                       # Project documentation
│   ├── aws-runbook.md          # AWS deployment runbook
│   ├── CHANGELOG.md            # Release changelog
│   ├── ISSUES_&_FIXES.md       # Known issues and fixes log
│   └── *.xlsx, *.zip           # Specs and data files
│
├── patterns/                   # Architecture patterns documentation
│   └── data-flow.md            # Data flow patterns
│
├── scripts/                    # Utility scripts
│   └── perfil_datos.py         # Python: generate statistical profiles from CSV
│
├── skills/                     # Claude skills (deployment instructions)
│   └── deploy.md               # Deploy skill
│
├── .github/workflows/
│   └── deploy.yml              # CI/CD: build + deploy frontend (S3) + backend (sls)
│
├── CLAUDE.md                   # Project instructions for Claude
├── CHANGELOG.md                # Root changelog
├── PLAN_ACCION.md              # Action plan
└── README.md                   # Project readme
```

## Directory Purposes

**`backend/src/`:**
- Purpose: NestJS API source code
- Contains: Domain modules, each with entity/controller/service/module files
- Key files: `serverless.ts` (Lambda entry), `offline-alerts.ts` (scheduled Lambda), `app.module.ts` (root module)

**`frontend/src/features/`:**
- Purpose: Feature-based page modules
- Contains: One directory per domain feature, each with a `*Page.tsx` and a `components/` subdirectory
- Key convention: Page component is at feature root, supporting components in `components/`

**`frontend/src/hooks/`:**
- Purpose: Custom React hooks, split by concern
- Contains: `auth/` for authentication hooks, `queries/` for TanStack Query hooks
- Key file: `index.ts` barrel re-exports all hooks

**`frontend/src/services/`:**
- Purpose: API client layer
- Contains: Axios instance, endpoint functions, route builders
- Key pattern: `routes.ts` builds URL strings, `endpoints.ts` calls API using those routes

**`frontend/src/store/`:**
- Purpose: Zustand global state stores
- Contains: `useAuthStore.ts` (auth state), `useAppStore.ts` (app UI state)

**`frontend/src/components/ui/`:**
- Purpose: Shared reusable UI components (not feature-specific)
- Contains: Layout, Chart wrappers, DataTable, Card, Skeleton, ErrorBoundary

**`infra/`:**
- Purpose: Standalone Lambda functions and one-off infrastructure scripts
- Contains: Independent Node.js packages (each with own `package.json`)
- Not part of the NestJS build pipeline

**`sql/`:**
- Purpose: Database schema migrations and seed data
- Contains: Numbered SQL files applied sequentially, plus import scripts

## Key File Locations

**Entry Points:**
- `backend/src/main.ts`: Local dev server (NestJS, port 4000)
- `backend/src/serverless.ts`: Lambda entry point (production)
- `backend/src/offline-alerts.ts`: Scheduled Lambda for offline meter detection
- `frontend/src/main.tsx`: React SPA entry point
- `infra/synthetic-generator/index.mjs`: Synthetic readings Lambda

**Configuration:**
- `backend/serverless.yml`: Lambda + VPC + env vars definition
- `backend/tsconfig.json`: Backend TypeScript config
- `frontend/vite.config.ts`: Vite dev server + proxy config
- `frontend/eslint.config.js`: ESLint configuration
- `.github/workflows/deploy.yml`: CI/CD pipeline

**Core Logic:**
- `backend/src/meters/meters.service.ts`: Readings, uptime, alarms, consumption queries
- `backend/src/hierarchy/hierarchy.service.ts`: CTE recursive queries for drill-down
- `backend/src/auth/auth.service.ts`: JWT/JWKS verification, user creation
- `backend/src/buildings/buildings.service.ts`: Building CRUD + consumption
- `frontend/src/services/endpoints.ts`: All API call functions
- `frontend/src/hooks/auth/useAuth.ts`: Unified auth facade (Microsoft + Google)

**Routing:**
- `frontend/src/app/appRoutes.ts`: Centralized route definitions with RBAC roles
- `frontend/src/app/router.tsx`: React Router config with lazy loading
- `frontend/src/services/routes.ts`: API route builder functions

**Types:**
- `frontend/src/types/index.ts`: All domain interfaces (Building, Meter, Reading, Alert, etc.)
- `frontend/src/types/auth.ts`: Auth types (Role, AuthUser)

## Naming Conventions

**Files (Backend):**
- Entities: `<name>.entity.ts` (e.g., `meter.entity.ts`, `reading.entity.ts`)
- Controllers: `<domain>.controller.ts` (e.g., `meters.controller.ts`)
- Services: `<domain>.service.ts` (e.g., `meters.service.ts`)
- Modules: `<domain>.module.ts` (e.g., `meters.module.ts`)
- DTOs: `dto/<name>.dto.ts` (e.g., `dto/auth-response.dto.ts`)
- Utilities: `<name>.util.ts` (e.g., `meter-status.util.ts`)
- Standalone Lambdas: `<name>.ts` at `src/` root (e.g., `offline-alerts.ts`)

**Files (Frontend):**
- Pages: `<Name>Page.tsx` in PascalCase (e.g., `BuildingsPage.tsx`, `MeterDetailPage.tsx`)
- Components: `<Name>.tsx` in PascalCase (e.g., `BuildingCard.tsx`, `StockChart.tsx`)
- Hooks: `use<Name>.ts` in camelCase (e.g., `useAuth.ts`, `useMeters.ts`)
- Stores: `use<Name>Store.ts` (e.g., `useAuthStore.ts`)
- Services: `<name>.ts` in camelCase (e.g., `api.ts`, `endpoints.ts`)
- Types: `<name>.ts` in camelCase (e.g., `auth.ts`, `index.ts`)

**Directories:**
- Backend domain modules: lowercase singular or plural matching NestJS convention (`meters/`, `auth/`, `buildings/`)
- Frontend features: lowercase kebab-case (`iot-devices/`, `drilldown/`, `buildings/`)
- Feature sub-components: always in a `components/` subdirectory

**SQL Migrations:**
- Pattern: `00N_<descriptive_name>.sql` (zero-padded sequential number)

## Where to Add New Code

**New Backend Domain Module:**
1. Create directory: `backend/src/<domain>/`
2. Create files following the standard pattern:
   - `<domain>.entity.ts` - TypeORM entity
   - `<domain>.service.ts` - Business logic
   - `<domain>.controller.ts` - REST endpoints (prefix with `@Controller('<domain>')`)
   - `<domain>.module.ts` - NestJS module (import TypeOrmModule.forFeature, export service)
3. If DTOs needed: create `backend/src/<domain>/dto/<name>.dto.ts`
4. Register module in `backend/src/app.module.ts` imports array
5. Add SQL migration: `sql/00N_<name>.sql` (next number in sequence)

**New Frontend Feature/Page:**
1. Create directory: `frontend/src/features/<feature-name>/`
2. Create page: `frontend/src/features/<feature-name>/<Name>Page.tsx` (named export)
3. Create supporting components in `frontend/src/features/<feature-name>/components/`
4. Add route definition in `frontend/src/app/appRoutes.ts` with path, label, and allowedRoles
5. Add lazy import + route entry in `frontend/src/app/router.tsx`
6. Add loading skeleton in `frontend/src/components/ui/Skeleton.tsx` if needed

**New API Query Hook (Frontend):**
1. Add API route builder in `frontend/src/services/routes.ts`
2. Add fetch function in `frontend/src/services/endpoints.ts`
3. Add corresponding type in `frontend/src/types/index.ts`
4. Create TanStack Query hook in `frontend/src/hooks/queries/use<Entity>.ts`
5. Re-export from `frontend/src/hooks/index.ts`

**New Shared UI Component:**
- Add to `frontend/src/components/ui/<Name>.tsx`

**New Auth Provider:**
- Config: `frontend/src/auth/<provider>Config.ts`
- Auth logic: `frontend/src/auth/<provider>Auth.ts`
- Hook: `frontend/src/hooks/auth/use<Provider>Auth.ts`
- Login button: `frontend/src/features/auth/components/<Provider>LoginButton.tsx`

**New Infrastructure Lambda:**
- Create directory: `infra/<lambda-name>/`
- Add `index.mjs`, `package.json`
- Deploy independently (not part of `backend/serverless.yml` unless scheduled)

**New Zustand Store:**
- Add to `frontend/src/store/use<Name>Store.ts`

## Special Directories

**`backend/.serverless/`:**
- Purpose: Serverless Framework build artifacts (CloudFormation templates, deployment zip)
- Generated: Yes
- Committed: Yes (currently committed, but typically should be gitignored)

**`backend/dist/`:**
- Purpose: Compiled NestJS JavaScript output
- Generated: Yes
- Committed: Should not be (build output)

**`frontend/dist/`:**
- Purpose: Vite production build output
- Generated: Yes
- Committed: Should not be (deployed to S3 via CI)

**`infra/*/node_modules/`:**
- Purpose: Dependencies for standalone infra scripts
- Generated: Yes
- Committed: Should not be

**`docs/`:**
- Purpose: Project documentation, specs, data files
- Generated: No
- Committed: Yes

**`patterns/`:**
- Purpose: Architecture pattern documentation for Claude reference
- Generated: No
- Committed: Yes

**`skills/`:**
- Purpose: Claude skill files (deployment instructions)
- Generated: No
- Committed: Yes

---

*Structure analysis: 2026-03-09*

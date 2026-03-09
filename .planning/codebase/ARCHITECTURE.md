# Architecture

**Analysis Date:** 2026-03-09

## Pattern Overview

**Overall:** Monolithic modular backend (NestJS) + SPA frontend (React), deployed as serverless (AWS Lambda) with PostgreSQL RDS.

**Key Characteristics:**
- Domain-module organization in both frontend and backend
- Serverless deployment: NestJS wrapped in `@vendia/serverless-express` behind API Gateway
- Scheduled Lambda functions for background tasks (synthetic readings, offline alerts)
- No middleware-based auth guard; JWT verification is done per-controller via manual `extractToken()` calls
- Heavy use of raw SQL and Postgres CTEs for hierarchical and time-series queries
- Frontend uses TanStack Query for server state, Zustand for auth state, React Router for navigation
- RBAC enforced on frontend via route-level `ProtectedRoute`; backend has no auth middleware/guard

## Layers

**Frontend - Presentation Layer:**
- Purpose: SPA with routing, auth, data fetching, and visualization
- Location: `frontend/src/`
- Contains: React components, pages, hooks, services, stores, types
- Depends on: Backend API via `/api` prefix (proxied in dev, CloudFront in prod)
- Used by: End users via browser

**Backend - API Layer (Controllers):**
- Purpose: HTTP endpoints with Swagger documentation
- Location: `backend/src/*/`.controller.ts`
- Contains: Route handlers, parameter validation, Swagger decorators
- Depends on: Service layer
- Used by: Frontend SPA, Swagger UI

**Backend - Service Layer:**
- Purpose: Business logic, database queries, data transformation
- Location: `backend/src/*/*.service.ts`
- Contains: TypeORM repository queries, raw SQL, aggregation logic
- Depends on: TypeORM repositories, DataSource for raw queries
- Used by: Controllers, scheduled Lambda handlers

**Backend - Data Layer (Entities):**
- Purpose: TypeORM entity definitions mapping to PostgreSQL tables
- Location: `backend/src/*/*.entity.ts`
- Contains: Column mappings, relations, Swagger decorators
- Depends on: PostgreSQL schema
- Used by: Service layer via TypeORM repositories

**Infrastructure Layer:**
- Purpose: Standalone Lambda functions for background data processing
- Location: `infra/synthetic-generator/`, `infra/reimport-readings/`, `infra/backfill-gap/`
- Contains: Node.js scripts using `pg` client directly (not TypeORM)
- Depends on: PostgreSQL RDS directly
- Used by: EventBridge schedules

## Data Flow

**User Authentication:**

1. User clicks Microsoft or Google login button on `LoginPage`
2. OAuth provider returns JWT (id_token) stored in `sessionStorage` as `access_token`
3. Frontend calls `GET /api/auth/me` with `Bearer` token via Axios interceptor (`frontend/src/services/api.ts`)
4. Backend `AuthController` extracts token, `AuthService.verifyToken()` detects provider from `iss` claim
5. JWT verified against provider's JWKS endpoint (Microsoft or Google) using `jose` library
6. `AuthService.resolveUser()` upserts user in DB, loads role permissions from `role_permissions` table
7. Returns `{ user, permissions }` to frontend; stored in Zustand `useAuthStore`

**Meter Readings Flow (Real-time Simulation):**

1. EventBridge triggers `infra/synthetic-generator/index.mjs` every 1 minute
2. Lambda reads all meters and their last energy reading from PostgreSQL
3. Generates synthetic readings using Box-Muller normal distribution from statistical profiles (`profiles.json`)
4. Batch INSERTs readings into `readings` table, updates `meters.last_reading_at`
5. Frontend fetches via `GET /api/meters/:id/readings?resolution=hourly&from=...&to=...`
6. Backend aggregates with `date_trunc` + `AVG/MAX` SQL, returns time-series JSON
7. Frontend renders via Highcharts Stock in `StockChart.tsx`

**Offline Alert Detection:**

1. EventBridge triggers `backend/src/offline-alerts.ts` every 5 minutes
2. Handler bootstraps NestJS app context, calls `AlertsService.scanOfflineMeters()`
3. Compares each meter's `last_reading_at` against 5-minute threshold
4. Creates `METER_OFFLINE` alerts for newly offline meters, resolves alerts for recovered meters
5. Frontend polls `GET /api/alerts?status=active` every 60s in `Layout.tsx` for banner display

**Hierarchical Drill-down:**

1. User navigates to `/monitoring/drilldown/:buildingId`
2. Frontend fetches hierarchy tree via `GET /api/hierarchy/:buildingId`
3. On node click, fetches children with consumption via `GET /api/hierarchy/node/:nodeId/children`
4. Backend uses recursive CTEs (`WITH RECURSIVE subtree`) to aggregate all meters in subtree
5. Returns `{ totalKwh, avgPowerKw, peakPowerKw, meterCount, status }` per child node
6. Consumption time-series fetched via `GET /api/hierarchy/node/:nodeId/consumption`

**State Management:**
- **Server state:** TanStack Query v5 with `staleTime: Infinity` default, per-query overrides
- **Auth state:** Zustand store (`useAuthStore`) persisted to `sessionStorage`
- **UI state:** Zustand store (`useAppStore`) for sidebar toggle
- **No global app state beyond auth and sidebar** - all data flows through TanStack Query

## Key Abstractions

**NestJS Modules:**
- Purpose: Domain-bounded containers grouping controller + service + entities
- Examples: `backend/src/meters/meters.module.ts`, `backend/src/alerts/alerts.module.ts`, `backend/src/hierarchy/hierarchy.module.ts`
- Pattern: Standard NestJS module with `TypeOrmModule.forFeature([Entity])` for repository injection

**TanStack Query Hooks:**
- Purpose: Encapsulate API calls with caching, refetching, and loading states
- Examples: `frontend/src/hooks/queries/useMeters.ts`, `frontend/src/hooks/queries/useBuildings.ts`, `frontend/src/hooks/queries/useAlerts.ts`
- Pattern: One `useQuery()` call per API endpoint, exported as named function `use<Entity><Action>()`

**Feature Pages:**
- Purpose: Top-level route components combining data hooks with UI components
- Examples: `frontend/src/features/buildings/BuildingsPage.tsx`, `frontend/src/features/meters/MeterDetailPage.tsx`
- Pattern: Page component uses query hooks, passes data to child components in `components/` subfolder

**API Route Map:**
- Purpose: Single source of truth for all backend API paths
- Examples: `frontend/src/services/routes.ts` (path builders), `frontend/src/services/endpoints.ts` (typed fetch functions)
- Pattern: `routes.ts` exports path-builder functions, `endpoints.ts` wraps each in Axios call with type annotation

**Hierarchy Node Tree:**
- Purpose: Represent building electrical topology (Building > Panel > Subpanel > Circuit)
- Examples: `backend/src/hierarchy/hierarchy-node.entity.ts`, `backend/src/hierarchy/hierarchy.service.ts`
- Pattern: Adjacency list with `parent_id`, queried via recursive CTEs; leaf nodes link to `meter_id`

## Entry Points

**Main API Lambda:**
- Location: `backend/src/serverless.ts`
- Triggers: API Gateway HTTP `{method} /api/{proxy+}`
- Responsibilities: Bootstrap NestJS app (cached), wrap in serverless-express, handle all API requests

**Local Development Server:**
- Location: `backend/src/main.ts`
- Triggers: `npm run start:dev`
- Responsibilities: Standard NestJS bootstrap with Swagger UI at `/api/docs`

**Offline Alerts Lambda:**
- Location: `backend/src/offline-alerts.ts`
- Triggers: EventBridge `rate(5 minutes)`
- Responsibilities: Bootstrap NestJS app context (not HTTP), run `AlertsService.scanOfflineMeters()`

**Synthetic Readings Generator:**
- Location: `infra/synthetic-generator/index.mjs`
- Triggers: EventBridge `rate(1 minute)` (configured outside `serverless.yml`)
- Responsibilities: Generate and insert synthetic meter readings using statistical profiles

**Frontend SPA:**
- Location: `frontend/src/main.tsx`
- Triggers: Browser navigation to `energymonitor.click`
- Responsibilities: Mount React app with MsalProvider, QueryClient, RouterProvider

## Error Handling

**Strategy:** Minimal - relies on NestJS built-in exception filters and frontend error boundaries

**Patterns:**
- Backend controllers throw `NotFoundException` for missing resources; other errors propagate as 500
- `ValidationPipe({ whitelist: true, transform: true })` applied globally for DTO validation
- Frontend wraps every route in `<ErrorBoundary>` component (`frontend/src/components/ui/ErrorBoundary.tsx`)
- Axios 401 interceptor clears auth state and removes token (`frontend/src/services/api.ts`)
- TanStack Query handles retry/error states per query; no global error handler

## Cross-Cutting Concerns

**Logging:** NestJS `Logger` class used in services (`AuthService`, `AlertsService`). No structured logging framework. Frontend uses `console.error`.

**Validation:** NestJS `ValidationPipe` globally with `whitelist: true`. DTOs use `class-validator` decorators (e.g., `backend/src/auth/dto/auth-response.dto.ts`). No validation on query params beyond TypeScript types.

**Authentication:** JWT verification in `AuthService.verifyToken()` using `jose` library. Token extracted manually per controller method - no NestJS Guard. Frontend sends `Bearer` token via Axios request interceptor.

**Authorization:** Frontend-only via `ProtectedRoute` component checking `allowedRoles` array from `appRoutes.ts`. Backend has NO authorization checks - any valid JWT accesses all endpoints. 7 roles defined: `SUPER_ADMIN`, `CORP_ADMIN`, `SITE_ADMIN`, `OPERATOR`, `ANALYST`, `TENANT_USER`, `AUDITOR`.

**API Documentation:** Swagger/OpenAPI via `@nestjs/swagger` decorators on controllers and entities. Setup in `backend/src/swagger.ts`.

---

*Architecture analysis: 2026-03-09*

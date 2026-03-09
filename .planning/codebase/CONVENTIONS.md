# Coding Conventions

**Analysis Date:** 2026-03-09

## Language Policy

**UI text:** Spanish (labels, titles, error messages, tooltips, Swagger descriptions)
**Code:** English (variables, functions, types, commit messages, file names)

Examples:
- UI: `"Edificios"`, `"Medidor no encontrado"`, `"Algo salio mal"`
- Code: `fetchBuildings()`, `getMeterStatus()`, `BuildingsPage`

## Naming Patterns

**Files:**
- React components: PascalCase — `BuildingsPage.tsx`, `MeterCard.tsx`, `StockChart.tsx`
- Hooks: camelCase with `use` prefix — `useMeters.ts`, `useAuth.ts`, `useAuthStore.ts`
- Services/utils: camelCase — `api.ts`, `endpoints.ts`, `routes.ts`, `meter-status.util.ts`
- NestJS backend files: kebab-case with suffix — `meters.service.ts`, `meters.controller.ts`, `meter.entity.ts`, `meters.module.ts`
- DTOs: kebab-case with `.dto.ts` suffix — `building-response.dto.ts`, `auth-response.dto.ts`
- SQL migrations: numbered prefix — `sql/004_meters_readings.sql`

**Functions:**
- camelCase for all functions: `findAll()`, `fetchMeterReadings()`, `useMeterUptime()`
- Frontend fetch functions: `fetch<Entity>` pattern — `fetchBuildings()`, `fetchMeter()`, `fetchMeterReadings()`
- Frontend hooks: `use<Entity>` pattern — `useBuildings()`, `useMeter()`, `useMeterReadings()`
- Backend service methods: `findAll()`, `findOne()`, `findByBuilding()`, `getOverview()`, `getUptimeSummary()`
- Helper/utility functions: descriptive camelCase — `pickResolution()`, `getMeterStatus()`, `buildPath()`

**Variables:**
- camelCase: `buildingId`, `lastReadingAt`, `meterRepo`
- Constants: UPPER_SNAKE_CASE — `OFFLINE_ALERT_TYPE`, `OFFLINE_THRESHOLD_MINUTES`, `ALARM_LABELS`
- Boolean state: `is` prefix — `isLoading`, `isAuthenticated`, `is3P`

**Types/Interfaces:**
- PascalCase: `Building`, `Meter`, `Reading`, `HierarchyNode`, `AlertSeverity`
- Type unions: PascalCase with descriptive name — `AlertStatus`, `AlertSeverity`, `Resolution`
- Props interfaces: `<ComponentName>Props` — `StockChartProps`, `DataTableProps<T>`
- Store interfaces: `<Store>Store` — `AuthStore`

## Code Style

**Formatting:**
- No Prettier configured (not present in project)
- Consistent use of single quotes in frontend
- Trailing commas in multi-line structures
- 2-space indentation
- Semicolons used consistently

**Linting:**
- Frontend: ESLint 9 flat config at `frontend/eslint.config.js`
  - Extends: `@eslint/js` recommended, `typescript-eslint` recommended, `react-hooks` recommended, `react-refresh` vite
  - No custom rules added
- Backend: ESLint referenced in `npm run lint` script (`eslint "{src,test}/**/*.ts"`) but no config file present in backend root

**TypeScript:**
- Frontend: strict mode with `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`, target ES2022
  - Config: `frontend/tsconfig.app.json`
- Backend: strict mode with `emitDecoratorMetadata`, `experimentalDecorators`, target ES2022
  - Config: `backend/tsconfig.json`
- Use definite assignment assertion (`!`) for entity properties: `id!: string`
- Use `type` keyword for type-only imports: `import type { Building } from '../types'`

## Import Organization

**Order (frontend):**
1. React/library imports (`react`, `react-router`, `highcharts`)
2. UI components (`../../components/ui/PageHeader`)
3. Hooks (`../../hooks/queries/useMeters`)
4. Types (`../../types`, `../../types/auth`)
5. Feature-local components (`./components/BuildingCard`)

**Order (backend):**
1. NestJS framework imports (`@nestjs/common`, `@nestjs/typeorm`)
2. Third-party libs (`typeorm`, `jose`)
3. Local module imports (`./meter.entity`, `../meters/meters.service`)

**Path style:**
- Relative paths throughout (no aliases configured)
- Frontend: `../../components/ui/`, `../../hooks/queries/`, `../../services/`
- Backend: `./`, `../`

## Error Handling

**Frontend patterns:**
- TanStack Query handles API errors automatically (no try/catch in query hooks)
- Axios interceptors handle 401 globally at `frontend/src/services/api.ts` — clears auth store
- `ErrorBoundary` class component wraps all routes at `frontend/src/components/ui/ErrorBoundary.tsx`
- Manual try/catch in auth flows with user-facing Spanish error messages
- Pattern: catch `unknown`, cast to check for properties:
  ```typescript
  catch (err: unknown) {
    const status = (err as { response?: { status?: number } }).response?.status;
  }
  ```

**Backend patterns:**
- NestJS built-in exceptions: `throw new NotFoundException()`, `throw new UnauthorizedException('...')`
- Service methods return `null` for not-found (controller throws exception)
- `Logger` class from `@nestjs/common` for service-level logging: `this.logger.warn(...)`, `this.logger.log(...)`
- Auth token verification returns `null` on failure (not throw)
- Async operations wrapped in try/catch only when needed (e.g., token verification)

## Logging

**Frontend:**
- `console.error('[ComponentName]', error, ...)` with bracketed prefix
- Used sparingly: auth flows and ErrorBoundary only

**Backend:**
- NestJS `Logger` class: `private readonly logger = new Logger(ClassName.name)`
- `this.logger.warn(...)` for expected failures (token verification)
- `this.logger.log(...)` for operational events (alert sync results)

## Comments

**When to Comment:**
- JSDoc-style `/** ... */` for service methods explaining business logic
- Inline comments for non-obvious logic (SQL expressions, workarounds)
- `// NOTE:` prefix for important behavioral notes
- Highcharts monkey-patch has URL reference comment

**Examples from codebase:**
```typescript
/** Derive status from lastReadingAt: online if < 5 min ago */
// 15-min buckets: Postgres has no date_trunc for 15min, so compute manually
// NOTE: `selected` is NOT here — it's managed per-instance via initialSelected ref
```

## Function Design

**Size:** Most functions are focused and under 50 lines. Service methods can be longer when they contain raw SQL.

**Parameters:** Use object destructuring for component props. Use positional params for service methods with few arguments. Optional params use `?` suffix.

**Return Values:**
- Service methods return domain objects or `null` for not-found
- Frontend fetch functions return typed API responses via generics: `api.get<Building[]>(...).then(r => r.data)`
- Backend raw SQL results are manually mapped to camelCase objects with explicit Number() conversions

## Module Design

**Exports:**
- Named exports everywhere (no default exports except `api` axios instance)
- React components: named export from feature file — `export function BuildingsPage()`
- Hooks: named exports, one file per domain — `useMeters.ts` exports multiple hooks
- Barrel file at `frontend/src/hooks/index.ts` re-exports selected hooks

**Barrel Files:**
- `frontend/src/hooks/index.ts` — re-exports auth and query hooks
- `frontend/src/types/index.ts` — central type definitions

**Frontend API layer (3-file pattern):**
1. `frontend/src/services/routes.ts` — URL builders (typed path functions)
2. `frontend/src/services/endpoints.ts` — API call functions using axios
3. `frontend/src/hooks/queries/use<Domain>.ts` — TanStack Query wrappers

**Backend module pattern (NestJS standard):**
- `<domain>.entity.ts` — TypeORM entity with `@ApiProperty` decorators
- `<domain>.service.ts` — business logic with `@Injectable()`
- `<domain>.controller.ts` — HTTP handlers with Swagger decorators
- `<domain>.module.ts` — NestJS module wiring

## State Management

**Zustand store pattern:**
```typescript
// frontend/src/store/useAuthStore.ts
export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      // state
      user: null,
      // actions
      setUser: (user) => set({ user, isAuthenticated: true, error: null }),
    }),
    { name: 'storage-key', storage: createJSONStorage(() => sessionStorage) },
  ),
);
```
- Use `persist` middleware with `sessionStorage`
- `partialize` to select which state to persist

## React Patterns

**Component structure:**
- Function components only (except ErrorBoundary which is a class component)
- Lazy-loaded pages via `React.lazy()` with named re-export pattern:
  ```typescript
  const BuildingsPage = lazy(() => import('../features/buildings/BuildingsPage').then((m) => ({ default: m.BuildingsPage })));
  ```
- Every route wrapped in `<ErrorBoundary>` + `<Suspense>` with typed skeleton fallback
- `<ProtectedRoute>` with `allowedRoles` prop for RBAC

**Hooks usage:**
- `useParams<{ param: string }>()` with non-null assertion (`!`) when param is guaranteed by route
- `useCallback` for event handlers passed to child components
- `useMemo` for computed values (e.g., date ranges)
- `useRef` for mutable values that shouldn't trigger re-renders (e.g., `resolving`, `initialSelected`)

**Styling:**
- Tailwind CSS v4 utility classes inline
- Custom semantic color tokens: `text-text`, `text-muted`, `text-subtle`, `bg-base`, `bg-raised`, `border-border`, `bg-accent`
- Responsive grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`
- Status badges use conditional classes: `meter.status === 'online' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'`

## Backend Patterns

**Swagger documentation:**
- Every controller method decorated with `@ApiOperation`, `@ApiOkResponse`, `@ApiParam`, `@ApiQuery`
- Swagger descriptions in Spanish
- Entity properties decorated with `@ApiProperty({ example: ... })`

**TypeORM usage:**
- `autoLoadEntities: true` — no explicit entity array
- `synchronize: false` — schema managed via SQL migrations
- Query builder for complex queries, raw SQL for CTE recursive queries
- Manual camelCase mapping from snake_case raw query results:
  ```typescript
  rows.map((r: Record<string, unknown>) => ({
    buildingId: r.buildingId,
    voltageL1: r.voltageL1 != null ? Number(r.voltageL1) : null,
  }));
  ```

**Validation:**
- Global `ValidationPipe` with `whitelist: true, transform: true` at `backend/src/serverless.ts`
- `class-validator` and `class-transformer` available but lightly used

---

*Convention analysis: 2026-03-09*

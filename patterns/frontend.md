# Frontend Patterns

## API Layer (3-file pattern)

```
routes.ts          → URL builders: buildPath('/meters', id)
endpoints.ts       → Axios calls: fetchMeter(id) → api.get<Meter>(routes.meter(id))
hooks/queries/     → TanStack Query: useMeter(id) → useQuery({ queryKey, queryFn })
```

Agregar nuevo endpoint: route builder → fetch function → query hook → re-export en `hooks/index.ts`.

## State Management

| Tipo | Herramienta | Persistencia |
|---|---|---|
| Server state | TanStack Query v5 | Cache en memoria |
| Auth state | Zustand (`useAuthStore`) | `sessionStorage` via `persist` middleware |
| UI state | Zustand (`useAppStore`) | No persiste |

```typescript
// Zustand pattern
export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user, isAuthenticated: true }),
    }),
    { name: 'auth-store', storage: createJSONStorage(() => sessionStorage) },
  ),
);
```

## TanStack Query Cache Strategy

| Query | staleTime | refetchInterval |
|---|---|---|
| buildings, building detail, auth/me | `Infinity` | — |
| consumption, readings | `0` (`keepPreviousData`) | — |
| meters overview, alerts | `30s` | `30s` |

## Routing & RBAC

```typescript
// appRoutes.ts — definición centralizada
{ path: '/buildings', label: 'Edificios', allowedRoles: ['SUPER_ADMIN', 'CORP_ADMIN'] }

// router.tsx — lazy loading
const Page = lazy(() => import('../features/foo/FooPage').then(m => ({ default: m.FooPage })));

// Cada ruta: <ErrorBoundary> + <Suspense fallback={Skeleton}> + <ProtectedRoute allowedRoles={[...]}>
```

RBAC solo en frontend. Backend no valida roles.

## Component Structure

```
features/<domain>/
  <Domain>Page.tsx          ← named export, top-level route
  components/
    <ComponentA>.tsx        ← supporting components
    <ComponentB>.tsx
```

- Function components only (excepto `ErrorBoundary` class component)
- Named exports everywhere
- Props via interface: `<Component>Props`

## Styling — Tailwind v4

Tokens semánticos custom:
```
text-text, text-muted, text-subtle
bg-base, bg-raised, bg-accent
border-border
```

Grid responsive: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`
Status badges: conditional classes por estado online/offline.

## Highcharts Stock Pattern

```typescript
// StockChart.tsx wrapper
// - Navigator + range selector
// - afterSetExtremes callback → cambia resolución en parent
// - Resolución: ≤36h→15min, ≤7d→hourly, >7d→daily
// - Bugs conocidos: hoverPoint crash, zoom blocking, rangeSelector reset (ver ISSUES_&_FIXES.md)
```

## Auth Flow

```
Login → Microsoft (MSAL redirect) | Google (credential/One Tap)
  → JWT en sessionStorage como 'access_token'
  → Axios interceptor inyecta Bearer
  → GET /api/auth/me → backend verifica JWKS
  → Zustand store: user + permissions

useAuth.ts: fachada unificada
  - useEffect con ref guard (resolving.current) para evitar double-resolution en redirect
  - 401 Axios interceptor → limpia auth store + sessionStorage
```

## React Patterns

- `useParams<{id: string}>()` con `!` non-null assertion cuando param garantizado por ruta
- `useCallback` para handlers pasados a children
- `useMemo` para computed values (date ranges)
- `useRef` para valores mutables sin re-render (`resolving`, `initialSelected`)
- `import type { X }` para type-only imports

## DataTable Pattern

```typescript
// TanStack Table v8 wrapper en components/ui/DataTable.tsx
// - Sorting, filtering headless
// - Columnas definidas con columnHelper
// - Renderizado con Tailwind classes
```

## Error Handling

- `ErrorBoundary` class component wraps cada ruta
- Axios 401 interceptor → clear auth
- TanStack Query maneja retry/error per query
- Auth flows: try/catch manual con mensajes en español
- `catch (err: unknown)` → cast para properties

## UI Components (components/ui/)

### Card
```typescript
interface CardProps { children: ReactNode; className?: string; onClick?: () => void; }
```
Contenedor con borde. Si `onClick` → cursor-pointer + hover accent border.

### DataTable
```typescript
interface DataTableProps<T> {
  data: T[]; columns: ColumnDef<T, any>[];
  highlightRowIndex?: number | null; onRowHover?: (index: number | null) => void;
  className?: string;
}
```
TanStack Table v8. Sorting por header click (↑↓). Row highlight vía prop o hover. Overflow-x responsive.

### PageHeader
```typescript
interface PageHeaderProps {
  title: string; breadcrumbs?: { label: string; to?: string }[]; showBack?: boolean;
}
```
H1 + breadcrumbs (separados por "/") + botón "← Volver" (`navigate(-1)`).

### Chart
```typescript
interface ChartProps {
  options: Highcharts.Options; className?: string;
  onPointHover?: (index: number | null) => void; highlightIndex?: number | null;
}
```
Highcharts wrapper. Dark theme. Point hover sync bidireccional (para sincronizar con DataTable). Height: 280px.

### StockChart
```typescript
interface StockChartProps {
  options: Highcharts.Options; className?: string;
  loading?: boolean; onRangeChange?: (min: number, max: number) => void;
}
```
Highcharts Stock. Navigator (40px) + range selector (1D, 1S, 1M, Todo). Loading overlay spinner. `onRangeChange` → `afterSetExtremes`. Dual Y-axis support. MinRange: 1h. Height: 380px.

### ErrorBoundary
```typescript
interface Props { children: ReactNode; fallback?: ReactNode; }
```
Class component. `getDerivedStateFromError` → muestra error + "Reintentar" + "Ir al inicio". Logs `componentDidCatch` a console.

### Skeleton
```typescript
interface SkeletonProps { className?: string; }
```
Base: `animate-pulse bg-raised`. Presets exportados:
- `BuildingsPageSkeleton` — título + grid 4 cards
- `BuildingDetailSkeleton` — header + chart 380px + 6 meter cards
- `ChartSkeleton` — 380px placeholder
- `MetersGridSkeleton` — grid configurable (default 6)
- `DrilldownSkeleton` — header + breadcrumb + 2 charts 300px + tabla
- `MeterDetailSkeleton` — header + 2 charts 380px

### Layout
App shell. Sidebar 56px (logo, usuario, nav, logout) + content area + alerts banner. Mobile: hamburger + slide sidebar. `useAppStore` para toggle. `useAlerts` para badge/banner (60s refetch). Nav filtrado por `getNavItems(role)`.

## TypeScript Types (types/)

### types/index.ts — Domain
```
Building { id, name, address, totalArea, metersCount }
Meter { id, buildingId, model, phaseType, busId, modbusAddress, uplinkRoute, status, lastReadingAt }
Reading { timestamp, voltageL1-3, currentL1-3, powerKw, reactivePowerKvar, powerFactor, frequencyHz, energyKwhTotal, thdVoltagePct, thdCurrentPct, phaseImbalancePct, breakerStatus, digitalInput1-2, digitalOutput1-2, alarm, modbusCrcErrors }
ConsumptionPoint { timestamp, totalPowerKw, avgPowerKw, peakPowerKw }
HierarchyNode { id, parentId, buildingId, name, level, nodeType, meterId, sortOrder }
HierarchyChildSummary extends HierarchyNode { totalKwh, avgPowerKw, peakPowerKw, meterCount, status }
HierarchyNodeWithPath { node, path }
UptimeSummary { period, totalSeconds, uptimeSeconds, downtimeSeconds, uptimePercent, downtimeEvents }
UptimeAll { daily, weekly, monthly }
DowntimeEvent { downtimeStart, downtimeEnd, durationSeconds }
AlarmEvent { timestamp, alarm, voltageL1, currentL1, powerFactor, thdCurrentPct, modbusCrcErrors }
AlarmSummary { total, byType[] }
MeterOverview { id, buildingId, model, phaseType, busId, status, lastReadingAt, uptime24h, alarmCount30d }
Alert { id, type, severity, status, meterId, buildingId, title, message, triggeredAt, acknowledgedAt, resolvedAt, metadata }
AlertsSyncSummary { scannedMeters, createdAlerts, resolvedAlerts, activeOfflineAlerts, scannedAt }
Invoice { id, siteId, tenantId, period, kWh, kW, kVArh, energyCharge, demandCharge, reactiveCharge, fixedCharge, netTotal, tax, total, status }
AuditLog { id, userId, action, resource, resourceId, detail, ip, timestamp }
Tenant { id, siteId, name, rut, localId, meterId, contractStart, contractEnd, status }
Integration { id, name, type, status, lastSyncAt, recordsSynced, errors }
```
Types: `AlertSeverity`, `AlertStatus`, `Resolution`

### types/auth.ts
```
AuthProvider = 'microsoft' | 'google'
Role = 'SUPER_ADMIN' | 'CORP_ADMIN' | 'SITE_ADMIN' | 'OPERATOR' | 'ANALYST' | 'TENANT_USER' | 'AUDITOR'
AuthUser { id, email, name, role, provider, avatar?, siteIds }
AuthState { user, isAuthenticated, isLoading, error }
```

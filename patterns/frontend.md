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

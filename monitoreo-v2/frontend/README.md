# Frontend — Monitoreo V2

React 19 + Vite 8 + Tailwind v4 + TypeScript 5.9. Multi-tenant theming, cookie-based auth.

## Quick Start

```bash
npm ci
npm run dev          # http://localhost:5173 (proxies /api → localhost:4000)
npm run test         # Vitest, 185+ tests / 18 suites
npm run build        # tsc + vite build
npm run storybook    # Component catalog on port 6006
```

## Project Structure

```
src/
├── app/                  # Router, routes, lazy page imports
├── components/
│   ├── auth/             # ProtectedRoute, RequirePerms, SessionGate
│   ├── charts/           # Chart, StockChart, MonthlyChart (Highcharts)
│   ├── errors/           # ErrorBoundary, fallback UIs
│   ├── layout/           # AppLayout, Header, Sidebar, MainContentOutlet
│   ├── routing/          # LoginRouteShell
│   └── ui/               # Button, Card, Toggle, Modal, Drawer, DataTable,
│                           DropdownSelect, ConfirmDialog, TablePrimitives,
│                           CronBuilder, DataWidget, QueryStateView
├── features/             # Feature pages (38 pages across 14 domains)
│   ├── admin/            # users, roles, tenants, hierarchy, audit, settings, api-keys
│   ├── alerts/           # alerts, rules, escalation, notifications, history
│   ├── analytics/        # benchmark, trends, patterns
│   ├── auth/             # LoginPage
│   ├── billing/          # invoices, my-invoice, tariffs
│   ├── buildings/        # BuildingsPage + form
│   ├── dashboard/        # main, executive, executive-site, compare
│   ├── integrations/     # IntegrationsPage
│   ├── meters/           # MetersPage + form
│   ├── monitoring/       # realtime, drilldown, demand, quality, devices,
│   │                       fault-history, meters-by-type, generation, modbus-map
│   └── reports/          # ReportsPage
├── hooks/
│   ├── auth/             # useAuth, useSessionResolver, useMicrosoftAuth, useGoogleAuth
│   └── queries/          # 19 TanStack Query hooks (useXQuery pattern)
├── lib/                  # chart-config, tenant-theme, fetchError
├── services/             # api.ts (Axios), routes.ts, endpoints.ts
├── store/                # useAuthStore, useAppStore (Zustand)
└── types/                # 21 TypeScript entity types
```

## Patterns

### API Layer (3-file)
```
services/routes.ts → services/endpoints.ts → hooks/queries/useXQuery.ts
```
Routes define paths, endpoints define Axios calls, hooks wrap in TanStack Query.

### State
- **Server state**: TanStack Query v5 (cache, refetch, mutations)
- **Client state**: Zustand — `useAuthStore` (session, user, tenant) + `useAppStore` (sidebar, theme, selectedBuilding)

### Auth
- OAuth login (Microsoft MSAL / Google) → backend issues JWT in httpOnly cookie
- `SessionGate` resolves session on app load
- `ProtectedRoute` checks authentication
- `RequirePerms` checks permissions per route (47 protected routes)
- No tokens in localStorage/sessionStorage

### Multi-Tenant Theming
- CSS variables: `--color-primary`, `--color-secondary`, `--color-sidebar`, `--color-accent`
- `applyTenantTheme()` sets vars + document.title + favicon from tenant config
- `[data-theme]` attribute on `<html>` for theme-specific overrides

### Routing
- `app/routes.ts` defines all paths
- `app/router.tsx` maps routes to lazy-loaded pages with `RequirePerms`
- `app/lazyPages.ts` handles dynamic imports with Suspense

### UI Components
- Atomic: Button, Card, Toggle, Modal, Drawer, DropdownSelect
- Composed: ConfirmDialog, DataTable, DataWidget, CronBuilder
- Table: Th, Td, StatusBadge, ActionBtn primitives
- Charts: Chart, StockChart, MonthlyChart (Highcharts, theme-aware via CSS vars)

### Sidebar
- Accordion navigation with 7 collapsible groups
- Permission-based visibility (`hasAny()`)
- Active group auto-expands based on current route
- Admin section with Audit sub-accordion

## Testing

```bash
npm run test         # single run
npm run test:watch   # watch mode
```

- **Framework**: Vitest + @testing-library/react + jsdom
- **Coverage**: 185+ tests / 18 suites
- **What's tested**: stores, hooks, UI components, aggregation logic, theme utils

## Design System

Reference docs in `design-system/` (10 files):
colors, typography, layout, borders, buttons, cards, animations, contrast, components, images.

Patterns applied: `transition-all duration-150`, `active:scale`, backdrop-blur on overlays, `prefers-reduced-motion` support.

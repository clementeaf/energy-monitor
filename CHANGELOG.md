# Changelog

## [0.2.0-alpha.1] - 2026-03-04

### Added

- **Dependencias MSAL**: `@azure/msal-browser`, `@azure/msal-react` para autenticación Microsoft
- **Tipos de autenticación** (`src/types/auth.ts`): `AuthProvider`, `Role` (7 roles), `AuthUser`, `AuthState`
- **Tipos de dominio** (`src/types/index.ts`): `Meter`, `HierarchyNode`, `Reading`, `Alert`, `Invoice`, `AuditLog`, `Tenant`, `Integration`
- **Variables de entorno**: `.env` y `.env.example` con config para Microsoft Entra y modo auth
- **Tipado de env vars** (`src/env.d.ts`): `ImportMetaEnv` con las 4 variables VITE\_

### Changed

- `.gitignore` actualizado para excluir `.env` y `.env.local`

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

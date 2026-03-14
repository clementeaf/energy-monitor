# Frontend: Vistas y Datos

> **Estado actual (2026-03-14):** Auth deshabilitado. TempLayout sin auth. API apunta a `localhost:4000`. Solo buildings conectado a backend. Theme light.

## Vistas activas

| Ruta | Vista | En nav | Conectada |
|------|-------|--------|-----------|
| `/` | Edificios | si | si — `GET /api/buildings` |
| `/buildings/:name` | Detalle edificio | — | si — `GET /api/buildings/:name` |
| `/meters/:meterId` | Detalle medidor | — | no (shell) |
| `/monitoring/realtime` | Monitoreo | si | no (shell) |
| `/monitoring/devices` | Dispositivos | si | no (shell) |
| `/alerts` | Alertas | si | no (shell) |
| `/alerts/:id` | Detalle alerta | — | no (shell) |

## Hooks activos

| Hook | Endpoint | Tipo retorno |
|------|----------|--------------|
| `useBuildings()` | `GET /api/buildings` | `BuildingSummary[]` |
| `useBuilding(name)` | `GET /api/buildings/:name` | `BuildingSummary[]` |

## Tipo único: BuildingSummary

```
BuildingSummary {
  buildingName, month, totalStores, storeTypes,
  totalMeters, assignedMeters, unassignedMeters, areaSqm,
  totalKwh, totalPowerKw, avgPowerKw, peakPowerKw,
  totalReactiveKvar, avgPowerFactor, peakDemandKw
}
```

## API

- Base: `http://localhost:4000/api`
- Sin interceptors de auth
- Sin headers custom

## Infra auth (conservada, no activa)

- `useAuthStore`, `useAppStore` — Zustand stores
- `useAuthQuery` — hook de auth
- `ProtectedRoute` — componente guard
- `appRoutes` + `permissions` — rutas y RBAC
- `types/auth.ts` — `Role`, `AuthUser`, `AuthProvider`

## Eliminado en esta sesión

- Features: admin, billing, drilldown, auth pages
- Componentes: BuildingCard, MeterCard, charts, badges, tables, panels
- Hooks: useAlerts, useMeters, useHierarchy, useAdminUsers, useBilling
- Layout.tsx (reemplazado por TempLayout)
- Tipos: todos excepto BuildingSummary

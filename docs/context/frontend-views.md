# Frontend: Vistas y Datos

> **Estado actual (2026-03-14):** Auth deshabilitado. TempLayout sin auth. API apunta a `localhost:4000`. Theme light.

## Vistas activas

| Ruta | Vista | En nav | Conectada |
|------|-------|--------|-----------|
| `/` | Edificios | si | si — cards con stats, click navega a detalle |
| `/buildings/:name` | Detalle edificio | — | si — `GET /api/buildings/:name` |
| `/meters/:meterId` | Detalle medidor | — | no (shell) |
| `/monitoring/realtime` | Monitoreo | si | no (shell) |
| `/monitoring/devices` | Dispositivos | si | no (shell) |
| `/alerts` | Alertas | si | no (shell) |
| `/alerts/:id` | Detalle alerta | — | no (shell) |

## Componentes UI

| Componente | Ubicación | Uso |
|------------|-----------|-----|
| `Card` | `components/ui/Card.tsx` | Container clickeable con hover gris sutil |
| `Skeleton` | `components/ui/Skeleton.tsx` | Loading states por vista |

## BuildingsPage

- Usa `<Card>` con `onClick` → navega a `/buildings/:name`
- Header: nombre edificio + badge gris "X medidores"
- Grid 2x2: consumo (kWh), potencia prom. (kW), demanda peak (kW), factor potencia
- Footer: tiendas + área (m²)
- Formato numérico `es-CL`

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
- CSP: `connect-src` incluye `http://localhost:4000`
- Sin interceptors de auth

## Infra auth (conservada, no activa)

- `useAuthStore`, `useAppStore` — Zustand stores
- `useAuthQuery` — hook de auth
- `ProtectedRoute` — componente guard
- `appRoutes` + `permissions` — rutas y RBAC
- `types/auth.ts` — `Role`, `AuthUser`, `AuthProvider`

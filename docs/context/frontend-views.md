# Frontend: Vistas y Datos

> **Estado actual (2026-03-14):** Auth deshabilitado. TempLayout sin auth. API apunta a `localhost:4000`. Theme light.

## Vistas activas

| Ruta | Vista | En nav | Conectada |
|------|-------|--------|-----------|
| `/` | Edificios | si | si — cards con stats, click navega a detalle |
| `/buildings/:id` | Detalle edificio | — | si — gráfico + tabla facturación |
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
| `PageHeader` | `components/ui/PageHeader.tsx` | Breadcrumbs + botón volver, título opcional |
| `BillingChart` | `features/buildings/components/BillingChart.tsx` | Highcharts columnas stacked (Neto + IVA) |
| `BillingTable` | `features/buildings/components/BillingTable.tsx` | 12 columnas, scroll horizontal, total anual |

## BuildingsPage

- `<Card>` con `onClick` → navega a `/buildings/:name`
- Header: nombre edificio
- Grid 2x2: consumo (kWh), potencia prom. (kW), demanda peak (kW), factor potencia
- Footer: medidores + área (m²)
- Formato numérico `es-CL`

## BuildingDetailPage

- Breadcrumbs (Edificios → nombre) + botón volver, sin título
- `BillingChart`: columnas stacked por mes (Neto gris oscuro, IVA gris claro)
- `BillingTable`: consumo kWh, energía $, dda. máx., dda. punta, kWh troncal, kWh serv. público, cargo fijo, neto, IVA, exento, total c/IVA — scroll horizontal, scroll vertical interno

## Hooks activos

| Hook | Endpoint | Tipo retorno |
|------|----------|--------------|
| `useBuildings()` | `GET /api/buildings` | `BuildingSummary[]` |
| `useBuilding(name)` | `GET /api/buildings/:name` | `BuildingSummary[]` |
| `useBilling(buildingName)` | `GET /api/billing/:buildingName` | `BillingMonthlySummary[]` |

## Tipos

```
BuildingSummary {
  buildingName, month, totalStores, storeTypes,
  totalMeters, assignedMeters, unassignedMeters, areaSqm,
  totalKwh, totalPowerKw, avgPowerKw, peakPowerKw,
  totalReactiveKvar, avgPowerFactor, peakDemandKw
}

BillingMonthlySummary {
  month, totalMeters, totalKwh, energiaClp, ddaMaxKw,
  ddaMaxPuntaKw, kwhTroncal, kwhServPublico, cargoFijoClp,
  totalNetoClp, ivaClp, montoExentoClp, totalConIvaClp
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

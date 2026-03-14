# Frontend: Vistas y Datos

> **Estado actual (2026-03-14):** Auth deshabilitado. TempLayout sin auth. API apunta a `localhost:4000`. Theme light.

## Vistas activas

| Ruta | Vista | En nav | Conectada |
|------|-------|--------|-----------|
| `/` | Edificios | si | si — cards con stats, click navega a detalle |
| `/buildings/:id` | Detalle edificio | — | si — gráfico, tabla facturación, listado remarcadores |
| `/meters/:meterId` | Detalle medidor | — | si — gráfico consumo mensual kWh |
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
| `BillingChart` | `features/buildings/components/BillingChart.tsx` | Highcharts columnas por mes, métrica dinámica vía prop |
| `BillingMetricSelector` | `features/buildings/components/BillingMetricSelector.tsx` | Dropdown custom con 11 métricas, `onHover` para preview en tabla |
| `BillingTable` | `features/buildings/components/BillingTable.tsx` | 12 columnas, sticky thead/tfoot, highlight columna, filtro de meses |
| `MetersTable` | `features/buildings/components/MetersTable.tsx` | 3 columnas (Medidor, Tienda, Tipo), paginación de 10, thead sticky, click → detalle medidor |
| `MonthlyColumnChart` | `components/charts/MonthlyColumnChart.tsx` | Gráfico genérico de columnas por mes (Highcharts), usado por BillingChart y MeterDetailPage |

## BuildingsPage

- `<Card>` con `onClick` → navega a `/buildings/:name`
- Header: nombre edificio
- Grid 2x2: consumo (kWh), potencia prom. (kW), demanda peak (kW), factor potencia
- Footer: medidores + área (m²)
- Formato numérico `es-CL`

## BuildingDetailPage

- Header: botón volver + nombre edificio en línea
- `BillingMetricSelector` + `BillingChart`: selector dropdown elige métrica, gráfico muestra columnas por mes
- Selector ↔ Tabla: métrica seleccionada destaca columna (`bg-blue-50`), hover en dropdown previsualiza columna (`bg-blue-50/60`)
- Tabs en card inferior:
  - **Detalle Facturación:** `BillingTable` — scroll interno, sticky thead/tfoot, header "Mes" filtra filas por mes (checkboxes + "Todo")
  - **Listado Remarcadores:** `MetersTable` — paginación de 10, columnas y paginador siempre visibles, click → `/meters/:meterId`
- Medidores sin tienda muestran "Por censar" (muted), sin tipo muestra "—"

## MeterDetailPage

- Header: botón volver + meterId
- Gráfico de consumo mensual (kWh) con `MonthlyColumnChart`
- Datos vía `useMeterMonthly(meterId)` → `GET /api/meter-monthly/:meterId`

## Hooks activos

| Hook | Endpoint | Tipo retorno |
|------|----------|--------------|
| `useBuildings()` | `GET /api/buildings` | `BuildingSummary[]` |
| `useBuilding(name)` | `GET /api/buildings/:name` | `BuildingSummary[]` |
| `useBilling(buildingName)` | `GET /api/billing/:buildingName` | `BillingMonthlySummary[]` |
| `useMetersByBuilding(name)` | `GET /api/meters/building/:name` | `MeterListItem[]` |
| `useMeterMonthly(meterId)` | `GET /api/meter-monthly/:meterId` | `MeterMonthly[]` |

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

MeterListItem {
  meterId, storeName, storeType
}

MeterMonthly {
  meterId, month, totalKwh, avgPowerKw, peakPowerKw,
  totalReactiveKvar, avgPowerFactor
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

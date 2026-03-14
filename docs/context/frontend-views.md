# Frontend: Vistas y Datos

> **Estado actual (2026-03-14):** Auth deshabilitado. TempLayout sin auth. API apunta a `localhost:4000`. Theme light.

## Vistas activas

| Ruta | Vista | En nav | Conectada |
|------|-------|--------|-----------|
| `/` | Dashboard | si | no — data mock hardcodeada (15 edificios, 3 cards, tabla períodos) |
| `/buildings` | Edificios | si | si — cards con stats, click navega a detalle |
| `/buildings/:id` | Detalle edificio | — | si — gráfico, tabla facturación, listado remarcadores |
| `/meters/:meterId` | Detalle medidor | — | si — selector 5 métricas, gráfico dinámico, tabla con highlight |
| `/meters/:meterId/readings/:month` | Lecturas medidor | — | si — gráfico Diario/15min, tabla resumen diario |
| `/monitoring/realtime` | Monitoreo | si | si — tabla última lectura por medidor, refetch 60s |
| `/monitoring/devices` | Dispositivos | si | no (shell) |
| `/alerts` | Alertas | si | si — DataTable paginada con filtros avanzados |
| `/alerts/:id` | Detalle alerta | — | no (shell) |

## Componentes UI

| Componente | Ubicación | Uso |
|------------|-----------|-----|
| `Card` | `components/ui/Card.tsx` | Container clickeable con hover gris sutil |
| `Skeleton` | `components/ui/Skeleton.tsx` | Loading states por vista (cada ruta tiene skeleton propio) |
| `DataTable` | `components/ui/DataTable.tsx` | Tabla declarativa genérica con Column<T>: ReactNode values, headerRender, cellClassName, className por columna, footer opcional, bg-surface sticky |
| `PaginatedTable` | `components/ui/PaginatedTable.tsx` | Wrapper de DataTable con paginación client-side |
| `PageHeader` | `components/ui/PageHeader.tsx` | Breadcrumbs + botón volver, título opcional |
| `BillingChart` | `features/buildings/components/BillingChart.tsx` | Highcharts columnas por mes, métrica dinámica vía prop |
| `BillingMetricSelector` | `features/buildings/components/BillingMetricSelector.tsx` | Dropdown custom con 11 métricas, `onHover` para preview en tabla |
| `BillingTable` | `features/buildings/components/BillingTable.tsx` | Usa DataTable. 12 columnas, highlight columna via `className`, filtro meses via `headerRender` |
| `MetersTable` | `features/buildings/components/MetersTable.tsx` | Usa PaginatedTable. 3 columnas, `cellClassName` para dim "Por censar", click → detalle medidor |
| `MonthlyColumnChart` | `components/charts/MonthlyColumnChart.tsx` | Gráfico genérico por mes (Highcharts), toggle Barra/Línea, usado por BillingChart y MeterDetailPage |
| `MeterMetricSelector` | `features/meters/components/MeterMetricSelector.tsx` | Dropdown con 5 métricas del medidor, `onHover` para preview en tabla |
| `MeterMonthlyTable` | `features/meters/components/MeterMonthlyTable.tsx` | Usa DataTable. 6 columnas, highlight columna via `className`, click fila → lecturas |
| `MeterReadingsPage` | `features/meters/MeterReadingsPage.tsx` | Lecturas 15 min, gráfico Diario/15min, resumen diario via DataTable inline |

## DashboardPage

- Vista principal del holding (Parque Arauco S.A.)
- Data 100% mock hardcodeada (sin hooks, sin API)
- Tabla superior: 15 edificios con consumo kWh, gasto $, superficie m², medidores. Footer con totales
- 3 cards: Pagos Recibidos, Docs por Vencer, Docs Vencidos
- Tabla inferior: documentos vencidos por período (5 rangos de días, cantidad, saldo)
- Usa `DataTable` y `Card` existentes

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
- `MeterMetricSelector` + `MonthlyColumnChart`: selector elige métrica, gráfico dinámico con toggle Barra/Línea
- Selector ↔ Tabla: métrica seleccionada destaca columna (`bg-blue-50`), hover preview (`bg-blue-50/60`)
- `MeterMonthlyTable` debajo del gráfico — 5 métricas por mes, totales en footer
- Datos vía `useMeterMonthly(meterId)` → `GET /api/meter-monthly/:meterId` (orden ASC)
- Click en fila de tabla → navega a `/meters/:meterId/readings/:month`

## MeterReadingsPage

- Header: botón volver + meterId + mes en español + conteo de lecturas
- Selector de métrica (11 métricas de `meter_readings`)
- Gráfico con toggle Diario / 15 min:
  - **Diario:** Highcharts línea, 1 punto por hora (promedio), eje X = días del mes
  - **15 min:** Highcharts Stock light theme, navigator con rango default 2 días, datos crudos cada 15 min, eje Y a la izquierda (`opposite: false`)
- **Resumen diario:** DataTable inline, una fila por día, 9 columnas (Día, Lecturas, Pot. prom., Pot. peak, Volt. L1, Corr. L1, React., FP, Frec.), totales en footer
- Datos vía `useMeterReadings(meterId, from, to)` → `GET /api/meter-readings/:meterId?from=&to=`

## RealtimePage

- Sin título (el sidebar indica "Monitoreo")
- Card con DataTable: 7 columnas (Medidor, Tienda, Potencia kW, Voltaje L1, Corriente L1, FP, Estado)
- Datos vía `useMetersLatest(buildingName)` → `GET /api/meters/building/:name/latest` (refetch 60s)
- Estado: badge Online (<30 min), Delay (<2h), Offline (>2h) según antigüedad de timestamp
- Skeleton: 8 filas con pulso mientras carga

## AlertsPage

- DataTable paginada (10/pág), columnas anchos fijos via `table-fixed`
- 8 columnas: Medidor, Fecha, Tipo, Severidad, Campo, Valor, Umbral, Mensaje
- **Filtros checkbox (5 columnas):** Medidor, Tipo, Severidad, Campo, Umbral — dropdown con valores únicos y checkboxes. Renderizados via `createPortal` con `position: fixed`
- **Filtro fecha (columna Fecha):** dropdown con 3 secciones:
  - Ordenar: Ascendente / Descendente (checkbox toggle)
  - Filtrar por fecha: exacta (`<input date>`) o rango (desde/hasta)
  - Filtrar por hora: exacta (`<input time>`) o rango (desde/hasta)
  - Todos deseleccionables al hacer click en checkbox activo
  - Badge dinámico en header resume filtros activos
- Severidad con colores: rojo (critical), ámbar (warning), azul (info)
- Datos vía `useAlerts()` → `GET /api/alerts`
- Pipeline de filtrado: checkbox filters → date/time filter → sort

## Hooks activos

| Hook | Endpoint | Tipo retorno |
|------|----------|--------------|
| `useBuildings()` | `GET /api/buildings` | `BuildingSummary[]` |
| `useBuilding(name)` | `GET /api/buildings/:name` | `BuildingSummary[]` |
| `useBilling(buildingName)` | `GET /api/billing/:buildingName` | `BillingMonthlySummary[]` |
| `useMetersByBuilding(name)` | `GET /api/meters/building/:name` | `MeterListItem[]` |
| `useMeterMonthly(meterId)` | `GET /api/meter-monthly/:meterId` | `MeterMonthly[]` |
| `useMetersLatest(buildingName)` | `GET /api/meters/building/:name/latest` | `MeterLatestReading[]` (refetch 60s) |
| `useMeterReadings(meterId, from, to)` | `GET /api/meter-readings/:meterId?from=&to=` | `MeterReading[]` |

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

MeterLatestReading {
  meterId, storeName, powerKw, voltageL1, currentL1,
  powerFactor, timestamp
}

MeterReading {
  meterId, timestamp, voltageL1, voltageL2, voltageL3,
  currentL1, currentL2, currentL3, powerKw,
  reactivePowerKvar, powerFactor, frequencyHz, energyKwhTotal
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

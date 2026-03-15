# Frontend: Vistas y Datos

> **Estado actual (2026-03-15):** Auth deshabilitado. TempLayout sin auth. API apunta a `localhost:4000`. Design system PA aplicado (sidebar, dashboard, edificios, detalle edificio).

## Vistas activas

| Ruta | Vista | En nav | Conectada |
|------|-------|--------|-----------|
| `/` | Dashboard | si | si — gráfico + tabla edificios + cards de pago + tabla vencidos, todos con datos reales |
| `/buildings` | Edificios | si | si — cards con stats, click navega a detalle |
| `/buildings/:id` | Detalle edificio | — | si — gráfico, tabla facturación, listado remarcadores |
| `/meters/:meterId` | Detalle medidor | — | si — selector 5 métricas, gráfico dinámico, tabla con highlight |
| `/meters/:meterId/readings/:month` | Lecturas medidor | — | si — gráfico Diario/15min, tabla resumen diario |
| `/monitoring/realtime` | Monitoreo | si | si — tabla última lectura por medidor, refetch 60s |
| `/monitoring/devices` | Dispositivos | si | no (shell) |
| `/alerts` | Alertas | si | si — DataTable paginada con filtros avanzados |
| `/alerts/:id` | Detalle alerta | — | no (shell) |
| `/comparisons` | Comparativas | si | si — datos reales. Toggle Por Tipo/Por Tienda, MultiSelect con búsqueda, selector mes, gráfico toggle Barra/Línea, tabla por edificio |

## Componentes UI

| Componente | Ubicación | Uso |
|------------|-----------|-----|
| `Card` | `components/ui/Card.tsx` | Container sin borde, fondo blanco, rounded-xl. Hover gris sutil si clickeable |
| `Skeleton` | `components/ui/Skeleton.tsx` | Loading states por vista (cada ruta tiene skeleton propio) |
| `DataTable` | `components/ui/DataTable.tsx` | Tabla PA: header blanco texto navy semibold, filas con línea fina #E5E7EB, footer bg gris claro bold navy, h-full para igualar alturas en grid |
| `MultiSelect` | `components/ui/MultiSelect.tsx` | Dropdown con input búsqueda + checkboxes + limpiar. Usa `useClickOutside` compartido |
| `Drawer` | `components/ui/Drawer.tsx` | Panel lateral/superior/inferior con portal, overlay, Escape, lock scroll. Props: side, size, title, overlayClose |
| `PaginatedTable` | `components/ui/PaginatedTable.tsx` | Wrapper de DataTable con paginación client-side. Tokens PA: `border-pa-border`, `text-pa-text-muted`, `hover:bg-gray-100` |
| `PageHeader` | `components/ui/PageHeader.tsx` | Breadcrumbs + botón volver, título opcional |
| `PillButton` | `components/ui/PillButton.tsx` | Botón pill PA: `rounded-full border-pa-blue`, hover bg-pa-blue text-white. Usado en "Ver más +", "Volver" |
| `SectionBanner` | `components/ui/SectionBanner.tsx` | Banner título PA: `bg-pa-bg-alt`, texto uppercase navy. Props: `title`, `children` (controles derecha), `inline` |
| `TogglePills` | `components/ui/TogglePills.tsx` | Toggle genérico `<T extends string>`: opciones pill PA, activo `bg-pa-navy text-white`. Usado en Dashboard (Barra/Línea/Área) y BuildingDetail (tabs) |
| `PillDropdown` | `components/ui/PillDropdown.tsx` | Dropdown genérico `<T extends string>`: botón pill PA, lista con items PA. Props: `items`, `value`, `onChange`, `onHover`, `listWidth`. Reemplaza BillingMetricSelector y MonthDropdown |
| `BillingChart` | `features/buildings/components/BillingChart.tsx` | Highcharts columnas por mes, métrica dinámica vía prop |
| `BillingTable` | `features/buildings/components/BillingTable.tsx` | Usa DataTable. 12 columnas, highlight columna via `className`, filtro meses via `headerRender`. Usa `sumByKey`/`maxByKey` de `lib/aggregations` |
| `MetersTable` | `features/buildings/components/MetersTable.tsx` | Usa PaginatedTable. 3 columnas (Medidor, Tienda, Tipo), `cellClassName` atenúa placeholders, `maxHeight="max-h-full"`, click → detalle medidor |
| `MonthlyColumnChart` | `components/charts/MonthlyColumnChart.tsx` | Gráfico PA por mes (Highcharts), usa `CHART_COLORS`/`LIGHT_PLOT_OPTIONS`/`LIGHT_TOOLTIP_STYLE` de `lib/chartConfig`, toggle pill Barra/Línea/Área |
| `MeterMetricSelector` | `features/meters/components/MeterMetricSelector.tsx` | Dropdown con 5 métricas del medidor, `onHover` para preview en tabla. Usa `useClickOutside` compartido |
| `MeterMonthlyTable` | `features/meters/components/MeterMonthlyTable.tsx` | Usa DataTable. 7 columnas (incluye Incidencias), highlight columna via `className`, click fila → lecturas. Usa formatters y aggregations de `lib/` |
| `MeterReadingsPage` | `features/meters/MeterReadingsPage.tsx` | Lecturas 15 min, gráfico Diario/15min, resumen diario via DataTable inline. Usa `useClickOutside` y aggregations de `lib/` |

## Utilidades compartidas (`lib/`)

| Archivo | Exports |
|---------|---------|
| `lib/formatters.ts` | `fmt`, `fmtNum`, `fmtClp`, `fmtAxis`, `monthLabel`, `monthName`, `fmtDate` |
| `lib/constants.ts` | `MONTH_NAMES_SHORT`, `MONTH_NAMES_FULL`, `SHORT_BUILDING_NAMES` |
| `lib/aggregations.ts` | `sumNonNull`, `maxNonNull`, `avgNonNull`, `sumByKey`, `maxByKey` |
| `lib/chartConfig.ts` | `ChartType`, `CHART_COLORS`, `LIGHT_PLOT_OPTIONS`, `LIGHT_TOOLTIP_STYLE` |

## Hooks compartidos

| Hook | Ubicación | Uso |
|------|-----------|-----|
| `useClickOutside` | `hooks/useClickOutside.ts` | Acepta ref único o array de refs, parámetro `active` (default `true`). Usado en 7 componentes |

## DashboardPage

- Vista principal del holding (Parque Arauco S.A.)
- Layout 2 columnas (`grid 5fr_1fr`), responsive a 1 columna en mobile
- **Fila 1 — col izq:** gráfico Highcharts (consumo kWh + gasto CLP) con toggle pill Barra/Línea (`bg-pa-navy`) y `MonthDropdown` custom PA
- **Fila 1 — col der:** 3 kpi_cards PA — Pagos Recibidos (verde), Facturas por Vencer (ámbar), Facturas Vencidas (coral). Número grande + label + botón pill "Ver más +" abre Drawer
- **Fila 2 — col izq:** tabla edificios con título banner PA, misma altura que col der
- **Fila 2 — col der:** tabla "Documentos Vencidos por Período" con título banner PA, misma altura que col izq
- Datos reales vía `useDashboardSummary` → `GET /api/dashboard/summary` (5 edificios × 12 meses, todos 2025)
- Datos de pago vía `useDashboardPayments` → `GET /api/dashboard/payments`
- **Drawers de documentos:** botón "Ver más +" en cards abre `Drawer` size `lg` con DataTable detalle. Datos vía `useDashboardDocuments(status)` (fetch lazy al abrir)
- **Layout:** sin scroll en vista, ambas filas flex-1 ocupan alto disponible
- Selector de mes derivado de los meses disponibles en la API

## BuildingsPage

- Cards con stats (consumo, potencia, demanda, FP), botón pill "Ver más +" navega a detalle
- Grid 2x2 stats + footer (medidores + área m²)
- Formato numérico `es-CL`

## BuildingDetailPage

- Header: botón pill "Volver" + nombre edificio uppercase navy
- **Gráfico:** Card con banner PA `w-fit` (título "Facturación Mensual" + `BillingMetricSelector` dropdown PA pill)
- **Tabla:** Card con tabs PA en banner `w-fit` (pills `rounded-full`, activo `bg-pa-navy text-white`)
- Layout sin scroll: gráfico `shrink-0`, tabla `flex-1 min-h-0` con scroll interno
- Selector ↔ Tabla: métrica seleccionada destaca columna (`bg-blue-50`), hover preview (`bg-blue-50/60`)
- Tabs:
  - **Detalle Facturación:** `BillingTable` — `max-h-full`, sticky thead/tfoot, filtro meses
  - **Listado Remarcadores:** `MetersTable` — `max-h-full`, paginación de 10, click → `/meters/:meterId`
- Medidores sin tienda real muestran placeholder en texto atenuado

## MeterDetailPage

- Header: botón volver + meterId
- `MeterMetricSelector` + `MonthlyColumnChart`: selector elige métrica, gráfico dinámico con toggle Barra/Línea
- Selector ↔ Tabla: métrica seleccionada destaca columna (`bg-blue-50`), hover preview (`bg-blue-50/60`)
- `MeterMonthlyTable` debajo del gráfico — 5 métricas + columna Incidencias por mes, totales en footer
- Incidencias clickeable → navega a `/alerts?meter_id=X&date_from=YYYY-MM-01&date_to=YYYY-MM-end`
- Datos vía `useMeterMonthly(meterId)` + `useAlerts({ meter_id })` para conteo de alertas por mes
- Click en fila de tabla → navega a `/meters/:meterId/readings/:month`

## MeterReadingsPage

- Header: botón volver + meterId + mes en español + conteo de lecturas
- Selector de métrica (11 métricas de `meter_readings`)
- Gráfico con toggle Diario / 15 min:
  - **Diario:** Highcharts línea, 1 punto por hora (promedio), eje X = días del mes
  - **15 min:** Highcharts Stock light theme, navigator con rango default 2 días, datos crudos cada 15 min, eje Y a la izquierda (`opposite: false`). Líneas rojas verticales en navigator y xAxis principal marcan alertas. Click en línea → navega a `/alerts?meter_id=X&date=YYYY-MM-DD`
- **Resumen diario:** DataTable inline, una fila por día, 10 columnas (Día, Lecturas, Incidencias, Pot. prom., Pot. peak, Volt. L1, Corr. L1, React., FP, Frec.), totales en footer
- Incidencias clickeable → navega a `/alerts?meter_id=X&date=YYYY-MM-DD`
- Alertas vía `useAlerts({ meter_id })` — alimentan plotLines y columna Incidencias
- Datos vía `useMeterReadings(meterId, from, to)` → `GET /api/meter-readings/:meterId?from=&to=`

## RealtimePage

- Sin título (el sidebar indica "Monitoreo")
- Card con DataTable: 7 columnas (Medidor, Tienda, Potencia kW, Voltaje L1, Corriente L1, FP, Estado)
- Datos vía `useMetersLatest(buildingName)` → `GET /api/meters/building/:name/latest` (refetch 60s)
- Estado: badge Online (<30 min), Delay (<2h), Offline (>2h) según antigüedad de timestamp
- Skeleton: 8 filas con pulso mientras carga, tokens PA alineados con DataTable

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
- Tokens PA en contenedor, dropdowns, inputs, loading. Sin borde exterior (alineado con Card)
- Datos vía `useAlerts()` → `GET /api/alerts`
- **Pre-filtrado vía URL:** acepta query params `meter_id`, `date`, `date_from`, `date_to` para inicializar filtros al abrir la vista (usado por links de Incidencias en medidor)
- Pipeline de filtrado: checkbox filters → date/time filter → sort

## ComparisonsPage

- Compara tiendas o tipos de tienda a través de distintos edificios
- Toggle "Por Tipo" (42 tipos) / "Por Tienda" (309 nombres) con MultiSelect y búsqueda
- Selector de mes dinámico derivado de la API
- Gráfico via `HighchartsReact` con `CHART_COLORS`, `LIGHT_PLOT_OPTIONS`, `LIGHT_TOOLTIP_STYLE`. Toggle Barra/Línea/Área, dual axis (consumo + gasto). Alto dinámico (100% del contenedor)
- Layout `overflow-hidden` con cards `flex-[3]` (chart) / `flex-[2]` (tabla), sin scrollbar vertical
- Títulos con `SectionBanner inline` (estilo PA: `bg-pa-bg-alt`, navy uppercase, `w-fit`)
- DataTable: Edificio, Consumo (kWh), Gasto ($), footer con totales
- Datos reales vía `useComparisonFilters`, `useComparisonByStoreType`, `useComparisonByStoreName`

## Hooks activos

| Hook | Endpoint | Tipo retorno |
|------|----------|--------------|
| `useDashboardPayments()` | `GET /api/dashboard/payments` | `PaymentSummary` |
| `useDashboardDocuments(status, enabled)` | `GET /api/dashboard/documents/:status` | `BillingDocumentDetail[]` |
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
  totalMeters, assignedMeters, unassignedMeters,
  areaSqm: number | null,
  totalKwh, totalPowerKw, avgPowerKw, peakPowerKw,
  totalReactiveKvar, avgPowerFactor, peakDemandKw
  — campos numéricos son number | null
}

BillingMonthlySummary {
  month, totalMeters,
  totalKwh, energiaClp, ddaMaxKw, ddaMaxPuntaKw,
  kwhTroncal, kwhServPublico, cargoFijoClp,
  totalNetoClp, ivaClp, montoExentoClp, totalConIvaClp
  — campos numéricos son number | null (SC53 tiene billing parcial)
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

BillingDocumentDetail {
  id, buildingName, month, docNumber, dueDate,
  totalNetoClp: number | null, ivaClp: number | null,
  totalClp, meterCount
}

PaymentSummary {
  pagosRecibidos: { count, totalClp }
  porVencer: { count, totalClp }
  vencidos: { count, totalClp }
  vencidosPorPeriodo: OverdueBucket[]
  — OverdueBucket: { range, count, totalClp }
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

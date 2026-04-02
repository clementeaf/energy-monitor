# Plan de Accion — monitoreo-v2

> Derivado de `POWER_Digital_Especificacion_Modulos-rev2.1.xlsx` y `docs/context/functional-spec.md`.
> Cada fase se construye sobre la anterior. Marcar `[x]` al completar.

---

## Fase 1 — Frontend: conectar vistas a backend existente

El backend ya tiene Buildings, Meters, Alerts, Readings. El frontend solo consume Auth.
Prioridad: que las vistas existentes muestren datos reales.

### 1.1 API layer frontend (services + hooks)
- [x] `services/routes.ts` — agregar rutas Buildings, Meters, Alerts, Readings
- [x] `services/endpoints.ts` — agregar `buildingsEndpoints`, `metersEndpoints`, `alertsEndpoints`, `readingsEndpoints`
- [x] `hooks/queries/useBuildingsQuery.ts` — conectar a `GET /buildings` + mutations CRUD
- [x] `hooks/queries/useMetersQuery.ts` — `GET /meters`, `GET /meters/:id` + mutations CRUD
- [x] `hooks/queries/useAlertsQuery.ts` — `GET /alerts`, `PATCH acknowledge/resolve`
- [x] `hooks/queries/useReadingsQuery.ts` — `GET /readings`, `GET /readings/latest`, `GET /readings/aggregated`
- [x] `hooks/queries/useAlertsQuery.ts` — incluye CRUD alert rules (mismo archivo, reutiliza keys)
- [x] `types/meter.ts`, `types/alert.ts`, `types/reading.ts` — tipos TS espejo exacto del backend

### 1.2 BuildingsPage real
- [x] Tabla de edificios con datos de `GET /buildings`
- [x] Detalle edificio (nombre, codigo, direccion, area, estado)
- [x] CRUD: crear, editar, eliminar edificio (admin only, con permisos)

### 1.3 MetersPage
- [x] Nueva ruta `/meters` en router + sidebar
- [x] Tabla de medidores con filtro por edificio
- [x] Detalle medidor (tipo, fase, modelo, estado)
- [x] CRUD: crear, editar, eliminar medidor (admin only, con permisos)

### 1.4 AlertsPage real
- [x] Reemplazar PlaceholderPage en `/alerts`
- [x] Tabla de alertas con filtros (status, severity, building)
- [x] Acciones: acknowledge, resolve
- [x] Badge de alertas activas en sidebar

### 1.5 Dashboard v2 — datos reales
- [x] Cards KPI conectadas a `GET /readings/latest` (potencia total, FP promedio, conteo)
- [x] Grafico principal con `StockChart` + `GET /readings` (time-series, dual-axis potencia+FP)
- [x] Tabla resumen por edificio con `GET /buildings` + `GET /readings/latest`

---

## Fase 2 — Backend: modulos pendientes (entidades ya existen)

Las entidades TypeORM existen en PlatformModule pero sin service/controller.

### 2.1 HierarchyModule
- [x] `hierarchy.service.ts` — queries para `BuildingHierarchy` + `MeterHierarchy`
- [x] `hierarchy.controller.ts` — `GET /hierarchy/buildings/:buildingId`, `GET /hierarchy/:id`, `GET /hierarchy/:id/meters`, `POST`, `PATCH`, `DELETE`
- [x] DTOs de consulta (CreateHierarchyNodeDto, UpdateHierarchyNodeDto)
- [x] Tests unitarios (17 tests, 2 suites)
- [x] Registrar en `app.module.ts`

### 2.2 ConcentratorsModule
- [x] `concentrators.service.ts` — CRUD `Concentrator` + relacion `ConcentratorMeter`
- [x] `concentrators.controller.ts` — `GET /concentrators`, `GET /:id`, `POST`, `PATCH`, `DELETE`, `GET /:id/meters`, `POST /:id/meters`, `DELETE /:id/meters/:meterId`
- [x] DTOs (CreateConcentratorDto, UpdateConcentratorDto, AddConcentratorMeterDto)
- [x] Tests unitarios (26 tests, 2 suites)
- [x] Registrar en `app.module.ts`

### 2.3 TenantUnitsModule (Locatarios)
- [x] `tenant-units.service.ts` — CRUD `TenantUnit` + relacion `TenantUnitMeter`
- [x] `tenant-units.controller.ts` — `GET /tenant-units`, `GET /:id`, `POST`, `PATCH`, `DELETE`, `GET /:id/meters`, `POST /:id/meters`, `DELETE /:id/meters/:meterId`
- [x] DTOs (CreateTenantUnitDto, UpdateTenantUnitDto, AddTenantUnitMeterDto)
- [x] Tests unitarios (26 tests, 2 suites)
- [x] Registrar en `app.module.ts`

### 2.4 TariffsModule
- [x] `tariffs.service.ts` — CRUD `Tariff` + `TariffBlock`
- [x] `tariffs.controller.ts` — `GET /tariffs`, `GET /:id`, `POST`, `PATCH`, `DELETE`, `GET /:id/blocks`, `POST /:id/blocks`, `DELETE /:id/blocks/:blockId`
- [x] DTOs (CreateTariffDto, UpdateTariffDto, CreateTariffBlockDto)
- [x] Tests unitarios (24 tests, 2 suites)
- [x] Registrar en `app.module.ts`

### 2.5 InvoicesModule (Facturacion)
- [x] `invoices.service.ts` — CRUD `Invoice` + `InvoiceLineItem` + approve/void con guardas de estado
- [x] `invoices.controller.ts` — `GET /invoices`, `GET /:id`, `GET /:id/line-items`, `POST`, `PATCH`, `DELETE`, `PATCH /:id/approve`, `PATCH /:id/void`
- [x] DTOs (CreateInvoiceDto, UpdateInvoiceDto, QueryInvoicesDto)
- [x] Tests unitarios (28 tests, 2 suites)
- [x] Registrar en `app.module.ts`
- [ ] Endpoint generacion: `POST /invoices/generate` (calculo desde readings + tariff) — pendiente Fase 4
- [ ] Endpoint PDF: `GET /invoices/:id/pdf` — pendiente Fase 4

### 2.6 FaultEventsModule
- [x] `fault-events.service.ts` — read-only `FaultEvent`
- [x] `fault-events.controller.ts` — `GET /fault-events`, `GET /:id`, filtros por meter/building/severity/tipo/dateRange
- [x] Tests unitarios (9 tests, 2 suites)
- [x] Registrar en `app.module.ts`

---

## Fase 3 — Frontend: vistas de monitoreo

Rutas objetivo del XLSX. Dependen de Fase 1 (API layer) y parcialmente Fase 2 (backend modules).

### 3.1 Monitoreo Tiempo Real `/monitoring/realtime`
- [x] Ruta + pagina + sidebar entry
- [x] Auto-refresh (30s polling) desde `GET /readings/latest`
- [x] Tabla de ultimas lecturas por medidor (potencia, voltaje, FP, frecuencia)
- [x] Indicadores de estado (online/offline/alarma) con cards resumen

### 3.2 Drill-down por sitio `/monitoring/drilldown/:siteId`
- [x] Ruta + pagina
- [x] Vista jerarquica: edificio → concentradores → medidores
- [x] Tabla de medidores con lecturas en vivo
- [x] Navegacion breadcrumb + links a Demanda/Calidad/Fallos

### 3.3 Demanda por sitio `/monitoring/demand/:siteId`
- [x] Ruta + pagina
- [x] StockChart de demanda (potencia promedio + max vs tiempo)
- [x] Indicador peak demand vs contratada (plotLine rojo)
- [x] Tabla Top 10 peaks con % contratada

### 3.4 Calidad electrica `/monitoring/quality/:siteId`
- [x] Ruta + pagina
- [x] 4 graficos: THD voltaje, THD corriente, factor de potencia, desequilibrio de fases
- [x] Indicadores vs umbrales normativos (NCh/IEEE 519) con cards rojo/verde
- [x] Alertas de calidad activas

### 3.5 Dispositivos `/monitoring/devices`
- [x] Ruta + pagina + sidebar entry
- [x] Tabla unificada de medidores + concentradores con estado
- [x] Filtros por edificio, tipo, estado
- [x] Detalle con ultima comunicacion y diagnostico

### 3.6 Historial de fallos `/monitoring/fault-history/:meterId`
- [x] Ruta + pagina
- [x] Timeline visual de eventos de fallo por medidor
- [x] Filtros por tipo de fallo y rango de fecha
- [x] Cards resumen (total, abiertos, resueltos, criticos)

---

## Fase 4 — Facturacion (frontend + backend)

### 4.1 Tarifas `/billing/rates`
- [x] API layer frontend: `tariffsEndpoints` + `useTariffsQuery`
- [x] Pagina con tabla de tarifas por ubicacion
- [x] Detalle tarifa con bloques horarios (expandible inline)
- [x] CRUD tarifas (admin only)
- [x] CRUD bloques horarios (admin only)

### 4.2 Generacion de facturacion
- [x] Backend: `POST /invoices/generate` — calculo desde readings + tariff blocks
- [x] Backend: `GET /invoices/:id/pdf` — HTML invoice con line items
- [x] API layer frontend: `invoicesEndpoints` + `useInvoicesQuery`
- [x] Modal wizard: seleccionar edificio + tarifa + periodo → generar
- [x] Historial de facturas generadas (tabla principal)

### 4.3 Vista facturacion `/billing`
- [x] Reemplazar PlaceholderPage con InvoicesPage
- [x] Tabla de facturas con filtros (edificio, estado)
- [x] Detalle factura con line items (modal)
- [x] Acciones: descargar PDF, aprobar, anular, eliminar (draft)

---

## Fase 5 — Admin

### 5.1 Usuarios `/admin/users`
- [x] Backend: `UsersModule` controller + service (CRUD) — 12 tests
- [x] Backend: endpoint asignacion de roles (`PATCH /users/:id`) y buildings (`PATCH /users/:id/buildings`)
- [x] Frontend: tabla usuarios, crear/editar/eliminar (UsersPage)
- [x] Frontend: form con rol + buildings por usuario (UserForm)

### 5.2 Locatarios `/admin/tenants`
- [x] API layer frontend: `tenantUnitsEndpoints` + `useTenantUnitsQuery` (CRUD + meters)
- [x] Tabla de locatarios con filtro por edificio (TenantsPage)
- [x] CRUD + formulario (TenantUnitForm)

### 5.3 Jerarquia electrica `/admin/hierarchy`
- [x] API layer frontend: `hierarchyEndpoints` CRUD + `useHierarchyQuery` mutations
- [x] Vista arbol recursiva: edificio → nodos con tipo coloreado (HierarchyPage)
- [x] Formulario crear/editar nodos + agregar hijos (NodeFormModal)

### 5.4 Auditoria `/admin/audit`
- [x] Backend: `AuditLogsModule` — `GET /audit-logs` con filtros (userId, action, resourceType, dateRange, paginacion) — 7 tests
- [x] Frontend: tabla de logs con filtros, paginacion, badges por metodo HTTP (AuditPage)

---

## Fase 6 — Alertas avanzadas (22 tipos)

Hoy solo existe `METER_OFFLINE`. El XLSX define 22 tipos agrupados por familia.

### 6.1 Engine de alertas backend
- [x] Definir las 22 alert rules como seeds (tipo, variable, umbral, severidad, escalamiento)
- [x] Servicio de evaluacion: cron job que evalua readings vs rules (cada 5 min)
- [x] Logica de escalamiento (tiempo sin resolver → sube severidad, cada 10 min)
- [x] Canales de notificacion: email (log, SES pendiente), webhook
- [x] NotificationLog entity + controller GET /notification-logs
- [x] POST /alert-engine/evaluate (trigger manual)
- [x] 27 tests nuevos (358 total, 37 suites)

### 6.2 Familias de alertas (6 evaluadores, strategy pattern)
- [x] Comunicacion: `METER_OFFLINE`, `CONCENTRATOR_OFFLINE`, `COMM_DEGRADED`
- [x] Electrica: `VOLTAGE_OUT_OF_RANGE`, `LOW_POWER_FACTOR`, `HIGH_THD`, `PHASE_IMBALANCE`, `FREQUENCY_OUT_OF_RANGE`, `OVERCURRENT`, `BREAKER_TRIP`, `NEUTRAL_FAULT`
- [x] Consumo: `ABNORMAL_CONSUMPTION`, `PEAK_DEMAND_EXCEEDED`, `ENERGY_DEVIATION`
- [x] Operativa: `METER_TAMPER`, `CONFIG_CHANGE`, `FIRMWARE_MISMATCH`
- [x] Generacion: `GENERATION_LOW`, `INVERTER_FAULT`, `GRID_EXPORT_LIMIT`
- [x] Bus/Concentrador: `BUS_ERROR`, `MODBUS_TIMEOUT`, `CRC_ERROR`

### 6.3 Frontend alertas avanzadas
- [x] AlertRulesPage — tabla reglas por familia, toggle activo, edicion umbrales/severidad/escalamiento/config
- [x] EscalationPage — alertas abiertas con tiempo, cards por severidad, SLA visual
- [x] NotificationsPage — historial notificaciones con filtros canal/estado, paginacion
- [x] 3 rutas: /alerts/rules, /alerts/escalation, /alerts/notifications

---

## Fase 7 — Reportes e integraciones

### 7.1 ReportsModule backend
- [x] `reports.service.ts` — CRUD `Report` + `ScheduledReport`
- [x] Generacion de reportes: consumo, demanda, billing summary, calidad electrica, ejecutivo, alertas; otros tipos placeholder
- [x] Scheduler: cron para reportes programados (cada 5 min)
- [x] Export: PDF + Excel + CSV

### 7.2 Reportes frontend `/reports`
- [x] Reemplazar PlaceholderPage por `ReportsPage`
- [x] Seleccion de tipo de reporte + parametros
- [x] Descarga (`GET .../export`); preview no dedicado (abre archivo generado)
- [x] Programar reportes recurrentes (cron + destinatarios + toggle)

### 7.3 IntegrationsModule backend
- [x] `integrations.service.ts` — CRUD `Integration` + lectura `IntegrationSyncLog`
- [ ] Conectores: API externa para terceros (read-only) — stub en `POST :id/sync`
- [x] Log de sincronizaciones (`GET :id/sync-logs` paginado)

---

## Fase 8 — Vistas adicionales XLSX

### 8.1 Dashboard Ejecutivo `/dashboard/executive`
- [x] KPIs consolidados multi-edificio
- [x] Graficos de tendencia (consumo, costo, demanda)
- [x] Ranking de edificios por eficiencia
- [x] Alertas criticas activas

### 8.2 Dashboard Comparativo `/dashboard/compare`
- [x] Seleccion de 2+ edificios o periodos
- [x] Graficos superpuestos para comparacion
- [x] Tabla comparativa con deltas

### 8.3 Medidores por tipo `/monitoring/meters/type`
- [ ] Agrupacion por tipo de medidor
- [ ] KPIs agregados por tipo
- [ ] Navegacion a detalle individual

### 8.4 Generacion por sitio `/monitoring/generation/:siteId`
- [ ] Graficos de generacion (solar, etc.)
- [ ] Balance generacion vs consumo
- [ ] Indicadores de autoconsumo

### 8.5 Mapa Modbus `/monitoring/modbus-map/:siteId`
- [ ] Diagrama de red Modbus del sitio
- [ ] Estado de cada nodo (online/offline/error)
- [ ] Detalle de configuracion por dispositivo

---

## Resumen de dependencias

```
Fase 1 (frontend API layer) ─────────────────────┐
                                                   ├──→ Fase 3 (vistas monitoreo)
Fase 2 (backend modules) ────────────────────────┘
                                                   ├──→ Fase 4 (facturacion)
                                                   ├──→ Fase 5 (admin)
                                                   ├──→ Fase 6 (alertas 22 tipos)
                                                   ├──→ Fase 7 (reportes)
                                                   └──→ Fase 8 (vistas XLSX)
```

Fase 1 y Fase 2 pueden avanzar **en paralelo**.
Fases 3-8 requieren al menos Fase 1 completa y los modulos backend relevantes de Fase 2.

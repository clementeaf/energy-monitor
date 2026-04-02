# API Endpoints

Estado actual: backend purgado, solo módulos activos sobre pg-arauco local. Todos `@Public()` excepto auth/users/roles/session.

## Auth (`/auth`) — requiere Bearer
| Method | Path | Response |
|---|---|---|
| GET | `/auth/me` | `{ user, permissions }` |
| GET | `/auth/permissions` | `{ role, permissions }` |

## Users (`/users`) — requiere Bearer
| Method | Path | Response |
|---|---|---|
| GET | `/users` | `AdminUserSummary[]` |
| POST | `/users` | `AdminUserSummary & { invitationToken }` |

## Roles (`/roles`) — requiere Bearer
| GET | `/roles` | `RoleOption[]` |

## Invitations (`/invitations`) — público
| GET | `/invitations/:token` | `{ email, name, role, ... }` |

## Views (`/views`) — requiere Bearer
| GET | `/views` | `ViewOption[]` |

## Session (`/session`) — mixto
| Method | Path | Response |
|---|---|---|
| POST | `/session/issue-token` | JWT token |
| POST | `/session` | Crear sesión |
| GET | `/session` | Listar sesiones |
| GET | `/session/:id` | Detalle sesión |
| PATCH | `/session/:id` | Actualizar sesión |
| DELETE | `/session/:id` | Eliminar sesión |

## Dashboard (`/dashboard`) — `@Public()`
| Method | Path | Response |
|---|---|---|
| GET | `/dashboard/summary` | `DashboardBuildingMonth[]` (5 edificios × 12 meses: buildingName, month, totalKwh, totalConIvaClp, totalMeters, areaSqm) |
| GET | `/dashboard/payments` | `PaymentSummary` (pagosRecibidos, porVencer, vencidos: {count, totalClp}, vencidosPorPeriodo: OverdueBucket[]) |
| GET | `/dashboard/documents/:status` | `BillingDocumentDetail[]` (id, buildingName, month, docNumber, dueDate, totalNetoClp, ivaClp, totalClp, meterCount). status: pagado, por_vencer, vencido |

## Comparisons (`/comparisons`) — `@Public()`
| Method | Path | Params | Response |
|---|---|---|---|
| GET | `/comparisons/filters` | — | `{ storeTypes: [{id, name}], storeNames: [string], months: [string] }` |
| GET | `/comparisons/by-store-type` | `storeTypeIds` (comma-sep), `month` | `ComparisonRow[]` (buildingName, totalKwh, totalConIvaClp, totalMeters) |
| GET | `/comparisons/by-store-name` | `storeNames` (comma-sep), `month` | `ComparisonRow[]` (misma estructura) |

## Buildings (`/buildings`) — `@Public()`
| Method | Path | Body / Params | Response |
|---|---|---|---|
| GET | `/buildings` | — | `BuildingSummary[]` (resumen mensual por edificio) |
| GET | `/buildings/:name` | — | `BuildingSummary[]` filtrado por nombre |
| POST | `/buildings` | `{ buildingName, areaSqm }` | `BuildingSummary` (row creada con defaults mes actual) |
| PATCH | `/buildings/:name` | `{ areaSqm? }` | `{ success: true }` |
| DELETE | `/buildings/:name` | — | `{ success: true }` (elimina todas las rows del building) |

## Stores (`/stores`) — `@Public()`
| Method | Path | Body / Params | Response |
|---|---|---|---|
| GET | `/stores` | — | `Store[]` (875 tiendas con tipo eager + buildingName) |
| GET | `/stores/types` | — | `StoreType[]` (42 tipos) |
| GET | `/stores/types/:id` | — | `Store[]` filtradas por tipo |
| GET | `/stores/operators/:buildingName` | — | `{ storeName, meterCount }[]` (operadores del edificio) |
| PATCH | `/stores/operators/:buildingName/:operatorName` | `{ newName }` | `{ success: true }` (renombra en todos los meters) |
| DELETE | `/stores/operators/:buildingName/:operatorName` | — | `{ success: true }` (store_name → 'Sin información') |
| POST | `/stores/bulk` | `{ items: [{ meterId, storeName, storeTypeName, buildingName }] }` | `{ successCount, errors: [{ row, meterId, error }] }` (bulk create con savepoints, auto-crea store_types) |
| POST | `/stores` | `{ meterId, storeName, storeTypeId, buildingName }` | `Store` (crea store + link en meter_monthly_billing) |
| PATCH | `/stores/:meterId` | `{ storeName?, storeTypeId? }` | `{ success: true }` |
| DELETE | `/stores/:meterId` | — | `{ success: true }` (elimina store + meter_monthly_billing) |
| GET | `/stores/:meterId` | — | `Store` por meter_id |

## Meter Monthly (`/meter-monthly`) — `@Public()`
| Method | Path | Response |
|---|---|---|
| GET | `/meter-monthly` | `MeterMonthly[]` (516 filas) |
| GET | `/meter-monthly/:meterId` | `MeterMonthly[]` historial de un medidor |

## Meter Readings (`/meter-readings`) — `@Public()`
| Method | Path | Query | Response |
|---|---|---|---|
| GET | `/meter-readings/:meterId` | `from`, `to` (requeridos, ISO 8601, max 31 días), `limit?` (max 5000) | `MeterReading[]` |

## Meters (`/meters`) — `@Public()`
| Method | Path | Response |
|---|---|---|
| GET | `/meters/building/:buildingName` | `MeterListItem[]` (meterId, storeName, storeType — sin tienda = "Por censar") |
| GET | `/meters/building/:buildingName/latest` | `MeterLatestReading[]` (última lectura por medidor: meterId, storeName, powerKw, voltageL1, currentL1, powerFactor, timestamp) |

## Billing (`/billing`) — `@Public()`
| Method | Path | Query | Response |
|---|---|---|---|
| GET | `/billing/pdf` | `storeName`, `buildingName`, `month` | Binary PDF (`application/pdf`). Invoca Lambda Python `billing-pdf-generator` |
| GET | `/billing/:buildingName/stores` | `month` (requerido) | `BillingStoreBreakdown[]` (desglose por tienda: storeName + 11 campos numéricos). JOIN con `store` para nombre |
| GET | `/billing/:buildingName` | — | `BillingMonthlySummary[]` (agregado mensual: totalKwh, energiaClp, ddaMaxKw, ddaMaxPuntaKw, kwhTroncal, kwhServPublico, cargoFijoClp, totalNetoClp, ivaClp, montoExentoClp, totalConIvaClp) |

## Alerts (`/alerts`) — `@Public()`
| Method | Path | Query | Response |
|---|---|---|---|
| GET | `/alerts` | `severity?`, `meter_id?` | `Alert[]` (max 500, orden timestamp DESC). Campos: id, meterId, timestamp, alertType, severity, field, value, threshold, message, createdAt |

## IoT Alerts (`/iot-readings/alerts`)
| Method | Path | Query | Response |
|---|---|---|---|
| GET | `/iot-readings/alerts` | `severity?`, `device_id?` | `Alert[]` (misma interfaz que `/alerts`). Generadas on-the-fly desde anomalías en `iot_readings`: voltaje <200V/>250V, PF <0.85, potencia >50kW, THD voltaje >8%, THD corriente >20% |

## Raw Readings (`/raw-readings`) — `@Public()`
| Method | Path | Query | Response |
|---|---|---|---|
| GET | `/raw-readings/:meterId` | `from`, `to` (requeridos, ISO 8601, max 31 días), `limit?` (max 5000) | `RawReading[]` (446 medidores, 15.6M filas) |

---

## monitoreo-v2 Endpoints

Todos los endpoints v2 requieren JWT cookie (httpOnly). Tenant scoping + buildingIds RBAC automáticos desde JWT.

### Auth (`/auth`)
| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/auth/login` | `{ provider, token }` | Sets httpOnly cookies (access + refresh) |
| POST | `/auth/refresh` | — | Rotación refresh token |
| POST | `/auth/logout` | — | Limpia cookies |
| GET | `/auth/me` | — | `{ user, tenant, permissions }` |

### Buildings (`/buildings`)
| Method | Path | Body / Query | Response |
|---|---|---|---|
| GET | `/buildings` | — | `Building[]` (scoped por tenant + buildingIds) |
| GET | `/buildings/:id` | — | `Building` |
| POST | `/buildings` | `{ name, address, totalArea? }` | `Building` |
| PATCH | `/buildings/:id` | `{ name?, address?, totalArea? }` | `Building` |
| DELETE | `/buildings/:id` | — | 204 No Content |

### Meters (`/meters`)
| Method | Path | Body / Query | Response |
|---|---|---|---|
| GET | `/meters` | `buildingId?` | `Meter[]` (scoped) |
| GET | `/meters/:id` | — | `Meter` |
| POST | `/meters` | `{ buildingId, name, code, meterType?, phaseType?, ... }` | `Meter` |
| PATCH | `/meters/:id` | campos parciales | `Meter` |
| DELETE | `/meters/:id` | — | 204 No Content |

### Readings (`/readings`) — read-only
| Method | Path | Query | Response |
|---|---|---|---|
| GET | `/readings` | `meterId` (uuid), `from`, `to` (ISO 8601), `resolution?` (raw/5min/15min/1h/1d), `limit?` (1-10000, default 1000) | `ReadingRow[]` — time-series con downsampling vía `time_bucket` |
| GET | `/readings/latest` | `buildingId?`, `meterId?` | `LatestRow[]` — última lectura por medidor (`DISTINCT ON`) |
| GET | `/readings/aggregated` | `from`, `to`, `interval` (hourly/daily/monthly), `buildingId?`, `meterId?` | `AggregatedRow[]` — avg/max/min power, energy delta, PF, reading count |

### Alerts (`/alerts`)
| Method | Path | Query / Body | Response |
|---|---|---|---|
| GET | `/alerts` | `status?`, `severity?`, `buildingId?`, `meterId?` | `PlatformAlert[]` |
| GET | `/alerts/:id` | — | `PlatformAlert` |
| PATCH | `/alerts/:id/acknowledge` | — | `PlatformAlert` (acknowledged) |
| PATCH | `/alerts/:id/resolve` | `{ resolutionNotes? }` | `PlatformAlert` (resolved) |

### Alert Rules (`/alert-rules`)
| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/alert-rules` | — | `AlertRule[]` |
| GET | `/alert-rules/:id` | — | `AlertRule` |
| POST | `/alert-rules` | `{ name, metric, operator, threshold, severity, buildingId? }` | `AlertRule` |
| PATCH | `/alert-rules/:id` | campos parciales | `AlertRule` |
| DELETE | `/alert-rules/:id` | — | 204 No Content |

### Hierarchy (`/hierarchy`)
| Method | Path | Body / Query | Response |
|---|---|---|---|
| GET | `/hierarchy/buildings/:buildingId` | — | `BuildingHierarchy[]` (nodos del edificio) |
| GET | `/hierarchy/:id` | — | `BuildingHierarchy` |
| GET | `/hierarchy/:id/meters` | — | `MeterHierarchy[]` (medidores del nodo) |
| POST | `/hierarchy` | `{ buildingId, name, levelType, parentId?, sortOrder?, metadata? }` | `BuildingHierarchy` |
| PATCH | `/hierarchy/:id` | `{ name?, parentId?, sortOrder?, metadata? }` | `BuildingHierarchy` |
| DELETE | `/hierarchy/:id` | — | 204 No Content |

### Concentrators (`/concentrators`)
| Method | Path | Body / Query | Response |
|---|---|---|---|
| GET | `/concentrators` | `buildingId?` | `Concentrator[]` (scoped) |
| GET | `/concentrators/:id` | — | `Concentrator` |
| POST | `/concentrators` | `{ buildingId, name, model, serialNumber?, ipAddress?, ... }` | `Concentrator` |
| PATCH | `/concentrators/:id` | campos parciales | `Concentrator` |
| DELETE | `/concentrators/:id` | — | 204 No Content |
| GET | `/concentrators/:id/meters` | — | `ConcentratorMeter[]` |
| POST | `/concentrators/:id/meters` | `{ meterId, busNumber?, modbusAddress? }` | `ConcentratorMeter` |
| DELETE | `/concentrators/:id/meters/:meterId` | — | 204 No Content |

### Tenant Units (`/tenant-units`)
| Method | Path | Body / Query | Response |
|---|---|---|---|
| GET | `/tenant-units` | `buildingId?` | `TenantUnit[]` (scoped) |
| GET | `/tenant-units/:id` | — | `TenantUnit` |
| POST | `/tenant-units` | `{ buildingId, name, unitCode, contactName?, contactEmail?, userId? }` | `TenantUnit` |
| PATCH | `/tenant-units/:id` | campos parciales | `TenantUnit` |
| DELETE | `/tenant-units/:id` | — | 204 No Content |
| GET | `/tenant-units/:id/meters` | — | `TenantUnitMeter[]` |
| POST | `/tenant-units/:id/meters` | `{ meterId }` | `TenantUnitMeter` |
| DELETE | `/tenant-units/:id/meters/:meterId` | — | 204 No Content |

### Tariffs (`/tariffs`)
| Method | Path | Body / Query | Response |
|---|---|---|---|
| GET | `/tariffs` | `buildingId?` | `Tariff[]` (scoped, order effectiveFrom DESC) |
| GET | `/tariffs/:id` | — | `Tariff` |
| POST | `/tariffs` | `{ buildingId, name, effectiveFrom, effectiveTo?, isActive? }` | `Tariff` |
| PATCH | `/tariffs/:id` | campos parciales | `Tariff` |
| DELETE | `/tariffs/:id` | — | 204 No Content |
| GET | `/tariffs/:id/blocks` | — | `TariffBlock[]` |
| POST | `/tariffs/:id/blocks` | `{ blockName, hourStart, hourEnd, energyRate, demandRate?, reactiveRate?, fixedCharge? }` | `TariffBlock` |
| DELETE | `/tariffs/:id/blocks/:blockId` | — | 204 No Content |

### Invoices (`/invoices`)
| Method | Path | Body / Query | Response |
|---|---|---|---|
| GET | `/invoices` | `buildingId?`, `status?`, `periodStart?`, `periodEnd?` | `Invoice[]` (scoped) |
| GET | `/invoices/:id` | — | `Invoice` |
| GET | `/invoices/:id/line-items` | — | `InvoiceLineItem[]` |
| POST | `/invoices` | `{ buildingId, invoiceNumber, periodStart, periodEnd, tariffId?, notes? }` | `Invoice` (status=draft) |
| PATCH | `/invoices/:id` | campos parciales (solo draft/pending) | `Invoice` |
| DELETE | `/invoices/:id` | — | 204 No Content (solo draft) |
| PATCH | `/invoices/:id/approve` | — | `Invoice` (status=approved, solo desde pending) |
| PATCH | `/invoices/:id/void` | — | `Invoice` (status=voided) |
| POST | `/invoices/generate` | `{ buildingId, tariffId, periodStart, periodEnd, meterIds?, tenantUnitIds? }` | `Invoice` (genera line items por medidor desde readings + tariff blocks) |
| GET | `/invoices/:id/pdf` | — | HTML invoice con line items y totales |

### Fault Events (`/fault-events`) — read-only
| Method | Path | Query | Response |
|---|---|---|---|
| GET | `/fault-events` | `buildingId?`, `meterId?`, `severity?`, `faultType?`, `dateFrom?`, `dateTo?` | `FaultEvent[]` (order startedAt DESC) |
| GET | `/fault-events/:id` | — | `FaultEvent` |

### Reports (`/reports`) — permisos `reports:*`
| Method | Path | Body / Query | Response |
|---|---|---|---|
| GET | `/reports` | `buildingId?`, `reportType?` | `Report[]` |
| POST | `/reports/generate` | `reportType`, `periodStart`, `periodEnd`, `format`, `buildingId?` | `Report` |
| GET | `/reports/:id` | — | `Report` |
| GET | `/reports/:id/export` | — | Binario PDF / XLSX / CSV (según `format` del registro) |
| DELETE | `/reports/:id` | — | 204 No Content |
| GET | `/reports/scheduled` | `buildingId?`, `isActive?` | `ScheduledReport[]` |
| POST | `/reports/scheduled` | `reportType`, `format`, `cronExpression`, `recipients[]`, `buildingId?`, `isActive?` | `ScheduledReport` |
| PATCH | `/reports/scheduled/:id` | campos parciales | `ScheduledReport` |
| DELETE | `/reports/scheduled/:id` | — | 204 No Content |

### Integrations (`/integrations`) — permisos `integrations:*`
| Method | Path | Body / Query | Response |
|---|---|---|---|
| GET | `/integrations` | `integrationType?`, `status?` | `Integration[]` |
| POST | `/integrations` | `name`, `integrationType`, `config`, `status?` | `Integration` |
| GET | `/integrations/:id` | — | `Integration` |
| PATCH | `/integrations/:id` | campos parciales | `Integration` |
| DELETE | `/integrations/:id` | — | 204 No Content |
| GET | `/integrations/:id/sync-logs` | `page?`, `limit?` | `{ items, total, page, limit }` |
| POST | `/integrations/:id/sync` | — | `IntegrationSyncLog` (stub) |

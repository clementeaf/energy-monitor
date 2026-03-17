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

## Raw Readings (`/raw-readings`) — `@Public()`
| Method | Path | Query | Response |
|---|---|---|---|
| GET | `/raw-readings/:meterId` | `from`, `to` (requeridos, ISO 8601, max 31 días), `limit?` (max 5000) | `RawReading[]` (446 medidores, 15.6M filas) |

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

## Buildings (`/buildings`) — `@Public()`
| Method | Path | Response |
|---|---|---|
| GET | `/buildings` | `BuildingSummary[]` (resumen mensual por edificio) |
| GET | `/buildings/:name` | `BuildingSummary[]` filtrado por nombre |

## Stores (`/stores`) — `@Public()`
| Method | Path | Response |
|---|---|---|
| GET | `/stores` | `Store[]` (43 tiendas con tipo eager) |
| GET | `/stores/types` | `StoreType[]` (20 tipos) |
| GET | `/stores/types/:id` | `Store[]` filtradas por tipo |
| GET | `/stores/:meterId` | `Store` por meter_id |

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

## Billing (`/billing`) — `@Public()`
| Method | Path | Response |
|---|---|---|
| GET | `/billing/:buildingName` | `BillingMonthlySummary[]` (agregado mensual: totalKwh, energiaClp, ddaMaxKw, ddaMaxPuntaKw, kwhTroncal, kwhServPublico, cargoFijoClp, totalNetoClp, ivaClp, montoExentoClp, totalConIvaClp) |

## Raw Readings (`/raw-readings`) — `@Public()`
| Method | Path | Query | Response |
|---|---|---|---|
| GET | `/raw-readings/:meterId` | `from`, `to` (requeridos, ISO 8601, max 31 días), `limit?` (max 5000) | `RawReading[]` (446 medidores, 15.6M filas) |

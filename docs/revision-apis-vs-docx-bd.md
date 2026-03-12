# Revisión: APIs actuales vs modelo del docx (Documentación BD)

Referencia: `docs/POWER_Digital_Documentacion_BD.docx` — jerarquía **locación (centro) → tienda/local → medidor** y consumo por intervalo 15 min.

**Refactor aplicado (migración 013 + promote + backend):** se añadieron `center_type` en `buildings` y `store_type`, `store_name` en `meters`; las APIs los exponen como `centerType`, `storeType`, `storeName`.

---

## 1. Mapeo modelo docx → backend actual

| Concepto docx | En backend | Expuesto por API |
|---------------|------------|------------------|
| **Locación / centro** (`center_name`, `center_type`) | `buildings` (id = slug de center_name, name = center_name, **center_type**) | Sí: `GET /buildings`, `GET /buildings/:id` (id, name, address, **centerType**, totalArea, metersCount). `centerType` null en legacy. |
| **Tienda / local** (`store_type`, `store_name`) | `meters` (**store_type**, **store_name**); también en hierarchy como niveles/nombres | Sí: `GET /meters/overview`, `GET /meters/:id` incluyen **storeType**, **storeName**. Null en legacy. |
| **Medidor** (`meter_id`, model, phase_type, etc.) | `meters` (id, building_id, model, phaseType, busId, modbusAddress, uplinkRoute, storeType, storeName) | Sí: `GET /meters/overview`, `GET /meters/:id`. Alineado con docx. |
| **Consumo por intervalo** (power_kW, energy_kWh_total, 15 min) | `readings` / `readings_import_staging` | Sí: `GET /meters/:id/readings`, `GET /buildings/:id/consumption`, `GET /hierarchy/node/:nodeId/consumption`. Series temporales con potencia/energía. |
| **Agrupación por centro** | buildings + meters por building_id | Sí: consumo agregado por edificio. |
| **Agrupación por tienda** (store_type, store_name) | No existe en tablas productivas; solo en staging | No: no hay endpoint "consumo por tienda" ni filtro por store_type (p. ej. SSCC). |

---

## 2. Endpoints relevantes al dominio del docx

### Buildings (locaciones/centros)

| Método | Ruta | Qué hace | Alineación docx |
|--------|------|----------|------------------|
| GET | `/buildings` | Lista edificios con metersCount y centerType | Centro = building; centerType expuesto. |
| GET | `/buildings/:id` | Detalle de un edificio (incl. centerType) | OK. |
| GET | `/buildings/:id/meters` | Medidores del edificio | OK. |
| GET | `/buildings/:id/consumption` | Consumo agregado del edificio (time-series) | OK. Requiere from/to si READINGS_SOURCE=staging. |

### Meters (medidores)

| Método | Ruta | Qué hace | Alineación docx |
|--------|------|----------|------------------|
| GET | `/meters/overview` | Estado de todos los medidores (incl. storeType, storeName) | OK. |
| GET | `/meters/:id` | Detalle de un medidor (incl. storeType, storeName) | OK. |
| GET | `/meters/:id/readings` | Serie temporal de lecturas (raw o agregada) | OK. Requiere from/to en staging. |
| GET | `/meters/:id/uptime` | Resumen de disponibilidad | OK (legacy/telemetría). |
| GET | `/meters/:id/downtime-events` | Eventos de corte | OK. |
| GET | `/meters/:id/alarm-events` | Eventos de alarma | OK (legacy). Staging no tiene alarm. |
| GET | `/meters/:id/alarm-summary` | Resumen de alarmas | OK. |

Ningún endpoint de meters devuelve a qué tienda/local pertenece el medidor (store_type, store_name).

### Hierarchy (drill-down: centro → panel → subpanel → circuito)

| Método | Ruta | Qué hace | Alineación docx |
|--------|------|----------|------------------|
| GET | `/hierarchy/:buildingId` | Árbol de nodos del edificio | Con hierarchy-from-staging: Building → Panel (center_type) → Subpanel (store_type) → Circuit (meter_id). Estructura alineada; no hay campos explícitos center_type/store_type en el DTO. |
| GET | `/hierarchy/node/:nodeId` | Nodo y path de ancestros | OK. |
| GET | `/hierarchy/node/:nodeId/children` | Hijos con resumen de consumo (totalKwh, avgPowerKw, etc.) | OK. |
| GET | `/hierarchy/node/:nodeId/consumption` | Serie temporal de consumo del subárbol | OK. Requiere from/to en staging. |

La jerarquía refleja el modelo del docx cuando está poblada desde staging (script hierarchy-from-staging), pero los nombres de nodos y niveles no se documentan en la API como "center_type" o "store_type".

---

## 3. Brechas respecto al docx (resueltas en refactor)

1. ~~**center_type** no se expone~~: **Resuelto.** Columna `buildings.center_type`; API devuelve `centerType`. Promote rellena desde staging.
2. ~~**store_type** y **store_name** no se exponen~~: **Resuelto.** Columnas `meters.store_type`, `meters.store_name`; API devuelve `storeType`, `storeName` en overview y detalle de medidor. Promote rellena desde staging.
3. ~~**Medidor sin vínculo a tienda**~~: **Resuelto.** Cada medidor tiene storeType y storeName en la respuesta.
4. **Consultas por tipo**: Los endpoints actuales no filtran por `centerType` ni por `storeType` (ej. "solo SSCC"). Para eso haría falta query param o endpoint adicional (backlog).

---

## 4. Resumen

- **Alineado con el docx:** listados de centros (buildings) con **centerType**, medidores con **storeType** y **storeName**, series de consumo por edificio/medidor/nodo, jerarquía y magnitudes eléctricas.
- **Pendiente (backlog):** filtros por `centerType` o `storeType` (p. ej. solo edificios tipo Mall, o solo medidores SSCC); endpoint "consumo por tienda" agregado.

**Aplicar migración `sql/013_center_and_store_fields.sql` en RDS y re-ejecutar promote (o catalog) para rellenar las columnas en datos Drive ya importados.**

# Revisión: datos cargados desde Google Drive en AWS

Objetivo: entender qué quedó en base de datos, cómo enviarlo de forma inteligente por backend, cómo consumirlo en frontend y en qué vistas mostrarlo.

---

## 1. Qué hay en base de datos (RDS)

### 1.1 Dos orígenes de datos

| Origen | buildings | meters | readings | Descripción |
|--------|-----------|--------|----------|-------------|
| **Legacy / seed** | 2 (`pac4220`, `s7-1200`) | 15 (`M001`–`M015`) | Sintéticos + histórico | Telemetría Siemens, jerarquía definida |
| **Drive (CSV)** | N (uno por `center_name` único) | Cientos (ej. MG-001, MM-045, OT-012, SC52-*, SC53-*) | Millones (15 min × medidores × tiempo) | Malls, outlets, strip centers |

Tras el pipeline (ingest + promote):

- **`readings`**: mezcla de legacy y Drive; cada fila tiene `meter_id`, `timestamp` y variables eléctricas.
- **`meters`**: legacy + medidores creados en la fase `catalog` del promote (building_id = slug de `center_name`, id = `meter_id` del CSV).
- **`buildings`**: legacy + edificios creados en `catalog` (id = slug de `center_name`, name = `center_name`, address = center_type, total_area = 0).

### 1.2 Restricciones de schema que importan

- **`meters.id`** = `VARCHAR(10)` → los `meter_id` del Drive deben tener ≤ 10 caracteres (ej. `MG-001`, `SC52-030`). Si algún CSV trae ids más largos, la promoción falla en validación.
- **`buildings.id`** = `VARCHAR(50)` → el slug de `center_name` debe caber (ej. `mall-grande`, `outlet-70`).
- **`readings`**: no hay partición por tiempo; millones de filas en una sola tabla. Agregaciones (hourly/daily) y filtros `from`/`to` son esenciales para no barrer todo.

### 1.3 Qué no se guarda en tablas productivas

- **Staging**: `center_type`, `store_type`, `store_name` solo existen en `readings_import_staging`. En `readings` y `meters` no se persisten; si el frontend necesita “tienda” o “tipo de local”, habría que llevarlo a tablas/campos nuevos o exponerlo vía una vista/API derivada de staging (solo para reporting).
- **Jerarquía**: `hierarchy_nodes` está poblada solo para los 2 edificios legacy. Los edificios creados desde Drive **no tienen nodos de jerarquía** → el drill-down por sitio (`/monitoring/drilldown/:siteId`) no mostrará nada para esos edificios hasta que se defina/importe jerarquía.

---

## 2. Cómo lo expone el backend (NestJS / Lambda)

### 2.1 Endpoints que ya consumen `readings` / `meters` / `buildings`

| Método | Ruta | Uso | Límites / notas |
|--------|------|-----|------------------|
| GET | `/buildings` | Lista edificios (con `metersCount`) | Sin paginación; si hay muchos edificios, devuelve todos (scope por `siteIds`). |
| GET | `/buildings/:id` | Detalle de un edificio | — |
| GET | `/buildings/:id/meters` | Medidores del edificio | — |
| GET | `/buildings/:id/consumption` | Consumo agregado del edificio (time-series) | `resolution`: 15min / hourly / daily. **Siempre conviene enviar `from` y `to`** para acotar. |
| GET | `/meters/overview` | Estado, uptime 24h, alarmas 30d por medidor | Útil para vista Dispositivos. |
| GET | `/meters/:id` | Detalle de un medidor | — |
| GET | `/meters/:id/readings` | Time-series del medidor | **raw**: limitado a **2000** filas (más recientes). **15min/hourly/daily**: sin límite de filas pero acotado por `from`/`to`. |
| GET | `/meters/:id/uptime` | Resumen de disponibilidad | — |
| GET | `/meters/:id/downtime-events` | Eventos de caída | — |
| GET | `/meters/:id/alarm-events` | Eventos de alarma | — |
| GET | `/meters/:id/alarm-summary` | Resumen de alarmas | — |
| GET | `/hierarchy/:buildingId` | Árbol de jerarquía del edificio | Solo edificios con filas en `hierarchy_nodes` (hoy solo legacy). |
| GET | `/hierarchy/node/:nodeId/children` | Hijos con consumo | Idem. |
| GET | `/hierarchy/node/:nodeId/consumption` | Consumo del nodo | Idem. |

Scoping: todos estos endpoints respetan `siteIds` del usuario y, si el frontend envía `X-Site-Context`, el backend restringe por ese sitio.

### 2.2 Envío “inteligente” desde backend

- **Siempre pedir rangos**: el frontend debe enviar `from` y `to` (ISO 8601) en consumo y lecturas para no arrastrar millones de puntos.
- **Resolución según rango**: ya está el criterio en front (≤36h → 15min, ≤7d → hourly, >7d → daily). Mantenerlo para charts.
- **Raw**: solo 2000 lecturas; para un medidor con años de datos, el usuario debe elegir un rango corto o usar resoluciones agregadas.
- **Listados**: si en el futuro hay muchos edificios/medidores, valorar paginación en `GET /buildings` y en overview de medidores (hoy no existe).

---

## 3. Dónde se consume en frontend (vistas)

| Vista | Ruta | Datos que usa | Comentario |
|-------|------|----------------|------------|
| **Edificios** | `/` | `GET /buildings` | Lista todos los edificios a los que el usuario tiene acceso (legacy + Drive). |
| **Detalle edificio** | `/buildings/:id` | `GET /buildings/:id`, `consumption`, `meters` | Gráfico de consumo + lista de medidores. Funciona igual para edificios Drive si tienen `buildings.id` y medidores asociados. |
| **Detalle medidor** | `/meters/:meterId` | `GET /meters/:id`, `readings` (con from/to y resolution) | Gráficos y tablas por medidor. Válido para cualquier `meter_id` en `meters` (legacy o Drive). |
| **Dispositivos** | `/monitoring/devices` | `GET /meters/overview` | Tabla de medidores con estado/uptime/alarmas. Incluye todos los medidores accesibles (legacy + Drive). |
| **Monitoreo tiempo real** | `/monitoring/realtime` | Depende de implementación | Si usa buildings/meters/consumption, mismo patrón. |
| **Drill-down** | `/monitoring/drilldown/:siteId` | `GET /hierarchy/:buildingId`, `children`, `consumption` | **Solo tiene datos para edificios con `hierarchy_nodes`** (hoy solo los 2 legacy). Edificios creados desde Drive no tendrán árbol ni consumo en esta vista hasta tener jerarquía. |
| **Alertas** | `/alerts`, `/alerts/:id` | `GET /alerts` | Alertas (ej. METER_OFFLINE); independiente del origen de datos. |

Resumen: las vistas que usan solo `buildings`, `meters` y `readings` (con from/to) ya pueden mostrar datos Drive. La que **no** mostrará datos Drive por ahora es **Drill-down**, salvo que se cargue jerarquía para esos edificios.

---

## 4. Verificación recomendada en AWS

**Opción 1 — AWS CLI (sin túnel ni token):** invocar la Lambda `dbVerify` que consulta RDS desde la VPC:

```bash
aws lambda invoke --function-name power-digital-api-dev-dbVerify --region us-east-1 out.json && cat out.json
```

**Opción 2 — Script local:** `infra/db-verify/verify-rds.mjs` (requiere .env con credenciales o túnel SSH):

```bash
cd infra/db-verify && npm ci && npm run verify
```

Consultas que realiza el script (equivalentes manuales):

1. **Conteos en RDS**: `readings`, `meters`, `buildings`, `readings_import_staging`.
2. **Distribución**: `SELECT building_id, COUNT(*) FROM meters GROUP BY building_id ORDER BY 2 DESC LIMIT 20`.
3. **Origen de datos**: `SELECT DISTINCT meter_id FROM meters ORDER BY 1 LIMIT 50` (y aviso si algún id supera VARCHAR(10)).
4. **Rangos temporales**: `SELECT meter_id, MIN(timestamp), MAX(timestamp) FROM readings GROUP BY meter_id LIMIT 20`.
5. **Jerarquía**: `SELECT building_id, COUNT(*) FROM hierarchy_nodes GROUP BY building_id`.
6. **Listado edificios**: id, name y cantidad de medidores por edificio.

---

## 5. Resumen y próximos pasos

- **Sí se puede consumir** la data de Drive desde el backend y mostrarla en el frontend en: lista de edificios, detalle de edificio, detalle de medidor, dispositivos, consumo agregado (con from/to).
- **Envío inteligente**: frontend siempre con `from`/`to` en lecturas y consumo; usar resoluciones 15min/hourly/daily según rango; tener presente el límite de 2000 en raw.
- **Vista pendiente de datos Drive**: Drill-down (jerarquía). Opciones: definir/importar `hierarchy_nodes` para edificios Drive o documentar que el drill-down solo aplica a edificios con jerarquía configurada.
- **Opcional**: si hace falta “tienda” o “tipo de local” en la UI, definir si se agrega a `meters`/`buildings` o se expone vía un endpoint que consulte staging o una vista materializada.

Este documento se puede actualizar cuando se verifiquen los conteos reales en RDS o cuando se implemente jerarquía/paginación.

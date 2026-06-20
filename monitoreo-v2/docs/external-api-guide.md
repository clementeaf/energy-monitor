# External API — Guia para Desarrolladores

Base URL: `https://power-monitor.cloud/api`

## Contenido

1. [Autenticacion](#1-autenticacion)
2. [Scopes (Permisos)](#2-scopes)
3. [Rate Limiting](#3-rate-limiting)
4. [Endpoints](#4-endpoints)
5. [Codigos de Error](#5-codigos-de-error)
6. [Ejemplos Completos](#6-ejemplos-completos)

---

## 1. Autenticacion

Dos mecanismos disponibles. Ambos proporcionan acceso a los mismos endpoints `/api/v1/*`.

### Opcion A: OAuth2 Client Credentials (recomendado)

Flujo estandar para integraciones maquina-a-maquina.

**Paso 1 — Solicitar credenciales**

Un administrador de la plataforma crea un "Cliente OAuth" desde Administracion > OAuth Clients. Recibira:
- `client_id` (ej: `emoc_2LXBrXC4RxBXsPrpCjTuT8OtmHEcvOwq`)
- `client_secret` (ej: `snWKFhnt9zhGE-4lHM0pvite2ccWxUKyfKXxVunMGF85VnPN`)

**Paso 2 — Obtener token**

```bash
curl -X POST https://power-monitor.cloud/api/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "client_credentials",
    "client_id": "emoc_2LXBrXC4RxBXsPrpCjTuT8OtmHEcvOwq",
    "client_secret": "snWKFhnt9zhGE-4lHM0pvite2ccWxUKyfKXxVunMGF85VnPN"
  }'
```

**Respuesta:**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

**Paso 3 — Usar token en cada request**

```bash
curl https://power-monitor.cloud/api/v1/buildings \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

**Renovacion:** cuando el token expire (campo `expires_in` en segundos), repita el Paso 2. No se usa refresh token.

### Opcion B: API Key

Acceso directo sin flujo de token. Ideal para scripts simples.

**Paso 1 — Crear API Key**

Un administrador crea la key desde Administracion > API Keys. La clave se muestra una sola vez — guardarla de forma segura.

**Paso 2 — Usar en cada request**

```bash
curl https://power-monitor.cloud/api/v1/buildings \
  -H "X-API-Key: emak_abc123..."
```

---

## 2. Scopes

Al crear un cliente OAuth o API Key, el administrador selecciona que permisos tendra. Solo los endpoints cubiertos por los scopes asignados estaran disponibles.

| Scope | Endpoints | Descripcion |
|-------|-----------|-------------|
| `buildings:read` | `GET /v1/buildings`, `GET /v1/buildings/:id` | Listar y consultar edificios |
| `meters:read` | `GET /v1/meters`, `GET /v1/meters/:id`, `GET /v1/meters/:id/status` | Listar medidores y su estado |
| `readings:read` | `GET /v1/readings`, `GET /v1/readings/latest`, `GET /v1/readings/aggregated`, `GET /v1/readings/compare-buildings`, `GET /v1/iot-readings/*` | Lecturas en tiempo real, historicas y agregadas |
| `readings:create` | `POST /v1/measurements` | Ingestar mediciones via API |
| `readings:export` | `GET /v1/readings/export`, `POST /v1/exports`, `GET /v1/exports/:id` | Exportar lecturas (CSV/Parquet) |
| `alerts:read` | `GET /v1/alerts`, `GET /v1/alerts/:id`, `GET /v1/iot-readings/alerts` | Consultar alertas activas e historicas |
| `billing:read` | `GET /v1/invoices`, `GET /v1/invoices/:id`, `GET /v1/tariffs`, `GET /v1/tariffs/:id`, `GET /v1/tariffs/:id/blocks` | Facturas y tarifas |
| `tenant_units:read` | `GET /v1/tenant-units`, `GET /v1/tenant-units/:id` | Locatarios (unidades de arriendo) |
| `hierarchy:read` | `GET /v1/hierarchy/buildings/:buildingId` | Arbol jerarquico del edificio |
| `concentrators:read` | `GET /v1/concentrators`, `GET /v1/concentrators/:id` | Concentradores de datos |
| `fault_events:read` | `GET /v1/fault-events`, `GET /v1/fault-events/:id` | Eventos de falla |
| `integrations:read` | `GET /v1/integrations/health` | Estado de conectores |

---

## 3. Rate Limiting

| Tipo de acceso | Limite |
|----------------|--------|
| OAuth token (`/oauth/token`) | 30 req/min |
| API Key — lectura | 60 req/min |
| API Key — ingesta (`POST /v1/measurements`) | 600 req/min |

Si se excede el limite, la API responde `429 Too Many Requests`.

---

## 4. Endpoints

Todos los endpoints estan bajo `/api/v1/`. Los IDs son UUID v4.

### 4.1 Edificios

#### `GET /v1/buildings`

Lista todos los edificios accesibles.

**Scope:** `buildings:read`

**Respuesta:**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Mall Arauco Maipu",
    "code": "MAM",
    "address": "Av. Americo Vespucio 399, Maipu",
    "latitude": -33.482,
    "longitude": -70.751,
    "tenantId": "..."
  }
]
```

#### `GET /v1/buildings/:id`

Detalle de un edificio por ID.

---

### 4.2 Medidores

#### `GET /v1/meters`

Lista todos los medidores.

**Scope:** `meters:read`

**Query params:**
| Param | Tipo | Descripcion |
|-------|------|-------------|
| `buildingId` | UUID (opcional) | Filtrar por edificio |

**Respuesta:**
```json
[
  {
    "id": "...",
    "name": "Medidor Principal",
    "serialNumber": "SN-001",
    "buildingId": "...",
    "meterType": "main",
    "protocol": "modbus",
    "isActive": true
  }
]
```

#### `GET /v1/meters/:id`

Detalle de un medidor.

#### `GET /v1/meters/:id/status`

Estado de ingesta de un medidor: ultima lectura, latencia, flag stale.

**Respuesta:**
```json
{
  "meterId": "...",
  "lastReadingAt": "2026-06-20T12:30:00Z",
  "lagMinutes": 15,
  "isStale": false
}
```

---

### 4.3 Lecturas

#### `GET /v1/readings`

Lecturas time-series con downsampling automatico.

**Scope:** `readings:read`

**Query params:**
| Param | Tipo | Descripcion |
|-------|------|-------------|
| `meterId` | UUID (requerido) | Medidor a consultar |
| `from` | ISO 8601 (requerido) | Inicio del rango |
| `to` | ISO 8601 (requerido) | Fin del rango |
| `resolution` | string (opcional) | `raw`, `15min`, `1h`, `1d`, `1M` |

**Ejemplo:**
```bash
curl "https://power-monitor.cloud/api/v1/readings?meterId=UUID&from=2026-06-01T00:00:00Z&to=2026-06-20T00:00:00Z&resolution=1h" \
  -H "Authorization: Bearer TOKEN"
```

#### `GET /v1/readings/latest`

Ultima lectura por medidor. Util para dashboards en tiempo real.

**Query params:**
| Param | Tipo | Descripcion |
|-------|------|-------------|
| `buildingId` | UUID (opcional) | Filtrar por edificio |

#### `GET /v1/readings/aggregated`

Lecturas agregadas (hourly/daily/monthly).

**Query params:**
| Param | Tipo | Descripcion |
|-------|------|-------------|
| `meterId` | UUID (opcional) | Medidor especifico |
| `buildingId` | UUID (opcional) | Filtrar por edificio |
| `from` | ISO 8601 (requerido) | Inicio |
| `to` | ISO 8601 (requerido) | Fin |
| `interval` | string (requerido) | `hourly`, `daily`, `monthly` |
| `groupBy` | string (opcional) | `portfolio`, `building` |
| `meterRole` | string (opcional) | `generation`, `load` |

#### `GET /v1/readings/compare-buildings`

Comparar consumo entre edificios (periodo actual vs anterior).

**Query params:**
| Param | Tipo | Descripcion |
|-------|------|-------------|
| `days` | number (opcional, default 30) | Dias a comparar |

#### `POST /v1/measurements`

Ingestar una medicion.

**Scope:** `readings:create`

**Body:**
```json
{
  "meterId": "UUID",
  "timestamp": "2026-06-20T12:00:00Z",
  "activePowerKw": 150.5,
  "reactivePowerKvar": 25.3,
  "voltageV": 220.1,
  "currentA": 45.2,
  "powerFactor": 0.98,
  "frequencyHz": 50.0,
  "energyKwh": 1250.0,
  "source": "api_ingress"
}
```

**Respuesta:** `201 Created`

---

### 4.4 Exportacion de Datos

#### `GET /v1/readings/export`

Stream de lecturas en CSV con paginacion por cursor.

**Scope:** `readings:export`

**Query params:**
| Param | Tipo | Descripcion |
|-------|------|-------------|
| `from` | ISO 8601 (requerido) | Inicio |
| `to` | ISO 8601 (requerido) | Fin |
| `meterId` | UUID (opcional) | Filtrar por medidor |
| `cursor` | string (opcional) | Cursor de paginacion |
| `limit` | number (opcional, default 10000) | Filas por pagina |

**Headers opcionales:**
- `X-Consumer-Id`: identificador del consumidor ETL. Persiste watermark para cargas incrementales.
- `X-Data-Contract-Version`: version del contrato de datos (ej: `readings-export@1.0.0`).

**Respuesta:** `200 OK` con body CSV. Header `X-Next-Cursor` presente si hay mas datos.

#### `POST /v1/exports`

Crear job de exportacion asincrono (CSV o Parquet).

**Body:**
```json
{
  "format": "parquet",
  "from": "2026-01-01T00:00:00Z",
  "to": "2026-06-01T00:00:00Z"
}
```

**Respuesta:** `202 Accepted`
```json
{
  "id": "UUID",
  "format": "parquet",
  "status": "pending",
  "rowCount": null,
  "createdAt": "2026-06-20T12:00:00Z"
}
```

#### `GET /v1/exports/:id`

Consultar estado del job. Cuando `status` es `completed`, el campo `downloadUrl` contiene la URL de descarga.

#### `GET /v1/exports/:id/download`

Descargar archivo de exportacion completado.

---

### 4.5 Alertas

#### `GET /v1/alerts`

Lista alertas con filtros.

**Scope:** `alerts:read`

**Query params:**
| Param | Tipo | Descripcion |
|-------|------|-------------|
| `status` | string (opcional) | `active`, `acknowledged`, `resolved` |
| `severity` | string (opcional) | `critical`, `high`, `medium`, `low` |
| `buildingId` | UUID (opcional) | Filtrar por edificio |
| `meterId` | UUID (opcional) | Filtrar por medidor |

#### `GET /v1/alerts/:id`

Detalle de una alerta.

---

### 4.6 Facturacion

#### `GET /v1/invoices`

Lista facturas.

**Scope:** `billing:read`

**Query params:**
| Param | Tipo | Descripcion |
|-------|------|-------------|
| `buildingId` | UUID (opcional) | Filtrar por edificio |
| `status` | string (opcional) | `pending`, `approved`, `voided` |
| `periodStart` | ISO 8601 (opcional) | Inicio del periodo |
| `periodEnd` | ISO 8601 (opcional) | Fin del periodo |
| `limit` | number (opcional, default 100) | |
| `offset` | number (opcional, default 0) | |

**Respuesta:**
```json
{
  "data": [...],
  "total": 45,
  "limit": 100,
  "offset": 0
}
```

#### `GET /v1/invoices/:id`

Detalle de factura con line items.

#### `GET /v1/tariffs`

Lista tarifas electricas.

| Param | Tipo | Descripcion |
|-------|------|-------------|
| `buildingId` | UUID (opcional) | Filtrar por edificio |

#### `GET /v1/tariffs/:id`

Detalle de tarifa.

#### `GET /v1/tariffs/:id/blocks`

Bloques horarios de una tarifa (punta, llano, valle).

---

### 4.7 Locatarios

#### `GET /v1/tenant-units`

**Scope:** `tenant_units:read`

| Param | Tipo | Descripcion |
|-------|------|-------------|
| `buildingId` | UUID (opcional) | Filtrar por edificio |

#### `GET /v1/tenant-units/:id`

Detalle de un locatario.

---

### 4.8 Jerarquia

#### `GET /v1/hierarchy/buildings/:buildingId`

**Scope:** `hierarchy:read`

Retorna el arbol jerarquico completo del edificio (areas, sub-areas, medidores).

---

### 4.9 Concentradores

#### `GET /v1/concentrators`

**Scope:** `concentrators:read`

| Param | Tipo | Descripcion |
|-------|------|-------------|
| `buildingId` | UUID (opcional) | Filtrar por edificio |

#### `GET /v1/concentrators/:id`

Detalle de concentrador.

---

### 4.10 Eventos de Falla

#### `GET /v1/fault-events`

**Scope:** `fault_events:read`

#### `GET /v1/fault-events/:id`

Detalle de evento de falla.

---

### 4.11 IoT Readings (MQTT/Siemens)

Lecturas de dispositivos IoT conectados via MQTT.

#### `GET /v1/iot-readings`

**Scope:** `readings:read`

| Param | Tipo | Descripcion |
|-------|------|-------------|
| `meterId` | UUID (requerido) | |
| `from` | ISO 8601 (requerido) | |
| `to` | ISO 8601 (requerido) | |
| `limit` | number (opcional, default 100) | |

#### `GET /v1/iot-readings/latest`

Ultima lectura IoT para un medidor.

| Param | Tipo | Descripcion |
|-------|------|-------------|
| `meterId` | UUID (requerido) | |

#### `GET /v1/iot-readings/timeseries`

Serie temporal IoT con resolucion configurable.

| Param | Tipo | Descripcion |
|-------|------|-------------|
| `meterId` | UUID (requerido) | |
| `from` | ISO 8601 (requerido) | |
| `to` | ISO 8601 (requerido) | |
| `variables` | string (opcional) | Comma-separated: `voltage,current,power` |
| `resolution` | string (opcional) | `raw`, `15min`, `1h`, `1d` |

#### `GET /v1/iot-readings/stats`

Resumen estadistico (min, max, avg, std) para un rango.

#### `GET /v1/iot-readings/alerts`

Alertas derivadas de anomalias IoT.

| Param | Tipo | Descripcion |
|-------|------|-------------|
| `meterId` | UUID (opcional) | |
| `severity` | string (opcional) | `critical`, `high`, `medium`, `low` |

---

### 4.12 Integraciones

#### `GET /v1/integrations/health`

**Scope:** `integrations:read`

Estado de salud de los conectores configurados.

---

## 5. Codigos de Error

| Codigo | Significado |
|--------|-------------|
| `400` | Parametros invalidos o faltantes |
| `401` | Token ausente, expirado o invalido |
| `403` | Scope insuficiente para este endpoint |
| `404` | Recurso no encontrado |
| `409` | Conflicto (ej: medicion duplicada) |
| `429` | Rate limit excedido |
| `451` | Procesamiento de datos suspendido (derecho ARCO+) |
| `500` | Error interno del servidor |

**Formato de error:**
```json
{
  "statusCode": 403,
  "message": "Missing permission: billing:read",
  "error": "Forbidden"
}
```

---

## 6. Ejemplos Completos

### Python

```python
import requests

BASE = "https://power-monitor.cloud/api"

# 1. Obtener token
token_resp = requests.post(f"{BASE}/oauth/token", json={
    "grant_type": "client_credentials",
    "client_id": "emoc_...",
    "client_secret": "snWK...",
})
token = token_resp.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

# 2. Listar edificios
buildings = requests.get(f"{BASE}/v1/buildings", headers=headers).json()
for b in buildings:
    print(f"{b['name']} — {b['address']}")

# 3. Lecturas agregadas del ultimo mes
import datetime
now = datetime.datetime.utcnow()
month_ago = now - datetime.timedelta(days=30)

readings = requests.get(f"{BASE}/v1/readings/aggregated", headers=headers, params={
    "buildingId": buildings[0]["id"],
    "from": month_ago.isoformat() + "Z",
    "to": now.isoformat() + "Z",
    "interval": "daily",
}).json()

for r in readings:
    print(f"{r['bucket']}: {r['avg_active_power_kw']:.1f} kW")
```

### JavaScript (Node.js)

```javascript
const BASE = 'https://power-monitor.cloud/api';

// 1. Obtener token
const tokenRes = await fetch(`${BASE}/oauth/token`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    grant_type: 'client_credentials',
    client_id: 'emoc_...',
    client_secret: 'snWK...',
  }),
});
const { access_token } = await tokenRes.json();
const headers = { Authorization: `Bearer ${access_token}` };

// 2. Listar medidores
const meters = await fetch(`${BASE}/v1/meters`, { headers }).then(r => r.json());
console.log(`${meters.length} medidores encontrados`);

// 3. Ultima lectura
const latest = await fetch(`${BASE}/v1/readings/latest`, { headers }).then(r => r.json());
for (const r of latest) {
  console.log(`${r.meterName}: ${r.activePowerKw} kW`);
}
```

### cURL (Bash)

```bash
# Obtener token
TOKEN=$(curl -s -X POST https://power-monitor.cloud/api/oauth/token \
  -H "Content-Type: application/json" \
  -d '{"grant_type":"client_credentials","client_id":"emoc_...","client_secret":"snWK..."}' \
  | jq -r '.access_token')

# Listar alertas criticas
curl -s "https://power-monitor.cloud/api/v1/alerts?severity=critical" \
  -H "Authorization: Bearer $TOKEN" | jq .

# Exportar lecturas CSV
curl -s "https://power-monitor.cloud/api/v1/readings/export?from=2026-06-01T00:00:00Z&to=2026-06-20T00:00:00Z" \
  -H "Authorization: Bearer $TOKEN" \
  -o readings.csv
```

### API Key (alternativa sin token)

```bash
# Directo con API Key — sin paso de token
curl -s "https://power-monitor.cloud/api/v1/buildings" \
  -H "X-API-Key: emak_abc123..."
```

---

*Documentacion generada para API v1 — Junio 2026*

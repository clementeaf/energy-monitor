# External API v1 — Integration Guide

> Base URL: `https://power-monitor.cloud/api/v1`
> Version: 1.0 | Header: `API-Version: 1.0`

---

## Authentication

Two methods, both scoped to a tenant and building set:

### API Key (recommended for server-to-server)

```
X-API-Key: <your-api-key>
```

API keys are created in the platform admin panel (**Configuración → API Keys**). Each key has assigned scopes that control endpoint access.

### OAuth2 Bearer Token

```
Authorization: Bearer <access_token>
```

Same JWT issued by the platform login flow. Useful for user-context integrations.

---

## Rate Limits

| Tier | Window | Limit |
|------|--------|-------|
| Short | 1 second | 10 requests |
| Medium | 1 minute | 100 requests |
| Long | 1 hour | 1,000 requests |

Exceeding limits returns `429 Too Many Requests`. Use exponential backoff for retries.

---

## Scopes

Each API key is assigned one or more scopes:

| Scope | Endpoints |
|-------|-----------|
| `buildings:read` | `GET /v1/buildings`, `GET /v1/buildings/:id` |
| `meters:read` | `GET /v1/meters`, `GET /v1/meters/:id`, `GET /v1/meters/:id/status` |
| `readings:read` | `GET /v1/readings`, `GET /v1/readings/latest`, `GET /v1/readings/aggregated`, `GET /v1/readings/latest-anchor`, `GET /v1/readings/compare-buildings`, `GET /v1/iot-readings/*` |
| `readings:create` | `POST /v1/measurements` |
| `readings:export` | `GET /v1/readings/export`, `POST /v1/exports`, `GET /v1/exports/:id`, `GET /v1/exports/:id/download` |
| `alerts:read` | `GET /v1/alerts`, `GET /v1/alerts/:id`, `GET /v1/iot-readings/alerts` |
| `billing:read` | `GET /v1/invoices`, `GET /v1/invoices/:id`, `GET /v1/tariffs`, `GET /v1/tariffs/:id`, `GET /v1/tariffs/:id/blocks` |
| `tenant_units:read` | `GET /v1/tenant-units`, `GET /v1/tenant-units/:id` |
| `hierarchy:read` | `GET /v1/hierarchy/buildings/:buildingId` |
| `concentrators:read` | `GET /v1/concentrators`, `GET /v1/concentrators/:id` |
| `fault_events:read` | `GET /v1/fault-events`, `GET /v1/fault-events/:id` |
| `integrations:read` | `GET /v1/integrations/health` |

---

## Common Response Format

All list endpoints return JSON arrays. Paginated endpoints return:

```json
{
  "data": [...],
  "total": 150,
  "limit": 20,
  "offset": 0
}
```

Error responses:

```json
{
  "statusCode": 404,
  "message": "Meter not found",
  "error": "Not Found"
}
```

---

## Endpoints

### Buildings

#### `GET /v1/buildings`

List all buildings accessible to the API key.

**Response:**

```json
[
  {
    "id": "uuid",
    "name": "Mall Parque Arauco",
    "code": "MPA-001",
    "countryCode": "CL",
    "timezone": "America/Santiago",
    "externalSiteId": "ERP-1234",
    "siteKind": "mall",
    "regionId": "uuid",
    "regionName": "Región Metropolitana"
  }
]
```

#### `GET /v1/buildings/:id`

Get a single building by UUID.

---

### Meters

#### `GET /v1/meters`

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `buildingId` | uuid | No | Filter by building |

**Response:**

```json
[
  {
    "id": "uuid",
    "buildingId": "uuid",
    "name": "Medidor Principal",
    "code": "MP-001",
    "meterType": "electrical",
    "isActive": true,
    "externalId": "EXT-456",
    "model": "Siemens 7KT1260",
    "serialNumber": "SN12345"
  }
]
```

#### `GET /v1/meters/:id`

Get a single meter.

#### `GET /v1/meters/:id/status`

Ingest status for a meter.

**Response:**

```json
{
  "meterId": "uuid",
  "lastReadingAt": "2026-06-15T10:00:00.000Z",
  "lastIngestedAt": "2026-06-15T10:00:05.000Z",
  "lastSource": "mqtt",
  "lagSeconds": 120,
  "isStale": false,
  "staleThresholdHours": 4
}
```

---

### Readings

#### `GET /v1/readings`

Time-series readings with automatic downsampling.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `meterId` | string | **Yes** | Meter UUID |
| `from` | ISO 8601 | **Yes** | Start timestamp |
| `to` | ISO 8601 | **Yes** | End timestamp |
| `resolution` | string | No | `raw`, `5min`, `15min`, `1h`, `1d` (default: auto) |
| `limit` | number | No | Max rows (1–10,000) |
| `quality` | string | No | Comma-separated: `measured,estimated,invalid,unknown` |

#### `GET /v1/readings/latest`

Latest reading per meter.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `buildingId` | uuid | No | Filter by building |
| `meterId` | uuid | No | Filter by meter |
| `quality` | string | No | Comma-separated quality filter |

#### `GET /v1/readings/aggregated`

Aggregated readings (hourly, daily, monthly).

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `from` | ISO 8601 | **Yes** | Start timestamp |
| `to` | ISO 8601 | **Yes** | End timestamp |
| `interval` | string | **Yes** | `15min`, `hourly`, `daily`, `monthly` |
| `buildingId` | uuid | No | Filter by building |
| `meterId` | uuid | No | Filter by meter |
| `groupBy` | string | No | `portfolio` or `building` |
| `meterRole` | string | No | `generation` or `load` |
| `quality` | string | No | Quality filter |
| `loadCategory` | string | No | e.g. `clima`, `iluminacion` |

#### `GET /v1/readings/latest-anchor`

Returns the newest reading timestamp for chart date anchoring.

#### `GET /v1/readings/compare-buildings`

Compare buildings (current vs previous period).

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `days` | number | **Yes** | `1`, `7`, or `30` |

---

### Ingress (Write)

#### `POST /v1/measurements`

Ingest a single meter reading. Scope: `readings:create`.

**Request body:**

```json
{
  "meterId": "uuid",
  "timestamp": "2026-06-15T10:00:00.000Z",
  "metrics": {
    "powerKw": 12.5,
    "energyKwhTotal": 10450.25,
    "voltageL1": 220.1,
    "voltageL2": 219.8,
    "voltageL3": 220.3,
    "currentL1": 45.2,
    "currentL2": 44.8,
    "currentL3": 45.0,
    "reactivePowerKvar": 2.1,
    "powerFactor": 0.98,
    "frequencyHz": 50.01,
    "thdVoltagePct": 2.3,
    "thdCurrentPct": 4.1,
    "phaseImbalancePct": 0.5
  },
  "quality": "measured",
  "externalRef": "ERP-INV-12345"
}
```

Only `meterId`, `timestamp`, `metrics.powerKw`, and `metrics.energyKwhTotal` are required. All other fields are optional.

**Response (201):**

```json
{
  "id": "uuid",
  "meterId": "uuid",
  "timestampUtc": "2026-06-15T10:00:00.000Z",
  "timezone": "America/Santiago",
  "timestampLocal": "2026-06-15T06:00:00",
  "powerKw": "12.500",
  "energyKwhTotal": "10450.250",
  "quality": "measured",
  "source": "api_ingress",
  "ingestedAt": "2026-06-15T10:00:01.000Z"
}
```

**Errors:**
- `403` — Meter not accessible for this API key
- `409` — Duplicate measurement (same meter + timestamp + source)

---

### Export (ETL)

#### `GET /v1/readings/export`

Stream readings as CSV with cursor pagination.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `format` | string | **Yes** | `csv` |
| `from` | ISO 8601 | **Yes** | Start date |
| `to` | ISO 8601 | **Yes** | End date |
| `cursor` | string | No | Continuation cursor from `X-Next-Cursor` header |
| `meterId` | uuid | No | Filter by meter |
| `buildingId` | uuid | No | Filter by building |

**Headers (optional):**
- `X-Consumer-Id` — Persists watermark cursor for incremental loads
- `X-Data-Contract-Version` — Contract validation (e.g. `readings-export@1.0.0`)

**Response:** CSV stream. Header `X-Next-Cursor` present when more data exists.

#### `POST /v1/exports`

Create async export job (CSV or Parquet). Returns `202 Accepted`.

**Request body:**

```json
{
  "format": "parquet",
  "from": "2026-01-01T00:00:00Z",
  "to": "2026-06-01T00:00:00Z",
  "buildingId": "uuid",
  "meterId": "uuid"
}
```

**Response (202):**

```json
{
  "id": "uuid",
  "format": "parquet",
  "status": "pending",
  "rowCount": 0,
  "error": null,
  "createdAt": "2026-06-15T10:00:00Z",
  "updatedAt": "2026-06-15T10:00:00Z",
  "expiresAt": null,
  "downloadUrl": null
}
```

#### `GET /v1/exports/:id`

Poll job status. `downloadUrl` appears when `status=completed`.

#### `GET /v1/exports/:id/download`

Download the completed export file.

---

### Alerts

#### `GET /v1/alerts`

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `status` | string | No | `active`, `acknowledged`, `resolved` |
| `severity` | string | No | `critical`, `high`, `medium`, `low` |
| `buildingId` | uuid | No | Filter by building |
| `meterId` | uuid | No | Filter by meter |

#### `GET /v1/alerts/:id`

Get a single alert.

---

### Billing

#### `GET /v1/invoices`

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `buildingId` | uuid | No | Filter by building |
| `status` | string | No | Invoice status filter |
| `periodStart` | ISO 8601 | No | Period start |
| `periodEnd` | ISO 8601 | No | Period end |
| `limit` | number | No | 1–100 (default 20) |
| `offset` | number | No | Pagination offset |

#### `GET /v1/invoices/:id`

Get a single invoice with line items.

#### `GET /v1/tariffs`

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `buildingId` | uuid | No | Filter by building |

#### `GET /v1/tariffs/:id`

Get a tariff.

#### `GET /v1/tariffs/:id/blocks`

List tariff time blocks.

---

### Tenant Units (Locatarios)

#### `GET /v1/tenant-units`

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `buildingId` | uuid | No | Filter by building |

#### `GET /v1/tenant-units/:id`

Get a single tenant unit.

---

### Hierarchy

#### `GET /v1/hierarchy/buildings/:buildingId`

Returns the full hierarchy tree for a building (building → concentrators → meters).

---

### Concentrators

#### `GET /v1/concentrators`

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `buildingId` | uuid | No | Filter by building |

#### `GET /v1/concentrators/:id`

Get a single concentrator.

---

### Fault Events

#### `GET /v1/fault-events`

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `buildingId` | uuid | No | Filter by building |
| `meterId` | uuid | No | Filter by meter |
| `severity` | string | No | Severity filter |
| `faultType` | string | No | Fault type filter |
| `dateFrom` | ISO 8601 | No | Start date |
| `dateTo` | ISO 8601 | No | End date |

#### `GET /v1/fault-events/:id`

Get a single fault event.

---

### IoT Readings (Siemens / MQTT)

#### `GET /v1/iot-readings`

Raw IoT readings for a meter.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `meterId` | uuid | **Yes** | Meter UUID |
| `from` | ISO 8601 | **Yes** | Start timestamp |
| `to` | ISO 8601 | **Yes** | End timestamp |
| `limit` | number | No | Max rows (1–5,000, default 100) |

#### `GET /v1/iot-readings/latest`

Latest IoT reading for a meter.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `meterId` | uuid | **Yes** | Meter UUID |

#### `GET /v1/iot-readings/timeseries`

Time-series with optional resolution.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `meterId` | uuid | **Yes** | Meter UUID |
| `from` | ISO 8601 | **Yes** | Start timestamp |
| `to` | ISO 8601 | **Yes** | End timestamp |
| `variables` | string | No | Comma-separated variable names |
| `resolution` | string | No | `raw`, `5min`, `15min`, `1h`, `1d` |

#### `GET /v1/iot-readings/stats`

Statistical summary (min, max, avg) for a meter in a range.

Same params as `timeseries`.

#### `GET /v1/iot-readings/alerts`

IoT-derived anomaly alerts.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `severity` | string | No | Filter by severity |
| `meterId` | uuid | No | Filter by meter |

---

### Integrations

#### `GET /v1/integrations/health`

Returns connector health summary for the tenant.

---

## Incremental Loading Pattern

For ETL pipelines that need only new data since the last fetch:

1. First call: `GET /v1/readings/export?format=csv&from=2026-01-01&to=2026-12-31`
   - Include header `X-Consumer-Id: my-etl-pipeline`
2. Response streams CSV. Header `X-Next-Cursor` contains the cursor.
3. Next call: add `&cursor=<X-Next-Cursor value>` to continue.
4. The watermark is persisted server-side per consumer ID.

---

## Data Quality Flags

Every reading includes a `quality` field:

| Value | Meaning |
|-------|---------|
| `measured` | Real hardware reading |
| `estimated` | Calculated or interpolated (e.g. CNR manual entry) |
| `invalid` | Failed validation |
| `unknown` | Legacy or unclassified |

Filter via `?quality=measured,estimated` on readings endpoints.

---

## Error Codes

| Status | Meaning |
|--------|---------|
| `400` | Validation error (check `message` for details) |
| `401` | Missing or invalid authentication |
| `403` | Valid auth but insufficient scope or building access |
| `404` | Resource not found |
| `409` | Duplicate (e.g. duplicate measurement) |
| `429` | Rate limit exceeded |
| `500` | Server error |

---

## Postman Collection

A ready-to-use Postman collection with all 252 routes is available at:

```
monitoreo-v2/docs/postman-collection.json
```

Import it and set variables:
- `{{baseUrl}}` → `https://power-monitor.cloud/api`
- `{{accessToken}}` → Your API key or Bearer token

---

## Versioning Policy

- Current version: `1.0` (header `API-Version: 1.0`)
- Breaking changes trigger a new major version
- Deprecated endpoints include `Deprecation`, `Sunset`, and `X-Deprecation-Notice` headers (RFC 8594)
- Minimum 6-month deprecation window before removal

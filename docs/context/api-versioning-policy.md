# API Versioning Policy — monitoreo-v2

> INT-06: Backward compatibility guarantee for at least 6 months on any breaking change.

## Current Version

- **API-Version:** `1.0`
- **Base path:** `/api/v1/`
- **Response header:** `API-Version: 1.0` on every response

## Versioning Scheme

- URL path versioning: `/api/v1/`, `/api/v2/` (future)
- Major version increments on breaking changes only
- Non-breaking changes (new fields, new endpoints) do NOT require version bump

## Backward Compatibility Rules

| Change Type | Compatible | Example |
|-------------|:---------:|---------|
| Add new endpoint | Yes | `GET /v1/new-resource` |
| Add optional field to response | Yes | New `quality` field in readings |
| Add optional query parameter | Yes | `?quality=measured` filter |
| Add new enum value | Yes | `manual_cnr` in reading sources |
| Remove field from response | **No** | Requires v2 |
| Rename field | **No** | Requires v2 |
| Change field type | **No** | Requires v2 |
| Remove endpoint | **No** | Deprecation cycle required |
| Change auth mechanism | **No** | Requires v2 |

## Deprecation Cycle

1. **Mark deprecated:** Endpoint gets `Deprecation: true` + `Sunset: <date>` response headers
2. **Notice period:** Minimum 6 months from deprecation to removal
3. **Notification:** `X-Deprecation-Notice` header with human-readable message
4. **Removal:** Endpoint removed only after sunset date

### Response Headers (RFC 8594)

```
API-Version: 1.0
Deprecation: true
Sunset: 2027-06-15
X-Deprecation-Notice: Use GET /v2/readings instead. This endpoint will be removed after 2027-06-15.
```

## Schema Change Notification (DAT-13b)

- Any breaking schema change communicated to consumers 30+ days in advance
- Non-breaking additions documented in CHANGELOG
- OpenAPI spec regenerated on every release (`npm run db:postman`)

## Rate Limiting (DAT-15)

| Tier | Limit | Applies to |
|------|------:|-----------|
| Default | 100 req/min | All authenticated requests |
| Short burst | 20 req/10s | Auth endpoints |
| API key | Per-key config | `rate_limit_per_minute` in api_keys table |

## Authentication

- **Browser sessions:** JWT httpOnly cookies (`__Host-access_token` in prod)
- **External API:** `X-API-Key` header or OAuth Bearer token
- **Scopes:** Per-endpoint permissions (`readings:read`, `readings:create`, etc.)

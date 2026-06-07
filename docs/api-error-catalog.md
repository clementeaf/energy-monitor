# Catálogo de errores API (auto-generado)

Generado: 2026-06-07 · 18 códigos

> Fuente: `monitoreo-v2/backend/src/common/errors/api-error-codes.ts`

> Regenerar: `node scripts/generate-error-catalog.mjs`

| Código | HTTP | Módulo | Mensaje |
|--------|------|--------|---------|
| `AUTH_INVALID_CREDENTIALS` | 401 | auth | Authentication failed. |
| `AUTH_TOKEN_EXPIRED` | 401 | auth | Invalid or expired refresh token. |
| `AUTH_MFA_REQUIRED` | 401 | auth | Invalid MFA code. |
| `AUTH_SSO_DISABLED` | 400 | auth | SSO is not enabled for this tenant. |
| `AUTH_FORBIDDEN` | 403 | auth | Missing permission. |
| `AUTH_CROSS_TENANT` | 403 | auth | Cross-tenant access denied. |
| `VALIDATION_FAILED` | 400 | common | Request validation failed. |
| `RESOURCE_NOT_FOUND` | 404 | common | Resource not found. |
| `RESOURCE_CONFLICT` | 409 | common | Resource conflict. |
| `RATE_LIMIT_EXCEEDED` | 429 | common | Too many requests. |
| `DATA_CONTRACT_MISMATCH` | 400 | data-governance | Data contract version mismatch. |
| `EXPORT_SCOPE_MISSING` | 403 | external-api | Missing permission: readings:export |
| `INGEST_DUPLICATE` | 409 | readings | Duplicate measurement. |
| `INGEST_METER_FORBIDDEN` | 403 | readings | Meter not accessible for this API key. |
| `BILLING_TARIFF_INVALID` | 400 | invoices | Tariff not found or has no blocks configured. |
| `BILLING_INVOICE_STATUS` | 400 | invoices | Invoice cannot be updated in current status. |
| `OAUTH_CLIENT_INVALID` | 401 | oauth-clients | Invalid client credentials. |
| `INTERNAL_ERROR` | 500 | common | Internal server error. |


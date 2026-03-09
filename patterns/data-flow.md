# Data Flow — Energy Monitor

## Ingesta de lecturas

```
Medidor Siemens (PAC1670/PAC1651)
  → [futuro] MQTT broker
  → [actual] Lambda synthetic-readings-generator (EventBridge 1/min)
    → INSERT readings (15 filas/min, una por medidor)
    → UPDATE meters SET last_reading_at = NOW(), status = 'online'
```

### Perfil estadístico
Cada lectura sintética se genera con distribución normal (Box-Muller):
- `profiles.json`: media + desviación estándar por medidor (M001-M015), por hora (00-23), por campo (13 campos eléctricos)
- Energía (`energy_kwh_total`): acumulativa desde última lectura real, incremento = `power_kw * dt_hours`

### Datos históricos
- CSV importado: 86,104 filas, 15-min interval, Ene-Feb 2026
- Post-CSV gap (Mar 2-5): backfill con `infra/backfill-gap/`
- Mar 6+: generador sintético en tiempo real

## API → Frontend

```
Frontend (React)
  → Axios + Bearer JWT
    → CloudFront /api/*
      → API Gateway HTTP
        → Lambda NestJS

Resolución dinámica (StockChart afterSetExtremes):
  ≤36h  → resolution=15min  → date_trunc + floor(extract(min)/15)*15
  ≤7d   → resolution=hourly → date_trunc('hour')
  >7d   → resolution=daily  → date_trunc('day')
```

### Endpoints principales

| Endpoint | Agregación | Uso |
|---|---|---|
| `GET /buildings/:id/consumption?resolution=&from=&to=` | AVG(power_kw) por medidor por bucket, luego SUM | Gráfico edificio (area+line) |
| `GET /meters/:id/readings?resolution=&from=&to=` | AVG por bucket (13 campos) | 6 charts por medidor |
| `GET /hierarchy/:buildingId/nodes/:nodeId/children-consumption?from=&to=` | SUM energy_kwh por subtree (CTE recursivo) | Drill-down barras + tabla |
| `GET /meters/:id/uptime` | LAG() window function, gap > 90min = downtime | Badges 24h/7d/30d |
| `GET /meters/:id/alarm-events?from=&to=` | Detección por umbrales en readings | Tabla + flags en charts |

## Detección de offline

```
Lambda offlineAlerts (EventBridge 5/min)
  → SELECT meters WHERE last_reading_at < NOW() - 5min
  → INSERT alert (type=METER_OFFLINE) si no existe activa
  → UPDATE alert SET resolved_at = NOW() si medidor volvió online
```

## Autenticación

```
Login (Microsoft redirect / Google credential)
  → JWT id_token en sessionStorage
  → Axios interceptor: Authorization: Bearer <token>
  → Backend: jose.jwtVerify() con JWKS (Microsoft/Google)
    → audience validation por provider
    → users.upsert(external_id, provider, email)
    → Si user.is_active = false → 403
    → Retorna { user, permissions[] }
```

## Caching (TanStack Query)

| Query | staleTime | refetchInterval |
|---|---|---|
| buildings list | Infinity | — |
| building detail | Infinity | — |
| consumption | 0 (keepPreviousData) | — |
| meter readings | 0 (keepPreviousData) | — |
| meters overview | 30s | 30s |
| alerts | 30s | 30s |
| auth/me | Infinity | — |

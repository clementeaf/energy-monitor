# Storage sizing — readings (15 min, 5 years)

**Context:** PASA EMS requires raw readings at 15-minute resolution retained for 5 years (DAT-08, ARQ-12).  
**Enforcement:** TimescaleDB `add_retention_policy('readings', INTERVAL '5 years')` — not application cron.

## Formula

```
rows_per_meter = (365.25 × retention_years × 24 × 60) / interval_minutes
total_rows     = rows_per_meter × meter_count
```

Default tenant setting: `tenants.settings.retentionYears = 5` (see `lib/tenant-settings.ts`).

## Reference: 15-minute buckets, 5 years, 1 meter

| Variable | Value |
|----------|-------|
| Interval | 15 min → 4 readings/hour → 96/day |
| Days/year | 365.25 |
| Years | 5 |
| **Rows/meter** | **≈ 175,320** |

```
96 × 365.25 × 5 = 175,320 rows/meter
```

## PASA-scale estimate (~2,673 meters integrar)

| Metric | Estimate |
|--------|----------|
| Raw rows (5y @ 15min) | ~468M rows |
| Row size (readings, compressed ~10×) | ~200 B raw → ~20 B compressed avg |
| Raw uncompressed | ~90 GB |
| After Timescale compression (7d+) | ~10–20 GB (varies by cardinality) |
| CAGG overhead (`readings_15min`, hourly, daily) | +15–25% storage |

## Continuous aggregates

| View | Buckets/meter/5y | Use case |
|------|------------------|----------|
| `readings_15min` | 175,320 | Aggregated API `interval=15min`, range > 7d |
| `readings_hourly` | 43,830 | Dashboard hourly |
| `readings_daily` | 1,826 | Executive portfolio, billing |

## Retention ops (GAP-069)

- **Do:** rely on TimescaleDB retention policy (migration `22-retention-5y.sql`).
- **Do not:** add cron/job that `DELETE FROM readings` before 5 years.
- **Do not:** contradict policy in `DataRetentionService` (tokens/users/MV refresh only).
- Compression after 7 days remains valid for 5-year retention (chunks stay queryable until policy drops them).

## Per-tenant override (future)

`tenants.settings.retentionYears` (1–10) is validated on PATCH; global hypertable policy remains 5y until per-tenant tiering is implemented.

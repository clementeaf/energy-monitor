# Reglas de negocio — KPIs y facturación (GAP-204)

Documento derivado del código en `monitoreo-v2/backend`. Fuente principal: `InvoicesService.generate` e integraciones dashboard.

## Resolución temporal de lecturas

| Granularidad | Fórmula | Uso |
|--------------|---------|-----|
| Energía (kWh) | `SUM(power_kw × 0.25)` | Lecturas cada 15 min → factor 0.25 h |
| Demanda pico (kW) | `MAX(power_kw)` | Período factura / agregado |
| Reactiva (kVArh) | `SUM(reactive_power_kvar × 0.25)` | Misma resolución 15 min |

> `readings.power_kw` en kW; intervalo implícito 15 minutos (4 lecturas/hora).

## Facturación por medidor (`POST /invoices/generate`)

Por cada medidor activo del edificio en el período `[periodStart, periodEnd)`:

### 1. Cargo energía (bloques horarios)

```
energyCharge = Σ (kWh_h × energyRate_block(h))
```

- `kWh_h`: suma horaria `SUM(power_kw × 0.25)` agrupada por `EXTRACT(HOUR FROM timestamp)`
- `energyRate_block(h)`: tarifa del bloque que cubre la hora `h` (`tariff_blocks.hour_start` / `hour_end`)
- Bloques overnight (ej. 23→6): horas `23..23` y `0..5` mapeadas al mismo bloque

### 2. Cargo demanda

```
demandCharge = kwMax × max(demandRate) sobre todos los bloques de la tarifa
```

- `kwMax`: `MAX(power_kw)` en el período

### 3. Cargo reactiva

```
reactiveCharge = kvarh × max(reactiveRate) sobre todos los bloques
```

### 4. Cargo fijo

```
fixedCharge = Σ fixedCharge de cada bloque de la tarifa
```

> Se suman los cargos fijos de **todos** los bloques (modelo mensual compuesto).

### 5. Total línea y factura

```
totalNet_line = energyCharge + demandCharge + reactiveCharge + fixedCharge
totalNet_invoice = Σ totalNet_line
taxAmount = totalNet_invoice × 0.19
total_invoice = totalNet_invoice + taxAmount
```

IVA fijo **19%** (`taxRate = 0.19`) en generación automática.

### Campos line item

| Campo | Regla |
|-------|-------|
| `kwhConsumption` | kWh total período |
| `kwDemandMax` | Demanda pico kW |
| `kvarhReactive` | kVArh total |
| `kwhExported` | `0.00` (placeholder; sin medición export aún) |
| `netBalance` | Igual a `kwhConsumption` |

## KPIs dashboard ejecutivo (frontend)

Fuente: `ExecutiveDashboardPage` + `readings` agregados `groupBy=portfolio`.

| KPI | Cálculo |
|-----|---------|
| Energía período | Suma `energyKwh` de series portfolio |
| Costo estimado | `energyKwh × refEnergyRate` (tarifa referencia UI) |
| Demanda | Serie `demandKw` por bucket temporal |
| Ranking intensidad | Potencia/energía actual por edificio vs portfolio |

Cache backend portfolio: 5 min (`PORTFOLIO_CACHE_TTL` en `ReadingsService`).

## Calidad y gobernanza de datos

| KPI | Regla | Fuente |
|-----|-------|--------|
| Medidor stale | Sin lectura > `staleThresholdHours` (default 4h, tenant settings) | `IngestGapDetectorService` |
| Balance padre/hijos | `|parent_kwh − sum_children| > threshold` → `balance_anomalies` | `MeterBalanceJobService` |
| Calidad diaria | `measured_pct`, `estimated_pct`, `invalid_pct` rollup | `data_quality_daily` |

## Export ETL

| Requisito | Regla |
|-----------|-------|
| Scope OAuth | `readings:export` obligatorio en `/v1/readings/export` |
| Contrato datos | Header `X-Data-Contract-Version: readings-export@1.0.0` (validado por `DataContractGuard`) |
| Watermark | Header opcional `X-Consumer-Id` persiste cursor en `etl_watermarks` |

## Referencias código

- `monitoreo-v2/backend/src/modules/invoices/invoices.service.ts` — `generate()`
- `monitoreo-v2/backend/src/modules/readings/readings.service.ts` — agregados portfolio
- `monitoreo-v2/frontend/src/features/dashboard/executive/ExecutiveDashboardPage.tsx`

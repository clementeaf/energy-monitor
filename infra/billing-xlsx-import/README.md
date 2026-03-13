# Billing XLSX import (S3 → RDS)

Lee los XLSX de facturación desde S3 (prefijo `billing/`) e inserta en:

- `billing_monthly_detail` (hoja Resumen Mensual)
- `billing_tariffs` (hoja Pliegos Tarifarios)
- `billing_center_summary` (hoja Resumen Ejecutivo)

## Uso

```bash
# Procesar todos los .xlsx bajo S3_BUCKET/billing/
npm run import
```

Variables de entorno:

- **S3:** `S3_BUCKET` (default: energy-monitor-ingest-058310292956), `S3_PREFIX` (default: billing)
- **DB:** `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD` o Secrets Manager (`DB_SECRET_NAME`)

Con túnel RDS local:

```bash
DB_HOST=127.0.0.1 DB_PORT=5433 node --env-file=../../backend/.env index.mjs
```

Idempotente: usa `ON CONFLICT ... DO UPDATE` por archivo, así que se puede re-ejecutar sin duplicar.

## Un solo archivo

```bash
S3_KEY=billing/MG446_KPIs_mensuales_2025_M.xlsx npm run import
# o
npm run import-one
```

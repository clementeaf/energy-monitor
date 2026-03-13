# Lambda: CSV Ingest (2 meses) → Staging → Catalog → Readings

Consume CSV desde S3 (`raw/`), filtra por ventana de 2 meses, inserta en `readings_import_staging`, ejecuta catalog (buildings, meters, staging_centers) y promote a `readings`. **Solo invocación manual**: la data ya está en S3; se ejecuta cuando se decide (CLI o EventBridge/cron si se habilita).

## Requisitos

- Misma VPC y Secrets Manager que el resto del proyecto (`energy-monitor/drive-ingest/db`).
- Variables de entorno en deploy: `VPC_SECURITY_GROUP_ID`, `VPC_SUBNET_ID_1`, `VPC_SUBNET_ID_2`, `VPC_SUBNET_ID_3`.

## Event payload (invocación manual)

```json
{
  "bucket": "energy-monitor-ingest-058310292956",
  "key": "raw/MALL_GRANDE_446_completo.csv",
  "fromDate": "2025-01-01T00:00:00.000Z",
  "toDate": "2025-02-28T23:59:59.999Z"
}
```

- `bucket` (opcional): por defecto `S3_BUCKET` env.
- `key` (opcional): un solo objeto. Si se omite, se listan todos los `raw/*.csv` y se procesan en secuencia.
- `fromDate` / `toDate` (opcional): ventana en ISO 8601. Solo se insertan filas cuyo `timestamp` está en ese rango. Si ambos faltan, se cargan todas las filas del CSV.

## Variables de entorno

| Variable        | Descripción                          | Default                          |
|----------------|--------------------------------------|----------------------------------|
| S3_BUCKET      | Bucket con prefijo `raw/`            | energy-monitor-ingest-058310292956 |
| DB_SECRET_NAME | Secret con credenciales RDS          | energy-monitor/drive-ingest/db   |
| FROM_DATE      | Ventana inicio (ISO)                 | —                                |
| TO_DATE        | Ventana fin (ISO)                    | —                                |
| BATCH_SIZE     | Filas por batch de INSERT            | 2000                             |

## Deploy

Antes del deploy, exporta las variables de VPC (mismos valores que el backend o drive-pipeline):

```bash
export VPC_SECURITY_GROUP_ID=sg-xxxxxxxxx
export VPC_SUBNET_ID_1=subnet-xxxxxxxxx
export VPC_SUBNET_ID_2=subnet-xxxxxxxxx
export VPC_SUBNET_ID_3=subnet-xxxxxxxxx
```

O copia `.env.example` a `.env`, rellena los IDs y carga antes de ejecutar:

```bash
cd infra/csv-ingest-lambda
npm ci
set -a && source .env && set +a
npx sls deploy --stage dev
```

## Invocación

Un archivo, últimos 2 meses (ejemplo: enero y febrero 2025):

```bash
aws lambda invoke --function-name csv-ingest-lambda-dev-ingest \
  --cli-binary-format raw-in-base64-out \
  --payload '{"key":"raw/MALL_GRANDE_446_completo.csv","fromDate":"2025-01-01T00:00:00.000Z","toDate":"2025-02-28T23:59:59.999Z"}' \
  --region us-east-1 \
  out.json && cat out.json
```

Todos los CSV en `raw/`, misma ventana (env o payload):

```bash
aws lambda invoke --function-name csv-ingest-lambda-dev-ingest \
  --cli-binary-format raw-in-base64-out \
  --payload '{"fromDate":"2025-01-01T00:00:00.000Z","toDate":"2025-02-28T23:59:59.999Z"}' \
  --region us-east-1 \
  out.json && cat out.json
```

## Respuesta

```json
{
  "statusCode": 200,
  "body": "{\"ingested\":[{\"key\":\"raw/MALL_GRANDE_446_completo.csv\",\"processedRows\":123456,\"insertedRows\":120000,\"uniqueMeters\":50}],\"catalog\":{\"buildings\":3,\"meters\":50},\"promote\":{\"totalPromoted\":120000}}"
}
```

## Contrato CSV

Igual que `docs/drive-csv-import-spec.md`: separador `;`, decimal `,`, UTF-8 BOM, 21 columnas. Solo se consideran filas con `timestamp` dentro de `fromDate`–`toDate`.

# AWS Runbook

## Services Used

| Servicio | Recurso | Propósito |
|---|---|---|
| Lambda | `power-digital-api-dev-api` | API NestJS (256MB, Node 20, VPC) |
| Lambda | `power-digital-api-dev-offlineAlerts` | Detección de medidores offline (30s timeout, cada 5 min) |
| Lambda | `synthetic-readings-generator` | Genera 15 lecturas/min con perfiles estadísticos (128MB) |
| API Gateway | HTTP API `626lq125eh` | Proxy HTTP → Lambda API (`/api/*`) |
| RDS | `energy-monitor-db` | PostgreSQL 16, db.t3.micro, 20GB gp3, encrypted, single-AZ |
| S3 | Bucket frontend | SPA estática (Vite build) |
| CloudFront | Distribution `energymonitor.click` | CDN: `/*` → S3, `/api/*` → API Gateway |
| EventBridge | `synthetic-readings-every-1min` | Trigger Lambda generador cada 1 min |
| EventBridge | Schedule en serverless.yml | Trigger offlineAlerts cada 5 min |

## Environments

| Entorno | Stage | URL | Notas |
|---|---|---|---|
| Production | `dev` (único stage) | `https://energymonitor.click` | Frontend + API unificados bajo CloudFront |
| Local | — | `http://localhost:5173` (frontend), `:4000` (backend) | Vite proxy `/api` → API Gateway |

### Endpoints
- **API Gateway:** `https://626lq125eh.execute-api.us-east-1.amazonaws.com/api/`
- **CloudFront API:** `https://energymonitor.click/api/`
- **RDS:** `energy-monitor-db.ci1q4okokkkd.us-east-1.rds.amazonaws.com:5432`
- **Swagger:** `https://energymonitor.click/api/docs`

### VPC
- Security Group: `sg-0adda6a999e8d5d9a` (TCP 5432 desde VPC)
- 3 subnets privadas: us-east-1a, us-east-1c, us-east-1d
- Lambda en VPC para acceder a RDS

## GitHub Secrets & Variables

### Secrets
| Nombre | Descripción |
|---|---|
| `AWS_ACCESS_KEY_ID` | IAM deploy key |
| `AWS_SECRET_ACCESS_KEY` | IAM deploy secret |
| `DB_HOST` | RDS endpoint |
| `DB_USERNAME` | RDS username |
| `DB_PASSWORD` | RDS password |
| `VITE_MICROSOFT_CLIENT_ID` | Microsoft Entra app ID |
| `VITE_MICROSOFT_TENANT_ID` | Microsoft Entra tenant ID |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `VPC_SECURITY_GROUP_ID` | SG para Lambda en VPC |
| `VPC_SUBNET_ID_1/2/3` | 3 subnets privadas |

### Variables
| Nombre | Valor |
|---|---|
| `AWS_REGION` | `us-east-1` |
| `S3_BUCKET` | Bucket name del frontend |
| `CLOUDFRONT_DISTRIBUTION_ID` | Distribution ID |
| `VITE_AUTH_MODE` | `microsoft` |

## Common Operations

### Deploy Frontend (automático)
Push a `main` → GitHub Actions → `npm run build` → S3 sync → CloudFront invalidation `/index.html`.

### Deploy Backend (automático)
Push a `main` → GitHub Actions → `npm run build` → `npx sls deploy --stage dev` con env vars inyectadas.

### Deploy Backend (manual)
```bash
cd backend
npm run build
export DB_HOST=... DB_PASSWORD=... VPC_SECURITY_GROUP_ID=... VPC_SUBNET_ID_1=... VPC_SUBNET_ID_2=... VPC_SUBNET_ID_3=... GOOGLE_CLIENT_ID=... MICROSOFT_CLIENT_ID=...
npx sls deploy --stage dev
```

### Ejecutar SQL en RDS
Conectar via `psql` desde una instancia en la VPC o usar Lambda temporal:
```bash
psql -h energy-monitor-db.ci1q4okokkkd.us-east-1.rds.amazonaws.com -U <user> -d energy_monitor
```

### Ver logs de Lambda
```bash
aws logs tail /aws/lambda/power-digital-api-dev-api --follow
aws logs tail /aws/lambda/power-digital-api-dev-offlineAlerts --follow
aws logs tail /aws/lambda/synthetic-readings-generator --follow
```

### Invalidar CloudFront
```bash
aws cloudfront create-invalidation --distribution-id <DIST_ID> --paths "/index.html"
```

### Desactivar generador sintético
Cuando se conecte MQTT real, ejecutar `infra/synthetic-generator/teardown.sh`:
```bash
bash infra/synthetic-generator/teardown.sh
```

## Troubleshooting

### Lambda timeout / cold start
- API Lambda: 10s timeout, 256MB. Si hay cold start largo, aumentar `memorySize` en `serverless.yml`
- offlineAlerts: 30s timeout (queries pueden ser pesadas con muchos medidores)

### RDS connection refused
- Verificar que Lambda está en la VPC correcta (mismos SG y subnets que RDS)
- Verificar SG permite TCP 5432 inbound desde el SG de Lambda

### CORS errors
- `localhost:5173` solo se incluye cuando `NODE_ENV !== 'production'` (ver `main.ts` y `serverless.ts`)
- En producción, CloudFront unifica dominio → no hay CORS

### Readings gap / datos faltantes
- El generador sintético corre cada 1 min. Si hay gap > 90 min, se detecta como downtime
- Para backfill: usar scripts en `infra/backfill-gap/` o `infra/reimport-readings/`

### Frontend build falla en CI
- Verificar que los secrets `VITE_*` están configurados en GitHub (el build necesita las variables de auth)
- `npx tsc --noEmit` corre antes del build → errores TypeScript bloquean el deploy

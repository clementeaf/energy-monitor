# AWS Runbook

## Inventario de Recursos

| Servicio | Recurso | ID / ARN | Propósito |
|---|---|---|---|
| Lambda | `power-digital-api-dev-api` | Managed by Serverless Framework | API NestJS (1024MB, Node 20, VPC, 30s timeout) |
| Lambda | `power-digital-api-dev-offlineAlerts` | Managed by Serverless Framework | Detección medidores offline (256MB, 30s, cada 5 min) |
| Lambda | `power-digital-api-dev-dbVerify` | Managed by Serverless Framework | Migraciones SQL y verificación DB (256MB) |
| Lambda | `billing-pdf-generator` | Deploy manual (Python 3.12, 512MB) | Genera PDFs de facturación |
| Lambda | `synthetic-readings-generator` | Standalone (256MB, 60s) | Genera lecturas cada 15 min, prune más antigua, refresh cache |
| API Gateway | HTTP API | `626lq125eh` | Proxy HTTP → Lambda API (`/api/*`) |
| RDS | PostgreSQL 16 | `energy-monitor-db.ci1q4okokkkd.us-east-1.rds.amazonaws.com` | db.t3.micro, 20GB gp3, encrypted, single-AZ |
| S3 | Frontend bucket | `energy-monitor-hoktus-mvp` | SPA estática (Vite build) |
| S3 | Globe Landing bucket | `globe-landing-hoktus` | Landing page Globe Power (`/landing/*`) |
| CloudFront | Distribution | `ECR03RA6F872Q` | CDN: `/*` → S3 frontend, `/landing/*` → S3 globe-landing, `/api/*` → API Gateway |
| CloudFront | Function | `landing-index-rewrite` | Reescribe `/landing/` → `/landing/index.html` (viewer-request) |
| EventBridge | Trigger 15 min | `synthetic-readings-every-1min` | Trigger Lambda generador cada 15 min (nombre legacy) |
| EventBridge | Trigger 5 min | Definido en serverless.yml | Trigger offlineAlerts cada 5 min |

### Región
**`us-east-1`** — todos los recursos están en esta región.

### VPC
| Recurso | Valor |
|---|---|
| Security Group | `sg-0adda6a999e8d5d9a` (TCP 5432 inbound desde VPC) |
| Subnet 1 | Configurada en GitHub Secrets `VPC_SUBNET_ID_1` |
| Subnet 2 | Configurada en GitHub Secrets `VPC_SUBNET_ID_2` |
| Subnet 3 | Configurada en GitHub Secrets `VPC_SUBNET_ID_3` |
| CIDR | `172.31.0.0/16` |

> Las Lambdas corren dentro de la VPC para acceder a RDS. RDS no es publicly-accessible.

### URLs de Producción
| Recurso | URL |
|---|---|
| Frontend | `https://energymonitor.click` |
| Globe Landing | `https://energymonitor.click/landing/` |
| API (via CloudFront) | `https://energymonitor.click/api/` |
| API (directo) | `https://626lq125eh.execute-api.us-east-1.amazonaws.com/api/` |
| Swagger | `https://energymonitor.click/api/docs` |
| RDS | `energy-monitor-db.ci1q4okokkkd.us-east-1.rds.amazonaws.com:5432` |

### Credenciales RDS Prod
| Campo | Valor |
|---|---|
| Host | `energy-monitor-db.ci1q4okokkkd.us-east-1.rds.amazonaws.com` |
| Port | `5432` |
| Database | `energy_monitor` |
| Username | `emadmin` |
| Password | Almacenada en GitHub Secret `DB_PASSWORD` |

---

## Entornos

| Entorno | Stage | URL | Notas |
|---|---|---|---|
| Production | `dev` (único stage) | `https://energymonitor.click` | Frontend + API unificados bajo CloudFront |
| Local | — | `localhost:5173` (frontend), `:4000` (backend) | Docker pg-arauco, puerto 5434 |

> **Nota:** El stage se llama `dev` pero ES producción. No hay ambiente de staging.

---

## Deploy

### Flujo de Decisión

```
¿Qué cambió?
├── Solo frontend/ (src/, components/, views/) → Deploy Frontend
├── Solo globe-landing/ → Deploy Globe Landing
├── Solo backend/ (controllers, services, entities, serverless.yml) → Deploy Backend (Serverless)
├── billing-pdf-lambda/ (handler.py, requirements.txt) → Deploy PDF Lambda
├── Ambos frontend + backend → Deploy Backend PRIMERO, luego Frontend
└── Cambios de schema DB → Ejecutar migración ANTES de cualquier deploy
```

### Método Automático (Recomendado)
Push a `main` → GitHub Actions ejecuta automáticamente:
1. Build + type-check frontend (`tsc --noEmit` + `npm run build`)
2. Build + type-check backend (`tsc --noEmit` + `npm run build`)
3. Si es push (no PR): deploy frontend a S3 + invalidación CloudFront
4. Si es push (no PR): deploy backend via `npx sls deploy --stage dev`

**Workflow:** `.github/workflows/deploy.yml`

> **globe-landing y billing-pdf-generator NO se depoyan automáticamente.** Ambos requieren deploy manual (ver abajo).

### Método Manual — Frontend

**Pre-checks:**
```bash
cd frontend && npm ci && npx tsc --noEmit && npm run build
```

**Deploy:**
```bash
# Variables reales — NO son placeholders
S3_BUCKET="energy-monitor-hoktus-mvp"
CF_DIST_ID="ECR03RA6F872Q"

# Sync assets (hashed filenames → cache inmutable)
aws s3 sync dist/ s3://$S3_BUCKET/ \
  --delete \
  --cache-control "public,max-age=31536000,immutable" \
  --exclude "index.html" \
  --exclude "*.json"

# index.html sin cache (siempre fresco)
aws s3 cp dist/index.html s3://$S3_BUCKET/index.html \
  --cache-control "no-cache,no-store,must-revalidate"

# Invalidar CloudFront
aws cloudfront create-invalidation \
  --distribution-id $CF_DIST_ID \
  --paths "/index.html"
```

**Variables de entorno requeridas para build:**
```bash
export VITE_AUTH_MODE=microsoft
export VITE_MICROSOFT_CLIENT_ID=<desde GitHub Secrets>
export VITE_MICROSOFT_TENANT_ID=<desde GitHub Secrets>
export VITE_GOOGLE_CLIENT_ID=<desde GitHub Secrets>
```

### Método Manual — Globe Landing

> **IMPORTANTE:** Globe Landing NO se deploya automáticamente con CI. Siempre es manual.

**Arquitectura CloudFront:**
```
CloudFront /landing/* → S3 bucket "globe-landing-hoktus"
                         └── CloudFront Function "landing-index-rewrite"
                              reescribe /landing/ → /landing/index.html
```

**Los archivos DEBEN subirse con prefijo `landing/`** dentro del bucket `globe-landing-hoktus`.
NO subir a la raíz del bucket ni al bucket `energy-monitor-hoktus-mvp`.

**Pre-checks:**
```bash
cd globe-landing && npm ci && npm run build
```

**Deploy:**
```bash
# Variables reales — NO son placeholders
S3_BUCKET="globe-landing-hoktus"
CF_DIST_ID="ECR03RA6F872Q"

# Sync todo al prefijo landing/ dentro del bucket
aws s3 sync dist/ s3://$S3_BUCKET/landing/ --delete

# Invalidar cache CloudFront
aws cloudfront create-invalidation \
  --distribution-id $CF_DIST_ID \
  --paths "/landing/*"
```

**Verificar:**
```bash
curl -sI https://energymonitor.click/landing/ | head -5
# Esperar: HTTP/2 200
```

**Errores comunes:**
- **403 en /landing/:** archivos subidos a la raíz del bucket en vez de `landing/`. Re-subir con prefijo.
- **Versión vieja:** falta invalidación CloudFront. Ejecutar invalidation y esperar ~1-2 min.
- **Subido al bucket equivocado:** el bucket es `globe-landing-hoktus`, NO `energy-monitor-hoktus-mvp`.

### Método Manual — Backend (Serverless)

**Pre-checks:**
```bash
cd backend && npm ci && npx tsc --noEmit && npm run build
```

**Deploy:**
```bash
# Todas las env vars necesarias
export DB_HOST="energy-monitor-db.ci1q4okokkkd.us-east-1.rds.amazonaws.com"
export DB_USERNAME="emadmin"
export DB_PASSWORD="<desde GitHub Secrets>"
export GOOGLE_CLIENT_ID="<desde GitHub Secrets>"
export MICROSOFT_CLIENT_ID="<desde GitHub Secrets>"
export MIGRATE_SECRET="<desde GitHub Secrets>"
export VPC_SECURITY_GROUP_ID="sg-0adda6a999e8d5d9a"
export VPC_SUBNET_ID_1="<desde GitHub Secrets>"
export VPC_SUBNET_ID_2="<desde GitHub Secrets>"
export VPC_SUBNET_ID_3="<desde GitHub Secrets>"

cd backend && npx sls deploy --stage dev
```

> **Esto deploya 3 Lambdas:** `api`, `offlineAlerts`, `dbVerify`. La Lambda `billing-pdf-generator` es independiente.

### Método Manual — billing-pdf-generator (Python)

**Pre-requisitos:** Docker instalado (compila deps para Linux).

```bash
# Env vars necesarias
export LAMBDA_ROLE_ARN="<rol IAM de la Lambda>"
export DB_HOST="energy-monitor-db.ci1q4okokkkd.us-east-1.rds.amazonaws.com"
export DB_NAME="energy_monitor"
export DB_USERNAME="emadmin"
export DB_PASSWORD="<desde GitHub Secrets>"
export VPC_SECURITY_GROUP_ID="sg-0adda6a999e8d5d9a"
export VPC_SUBNET_ID_1="<desde GitHub Secrets>"
export VPC_SUBNET_ID_2="<desde GitHub Secrets>"
export VPC_SUBNET_ID_3="<desde GitHub Secrets>"

cd backend/billing-pdf-lambda
./deploy.sh update  # o "create" para primera vez
```

### Migraciones de Base de Datos

Si el deploy incluye cambios de schema (nuevas columnas, tablas, índices):

1. **TypeORM synchronize está DESHABILITADO en prod.** Las migraciones se ejecutan manualmente.
2. Invocar Lambda `dbVerify` que ejecuta SQL de migración:
```bash
aws lambda invoke \
  --function-name power-digital-api-dev-dbVerify \
  --payload '{}' \
  --region us-east-1 \
  /tmp/db-verify-response.json

cat /tmp/db-verify-response.json
```
3. **Orden:** migración PRIMERO → deploy backend DESPUÉS.

---

## Verificación Post-Deploy

```bash
# 1. Frontend accesible
curl -sI https://energymonitor.click | head -5
# Esperar: HTTP/2 200

# 2. API responde (401 = OK, significa que Lambda arrancó)
curl -s https://energymonitor.click/api/auth/me
# Esperar: {"statusCode":401,...}

# 3. Swagger accesible
curl -sI https://energymonitor.click/api/docs
# Esperar: HTTP/2 200

# 4. Logs sin errores (primeros 30s post-deploy)
aws logs tail /aws/lambda/power-digital-api-dev-api --since 1m --region us-east-1
```

---

## Operaciones Comunes

### Ver Logs
```bash
# API principal
aws logs tail /aws/lambda/power-digital-api-dev-api --follow --region us-east-1

# Alertas offline
aws logs tail /aws/lambda/power-digital-api-dev-offlineAlerts --follow --region us-east-1

# Generador sintético
aws logs tail /aws/lambda/synthetic-readings-generator --follow --region us-east-1

# PDF generator
aws logs tail /aws/lambda/billing-pdf-generator --follow --region us-east-1
```

### Invalidar CloudFront
```bash
# Frontend principal
aws cloudfront create-invalidation \
  --distribution-id ECR03RA6F872Q \
  --paths "/index.html"

# Globe Landing
aws cloudfront create-invalidation \
  --distribution-id ECR03RA6F872Q \
  --paths "/landing/*"
```

### Conectar a RDS (desde instancia en VPC)
```bash
psql -h energy-monitor-db.ci1q4okokkkd.us-east-1.rds.amazonaws.com \
  -U emadmin -d energy_monitor
```

> RDS no es publicly-accessible. Solo se puede acceder desde dentro de la VPC (Lambda, ECS, EC2 en la misma VPC).

### Desactivar Generador Sintético
```bash
bash infra/synthetic-generator/teardown.sh
```

### Estado de los Recursos
```bash
# Estado de las Lambdas
aws lambda get-function --function-name power-digital-api-dev-api --query 'Configuration.{State:State,Memory:MemorySize,Timeout:Timeout,Runtime:Runtime,LastModified:LastModified}' --region us-east-1
aws lambda get-function --function-name power-digital-api-dev-offlineAlerts --query 'Configuration.{State:State,Memory:MemorySize,Timeout:Timeout,LastModified:LastModified}' --region us-east-1
aws lambda get-function --function-name billing-pdf-generator --query 'Configuration.{State:State,Memory:MemorySize,Timeout:Timeout,Runtime:Runtime,LastModified:LastModified}' --region us-east-1

# Estado RDS
aws rds describe-db-instances --db-instance-identifier energy-monitor-db --query 'DBInstances[0].{Status:DBInstanceStatus,Class:DBInstanceClass,Engine:Engine,EngineVersion:EngineVersion,Storage:AllocatedStorage}' --region us-east-1

# Distribución CloudFront
aws cloudfront get-distribution --id ECR03RA6F872Q --query 'Distribution.{Status:Status,DomainName:DomainName,Enabled:DistributionConfig.Enabled}' --region us-east-1

# Contenido bucket S3 frontend
aws s3 ls s3://energy-monitor-hoktus-mvp/ --region us-east-1

# Contenido bucket S3 globe-landing
aws s3 ls s3://globe-landing-hoktus/landing/ --region us-east-1
```

---

## Amazon SES (email saliente)

Monitoreo-v2 (`NotificationService` + `SesEmailService`) envía correo con **Amazon SES** en `us-east-1` cuando están definidas las variables de entorno.

| Variable | Uso |
|----------|-----|
| `SES_FROM_EMAIL` | Dirección o identidad verificada en SES (remitente). Si está vacía, no se llama a SES (solo logs `[EMAIL]` / `[USER_INVITE]`). |
| `SES_REGION` | Opcional; por defecto `AWS_REGION` o `us-east-1`. |
| `ALERT_EMAIL_RECIPIENTS` | Lista separada por comas: destinatarios de alertas y escalamiento. Sin esto, las alertas no se envían por SES (solo traza y `notification_logs`). |

**Invitaciones de usuario:** con `SES_FROM_EMAIL` definido, el alta desde admin envía un correo al email del usuario creado.

**IAM:** el rol de ejecución de la Lambda (o tarea ECS) necesita `ses:SendEmail` sobre la identidad remitente (y en sandbox, las destinatarias deben estar verificadas).

**Sandbox:** en SES sandbox solo se entrega a direcciones verificadas. Solicitar salida de sandbox en la consola AWS cuando se requiera a destinatarios arbitrarios.

---

## Rollback

### Frontend
```bash
# Opción 1: revertir commit y push (CI redeploya)
git revert HEAD && git push origin main

# Opción 2: sync manual desde build anterior
aws s3 sync <backup-local>/ s3://energy-monitor-hoktus-mvp/ --delete
aws cloudfront create-invalidation --distribution-id ECR03RA6F872Q --paths "/*"
```

### Backend
```bash
# Serverless rollback al deploy anterior
cd backend && npx sls rollback --stage dev

# O revertir commit y push
git revert HEAD && git push origin main
```

### billing-pdf-generator
```bash
# No tiene rollback automático. Redeploy con versión anterior del código:
git checkout <commit-anterior> -- backend/billing-pdf-lambda/
cd backend/billing-pdf-lambda && ./deploy.sh update
```

---

## Troubleshooting

### Lambda timeout / cold start
- API Lambda: 30s timeout, 1024MB. Cold start ~3-5s.
- Si cold start es muy largo, aumentar `memorySize` en `serverless.yml`.
- offlineAlerts: 30s timeout (queries pueden ser pesadas con muchos medidores).

### RDS connection refused
- Verificar Lambda en VPC correcta (mismos SG y subnets que RDS).
- SG debe permitir TCP 5432 inbound desde el SG de Lambda.

### CORS errors
- `localhost:5173` solo se incluye cuando `NODE_ENV !== 'production'`.
- En producción, CloudFront unifica dominio → no hay CORS.

### Readings gap / datos faltantes
- Generador sintético corre cada 15 min. Gap > 90 min = downtime detectado.
- Para backfill: scripts en `infra/backfill-gap/` o `infra/reimport-readings/`.

### Frontend build falla en CI
- Verificar secrets `VITE_*` en GitHub (el build necesita variables de auth).
- `npx tsc --noEmit` corre antes del build → errores TS bloquean deploy.

### Deploy backend falla por env vars
- Todas las env vars de VPC son **obligatorias**. Sin ellas, Serverless Framework falla.
- Verificar que `VPC_SUBNET_ID_1/2/3` y `VPC_SECURITY_GROUP_ID` están seteadas.

---

## GitHub Secrets & Variables

### Secrets (valores sensibles)
| Nombre | Descripción |
|---|---|
| `AWS_ACCESS_KEY_ID` | IAM deploy key |
| `AWS_SECRET_ACCESS_KEY` | IAM deploy secret |
| `DB_HOST` | RDS endpoint (`energy-monitor-db.ci1q4okokkkd.us-east-1.rds.amazonaws.com`) |
| `DB_USERNAME` | `emadmin` |
| `DB_PASSWORD` | Password RDS prod |
| `VITE_MICROSOFT_CLIENT_ID` | Microsoft Entra app ID |
| `VITE_MICROSOFT_TENANT_ID` | Microsoft Entra tenant ID |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `VPC_SECURITY_GROUP_ID` | `sg-0adda6a999e8d5d9a` |
| `VPC_SUBNET_ID_1` | Subnet privada us-east-1a |
| `VPC_SUBNET_ID_2` | Subnet privada us-east-1c |
| `VPC_SUBNET_ID_3` | Subnet privada us-east-1d |
| `MIGRATE_SECRET` | Secret para invocar migraciones |

### Variables (valores no sensibles)
| Nombre | Valor |
|---|---|
| `AWS_REGION` | `us-east-1` |
| `S3_BUCKET` | `energy-monitor-hoktus-mvp` |
| `CLOUDFRONT_DISTRIBUTION_ID` | `ECR03RA6F872Q` |
| `VITE_AUTH_MODE` | `microsoft` |

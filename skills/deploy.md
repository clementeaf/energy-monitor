# Deploy Skill

## Descripción
Despliega energy-monitor a AWS. Este skill es la referencia principal para cualquier agente IA que necesite ejecutar un deploy.

## Arquitectura de Deploy

```
Repositorio (main)
├── .github/workflows/deploy.yml  → CI/CD automático
├── frontend/                     → S3 + CloudFront
├── backend/                      → Lambda via Serverless Framework (3 funciones)
└── backend/billing-pdf-lambda/   → Lambda standalone (Python, deploy manual)
```

## Valores Reales de Recursos

```bash
# Estos NO son placeholders — son los valores de producción
S3_BUCKET="energy-monitor-hoktus-mvp"
CF_DIST_ID="ECR03RA6F872Q"
AWS_REGION="us-east-1"
RDS_HOST="energy-monitor-db.ci1q4okokkkd.us-east-1.rds.amazonaws.com"
RDS_DB="energy_monitor"
RDS_USER="emadmin"
API_GW_ID="626lq125eh"
SG_ID="sg-0adda6a999e8d5d9a"
```

## Pre-requisitos
- AWS CLI configurado con credenciales (permisos: S3, CloudFront, Lambda, API Gateway, RDS, Logs)
- Node 20 instalado
- Docker instalado (solo para billing-pdf-lambda)
- Variables de entorno VPC disponibles (ver sección abajo)

---

## Flujo de Decisión para Agentes

```
PASO 1: ¿Qué cambió?
  → Solo archivos en frontend/          → ir a DEPLOY FRONTEND
  → Solo archivos en backend/ (no billing-pdf-lambda/) → ir a DEPLOY BACKEND
  → Solo archivos en backend/billing-pdf-lambda/ → ir a DEPLOY PDF LAMBDA
  → Frontend + Backend                  → DEPLOY BACKEND primero, luego FRONTEND
  → Cambios de schema DB               → MIGRACIÓN primero, luego DEPLOY

PASO 2: ¿Método?
  → Push a main disponible              → AUTOMÁTICO (preferido)
  → No se puede pushear / urgencia      → MANUAL
```

---

## Deploy Automático (Recomendado)

**Trigger:** Push a `main` en GitHub.

**Lo que ejecuta CI:**
1. `npm ci` + `tsc --noEmit` + `npm run build` (frontend)
2. `npm ci` + `tsc --noEmit` + `npm run build` (backend)
3. S3 sync + CloudFront invalidation (frontend)
4. `npx sls deploy --stage dev` (backend — 3 Lambdas)

**Lo que NO deploya CI:** `billing-pdf-generator` (siempre manual).

**Verificar resultado:**
```bash
# Ver estado del workflow
gh run list --limit 3

# Ver logs del último run
gh run view --log
```

---

## Deploy Manual — Frontend

### 1. Pre-check
```bash
cd frontend
npm ci
npx tsc --noEmit   # DEBE pasar sin errores
npm run build       # Requiere VITE_* env vars (ver abajo)
```

### 2. Env vars para build
```bash
export VITE_AUTH_MODE=microsoft
export VITE_MICROSOFT_CLIENT_ID="<GitHub Secret: VITE_MICROSOFT_CLIENT_ID>"
export VITE_MICROSOFT_TENANT_ID="<GitHub Secret: VITE_MICROSOFT_TENANT_ID>"
export VITE_GOOGLE_CLIENT_ID="<GitHub Secret: VITE_GOOGLE_CLIENT_ID>"
```

### 3. Deploy
```bash
aws s3 sync dist/ s3://energy-monitor-hoktus-mvp/ \
  --delete \
  --cache-control "public,max-age=31536000,immutable" \
  --exclude "index.html" \
  --exclude "*.json"

aws s3 cp dist/index.html s3://energy-monitor-hoktus-mvp/index.html \
  --cache-control "no-cache,no-store,must-revalidate"

aws cloudfront create-invalidation \
  --distribution-id ECR03RA6F872Q \
  --paths "/index.html"
```

### 4. Verificar
```bash
curl -sI https://energymonitor.click | head -5
# Esperar: HTTP/2 200
```

---

## Deploy Manual — Backend (Serverless)

### 1. Pre-check
```bash
cd backend
npm ci
npx tsc --noEmit   # DEBE pasar sin errores
npm run build
```

### 2. Env vars (TODAS obligatorias)
```bash
export DB_HOST="energy-monitor-db.ci1q4okokkkd.us-east-1.rds.amazonaws.com"
export DB_USERNAME="emadmin"
export DB_PASSWORD="<GitHub Secret: DB_PASSWORD>"
export GOOGLE_CLIENT_ID="<GitHub Secret: VITE_GOOGLE_CLIENT_ID>"
export MICROSOFT_CLIENT_ID="<GitHub Secret: VITE_MICROSOFT_CLIENT_ID>"
export MIGRATE_SECRET="<GitHub Secret: MIGRATE_SECRET>"
export VPC_SECURITY_GROUP_ID="sg-0adda6a999e8d5d9a"
export VPC_SUBNET_ID_1="<GitHub Secret: VPC_SUBNET_ID_1>"
export VPC_SUBNET_ID_2="<GitHub Secret: VPC_SUBNET_ID_2>"
export VPC_SUBNET_ID_3="<GitHub Secret: VPC_SUBNET_ID_3>"
```

### 3. Deploy
```bash
cd backend
npx sls deploy --stage dev
```

> Esto deploya 3 funciones: `api` (1024MB), `offlineAlerts` (256MB), `dbVerify` (256MB).

### 4. Verificar
```bash
# API responde (401 = Lambda arrancó correctamente)
curl -s https://energymonitor.click/api/auth/me
# Esperar: {"statusCode":401,...}

# Swagger accesible
curl -sI https://energymonitor.click/api/docs
# Esperar: HTTP/2 200

# Logs sin errores
aws logs tail /aws/lambda/power-digital-api-dev-api --since 1m --region us-east-1
```

---

## Deploy Manual — billing-pdf-generator (Python)

### 1. Pre-requisito
Docker debe estar corriendo (se usa para compilar dependencias Python para Linux).

### 2. Env vars
```bash
export LAMBDA_ROLE_ARN="<ARN del rol IAM de la Lambda>"
export DB_HOST="energy-monitor-db.ci1q4okokkkd.us-east-1.rds.amazonaws.com"
export DB_NAME="energy_monitor"
export DB_USERNAME="emadmin"
export DB_PASSWORD="<GitHub Secret: DB_PASSWORD>"
export VPC_SECURITY_GROUP_ID="sg-0adda6a999e8d5d9a"
export VPC_SUBNET_ID_1="<GitHub Secret: VPC_SUBNET_ID_1>"
export VPC_SUBNET_ID_2="<GitHub Secret: VPC_SUBNET_ID_2>"
export VPC_SUBNET_ID_3="<GitHub Secret: VPC_SUBNET_ID_3>"
```

### 3. Deploy
```bash
cd backend/billing-pdf-lambda
./deploy.sh update    # "create" solo la primera vez
```

### 4. Verificar
```bash
aws lambda invoke \
  --function-name billing-pdf-generator \
  --payload '{"storeName":"LOC-39","buildingName":"Parque Arauco Kennedy","month":"2025-02-01"}' \
  /tmp/pdf-response.json \
  --region us-east-1

cat /tmp/pdf-response.json
```

---

## Migraciones de Base de Datos

**Cuándo:** si el deploy incluye nuevas columnas, tablas, índices, o ALTER TABLE.

**Orden:** migración PRIMERO → deploy DESPUÉS.

```bash
# Invocar Lambda dbVerify (ejecuta migraciones SQL)
aws lambda invoke \
  --function-name power-digital-api-dev-dbVerify \
  --payload '{}' \
  --region us-east-1 \
  /tmp/db-verify-response.json

cat /tmp/db-verify-response.json
```

> TypeORM `synchronize: false` en producción. No hay auto-sync de schema.

---

## Rollback

### Frontend
```bash
# Opción 1: revertir commit → CI redeploya
git revert HEAD && git push origin main

# Opción 2: sync manual
aws s3 sync <backup-local>/ s3://energy-monitor-hoktus-mvp/ --delete
aws cloudfront create-invalidation --distribution-id ECR03RA6F872Q --paths "/*"
```

### Backend
```bash
# Serverless rollback
cd backend && npx sls rollback --stage dev

# O revertir commit
git revert HEAD && git push origin main
```

### billing-pdf-generator
```bash
git checkout <commit-anterior> -- backend/billing-pdf-lambda/
cd backend/billing-pdf-lambda && ./deploy.sh update
```

---

## Inspección del Stack (para revisión)

```bash
# Estado de Lambdas
aws lambda get-function --function-name power-digital-api-dev-api --query 'Configuration.{State:State,Memory:MemorySize,Timeout:Timeout,Runtime:Runtime,LastModified:LastModified}' --region us-east-1
aws lambda get-function --function-name power-digital-api-dev-offlineAlerts --query 'Configuration.{State:State,Memory:MemorySize,Timeout:Timeout,LastModified:LastModified}' --region us-east-1
aws lambda get-function --function-name power-digital-api-dev-dbVerify --query 'Configuration.{State:State,LastModified:LastModified}' --region us-east-1
aws lambda get-function --function-name billing-pdf-generator --query 'Configuration.{State:State,Memory:MemorySize,Timeout:Timeout,Runtime:Runtime,LastModified:LastModified}' --region us-east-1

# Estado RDS
aws rds describe-db-instances --db-instance-identifier energy-monitor-db --query 'DBInstances[0].{Status:DBInstanceStatus,Class:DBInstanceClass,Engine:Engine,EngineVersion:EngineVersion,Storage:AllocatedStorage}' --region us-east-1

# CloudFront
aws cloudfront get-distribution --id ECR03RA6F872Q --query 'Distribution.{Status:Status,DomainName:DomainName,Enabled:DistributionConfig.Enabled}'

# S3
aws s3 ls s3://energy-monitor-hoktus-mvp/ --region us-east-1

# Logs recientes (últimos 5 min)
aws logs tail /aws/lambda/power-digital-api-dev-api --since 5m --region us-east-1
aws logs tail /aws/lambda/power-digital-api-dev-offlineAlerts --since 5m --region us-east-1
```

---

## Referencia Rápida

| Acción | Comando |
|---|---|
| Deploy todo (automático) | `git push origin main` |
| Deploy frontend (manual) | `aws s3 sync` + `aws cloudfront create-invalidation` |
| Deploy backend (manual) | `npx sls deploy --stage dev` |
| Deploy PDF Lambda | `cd backend/billing-pdf-lambda && ./deploy.sh update` |
| Migración DB | `aws lambda invoke --function-name power-digital-api-dev-dbVerify` |
| Ver logs API | `aws logs tail /aws/lambda/power-digital-api-dev-api --follow` |
| Invalidar cache | `aws cloudfront create-invalidation --distribution-id ECR03RA6F872Q --paths "/index.html"` |
| Rollback backend | `cd backend && npx sls rollback --stage dev` |
| Health check | `curl -s https://energymonitor.click/api/auth/me` → esperar 401 |

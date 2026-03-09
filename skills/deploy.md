# Deploy Skill

## Description
Despliega frontend y/o backend de energy-monitor a AWS. El frontend va a S3+CloudFront, el backend a Lambda via Serverless Framework.

## Pre-requisitos
- AWS CLI configurado con credenciales que tengan permisos sobre S3, CloudFront, Lambda, API Gateway
- Node 20 instalado
- Variables de entorno de RDS y VPC disponibles (ver `docs/aws-runbook.md`)

## Steps

### Frontend
```bash
cd frontend
npm ci
npm run build  # requiere VITE_AUTH_MODE, VITE_MICROSOFT_CLIENT_ID, VITE_MICROSOFT_TENANT_ID, VITE_GOOGLE_CLIENT_ID
aws s3 sync dist/ s3://<BUCKET>/ --delete --cache-control "public,max-age=31536000,immutable" --exclude "index.html" --exclude "*.json"
aws s3 cp dist/index.html s3://<BUCKET>/index.html --cache-control "no-cache,no-store,must-revalidate"
aws cloudfront create-invalidation --distribution-id <DIST_ID> --paths "/index.html"
```

### Backend
```bash
cd backend
npm ci
npm run build
npx sls deploy --stage dev
# Requiere env vars: DB_HOST, DB_PASSWORD, DB_USERNAME, GOOGLE_CLIENT_ID, MICROSOFT_CLIENT_ID, VPC_SECURITY_GROUP_ID, VPC_SUBNET_ID_1/2/3
```

### Ambos (automático)
Push a `main` → GitHub Actions ejecuta ambos deploys automáticamente.

## Verificación post-deploy
```bash
# Frontend
curl -sI https://energymonitor.click | head -5

# Backend API
curl -s https://energymonitor.click/api/auth/me  # esperar 401

# Swagger
curl -sI https://energymonitor.click/api/docs  # esperar 200
```

## Rollback

### Frontend
```bash
# Opción 1: revertir commit y push a main (CI redeploya)
git revert HEAD && git push origin main

# Opción 2: sync manual desde build anterior
aws s3 sync <backup-local>/ s3://<BUCKET>/ --delete
aws cloudfront create-invalidation --distribution-id <DIST_ID> --paths "/*"
```

### Backend
```bash
# Serverless rollback al deploy anterior
cd backend && npx sls rollback --stage dev

# O revertir commit y push
git revert HEAD && git push origin main
```

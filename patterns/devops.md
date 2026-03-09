# DevOps Patterns

> Anexo secundario. El contexto operativo base vive en `CLAUDE.md`.

## Cuándo leer esto
- Cambiar deploy, env vars, lambdas o recursos AWS.
- Agregar una lambda programada o script infra nuevo.

## Playbook puntual
- Lambda programada nueva: `patterns/playbooks/new-scheduled-lambda.md`

## Comandos base

### Frontend
```bash
cd frontend
npm ci
npm run build
```

### Backend
```bash
cd backend
npm ci
npx sls deploy --stage dev
```

### Local serverless
```bash
cd backend
npx sls offline
```

## Infra actual
```text
CloudFront
├── S3 frontend
└── /api/* → API Gateway HTTP → Lambda NestJS → RDS PostgreSQL

EventBridge 1/min → synthetic-generator
EventBridge 5/min → offlineAlerts
```

## Env matrix
- Backend Lambda: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD`, `GOOGLE_CLIENT_ID`, `MICROSOFT_CLIENT_ID`, `NODE_ENV`.
- Frontend: `VITE_AUTH_MODE`, `VITE_MICROSOFT_CLIENT_ID`, `VITE_MICROSOFT_TENANT_ID`, `VITE_GOOGLE_CLIENT_ID`.
- Infra scripts: `DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME`.
- VPC: `VPC_SECURITY_GROUP_ID`, `VPC_SUBNET_ID_1`, `VPC_SUBNET_ID_2`, `VPC_SUBNET_ID_3`.

## Receta rápida: nueva lambda programada
1. Definir si vive en NestJS o en `infra/` standalone.
2. Crear handler y dependencias mínimas.
3. Declarar env vars requeridas.
4. Registrar evento schedule en `serverless.yml` o pipeline manual correspondiente.
5. Validar timeout, memoria, VPC y seguridad.
6. Documentar el flujo en `CLAUDE.md` si cambia el runtime.

## Checklist antes de deploy
1. Variables de entorno presentes.
2. Queries y conexiones DB probadas.
3. `serverless.yml` coherente con memoria, timeout y VPC.
4. Runbook AWS revisado.
5. Cambio documentado si altera patrón operativo.

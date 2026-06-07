# RDS migrations — prod (ECS Exec)

Guía para aplicar migraciones SQL de `monitoreo-v2/database/migrations/` en **RDS prod** cuando la base no es accesible desde tu laptop (VPC privada).

## Inventario AWS (cuenta `058310292956`, `us-east-1`)

| Recurso | Valor |
|---------|--------|
| RDS | `monitoreo-v2-db` |
| Endpoint | `monitoreo-v2-db.ci1q4okokkkd.us-east-1.rds.amazonaws.com:5432` |
| Database | `monitoreo_v2` |
| User | `emadmin` (password en Secrets Manager) |
| Publicly accessible | **No** |
| VPC | `vpc-0dfb29ff019750986` |
| ECS cluster | `monitoreo-v2` |
| ECS service | `monitoreo-v2-backend-restored` |
| ECS Exec | **Habilitado** (`enableExecuteCommand: true`) |
| Secret | `arn:aws:secretsmanager:us-east-1:058310292956:secret:monitoreo-v2/secrets-PG8e42` → clave `DB_PASSWORD` |

El contenedor backend ya tiene `DB_*` inyectados y el bundle CA en `/app/certs/rds-global-bundle.pem`. **No hace falta** pasar credenciales desde local.

## Por qué no funciona `npm run db:migrate` directo a prod

`apply-migration.mjs` conecta por TCP al host RDS. Desde fuera de la VPC la conexión falla (RDS sin IP pública). Opciones válidas:

1. **ECS Exec** (recomendado) — ejecutar SQL desde una tarea Fargate dentro de la VPC.
2. Bastion / EC2 en la misma VPC + `psql`.
3. VPN / SSM port forwarding (más setup).

## Prerrequisitos locales

```bash
# AWS CLI autenticado (usuario cefal u otro con permisos)
aws sts get-caller-identity

# Session Manager plugin (obligatorio para ECS Exec)
session-manager-plugin --version
# macOS: brew install --cask session-manager-plugin
```

Permisos IAM mínimos: `ecs:ExecuteCommand`, `ecs:ListTasks`, `ecs:DescribeServices`, `ssm:StartSession` sobre el cluster/tarea.

## Local (Docker)

Cuando `.env` apunta a `127.0.0.1:5434`:

```bash
cd monitoreo-v2/backend
source .env   # DB_HOST, DB_PORT, DB_NAME, DB_USERNAME, DB_PASSWORD
npm run db:migrate -- 42-building-tenant-import
```

Si falta una dependencia (ej. `regions` antes de import edificios), aplicar en orden:

```bash
npm run db:migrate -- 17-tenant-geography
npm run db:migrate -- 42-building-tenant-import
```

## Prod (ECS Exec)

Script: `monitoreo-v2/backend/scripts/apply-migration-ecs.mjs`

```bash
cd monitoreo-v2/backend

# Una migración
node scripts/apply-migration-ecs.mjs 42-building-tenant-import

# O vía wrapper
./scripts/apply-migration-ecs.sh 42-building-tenant-import
```

Variables opcionales:

| Variable | Default |
|----------|---------|
| `AWS_REGION` | `us-east-1` |
| `ECS_CLUSTER` | `monitoreo-v2` |
| `ECS_SERVICE` | `monitoreo-v2-backend-restored` |
| `ECS_CONTAINER` | `backend` |

### Estado prod (2026-06-07)

| Aplicadas | Pendiente |
|-----------|-----------|
| `10`–`21`, `24`–`42` | `22-retention-5y`, `23-cagg-15min` (API TimescaleDB en RDS) |

`GET /api/health` → `schemaVersion: 40-oauth-clients`.

### Cadena mínima (import masivo)

```bash
node scripts/apply-migration-ecs.mjs 15-schema-migrations
node scripts/apply-migration-ecs.mjs 17-tenant-geography
node scripts/apply-migration-ecs.mjs 41-user-import-prereq
node scripts/apply-migration-ecs.mjs 42-building-tenant-import
```

### Cadena completa (2.15.0+ en prod verde)

```bash
for m in 16-portfolio-summary 18-tenant-units-external 19-meter-metadata \
  20-views-enriched 21-reading-quality 24-meter-reading-status \
  25-fn-upsert-meter-status 26-ingest-gaps 27-backfill-jobs 28-views-stale-meters \
  29-readings-ingress-unique 30-etl-watermarks 31-export-jobs 32-protocol-mapping \
  33-seed-pac1670-modbus 34-seed-siemens-poc3000-mqtt 35-bacnet-devices \
  36-snmp-devices 37-webhook-subscriptions 38-data-governance \
  39-tenant-sso-config 40-oauth-clients; do
  node scripts/apply-migration-ecs.mjs "$m"
done
```

Todas son **idempotentes** (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`).

## Verificar en prod

Vía ECS Exec (misma tarea):

```bash
TASK=$(aws ecs list-tasks --cluster monitoreo-v2 \
  --service-name monitoreo-v2-backend-restored --desired-status RUNNING \
  --query 'taskArns[0]' --output text --region us-east-1 | awk -F/ '{print $NF}')

aws ecs execute-command --cluster monitoreo-v2 --task "$TASK" --container backend \
  --region us-east-1 --interactive \
  --command "node -e \"
const pg=require('pg');const fs=require('fs');
const c=new pg.Client({host:process.env.DB_HOST,port:5432,database:process.env.DB_NAME,user:process.env.DB_USERNAME,password:process.env.DB_PASSWORD,ssl:{rejectUnauthorized:true,ca:fs.readFileSync('/app/certs/rds-global-bundle.pem')}});
(async()=>{await c.connect();
const r=await c.query(\\\"SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 10\\\");
console.log(r.rows);await c.end();})();\""
```

Esperado tras import v2:

- `41-user-import-prereq`, `42-building-tenant-import`
- Tablas: `user_import_*`, `building_import_*`, `tenant_unit_import_*`

## Troubleshooting

| Síntoma | Causa | Acción |
|---------|-------|--------|
| `database does not exist` | Host/puerto incorrecto | Local: `DB_PORT=5434`. Prod: usar ECS Exec, no TCP directo |
| `relation "regions" does not exist` | Falta migración 17 | Aplicar `17-tenant-geography` antes de 42 |
| `Unable to start command: export: not found` | Comando sin shell | Usar `apply-migration-ecs.mjs` (invoca `sh -c`) |
| `TargetNotConnectedException` | Exec deshabilitado o tarea vieja | Verificar `enableExecuteCommand` y redeploy service |
| Session Manager plugin missing | Plugin no instalado | Instalar plugin (ver arriba) |

## Descubrir recursos (CLI)

```bash
aws sts get-caller-identity
aws rds describe-db-instances --region us-east-1 \
  --query 'DBInstances[*].{Id:DBInstanceIdentifier,Endpoint:Endpoint.Address,Public:PubliclyAccessible}'
aws ecs list-services --cluster monitoreo-v2 --region us-east-1
aws ecs describe-services --cluster monitoreo-v2 --services monitoreo-v2-backend-restored \
  --region us-east-1 --query 'services[0].enableExecuteCommand'
```

## Referencias

- [AWS ECS Exec](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-exec.html)
- Migraciones SQL: `monitoreo-v2/database/migrations/`
- Local: `monitoreo-v2/backend/scripts/apply-migration.mjs`
- Prod: `monitoreo-v2/backend/scripts/apply-migration-ecs.mjs`

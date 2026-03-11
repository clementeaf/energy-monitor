# Verificación RDS

Comprobar en AWS RDS qué datos hay en `readings`, `meters`, `buildings` y `hierarchy_nodes` tras la carga desde Google Drive.

## Con AWS CLI (recomendado)

La Lambda `dbVerify` consulta RDS desde dentro de la VPC. Solo necesitas AWS CLI configurado (credenciales); no hace falta túnel ni token de login.

**Requisito:** el backend debe estar desplegado (incluye la función `dbVerify`). Si sueles desplegar por CI, tras el próximo deploy ya podrás invocarla. Si despliegas a mano: `cd backend && npx sls deploy --stage dev` (con VPC_SECURITY_GROUP_ID, VPC_SUBNET_ID_1/2/3 y credenciales DB en el entorno).

```bash
# Invocar la Lambda (ajusta el nombre si usas otro stage, ej. prod):
aws lambda invoke \
  --function-name power-digital-api-dev-dbVerify \
  --region us-east-1 \
  --log-type Tail \
  out.json

# Ver resultado (JSON con conteos, distribución, edificios, etc.):
cat out.json | jq .
# o sin jq:
cat out.json
```

El nombre de la función puede variar según el stage (ej. `power-digital-api-prod-dbVerify`). Listar funciones: `aws lambda list-functions --query "Functions[?contains(FunctionName, 'dbVerify')].FunctionName"`.

## Modo prueba (script local con .env)

No hace falta login ni credenciales AWS. Basta con tener las credenciales de la base (host, user, password) y acceso de red a RDS (por ejemplo túnel SSH o VPN). El script carga automáticamente el archivo `.env` del directorio actual.

```bash
cd infra/db-verify
npm ci
cp .env.example .env
# Editar .env con los valores correctos (host, user, password, database)
npm run verify
```

Si están definidos `DB_HOST`, `DB_USER` (o `DB_USERNAME`) y `DB_PASSWORD` en `.env` o en el entorno, el script **no usa Secrets Manager** ni ningún token.

## Con AWS Secrets Manager

Si no defines credenciales locales, el script usa el secret `energy-monitor/drive-ingest/db` (requiere AWS configurado y acceso al secret).

```bash
npm run verify
```

Con túnel SSH: `DB_HOST=127.0.0.1 DB_PORT=5433 npm run verify` (user/password siguen viniendo del secret).

## Variables de entorno

| Variable        | Modo prueba | Con AWS   | Descripción                    |
|----------------|-------------|-----------|--------------------------------|
| `DB_HOST`      | obligatorio | override  | Host de RDS (o 127.0.0.1 si hay túnel) |
| `DB_PORT`      | opcional (5432) | override  | Puerto                         |
| `DB_USER` / `DB_USERNAME` | obligatorio | —     | Usuario de la base             |
| `DB_PASSWORD`  | obligatorio | —         | Contraseña                     |
| `DB_NAME`      | opcional (postgres) | —    | Nombre de la base              |
| `AWS_REGION`   | —           | us-east-1 | Región para Secrets Manager    |
| `DB_SECRET_NAME` | —         | energy-monitor/drive-ingest/db | Secret con host, user, password |

## Salida

El script imprime:

1. Conteos: `readings`, `meters`, `buildings`, `readings_import_staging`
2. Medidores por edificio (top 20)
3. Muestra de `meter_id` (50 primeros) y aviso si alguno supera 10 caracteres
4. Rangos min/max de timestamp por medidor (20 primeros)
5. Nodos de jerarquía por edificio
6. Listado de edificios con cantidad de medidores

Ver también: [docs/data-drive-aws-review.md](../../docs/data-drive-aws-review.md).

# monitoreo-v2 en una cuenta AWS nueva

Runbook para levantar monitoreo-v2 desde cero en cualquier cuenta AWS y seguir desplegando ahí. Todo lo que necesita la app está en `monitoreo-v2/infra/aws/stack.yml` (CloudFormation) y se despliega con un solo comando: `monitoreo-v2/infra/aws/deploy.sh`.

Alcance de la cuenta nueva: plataforma + ingesta Varelectric (Alto Peñalolén, Quilicura, Hotel Renaissance). Sin datos históricos, sin PASA, sin Siemens IoT.

---

## 1. Qué se crea

```
Usuario ──► CloudFront ──► /*      S3 (SPA, privado vía OAC)
                      └──► /api/*  API Gateway HTTP ──► Lambda (NestJS) ──► RDS PostgreSQL 16
Varelectric ──► POST /api/v1/varelectric/batch (X-API-Key) ─┘
EventBridge Scheduler ──► misma Lambda {"job": "..."}  (8 jobs: alertas, reportes, retención…)
```

| Recurso | Detalle |
|---|---|
| RDS PostgreSQL 16.15 | `db.t4g.small`, 20 GB gp3 (autoescala a 100), cifrado, TLS obligatorio, backups 7 días, snapshot al borrar, protección contra borrado |
| Lambda `monitoreo-v2-api` | Node 24, arm64, 1 GB. Atiende la API y los jobs programados |
| API Gateway HTTP | Solo detrás de CloudFront |
| EventBridge Scheduler | 8 schedules, uno por `@Cron` del backend (un test falla si se desalinean) |
| S3 | Frontend (privado) + exports (expiran a los 7 días) + artefactos de deploy |
| CloudFront | SPA + `/api/*`, HTTP/2+3, reescritura SPA con CloudFront Function |
| Secrets Manager | `jwt-secret`, `cookie-secret`, `config-encryption-key`, `db-password`: se generan solos |
| ACM + Route 53 | Solo si se pasa dominio |

**Costo mensual estimado:** 33–40 USD + impuestos (RDS ~28; el resto queda casi dentro del free tier). WAF y Redis no se incluyen; se pueden agregar después.

---

## 2. Prerrequisitos

- AWS CLI v2 con un perfil de la **cuenta destino** con permisos de administrador (`aws configure --profile <nombre>`).
- Node.js 24+, npm, `psql` (cliente PostgreSQL), `zip`, `openssl`.
- Credenciales OAuth (las mismas que hoy): `MICROSOFT_TENANT_ID`, `MICROSOFT_CLIENT_ID`, `GOOGLE_CLIENT_ID`.
- Región: `AWS_REGION` (default `us-east-1`). Con `DOMAIN_NAME` debe ser `us-east-1`: CloudFront exige el certificado ahí; el script corta si no lo es.

Verificar la cuenta antes de desplegar:

```bash
aws sts get-caller-identity --profile <perfil-cuenta-nueva>
```

---

## 3. Desplegar (primera vez y cada actualización)

Desde la raíz del repo:

```bash
export AWS_PROFILE=<perfil-cuenta-nueva> AWS_REGION=<region-permitida>
export MICROSOFT_TENANT_ID=<...> MICROSOFT_CLIENT_ID=<...> GOOGLE_CLIENT_ID=<...>
# Opcional, con dominio (ver sección 4):
# export DOMAIN_NAME=power-monitor.cloud HOSTED_ZONE_ID=Z0123456789
# Opcional: export SES_FROM_EMAIL=noreply@dominio-verificado

monitoreo-v2/infra/aws/deploy.sh
```

El script hace, en orden:

1. Crea el bucket de artefactos `monitoreo-v2-artifacts-<cuenta>` si no existe.
2. Compila el backend, arma el zip de la Lambda y lo sube.
3. Despliega la stack `monitoreo-v2` (**primera vez: ~15–20 min**; RDS y CloudFront son lo lento. Actualizaciones: 1–3 min).
4. Si la base está vacía, ejecuta `database/rds/bootstrap.sh` (esquema + semilla Varelectric). Si ya tiene esquema, no toca nada.
5. Compila el frontend con la URL final, lo sube a S3 (sin `--delete`, excluyendo `docs/*`) e invalida CloudFront.
6. Smoke test: `GET <sitio>/api/health` debe responder `{"status":"ok","db":"ok",...}`.

**Actualizar después** (backend, frontend o infraestructura): se vuelve a correr el mismo comando. Si nada cambió en la stack, CloudFormation no hace nada y solo se republica el frontend.

---

## 4. Dominio

Sin `DOMAIN_NAME` la app queda en `https://<id>.cloudfront.net`, que sirve para validar todo antes de mover el dominio.

Para usar dominio propio, la zona DNS debe estar en Route 53 de la **cuenta nueva**:

1. Crear la zona: `aws route53 create-hosted-zone --name power-monitor.cloud --caller-reference $(date +%s)` y anotar el `HostedZoneId` y sus 4 NS.
2. Apuntar el dominio a esos NS:
   - Si el registro sigue en la cuenta vieja: Route 53 → Registered domains → `power-monitor.cloud` → Edit name servers (desde la cuenta vieja).
   - O transferir el registro entre cuentas: `aws route53domains transfer-domain-to-another-aws-account` (cuenta vieja) + `aws route53domains accept-domain-transfer-from-another-aws-account` (cuenta nueva).
3. Desplegar con `DOMAIN_NAME` y `HOSTED_ZONE_ID`. El certificado ACM se valida solo por DNS y se crean los registros A/AAAA.

Si el dominio cambia por otro, es el mismo procedimiento con el dominio nuevo.

**OAuth:** agregar la URL final (`https://<dominio o cloudfront>`) como origen/redirect autorizado en Google Cloud Console (Authorized JavaScript origins) y en Azure AD (Redirect URIs de la app `MICROSOFT_CLIENT_ID`). Sin esto el login falla aunque todo lo demás funcione.

---

## 5. Primer acceso

La semilla crea el tenant **Globe Power** con un super admin: `carriagadafalcone@gmail.com` (login Google). Desde ahí se invitan usuarios en Configuración.

Edificios y medidores creados:

| Código | Edificio | Medidores |
|---|---|---|
| `VE-ALTOPENA` | Alto Peñalolén | 55 |
| `VE-QUILICURA` | Quilicura | 11 |
| `VE-REN` | Hotel Renaissance | 1 |

Si Varelectric envía un remarcador que no existe, se crea solo como `Remarcador <id>` en el edificio de la API key y se puede renombrar después.

---

## 6. Habilitar Varelectric

Una API key por edificio (la key define a qué edificio van los datos). Con acceso a la base:

```bash
STACK_OUTPUT() { aws cloudformation describe-stacks --stack-name monitoreo-v2 --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text; }
export PGHOST=$(STACK_OUTPUT DbEndpoint)
export PGPASSWORD=$(aws secretsmanager get-secret-value --secret-id "$(STACK_OUTPUT DbPasswordSecretArn)" --query SecretString --output text)
export PGUSER=emadmin PGDATABASE=monitoreo_v2 PGSSLMODE=require

monitoreo-v2/database/rds/create-varelectric-key.sh VE-ALTOPENA
monitoreo-v2/database/rds/create-varelectric-key.sh VE-QUILICURA
monitoreo-v2/database/rds/create-varelectric-key.sh VE-REN
```

Cada comando imprime la key **una sola vez**. Entregar a Varelectric las 3 keys por un canal seguro junto con [`varelectric-integration.md`](varelectric-integration.md). Apenas empiecen a enviar, los datos aparecen en Resumen, Centros, Remarcadores y Consumo.

---

## 7. Verificación

- [ ] `curl https://<sitio>/api/health` → `status: ok`, `db: ok`, `schemaVersion: rds-20-rekey-non-rfc-uuids`
- [ ] El frontend carga y el login con Google/Microsoft funciona
- [ ] Centros muestra los 3 edificios
- [ ] Un `POST /api/v1/varelectric/batch` de prueba con una key devuelve `{"inserted": N, ...}` y la lectura aparece en Remarcadores
- [ ] CloudWatch → log group `/aws/lambda/monitoreo-v2-api`: invocaciones de jobs cada 5 min (`alert-engine`, `reports-scheduler`)
- [ ] Con dominio: el certificado queda `ISSUED` y el dominio resuelve a CloudFront

---

## 8. Operación

| Tarea | Cómo |
|---|---|
| Logs de API y jobs | CloudWatch `/aws/lambda/monitoreo-v2-api` (JSON) |
| Correr un job a mano | `aws lambda invoke --function-name monitoreo-v2-api --payload '{"job":"alert-engine"}' --cli-binary-format raw-in-base64-out /dev/stdout` |
| Consultar la base | `psql` con las variables de la sección 6 |
| Backups | Automáticos 7 días + snapshot final si se borra la stack |
| Rotar secretos JWT/cookie | Nuevo valor en Secrets Manager y volver a desplegar (cierra todas las sesiones) |

---

## 9. Decisiones y límites conocidos

- **RDS público con TLS obligatorio.** La Lambda corre fuera de VPC porque dentro necesitaría un NAT Gateway (~32 USD/mes) para validar tokens de Google/Microsoft y enviar correos. La base solo acepta TLS y una contraseña generada de 40 caracteres. Para cerrarla: Lambda en VPC + NAT + security group restringido.
- **Secretos como variables de entorno de la Lambda.** CloudFormation los resuelve al desplegar; quedan visibles para quien tenga acceso a la consola de Lambda de esa cuenta.
- **Sin TimescaleDB.** Los agregados (`readings_15min/hourly/daily`) son vistas normales: siempre al día y sin refrescos. Con el volumen de Varelectric (~6.400 lecturas/día) responden en menos de 0,3 s con un mes de datos. Si el volumen crece mucho, pasarlos a vistas materializadas con refresco en un job.
- **Consumo del mes** suma los deltas diarios de energía por medidor (agregador existente) y subestima alrededor de 1 % por los intervalos entre días.
- **SES en sandbox** en una cuenta nueva: solo envía a direcciones verificadas hasta pedir producción a AWS (1–2 días).
- **Límite de peticiones** global por IP: 10/s, 100/min, 1.000/h. Varelectric en operación normal usa ~3 peticiones cada 15 min; una recarga de histórico debe espaciar los lotes.
- **Módulos add-on** (Márgenes, Sostenibilidad, Facturas, Alertas, Reportes) siguen mostrando datos de ejemplo.

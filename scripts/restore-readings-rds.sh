#!/usr/bin/env bash
set -euo pipefail

###############################################################################
# restore-readings-rds.sh
#
# Restaura meter_readings (875 particiones) y raw_readings a RDS via ECS Fargate.
#
# Flujo:
#   PASO 1: pg_dump dentro de Docker → 4 archivos en /tmp/dumps/
#   PASO 2: Copiar dumps de Docker al host
#   PASO 3: Subir dumps a S3
#   PASO 4: Escalar RDS a db.t3.medium
#   PASO 5: Ejecutar ECS Fargate task (restore)
#   PASO 6: Verificar counts
#   PASO 7: Bajar RDS a db.t3.micro
#
# Uso:
#   bash scripts/restore-readings-rds.sh          # Ejecutar todo
#   bash scripts/restore-readings-rds.sh step N   # Ejecutar desde paso N
###############################################################################

# ── Config ──────────────────────────────────────────────────────────────────
DOCKER_CONTAINER="pg-arauco"
DOCKER_DB="arauco"
DOCKER_USER="postgres"

S3_BUCKET="energy-monitor-ingest-058310292956"
S3_PREFIX="readings-restore"

RDS_HOST="energy-monitor-db.ci1q4okokkkd.us-east-1.rds.amazonaws.com"
RDS_DB="energy_monitor"
RDS_USER="emadmin"
RDS_PASS="EmAdmin2026Prod"

RDS_INSTANCE="energy-monitor-db"
RDS_TARGET_CLASS="db.t3.medium"
RDS_FINAL_CLASS="db.t3.micro"

# ECS
ECS_CLUSTER="energy-monitor-cluster"
ECS_SUBNETS="subnet-06decacd773bdf518,subnet-0874cd006a3a91552,subnet-0bcf50b0d84819964"  # us-east-1a,c,d public /20
ECS_SG="sg-0adda6a999e8d5d9a"
ECR_REPO="058310292956.dkr.ecr.us-east-1.amazonaws.com"
TASK_FAMILY="energy-monitor-readings-restore"

REGION="us-east-1"
DUMP_DIR="/tmp/readings-dumps"
DOCKER_DUMP_DIR="/tmp/dumps"

# ── Helpers ─────────────────────────────────────────────────────────────────
log()  { echo "[$(date '+%H:%M:%S')] $*"; }
die()  { log "ERROR: $*"; exit 1; }
timer_start() { STEP_START=$(date +%s); }
timer_end()   { local elapsed=$(( $(date +%s) - STEP_START )); log "  ⏱ ${elapsed}s"; }

START_STEP=${2:-1}
should_run() { [[ $1 -ge $START_STEP ]]; }

# ── PASO 1: pg_dump dentro de Docker ───────────────────────────────────────
if should_run 1; then
  log "PASO 1: pg_dump dentro de Docker → $DOCKER_DUMP_DIR"
  timer_start

  docker exec "$DOCKER_CONTAINER" mkdir -p "$DOCKER_DUMP_DIR"

  # 1a: Schema de meter_readings (parent + 875 particiones, SIN índices)
  log "  1a: Schema meter_readings (pre-data)..."
  docker exec "$DOCKER_CONTAINER" pg_dump -U "$DOCKER_USER" -d "$DOCKER_DB" \
    --section=pre-data -t 'meter_readings*' \
    -Fc -f "$DOCKER_DUMP_DIR/meter_readings_schema.dump"

  # 1b: Data de meter_readings por edificio (5 dumps)
  for bldg in mg mm ot sc52 sc53; do
    log "  1b: Data meter_readings_${bldg}_*..."
    docker exec "$DOCKER_CONTAINER" pg_dump -U "$DOCKER_USER" -d "$DOCKER_DB" \
      --section=data -t "meter_readings_${bldg}_*" \
      -Fc -f "$DOCKER_DUMP_DIR/meter_readings_data_${bldg}.dump"
  done

  # 1c: Índices de meter_readings (post-data)
  log "  1c: Indices meter_readings (post-data)..."
  docker exec "$DOCKER_CONTAINER" pg_dump -U "$DOCKER_USER" -d "$DOCKER_DB" \
    --section=post-data -t 'meter_readings*' \
    -Fc -f "$DOCKER_DUMP_DIR/meter_readings_indexes.dump"

  # 1d: raw_readings completa (schema + data + indexes, tabla simple)
  log "  1d: raw_readings completa..."
  docker exec "$DOCKER_CONTAINER" pg_dump -U "$DOCKER_USER" -d "$DOCKER_DB" \
    -t 'raw_readings' \
    -Fc -f "$DOCKER_DUMP_DIR/raw_readings_full.dump"

  timer_end
  log "  Listando dumps:"
  docker exec "$DOCKER_CONTAINER" ls -lh "$DOCKER_DUMP_DIR/"
fi

# ── PASO 2: Copiar dumps de Docker al host ─────────────────────────────────
if should_run 2; then
  log "PASO 2: Docker → host ($DUMP_DIR)"
  timer_start
  rm -rf "$DUMP_DIR" && mkdir -p "$DUMP_DIR"

  for f in meter_readings_schema.dump \
           meter_readings_data_mg.dump \
           meter_readings_data_mm.dump \
           meter_readings_data_ot.dump \
           meter_readings_data_sc52.dump \
           meter_readings_data_sc53.dump \
           meter_readings_indexes.dump \
           raw_readings_full.dump; do
    log "  Copiando $f..."
    docker cp "${DOCKER_CONTAINER}:${DOCKER_DUMP_DIR}/${f}" "${DUMP_DIR}/${f}"
  done

  ls -lh "$DUMP_DIR/"
  timer_end
fi

# ── PASO 3: Subir a S3 ─────────────────────────────────────────────────────
if should_run 3; then
  log "PASO 3: Subir dumps a s3://${S3_BUCKET}/${S3_PREFIX}/"
  timer_start
  aws s3 sync "$DUMP_DIR/" "s3://${S3_BUCKET}/${S3_PREFIX}/" --region "$REGION"
  timer_end
  log "  Verificando S3:"
  aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}/" --human-readable
fi

# ── PASO 4: Escalar RDS ────────────────────────────────────────────────────
if should_run 4; then
  log "PASO 4: Escalar RDS a $RDS_TARGET_CLASS"
  timer_start

  CURRENT_CLASS=$(aws rds describe-db-instances \
    --db-instance-identifier "$RDS_INSTANCE" \
    --query 'DBInstances[0].DBInstanceClass' --output text --region "$REGION")

  if [[ "$CURRENT_CLASS" == "$RDS_TARGET_CLASS" ]]; then
    log "  Ya está en $RDS_TARGET_CLASS, saltando."
  else
    aws rds modify-db-instance \
      --db-instance-identifier "$RDS_INSTANCE" \
      --db-instance-class "$RDS_TARGET_CLASS" \
      --apply-immediately \
      --region "$REGION" > /dev/null

    log "  Esperando que RDS esté disponible (puede tardar 5-10 min)..."
    aws rds wait db-instance-available \
      --db-instance-identifier "$RDS_INSTANCE" \
      --region "$REGION"
  fi
  timer_end
fi

# ── PASO 5: ECS Fargate restore ────────────────────────────────────────────
if should_run 5; then
  log "PASO 5: Ejecutar restore via ECS Fargate"
  timer_start

  # El restore script que corre dentro del container
  RESTORE_SCRIPT='#!/bin/bash
set -euo pipefail

echo "[$(date +%H:%M:%S)] Descargando dumps de S3..."
mkdir -p /tmp/dumps
aws s3 sync "s3://'"$S3_BUCKET"'/'"$S3_PREFIX"'/" /tmp/dumps/
ls -lh /tmp/dumps/

export PGPASSWORD="'"$RDS_PASS"'"
PG_CONN="-h '"$RDS_HOST"' -U '"$RDS_USER"' -d '"$RDS_DB"'"

echo "[$(date +%H:%M:%S)] Paso 5a: Restaurando schema meter_readings (parent + 875 particiones)..."
pg_restore $PG_CONN --no-owner --no-privileges --section=pre-data /tmp/dumps/meter_readings_schema.dump || true

echo "[$(date +%H:%M:%S)] Paso 5b: Restaurando data meter_readings por edificio..."
for bldg in mg mm ot sc52 sc53; do
  echo "[$(date +%H:%M:%S)]   Edificio: $bldg"
  pg_restore $PG_CONN --no-owner --no-privileges --section=data /tmp/dumps/meter_readings_data_${bldg}.dump || {
    echo "WARN: Falló data $bldg, continuando..."
  }
done

echo "[$(date +%H:%M:%S)] Paso 5c: Restaurando raw_readings..."
pg_restore $PG_CONN --no-owner --no-privileges /tmp/dumps/raw_readings_full.dump || true

echo "[$(date +%H:%M:%S)] Paso 5d: Creando índices meter_readings..."
pg_restore $PG_CONN --no-owner --no-privileges --section=post-data /tmp/dumps/meter_readings_indexes.dump || true

echo "[$(date +%H:%M:%S)] Paso 5e: Verificando counts..."
psql $PG_CONN -c "SELECT '\''meter_readings'\'' as tbl, count(*) FROM meter_readings UNION ALL SELECT '\''raw_readings'\'', count(*) FROM raw_readings;"

echo "[$(date +%H:%M:%S)] RESTORE COMPLETADO"
'

  # Crear Dockerfile temporal con pg16 + awscli
  DOCKER_BUILD_DIR=$(mktemp -d)
  cat > "$DOCKER_BUILD_DIR/Dockerfile" <<'DOCKERFILE'
FROM postgres:16-alpine
RUN apk add --no-cache aws-cli bash
COPY restore.sh /restore.sh
RUN chmod +x /restore.sh
CMD ["/restore.sh"]
DOCKERFILE

  echo "$RESTORE_SCRIPT" > "$DOCKER_BUILD_DIR/restore.sh"

  # Build y push a ECR
  ECR_IMAGE="${ECR_REPO}/energy-monitor-readings-restore:latest"
  log "  Building Docker image..."
  docker build -t energy-monitor-readings-restore "$DOCKER_BUILD_DIR" --platform linux/amd64

  log "  Pushing to ECR..."
  aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$ECR_REPO"

  # Crear repo ECR si no existe
  aws ecr describe-repositories --repository-names energy-monitor-readings-restore --region "$REGION" 2>/dev/null || \
    aws ecr create-repository --repository-name energy-monitor-readings-restore --region "$REGION" > /dev/null

  docker tag energy-monitor-readings-restore "$ECR_IMAGE"
  docker push "$ECR_IMAGE"

  # Registrar task definition
  TASK_DEF=$(cat <<TASKDEF
{
  "family": "$TASK_FAMILY",
  "taskRoleArn": "arn:aws:iam::058310292956:role/energy-monitor-drive-ingest-task-role",
  "executionRoleArn": "arn:aws:iam::058310292956:role/energy-monitor-drive-ingest-task-execution-role",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "2048",
  "memory": "4096",
  "containerDefinitions": [{
    "name": "readings-restore",
    "image": "$ECR_IMAGE",
    "essential": true,
    "environment": [
      {"name": "AWS_REGION", "value": "$REGION"}
    ],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "/ecs/$TASK_FAMILY",
        "awslogs-region": "$REGION",
        "awslogs-stream-prefix": "ecs",
        "awslogs-create-group": "true"
      }
    }
  }]
}
TASKDEF
)

  echo "$TASK_DEF" > /tmp/readings-restore-taskdef.json
  aws ecs register-task-definition --cli-input-json file:///tmp/readings-restore-taskdef.json --region "$REGION" > /dev/null

  # Crear cluster si no existe
  aws ecs describe-clusters --clusters "$ECS_CLUSTER" --region "$REGION" 2>/dev/null | grep -q ACTIVE || \
    aws ecs create-cluster --cluster-name "$ECS_CLUSTER" --region "$REGION" > /dev/null

  # Lanzar task
  log "  Lanzando ECS Fargate task..."
  TASK_ARN=$(aws ecs run-task \
    --cluster "$ECS_CLUSTER" \
    --task-definition "$TASK_FAMILY" \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[${ECS_SUBNETS}],securityGroups=[${ECS_SG}],assignPublicIp=ENABLED}" \
    --region "$REGION" \
    --query 'tasks[0].taskArn' --output text)

  log "  Task ARN: $TASK_ARN"
  TASK_ID=$(echo "$TASK_ARN" | awk -F'/' '{print $NF}')

  log "  Esperando que termine (monitor logs con):"
  log "    aws logs tail /ecs/$TASK_FAMILY --follow --region $REGION"
  log ""
  log "  O verificar status:"
  log "    aws ecs describe-tasks --cluster $ECS_CLUSTER --tasks $TASK_ID --region $REGION --query 'tasks[0].lastStatus'"
  log ""

  # Esperar a que termine
  aws ecs wait tasks-stopped --cluster "$ECS_CLUSTER" --tasks "$TASK_ID" --region "$REGION"

  # Verificar exit code
  EXIT_CODE=$(aws ecs describe-tasks --cluster "$ECS_CLUSTER" --tasks "$TASK_ID" --region "$REGION" \
    --query 'tasks[0].containers[0].exitCode' --output text)

  if [[ "$EXIT_CODE" == "0" ]]; then
    log "  ECS task completada exitosamente"
  else
    die "ECS task falló con exit code: $EXIT_CODE. Revisar logs."
  fi

  timer_end
  rm -rf "$DOCKER_BUILD_DIR"
fi

# ── PASO 6: Verificación final ─────────────────────────────────────────────
if should_run 6; then
  log "PASO 6: Verificación (se ejecutó dentro del container, verificar logs)"
  log "  aws logs tail /ecs/$TASK_FAMILY --follow --region $REGION"
fi

# ── PASO 7: Bajar RDS ──────────────────────────────────────────────────────
if should_run 7; then
  log "PASO 7: Bajar RDS a $RDS_FINAL_CLASS"
  timer_start

  CURRENT_CLASS=$(aws rds describe-db-instances \
    --db-instance-identifier "$RDS_INSTANCE" \
    --query 'DBInstances[0].DBInstanceClass' --output text --region "$REGION")

  if [[ "$CURRENT_CLASS" == "$RDS_FINAL_CLASS" ]]; then
    log "  Ya está en $RDS_FINAL_CLASS, saltando."
  else
    aws rds modify-db-instance \
      --db-instance-identifier "$RDS_INSTANCE" \
      --db-instance-class "$RDS_FINAL_CLASS" \
      --apply-immediately \
      --region "$REGION" > /dev/null

    log "  Esperando que RDS esté disponible..."
    aws rds wait db-instance-available \
      --db-instance-identifier "$RDS_INSTANCE" \
      --region "$REGION"
  fi
  timer_end
fi

log ""
log "══════════════════════════════════════════════════════════"
log "  PROCESO COMPLETO"
log "══════════════════════════════════════════════════════════"

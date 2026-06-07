# Runbook RTO/RPO — Restauración RDS (GAP-203)

Objetivos PASA / ARQ-11:

| Métrica | Objetivo | Notas |
|---------|----------|-------|
| **RPO** | 1 hora | Pérdida máxima de datos aceptable |
| **RTO** | 4 horas | Tiempo máximo para servicio operativo |

## Contexto producción monitoreo-v2

| Recurso | Valor |
|---------|-------|
| Instancia RDS | `monitoreo-v2-db` (PostgreSQL 16, ECS Fargate backend) |
| Región | `us-east-1` |
| Backups automáticos | Habilitados (retención AWS default 7d; verificar en consola) |
| Snapshots manuales | Antes de migraciones mayores o releases críticos |

## Checklist — detección e inicio (T+0)

- [ ] Confirmar incidente: health `/api/health` falla, ECS tasks en crash loop, o errores DB en CloudWatch
- [ ] Abrir bridge call; asignar roles: **Incident Commander**, **DB Lead**, **Deploy Lead**
- [ ] Congelar deploys y migraciones hasta restauración validada
- [ ] Capturar hora UTC del último dato confirmado en prod (RPO baseline)
- [ ] Revisar CloudWatch RDS: CPU, storage, connections, `DatabaseConnections`

## Checklist — restauración desde snapshot (T+0 → T+4h)

### 1. Evaluar opción de recuperación

- [ ] **Point-in-time restore (PITR)** si fallo lógico reciente (< 1h) — preferido para RPO 1h
- [ ] **Snapshot manual** si corrupción conocida o PITR no disponible
- [ ] Documentar snapshot/hora PITR elegida en ticket de incidente

### 2. Crear instancia restaurada (AWS Console o CLI)

```bash
# Ejemplo PITR (ajustar db-instance-identifier y restore-time)
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier monitoreo-v2-db \
  --target-db-instance-identifier monitoreo-v2-db-restored \
  --restore-time 2026-06-06T12:00:00Z \
  --db-subnet-group-name <subnet-group> \
  --vpc-security-group-ids <sg-ecs-rds> \
  --no-publicly-accessible
```

- [ ] Esperar estado `available` (típico 20–45 min según tamaño)
- [ ] Verificar endpoint nuevo: `monitoreo-v2-db-restored.xxxxx.us-east-1.rds.amazonaws.com`

### 3. Validar datos restaurados

```bash
psql "host=<restored-endpoint> port=5432 dbname=energy_monitor user=<user> sslmode=require" \
  -c "SELECT MAX(timestamp) FROM readings;"
psql ... -c "SELECT COUNT(*) FROM tenants;"
psql ... -c "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 5;"
```

- [ ] Confirmar `schema_migrations` alineado con release desplegado
- [ ] Confirmar lag RPO: `MAX(readings.timestamp)` ≥ hora objetivo − 1h

### 4. Cutover aplicación

- [ ] Actualizar secret ECS `DB_HOST` → endpoint restaurado (Secrets Manager o task definition)
- [ ] Forzar nuevo deployment ECS `monitoreo-v2-backend`
- [ ] Verificar tasks healthy; `/api/health` → 200
- [ ] Smoke test: login OAuth, `GET /readings/latest`, export ETL (`readings:export`)

### 5. DNS / naming (opcional)

- [ ] Renombrar instancias: restored → primary, primary corrupta → `-old` (ventana de mantenimiento)
- [ ] O mantener endpoint restaurado en secret permanentemente si rename no es viable en ventana RTO

## Checklist — post-restauración

- [ ] Monitorear 24h: latencia RDS, errores 5xx API, cola ingest
- [ ] Re-sincronizar datos faltantes si hubo gap (Drive pipeline, IoT backfill) — ver `docs/aws-runbook.md`
- [ ] Crear snapshot post-mortem manual
- [ ] Post-mortem: causa raíz, acciones preventivas, actualizar este runbook si aplica

## Roles y contactos

| Rol | Responsabilidad |
|-----|-----------------|
| Incident Commander | Comunicación cliente, go/no-go cutover |
| DB Lead | PITR/snapshot, validación SQL |
| Deploy Lead | ECS secrets, redeploy, smoke tests |

## Referencias

- [AWS Runbook general](../aws-runbook.md)
- [RDS Read Replica](./rds-replica.md)
- Migraciones: `monitoreo-v2/database/migrations/`

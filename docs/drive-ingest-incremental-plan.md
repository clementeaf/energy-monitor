# Plan: Ingesta Incremental Automatizada desde Google Drive hacia AWS RDS

## Problema actual

El flujo actual descarga y re-importa los archivos CSV completos cada vez que se ejecuta, independientemente de si cambiaron o no. El procesamiento corre desde la máquina local a través de un túnel SSH, lo que hace el flujo lento (~2.5 horas para 5.5 GB), frágil y completamente manual.

---

## Objetivo

Lograr que cuando alguien actualice un CSV en Google Drive, los datos nuevos lleguen a la tabla `readings_import_staging` en RDS de forma **automática**, **rápida** y **sin intervención manual**.

---

## Flujo propuesto

```
EventBridge (schedule diario o bajo demanda)
  → Fargate Task (dentro del VPC)
      1. Listar archivos CSV en Google Drive folder
      2. Para cada archivo: comparar modifiedTime con el último manifest en S3
      3. Si el archivo cambió → descargar desde Drive a S3 (sobreescribe raw/)
      4. Si el archivo cambió → importar desde S3 a readings_import_staging
      5. Guardar nuevo manifest con resultado
```

---

## Lógica de detección de cambios

- Al finalizar cada importación, el manifest ya guarda `driveModifiedTime` y `sha256`.
- El proceso incremental busca el manifest más reciente por archivo (`manifests/<timestamp>-<filename>.json`).
- Si `driveModifiedTime` del manifest más reciente es igual al actual en Drive → **skip** (no descarga, no importa).
- Si es distinto → el archivo fue actualizado → descarga + importa.
- Si no existe manifest previo → archivo nuevo → descarga + importa.

---

## Lógica de importación incremental (staging)

La tabla `readings_import_staging` ya tiene:

```
UNIQUE (meter_id, timestamp, source_file)
```

Por lo que el `INSERT ... ON CONFLICT DO NOTHING` ya es idempotente. Esto significa que:

- Si el CSV tiene **solo filas nuevas al final** (datos más recientes), solo esas se insertan.
- Las filas ya existentes se omiten silenciosamente.
- No es necesario truncar ni recargar todo — solo se procesa el archivo actualizado.

> **Limitación conocida**: si el CSV corrige filas antiguas (no solo agrega al final), esas correcciones no llegarán a staging autmáticamente con este enfoque. Para ese caso habría que incluir una estrategia de `DELETE + INSERT` selectiva por rango de fechas.

---

## Dónde corre el proceso

**Fargate (dentro del VPC)** — no en local ni en Lambda.

- La conexión S3 → RDS es interna: sin latencia de red pública, sin túnel SSH, ordenes de magnitud más rápida.
- Lambda no es una opción para archivos de 1.5–3 GB (límite de tiempo de ejecución y memoria).
- Fargate es on-demand: solo levanta el contenedor cuando hay trabajo, luego se apaga.

El cluster ECS `energy-monitor-drive-ingest` ya está creado y provisionado.

---

## Automatización

- **EventBridge schedule**: trigger diario (ej: 03:00 UTC) lanza la Fargate Task.
- **Trigger bajo demanda**: también se puede invocar manualmente con `aws ecs run-task` cuando se necesite una actualización inmediata.
- **CloudWatch Logs**: todos los logs del proceso quedan en `/ecs/energy-monitor-drive-ingest` para auditoría.

---

## Componentes a construir

| Componente | Descripción |
|---|---|
| Lógica de comparación de manifests | Leer el manifest más reciente de S3 y comparar `driveModifiedTime` |
| Integración en el script de ingest | Añadir el check antes de descargar cada archivo |
| Dockerfile del proceso de importación | Empaquetar `drive-ingest` + `drive-import-staging` en un contenedor |
| Task Definition en ECS | Definir CPU, memoria, roles IAM, secretos y VPC |
| EventBridge Rule | Schedule diario que dispare la Task |
| Secrets IAM | El rol de la task ya tiene acceso a S3 y Secrets Manager |

---

## Orden recomendado de implementación

1. Agregar lógica de comparación de `modifiedTime` en el script de ingesta (Drive → S3).
2. Unificar los dos scripts (`drive-ingest` + `drive-import-staging`) en un único flujo orquestado.
3. Crear el `Dockerfile` que empaquete ese flujo.
4. Registrar la Task Definition en ECS con los secretos y el VPC correctos.
5. Crear la EventBridge rule para el schedule diario.
6. Probar una corrida completa desde ECS y validar los resultados en staging.

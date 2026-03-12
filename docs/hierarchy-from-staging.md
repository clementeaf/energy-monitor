# Jerarquía desde staging (sitios Drive)

Script que genera e inserta nodos en `hierarchy_nodes` para edificios cuyo origen es el import Drive (CSV en staging), a partir de `center_type`, `store_type`, `store_name` y `meter_id` en `readings_import_staging`.

## Uso

Desde el directorio del proyecto, con acceso a RDS (túnel SSH o ejecución dentro de la VPC):

```bash
cd infra/drive-import-staging
npm ci
npm run hierarchy-from-staging
```

Con variables de entorno (igual que `promote.mjs`):

- **DB_SECRET_NAME** — Secret en AWS Secrets Manager (default: `energy-monitor/drive-ingest/db`).
- **DB_HOST**, **DB_PORT** — Opcionales; para túnel local (ej. `127.0.0.1`, `5433`).
- **DRY_RUN=true** — Solo imprime los nodos que insertaría, sin escribir.

Ejemplo con túnel local:

```bash
DB_HOST=127.0.0.1 DB_PORT=5433 npm run hierarchy-from-staging
```

Inspección sin escritura:

```bash
DRY_RUN=true npm run hierarchy-from-staging
```

## Comportamiento

1. **Edificios candidatos:** Se consideran los `center_name` distintos en staging cuyo slug coincide con un `buildings.id` existente y que **no** tienen ya filas en `hierarchy_nodes`. Se excluyen siempre los legacy `pac4220` y `s7-1200`.
2. **Árbol por edificio:** Para cada edificio se construye:
   - **Nivel 1 (building):** Un nodo raíz `B-{building_id}`.
   - **Nivel 2 (panel):** Un nodo por cada `center_type` distinto, con id `P-{shortBuilding}-{i}`.
   - **Nivel 3 (subpanel):** Un nodo por cada par `(center_type, store_type)`, con id `S-{panel_id}-{j}`.
   - **Nivel 4 (circuit):** Un nodo por cada `meter_id`, con id = `meter_id`, padre el subpanel que corresponde a su `(center_type, store_type)`; nombre = `store_name` o "Medidor {meter_id}".
3. **Inserción:** `INSERT ... ON CONFLICT (id) DO NOTHING`, para poder re-ejecutar sin duplicar.

## Convención de IDs (VARCHAR 20)

| Nivel   | Formato              | Ejemplo        |
|---------|----------------------|----------------|
| Building| `B-{building_id}`     | `B-mall-grande` (truncado a 20) |
| Panel   | `P-{shortBuilding}-{i}` | `P-mall-gra-0` (shortBuilding = 8 chars) |
| Subpanel| `S-{panel_id}-{j}`   | `S-P-mall-gra-0-0` (truncado a 20) |
| Circuit | `meter_id`          | `MG-001` (ya en `meters.id`) |

`building_id` es el slug de `center_name` (mismo que en `buildings.id`). Los nombres mostrados (`name`) usan `center_name`, `center_type`, `store_type` y `store_name` sin truncar salvo al límite de 100 caracteres del schema.

## Cuándo ejecutarlo

- **Después de promote:** Tras haber ejecutado `promote.mjs` (staging → readings y catálogo de buildings/meters), para que los sitios Drive tengan jerarquía y el drill-down (`/monitoring/drilldown/:siteId`) muestre árbol y consumo por nodo.
- **Re-ejecución:** Es idempotente por `ON CONFLICT (id) DO NOTHING`; no borra nodos existentes. Si se añaden nuevos edificios o medidores vía staging/promote, volver a ejecutar creará solo los nodos que falten.

## Referencias

- Plan de negocio: `docs/plan-negocio-consumo-datos-rds.md` (Fase 2, Opción A).
- Revisión datos Drive: `docs/data-drive-aws-review.md`.
- Schema: `sql/005_hierarchy_nodes.sql`.

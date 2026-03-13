# Staging como buffer, no como almacén

## Problema
`readings_import_staging` con ~30M filas consume 16+ GB y capacidad de RDS. Mantener todo ahí nos quita tiempo y capacidad; las consultas pesadas (GROUP BY, DISTINCT, análisis) nos meten en problemas.

## Regla
**Staging = zona de llegada y procesamiento. No = archivo histórico.**

1. **Entrada:** Los CSV siguen llegando a staging (por archivo o por lotes).
2. **Procesamiento:** Se distribuye a tablas finales: `buildings`, `meters`, `tiendas`, `readings`, `analisis`, `staging_centers`.
3. **Purgado:** Tras un reparto exitoso, **vaciar staging** (o borrar por `source_file` / rango ya procesado) para liberar espacio y no volver a acumular millones.

## Flujo recomendado

```
CSV → staging (por archivo/lote)
       → promote (readings, buildings, meters)
       → distribute (tiendas, analisis)
       → TRUNCATE readings_import_staging  (o DELETE por source_file ya procesado)
```

Así staging solo retiene lo que aún no se ha repartido. Si en el futuro se re-ingesta el mismo CSV, se vuelve a cargar a staging y se repite el flujo.

## Opciones de purga

- **TRUNCATE readings_import_staging:** Borra todo. Usar cuando todo lo que importa ya está en `readings` + `tiendas` + `analisis` y no necesitas re-ejecutar el reparto sobre los mismos datos.
- **DELETE por source_file:** Tras procesar un archivo, `DELETE FROM readings_import_staging WHERE source_file = $1`. Staging va bajando de tamaño conforme avanza el reparto.
- **Retención por tiempo:** Mantener en staging solo los últimos N días; borrar el resto una vez distribuido.

## Una vez aplicado
- Staging deja de crecer sin límite.
- RDS recupera capacidad y las consultas pesadas dejan de competir con 30M filas.
- El histórico queda en `readings` y en `analisis`; staging solo como buffer temporal.

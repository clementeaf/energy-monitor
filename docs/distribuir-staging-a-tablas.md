# Distribución de datos: tabla gigante → tiendas + análisis

## Estrategia para no saturar RDS (millones de filas)

### 1. Tiendas (poco volumen)
- **Origen:** `readings_import_staging` (center_name, store_type, store_name).
- **Destino:** `tiendas` (building_id, store_type, store_name).
- **Táctica:** Trozos por **source_file**. Por cada archivo se hace un `SELECT DISTINCT center_name, store_type, store_name` (pocas filas por archivo). Se acumulan en un Set en memoria para deduplicar y al final se insertan en `tiendas` con `building_id = slug(center_name)` y `ON CONFLICT DO NOTHING`. No se hace un único DISTINCT sobre toda la tabla.

### 2. Análisis (pesado)
- **Origen:** `readings_import_staging` (timestamp, meter_id, center_name, power_kw, energy_kwh_total).
- **Destino:** `analisis` (meter_id, period_type, period_start, period_end, consumption_kwh, avg_power_kw, peak_demand_kw, num_readings).
- **Táctica:** Trozos por **ventana de tiempo (día)**. Para cada día: consulta `WHERE timestamp >= $dayStart AND timestamp < $dayEnd`. Dentro de cada día se lee en **batches** (ej. 50 000 filas) con LIMIT/OFFSET o cursor para no cargar todo el día en memoria. En Node se agrega por (meter_id): consumo = max(energy_kwh_total) - min(energy_kwh_total), avg(power_kw), max(power_kw), count. Se inserta en `analisis` (scope = meter_id, period_type = 'day'). Opcional: índice en `readings_import_staging(timestamp)` para que el filtro por día sea rápido.

### 3. Lecturas
- **Ya resuelto:** El `promote` copia de `readings_import_staging` a `readings`. No hace falta volver a distribuir esas filas.

### 4. Parámetros recomendados
- **BATCH_READ:** 50 000 filas por lectura dentro de un día.
- **DRY_RUN:** ejecutar sin escribir para validar conteos y rangos.
- **Un solo proceso** corriendo a la vez (no paralelizar escrituras en las mismas tablas).

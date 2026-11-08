# Integración Varelectric → Energy Monitor

Documento para el equipo de Varelectric. Las lecturas se envían igual que antes: un `INSERT` en la tabla `var_electric`. Cambian la conexión y se agrega la columna `edificio`.

## Qué cambia respecto de antes

| | Antes | Ahora |
|---|---|---|
| Servidor | base anterior (dada de baja) | ver Conexión |
| Tabla | `var_electric` | `var_electric` (mismas columnas) |
| Columna nueva | — | `edificio` en cada fila |
| Edificio nuevo | lo creaba Energy Monitor | se crea solo con su primera fila |

## Conexión (PostgreSQL)

| Parámetro | Valor |
|---|---|
| Host | `monitoreo-v2-db.czess084sdtu.us-east-2.rds.amazonaws.com` |
| Puerto | `5432` |
| Base | `monitoreo_v2` |
| Usuario | `varelectric` |
| Contraseña | se entrega por separado |
| SSL | obligatorio (`sslmode=require`) |

El usuario solo puede insertar en `var_electric`; no puede leer ni modificar nada.

## INSERT

```sql
INSERT INTO var_electric
  (idvar_electric, estado, edificio, id_remarcador, fecha,
   tag1, tag2, tag3, tag4, tag5, tag6, tag12, tag14, tag16)
VALUES
  (123456, 1, 'altopena', 101, '2026-10-16 10:15:00',
   224.1, 226.1, 223.6, 8.53, 8.25, 8.82, 0.97, 15230.5, 5.689);
```

Se pueden insertar muchas filas en un solo `INSERT`.

## Valores de `edificio`

| Edificio | `edificio` |
|---|---|
| Alto Peñalolén | `altopena` |
| Quilicura | `quilicura` |
| Hotel Renaissance | `renaissance` |

Para un edificio nuevo, usar un valor nuevo (letras, números, `-` o `_`, máximo 46 caracteres) y siempre el mismo para ese edificio. Se registra solo con ese valor como nombre; avisar para ponerle el nombre real.

## Columnas

| Columna | Obligatoria | Uso |
|---|---|---|
| `idvar_electric` | no (entero) | Se guarda, no se usa |
| `estado` | sí (entero) | Se guarda, no se usa |
| `edificio` | sí | Identifica el edificio |
| `id_remarcador` | sí (entero) | Identifica el medidor dentro del edificio |
| `fecha` | sí | Hora de Chile si va sin zona; también acepta zona (`2026-10-16T13:15:00Z`) |
| `tag1`, `tag2`, `tag3` | no | Voltaje L1, L2, L3 (V) |
| `tag4`, `tag5`, `tag6` | no | Corriente L1, L2, L3 (A) |
| `tag12` | no | Factor de potencia |
| `tag14` | sí para guardar | Energía acumulada (kWh, contador) |
| `tag16` | no | Demanda: potencia promedio de 15 min (kW), la que se cobra. Si viene vacía se calcula como (`tag14` − `tag14` anterior del mismo remarcador, hasta 20 min antes) ÷ horas entre ambas lecturas; sin lectura anterior queda 0 |
| `tag7`–`tag11`, `tag13`, `tag15`, `tag17`–`tag20` | no | Se aceptan y se ignoran |

Las filas sin `tag14` se aceptan pero no generan lectura. Un `id_remarcador` nuevo se registra solo como `Remarcador <id>`.

## Reenvío pendiente

La plataforma no tiene lecturas desde el **28-07-2026**. Insertar todas las lecturas desde esa fecha hasta hoy. Repetir una fila ya enviada no duplica la lectura, así que no hay que filtrar.

## Errores

Si el `INSERT` falla, PostgreSQL devuelve el motivo y no se guarda ninguna fila de ese `INSERT`:

- Valor de `edificio` con caracteres no permitidos: corregir el valor.
- `Building code VE-<edificio> is taken`: contactar a Energy Monitor.

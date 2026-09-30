# Integración Varelectric → Energy Monitor

Documento para el equipo de Varelectric. Describe cómo enviar las lecturas de los remarcadores a la plataforma.

## Resumen

- Envío por **HTTPS POST**, cada 15 minutos (o con la frecuencia que tengan los controladores).
- **Una API key por edificio.** La key identifica el edificio; no hace falta enviarlo en el cuerpo.
- El formato de cada registro es el mismo de la tabla `var_electric` que ya usan.
- Reenviar un registro ya recibido no lo duplica.

| Edificio | La API key se entrega por separado |
|---|---|
| Alto Peñalolén | key 1 |
| Quilicura | key 2 |
| Hotel Renaissance | key 3 |

## Endpoint

```
POST https://<dominio-plataforma>/api/v1/varelectric/batch
Content-Type: application/json
X-API-Key: <key del edificio>
```

Máximo **1.000 registros** por petición. Para un solo registro también existe `POST /api/v1/varelectric` con el registro directamente como cuerpo.

## Cuerpo

```json
{
  "records": [
    {
      "idvar_electric": 123456,
      "estado": 1,
      "id_remarcador": 101,
      "fecha": "2026-09-30 10:15:00",
      "tag1": 224.1, "tag2": 226.1, "tag3": 223.6,
      "tag4": 8.53, "tag5": 8.25, "tag6": 8.82,
      "tag9": 5.689,
      "tag12": 0.97,
      "tag14": 15230.5
    }
  ]
}
```

| Campo | Obligatorio | Uso |
|---|---|---|
| `idvar_electric` | sí (entero) | Se valida, no se usa |
| `estado` | sí (entero) | Se valida, no se usa |
| `id_remarcador` | sí (entero) | Identifica el medidor dentro del edificio |
| `fecha` | sí | Ver "Fecha y zona horaria" |
| `tag1`, `tag2`, `tag3` | no | Voltaje L1, L2, L3 (V) |
| `tag4`, `tag5`, `tag6` | no | Corriente L1, L2, L3 (A) |
| `tag9` | **sí para guardar** | Potencia activa (kW) |
| `tag12` | no | Factor de potencia |
| `tag14` | **sí para guardar** | Energía acumulada (kWh, contador) |
| `tag7`, `tag8`, `tag10`, `tag11`, `tag13`, `tag15`–`tag20` | no | Se aceptan y se ignoran |

Los registros sin `tag9` o sin `tag14` se cuentan como `skipped` y no se guardan.

## Fecha y zona horaria

- **Recomendado:** ISO 8601 con zona horaria, por ejemplo `2026-09-30T10:15:00-03:00` o `2026-09-30T13:15:00Z`.
- También se acepta sin zona (`2026-09-30 10:15:00`), en cuyo caso se interpreta como hora de Chile continental (`America/Santiago`). Con este formato, la hora repetida del cambio de horario de abril es ambigua y las lecturas de esa hora pueden descartarse como duplicadas. Por eso se recomienda enviar la zona.

## Respuestas

| Código | Significado | Qué hacer |
|---|---|---|
| `201` | `{"inserted": N, "skipped": M}` | OK. `skipped` = duplicados o registros sin potencia/energía |
| `400` | Cuerpo inválido; el mensaje indica el campo | Corregir el registro |
| `401` | API key inválida o desactivada | Revisar la key |
| `422` | La key no está asociada a exactamente un edificio | Contactar a Energy Monitor |
| `429` | Demasiadas peticiones | Reintentar después de 60 s |
| `5xx` | Error de la plataforma | Reintentar con espera creciente; el reenvío no duplica |

## Límites

- 1.000 registros por petición.
- Hasta 10 peticiones por segundo, 100 por minuto y 1.000 por hora desde la misma IP.
- Para cargar histórico: lotes de 1.000 con ~1 s entre peticiones (unos 3,6 millones de registros por hora).

## Remarcadores nuevos

Si llega un `id_remarcador` que la plataforma no conoce, se registra automáticamente en el edificio de la key y se nombra `Remarcador <id>`. Conviene avisar para ponerle el nombre del local.

## Prueba rápida

```bash
curl -X POST https://<dominio-plataforma>/api/v1/varelectric/batch \
  -H "Content-Type: application/json" \
  -H "X-API-Key: <key>" \
  -d '{"records":[{"idvar_electric":1,"estado":1,"id_remarcador":101,"fecha":"2026-09-30T10:15:00-03:00","tag9":5.6,"tag14":15230.5}]}'
# → {"inserted":1,"skipped":0}
```

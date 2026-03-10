# Drive CSV Import Spec

## Propósito
Especificación mínima para importar los CSV cargados en S3 hacia staging en RDS sin volver a parsear el `.docx` completo.

Fuente funcional: `docs/POWER_Digital_Documentacion_BD.docx`.
Fuente operativa actual: `CLAUDE.md`.

## Archivos fuente ya cargados en S3
- `raw/MALL_GRANDE_446_completo.csv`
- `raw/MALL_MEDIANO_254_completo.csv`
- `raw/OUTLET_70_anual.csv`
- `raw/SC52_StripCenter_anual.csv`
- `raw/SC53_StripCenter_anual.csv`

## Contrato del CSV
- Separador de columnas: `;`
- Separador decimal: `,`
- Codificación: `UTF-8 with BOM` (`utf-8-sig`)
- Cabecera: primera fila contiene los nombres de las 21 columnas
- Sin comillas en valores numéricos
- Celdas vacías: `;;`
- Precisión esperada:
  - potencia y energía: 4 decimales
  - voltajes: 2 decimales
  - corrientes: 3 decimales

## Granularidad y orden
- 1 fila = 1 medidor × 1 intervalo de 15 minutos
- 35.040 filas por medidor por año
- Orden del archivo: `meter_id`, luego `timestamp`, ambos ascendentes
- `energy_kWh_total` parte en `0` en la primera lectura del medidor
- `energy_kWh_total` es monótona no decreciente

## Columnas fuente

### Identificación
- `timestamp`
- `meter_id`
- `center_name`
- `center_type`
- `store_type`
- `store_name`

### Configuración técnica
- `model`
- `phase_type`
- `uplink_route`
- `modbus_address`

### Variables eléctricas
- `voltage_L1`
- `voltage_L2`
- `voltage_L3`
- `current_L1`
- `current_L2`
- `current_L3`
- `power_kW`
- `reactive_power_kvar`
- `power_factor`
- `frequency_Hz`
- `energy_kWh_total`

## Reglas de negocio derivadas del documento
- `meter_id + timestamp` identifica una fila única del dataset fuente
- `model = PAC1670` implica `phase_type = 3P`
- `model = PAC1651` implica `phase_type = 1P`
- En `1P`, `voltage_L2`, `voltage_L3`, `current_L2`, `current_L3` deben venir vacíos
- `power_kW >= 0.001`
- `energy_kWh_total` nunca disminuye para un mismo `meter_id`
- Intervalo temporal fijo: 15 minutos

## Implicancias para el schema actual
El schema productivo actual no coincide 1:1 con el dataset fuente.

### Coinciden directamente con `readings`
- `timestamp` -> `timestamp`
- `power_kW` -> `power_kw`
- `reactive_power_kvar` -> `reactive_power_kvar`
- `power_factor` -> `power_factor`
- `frequency_Hz` -> `frequency_hz`
- `energy_kWh_total` -> `energy_kwh_total`
- `voltage_L1` -> `voltage_l1`
- `voltage_L2` -> `voltage_l2`
- `voltage_L3` -> `voltage_l3`
- `current_L1` -> `current_l1`
- `current_L2` -> `current_l2`
- `current_L3` -> `current_l3`

### Existen en fuente pero no en `readings`
- `center_name`
- `center_type`
- `store_type`
- `store_name`
- `model`
- `phase_type`
- `uplink_route`
- `modbus_address`

### Existen en `readings` pero no en fuente
- `thd_voltage_pct`
- `thd_current_pct`
- `phase_imbalance_pct`
- `breaker_status`
- `digital_input_1`
- `digital_input_2`
- `digital_output_1`
- `digital_output_2`
- `alarm`
- `modbus_crc_errors`

Conclusión: la importación debe pasar primero por staging y no intentar insertar directo en `readings`.

## Staging recomendado

### Tabla sugerida
`readings_import_staging`

### Columnas sugeridas
- `source_file` text not null
- `source_bucket` text not null
- `source_key` text not null
- `source_row_number` bigint not null
- `timestamp` timestamptz not null
- `meter_id` text not null
- `center_name` text not null
- `center_type` text not null
- `store_type` text not null
- `store_name` text not null
- `model` text not null
- `phase_type` text not null
- `uplink_route` text not null
- `modbus_address` integer not null
- `voltage_l1` numeric(7,2)
- `voltage_l2` numeric(7,2)
- `voltage_l3` numeric(7,2)
- `current_l1` numeric(8,3)
- `current_l2` numeric(8,3)
- `current_l3` numeric(8,3)
- `power_kw` numeric(10,4) not null
- `reactive_power_kvar` numeric(10,4)
- `power_factor` numeric(5,4)
- `frequency_hz` numeric(6,3)
- `energy_kwh_total` numeric(14,4) not null
- `ingested_at` timestamptz not null default now()

### Índices mínimos
- unique (`meter_id`, `timestamp`, `source_file`)
- index (`source_file`)
- index (`meter_id`, `timestamp`)

## Parseo recomendado
Si el import se hace en Python o Node, debe respetar exactamente:

```text
separator=';'
decimal=','
encoding='utf-8-sig'
parse timestamp as ISO 8601
empty strings -> NULL
```

## Validaciones de staging antes de promotion
- Conteo por archivo = `medidores × 35.040`
- No duplicados en (`meter_id`, `timestamp`) por archivo
- Todos los timestamps caen en 2026 y avanzan cada 15 minutos
- `phase_type` y `model` son coherentes
- En medidores `1P`, L2/L3 y corrientes L2/L3 son null
- `energy_kwh_total` no decrece por `meter_id`
- `power_kw` nunca negativa

## Promotion al modelo actual
La promotion no debería intentar reemplazar el catálogo de `meters` automáticamente en el primer corte.

Primero hay que resolver este gap:
- el dataset fuente usa `meter_id` como `MG-001`, `MM-045`, `OT-012`, `SC53-030`
- el modelo actual del repo espera ids tipo `M001`

Por eso, antes de insertar en `readings`, hace falta una estrategia explícita:
- opción A: crear nuevo catálogo de medidores alineado al dataset fuente
- opción B: construir una tabla de mapeo `source_meter_id -> meters.id`

Sin resolver eso, la promotion a `readings` no es segura.

## Orden recomendado de implementación
1. Crear `readings_import_staging`
2. Implementar parser desde S3 hacia staging
3. Validar conteos, duplicados y monotonía
4. Resolver estrategia de mapeo de `meter_id`
5. Recién entonces diseñar la promotion a `readings`

## Consultas mínimas útiles para QA
- filas por archivo
- filas por `meter_id`
- min/max `timestamp` por archivo
- primera y última `energy_kwh_total` por `meter_id`
- registros inválidos `model/phase_type`
- gaps de 15 minutos por medidor
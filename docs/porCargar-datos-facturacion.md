# Datos en docs/porCargar — Facturación y cobros

## Relación con el .docx de docs

El archivo **POWER_Digital_Documentacion_BD.docx** describe la **base de datos de simulación**: CSVs de lecturas cada 15 minutos (timestamp, meter_id, power_kW, energy_kWh_total, center_name, store_type, etc.). Es la **fuente granular** de telemetría.

Los **XLSX en docs/porCargar** son **reportes de facturación/KPIs mensuales**: datos ya agregados por mes y por local, con montos en pesos ($), IVA y totales. Sirven para **factura y visualización de cobros**, no para las lecturas crudas.

Resumen:
- **Docx + CSV**: qué se mide y cómo viene la telemetría (lecturas 15 min).
- **XLSX porCargar**: qué se cobra y cómo se presenta por centro/local/mes (facturación).

---

## Archivos en porCargar

| Archivo | Centro / tipo | Hojas principales |
|---------|----------------|--------------------|
| MG446_KPIs_mensuales_2025_M.xlsx | Mall Grande 446 (ej. Parque Arauco Kennedy) | Resumen Mensual, Pliegos Tarifarios (Las Condes), Consumo por Local (Pivot), Resumen Ejecutivo |
| MM254_KPIs_mensuales_2025_M.xlsx | Mall Mediano 254 (ej. Arauco Estación) | Idem, Pliegos (Santiago) |
| OUTLET_KPIs_mensuales_2025_M.xlsx | Outlet 70 (ej. Arauco Premium Outlet Buenaventura) | Idem, Pliegos (Quilicura) |
| SC52_KPIs_mensuales_2025_M.xlsx | Strip Center 52 | Idem |
| SC53_KPIs_mensuales_2025_M.xlsx | Strip Center 53 (ej. Arauco Express El Carmen) | Idem |

Todos comparten la misma estructura de hojas; solo cambia el centro y la comuna del pliego tarifario.

---

## Estructura de las hojas (uso factura / cobros)

### 1. Resumen Mensual (la que más importa para factura y cobros)

Detalle **por mes, por local, por medidor**: consumo, demanda, montos y totales.

- **Filas**: título (1), subtítulo (2), **cabecera real en fila 3**, datos desde fila 4.
- **Columnas** (cabecera en fila 3):

| Columna | Uso |
|--------|-----|
| Mes | Período facturado (Enero, Febrero, …) |
| N° Mes | 1–12 |
| Ubicación | Centro (ej. Parque Arauco Kennedy, Arauco Estación) |
| ID Medidor | ej. MG-001, MM-045, OT-012, SC53-030 (alineado con meter_id del docx) |
| Tipo Local | Rubro (SSCC, Retail, etc.) |
| Nombre Local | Nombre del local o “Servicios comunes” |
| Fase | 3P / 1P |
| Consumo Mensual (kWh) | Energía del mes — base para cobro por energía |
| Peak Mensual (kW) | Demanda máxima del mes |
| Demanda Hora Punta (kWh) | Consumo en ventana punta |
| % Punta / Consumo Total | Porcentaje punta |
| Promedio Diario (kWh) | Promedio diario del mes |
| Consumo Energía ($kWh) | **Monto $ por energía** |
| Dda. Máx. Suministrada (kW) | Demanda máxima (para cargo demanda) |
| Dda. Máx. Hora Punta (kW) | Demanda punta |
| KWH para Sistema Troncal / Serv. Público Neto | Desglose por componente |
| Cargo Fijo ($) | **Cargo fijo en $** |
| Total Neto ($) | **Total antes de IVA** |
| IVA ($) | **IVA** |
| Monto Exento | Exenciones |
| Total con IVA ($) | **Total a cobrar (factura)** |

Uso: **factura por local/medidor/mes** y **visualizar cobros** (por centro, por local, por período).

### 2. Pliegos Tarifarios (Las Condes / Santiago / Quilicura, según archivo)

Tarifas aplicadas por mes (no por local): energía, demanda, troncal, serv. público por tramo IVA, cargo fijo.

- **Filas**: cabecera + 12 meses (a veces 13 con totales).
- **Columnas**: Mes (o N°), Consumo Energía (kWh), Dda. Máx. Suministrada (kW), Dda. Máx. Hora Punta (kW), KWH Sistema Troncal, KWH Serv. Público IVA 1–5, Cargo Fijo ($).

Uso: **referencia de tarifas** por comuna/centro; no es el detalle de cobro por local pero explica cómo se calculan los $.

### 3. Consumo por Local (Pivot)

Pivot de **consumo mensual (kWh)** por local: una fila por medidor, columnas Enero–Diciembre + TOTAL ANUAL.

- Cabecera real varias filas más abajo (ej. “ID Medidor”, “Nombre Local”, “Enero” … “Diciembre”, “TOTAL ANUAL”).

Uso: **visualizar consumo** por local a lo largo del año; complementa el resumen de cobros.

### 4. Resumen Ejecutivo

Una fila por mes a **nivel centro**: Consumo Total Centro (kWh), Peak Máx Centro (kW), Demanda Punta, % Punta, Promedio Diario, Local con Mayor Consumo.

Uso: **vista ejecutiva** del centro (no detalle por local); sirve para dashboards de facturación por centro.

---

## Cómo se organiza la data (resumen)

- **Granularidad para factura/cobros**: **Centro → Mes → Local (medidor)**.
- **Identificadores**: Ubicación (centro), ID Medidor (coincide con meter_id del docx/CSV), Tipo Local, Nombre Local.
- **Montos para cobro**: Consumo Energía ($kWh), Cargo Fijo ($), Total Neto ($), IVA ($), **Total con IVA ($)** = lo facturado.
- **Año**: 2025 en el nombre del archivo; dentro del Excel, Mes/N° Mes definen el período.

El .docx explica el origen de los datos (medidores, centros, locales); los XLSX de porCargar son el **resultado agregado para facturación y visualización de cobros** por centro, local y mes.

# POWER Digital — Especificacion Modulos rev2.1 (Resumen)

Fuente: `docs/POWER_Digital_Especificacion_Modulos-rev2.1 (1).xlsx` — 7 hojas, 306 filas totales.

---

## 1. Roles y Permisos (61 filas)

### 1.1 Definicion de Roles

| Rol | Nombre Sistema | Alcance | Auth | Sesion Max |
|-----|---------------|---------|------|------------|
| Super Admin | `SUPER_ADMIN` | Todos los tenants, edificios, configuraciones globales | SSO Azure AD + MFA obligatorio | 30 min |
| Admin Corporativo | `CORP_ADMIN` | Todos los edificios del tenant (portafolio completo) | SSO Azure AD + MFA obligatorio | 15 min |
| Admin de Edificio | `SITE_ADMIN` | Solo edificio(s) asignado(s) | SSO Azure AD + MFA | 15 min |
| Operador Tecnico | `OPERATOR` | Edificio(s) asignado(s), solo vistas tecnicas | SSO Azure AD | 30 min |
| Analista | `ANALYST` | Edificio(s) o portafolio segun asignacion, solo lectura | SSO Azure AD | 30 min |
| Locatario | `TENANT_USER` | Solo su local/unidad dentro del edificio | Email + password + MFA opcional | 60 min |
| Auditor | `AUDITOR` | Segun asignacion, solo lectura | SSO Azure AD + MFA obligatorio | 15 min |

### 1.2 Matriz de Permisos por Modulo

| Modulo / Accion | Super Admin | Corp Admin | Site Admin | Operador | Analista | Locatario | Auditor |
|-----------------|-------------|------------|------------|----------|----------|-----------|---------|
| **DASHBOARD EJECUTIVO** | | | | | | | |
| Ver dashboard portafolio | CRUD | R | — | — | R | — | R |
| Ver dashboard por edificio | CRUD | R | R | — | R | — | R |
| Ver KPIs consolidados | CRUD | R | R | — | R | — | R |
| **DASHBOARD TECNICO** | | | | | | | |
| Monitoreo real-time | CRUD | R | R | R | R | — | R |
| Drill-down a circuito | CRUD | R | R | R | R | — | R |
| Gestionar alertas (ACK/resolver) | CRUD | R | CRU | CRU | — | — | R |
| **FACTURACION** | | | | | | | |
| Configurar tarifas | CRUD | R | CRU | — | R | — | R |
| Generar factura | CRUD | R | CRU | — | — | — | R |
| Aprobar factura | CRUD | CRU | CRU | — | — | — | R |
| Ver factura propia | — | — | — | — | — | R | — |
| Ver energia exportada/generacion | CRUD | R | R | — | R | R (propia) | R |
| **REPORTES** | | | | | | | |
| Generar/exportar reportes | CRUD | CRU | CRU | R | CRU | — | R |
| Ver reporte ESG | CRUD | R | R | — | R | — | R |
| Ver reporte de su local | — | — | — | — | — | R | — |
| Ver tipo medidor (Mono/Trifasico) | CRUD | R | R | R | R | — | R |
| Ver estado breaker/proteccion (DI) | CRUD | R | R | R | — | — | R |
| **ALERTAS** | | | | | | | |
| Configurar umbrales/reglas | CRUD | R | CRU | — | — | — | R |
| Recibir alertas | CRUD | R | R | R | — | R (propias) | R |
| Escalar/resolver alertas | CRUD | R | CRU | CRU | — | — | R |
| **ADMINISTRACION** | | | | | | | |
| Gestionar usuarios | CRUD | CRU | CRU (su edificio) | — | — | — | R |
| Gestionar edificios/sites | CRUD | R | R | — | — | — | R |
| Gestionar medidores/dispositivos | CRUD | R | CRU | R | — | — | R |
| Configurar tenant | CRUD | — | — | — | — | — | — |
| **DIAGNOSTICO INFRAESTRUCTURA** | | | | | | | |
| Ver mapa bus Modbus RTU | CRUD | R | R | R | — | — | R |
| Ver historial fallos/mantenimiento | CRUD | R | R | R | R | — | R |
| **AUDITORIA** | | | | | | | |
| Ver logs de auditoria | CRUD | R | R (su edificio) | — | — | — | R |
| Exportar logs | CRUD | R | — | — | — | — | R |
| **INTEGRACIONES** | | | | | | | |
| Configurar APIs/Datalake | CRUD | R | — | — | — | — | R |
| Ver estado integraciones | CRUD | R | R | R | — | — | R |

Leyenda: **CRUD** = acceso completo | **CRU** = sin eliminar | **R** = solo lectura | **—** = sin acceso

---

## 2. Modulos - Resumen (52 filas)

10 modulos (M01-M10) con submodulos, tipo UI, graficos, tablas, filtros, roles y fase de implementacion.

### M01 — Login / Autenticacion (Alpha)
- Pantalla login SSO Azure AD
- Seleccion de contexto (edificio/portafolio)
- MFA segundo factor (Beta)

### M02 — Dashboard Ejecutivo (Beta/Core)
- **Vista Portafolio**: barras apiladas consumo, dona costo, linea tendencia mensual
- **Vista por Edificio**: consumo diario, gauge FP, barras demanda, heatmap horario
- **Comparativo entre edificios** (Core): barras kWh/m2, scatter, radar multi-KPI

### M03 — Dashboard Tecnico (Alpha/Beta/Core)
- **Monitoreo Tiempo Real** (Alpha): gauges V/I/kW/FP, streaming 4h, semaforos estado
- **Drill-down Jerarquico 5 niveles** (Alpha): treemap, barras por circuito
- **Estado Dispositivos IoT** (Alpha): dona online/offline, timeline desconexiones
- **Analisis de Demanda** (Beta): linea 15min, referencia contratada, heatmap horario
- **Calidad de Energia** (Core): THD por fase, FP instantaneo, armonicos
- **Tipo Medidor Mono/Trifasico + Estado Breaker** (Beta): badge tipo, semaforo DI
- **Generacion/Exportacion Energia** (Beta): gauge kW, linea import/export, semaforo modo
- **Mapa Bus Modbus RTU** (Beta): arbol concentrador > bus > medidores, errores CRC
- **Historial Fallos y Mantenimiento** (Core): timeline eventos, MTBF/MTTR
- **Diagnostico Concentrador** (Beta): estado PAC4220/S7-1200, MQTT, firmware

### M04 — Facturacion Energetica (Beta)
- Configuracion tarifaria (bloques horarios, cargos)
- Generacion de factura (workflow con pre-factura)
- Aprobacion de facturas
- Historial de facturacion
- Portal locatario (mi factura)

### M05 — Centro de Alertas (Alpha/Beta/Core)
- Panel alertas activas (dona severidad, timeline 24h)
- Detalle de alerta (linea variable + umbral)
- Configuracion de reglas
- Historial y SLA (tendencia mensual, tiempo medio resolucion)

### M06 — Reportes (Beta/Core)
- Ejecutivo, Consumo Detallado, Demanda, Facturacion
- SLA/Disponibilidad, ESG/Huella de Carbono, Benchmarking
- Inventario, Alertas/Compliance
- Formatos: PDF, Excel, CSV. Programacion automatica por email.

### M07 — Administracion (Alpha/Beta)
- Usuarios, Edificios/Sites, Medidores, Locatarios
- Configuracion del Tenant
- Jerarquia del Edificio (tree editor visual)

### M08 — Auditoria y Logs (Beta)
- Log de actividades, cambios de configuracion, accesos

### M09 — Integraciones (Core)
- Estado de conexiones, configuracion API/Datalake, log de sincronizacion

### M10 — Analitica Avanzada (Core)
- Benchmarking entre edificios
- Tendencias y proyeccion (linea historica + proyeccion)
- Patrones y anomalias (heatmap, cluster, deteccion)

---

## 3. Filtros Detallados (36 filas)

### Filtros Globales (Header)

| Filtro | Componente UI | Seleccion | Default | Comportamiento |
|--------|--------------|-----------|---------|----------------|
| Edificio | Dropdown con search | Single | Primer edificio del usuario | Recarga todos los datos. Persiste entre navegaciones. |
| Periodo rapido | Segmented control | Single | 30d | Presets: Hoy/7d/30d/90d/12m/Personalizado |
| Rango de Fechas | Date range picker | Rango | Ultimos 30 dias | Max 730 dias. Formato dd/mm/aaaa |

### Filtros por Modulo (destacados)

| Modulo | Filtro | Componente | Notas |
|--------|--------|-----------|-------|
| Dash. Ejecutivo | Edificios comparativo | Multi-select chips | Min 2, max 10 |
| Dash. Ejecutivo | Metrica | Dropdown | kWh/kWh-m2/kW peak/FP/Costo/Costo-m2 |
| Dash. Ejecutivo | Granularidad | Segmented | Diario/Semanal/Mensual |
| Dash. Tecnico | Nivel Jerarquia | Breadcrumb clickeable | 5 niveles drill-down |
| Dash. Tecnico | Variable electrica | Dropdown con iconos | kWh/kW/kVArh/FP/V/A/THD/armonicos/freq |
| Dash. Tecnico | Medidor especifico | Dropdown + status | Indicador verde/rojo |
| Dash. Tecnico | Auto-refresh | Toggle + intervalo | 5s/15s/30s/60s/Off |
| Dash. Tecnico | Tipo de Medidor | Segmented/Chips | Todos/Monofasico/Trifasico |
| Dash. Tecnico | Modo Energia | Toggle/Segmented | Import/Export/Balance Neto |
| Dash. Tecnico | Concentrador | Dropdown + chips | PAC4220/S7-1200/Todos |
| Dash. Tecnico | Bus RS-485 | Dropdown | Depende de concentrador |
| Dash. Tecnico | Estado Integridad Bus | Chips coloreados | OK/Advertencia/Error |
| Facturacion | Periodo | Month picker | Ultimo ciclo cerrado |
| Facturacion | Estado factura | Chips/Tags | Borrador/Pendiente/Aprobada/Enviada/Pagada/Anulada |
| Alertas | Severidad | Chips coloreados | Critica/Alta/Media/Baja con contadores |
| Alertas | Tipo alerta | Dropdown agrupado | 11 tipos en grupos colapsables |
| Alertas | Estado | Segmented | Activas/ACK/Resueltas/Todas |
| Reportes | Tipo reporte | Card selector visual | 9 tipos con icono |
| Reportes | Formato | Radio buttons | PDF/Excel/CSV |
| Administracion | Busqueda global | Search input | Debounce 300ms, min 3 chars |
| Auditoria | Rango datetime | DateTime range picker | Precision al minuto |

---

## 4. Graficos y Visualizaciones (28 filas)

### Por Libreria Sugerida

**Recharts** (mayoria):
- Barras apiladas consumo por edificio
- Dona distribucion costo
- Linea tendencia mensual / consumo diario
- Radar multi-KPI
- Barras por circuito (horizontales)
- Linea demanda 15min + referencia
- Dona severidad alertas
- Barras tiempo resolucion
- Barras consumo por locatario
- Barras + linea consumo mensual locatario
- Ranking kWh/m2
- Proyeccion demanda + area confianza

**D3.js**:
- Heatmap consumo horario (hora x dia semana)
- Treemap consumo jerarquico (drill-down)
- Heatmap semanal demanda
- Timeline alertas 24h
- Heatmap patrones consumo

**Custom SVG**:
- Gauge semicircular factor potencia (zonas rojo/amarillo/verde)
- Gauges circulares variables (V, I, kW, FP, Hz)
- Semaforo estado breaker (DI)

**D3.js / uPlot**:
- Linea streaming ultimas 4h (sliding window, auto-scroll)

**Recharts + Custom**:
- Flujo energia import/export + semaforo modo

**Custom Badge**:
- Badge tipo medidor (azul=Mono, morado=Tri)

### Interactividad Comun
- Hover tooltip con desglose
- Click para navegar/filtrar
- Toggle visibilidad series en leyenda
- Zoom drag horizontal
- Auto-scroll en streaming (pause al hover)

---

## 5. Datos y Campos (61 filas)

### Tabla Resumen Edificios (Dashboard Ejecutivo)

| Campo | Tipo | Formato | Fuente |
|-------|------|---------|--------|
| Nombre Edificio | String | Texto + link | `sites.name` |
| kWh Total Periodo | Decimal | #,##0.0 kWh | SUM(readings.kwh_active) |
| kW Demanda Maxima | Decimal | #,##0.0 kW | MAX(readings.kw_demand) |
| Factor Potencia Prom. | Decimal | 0.00 | AVG(readings.power_factor) |
| Costo Estimado | Integer | $ #,##0 | kWh * tarifa_vigente |
| kWh/m2 | Decimal | #0.0 | kWh / sites.area_m2 |
| Alertas Activas | Integer | #0 + badge color | COUNT(alerts WHERE active) |
| Estado | Enum | Badge Normal/Alerta/Critico | basado en alertas criticas |

### Tabla Medidores (Dashboard Tecnico)

| Campo | Tipo | Formato | Fuente |
|-------|------|---------|--------|
| ID Medidor | String | Monoespaciado | `meters.external_id` |
| Modelo | String | Texto | `meters.model` |
| Ubicacion | String | Breadcrumb | hierarchy path |
| IP | String | xxx.xxx.xxx.xxx | `meters.ip_address` |
| Ultima Lectura | Datetime | dd/mm/aaaa HH:mm:ss | MAX(readings.timestamp) |
| Estado Conexion | Enum | Badge Online/Offline/Error | ultima lectura < 5min |
| Uptime % | Decimal | 0.0% + barra | tiempo_online / total * 100 |
| kWh Acumulado | Decimal | #,##0.0 kWh | readings.kwh_active |
| **Tipo Medidor** | Enum | Badge Mono/Trifasico | `meters.meter_type` |
| **Estado Breaker (DI)** | Enum | Semaforo Cerrado/Abierto | `meters.di_status` |
| **kWh Exportado** | Decimal | #,##0.0 kWh | `readings.kwh_export` |
| **Via Uplink** | Enum | Badge ruta | `meters.uplink_route` |
| **Direccion Modbus** | Integer | 1-247 | `meters.modbus_address` |
| **Bus RS-485** | String | ID concentrador + N bus | `meters.bus_id` |
| **N Serie** | String | S/N fabricante | `meters.serial_number` |
| **Estado DO** | Enum | Semaforo Activa/Inactiva/Error | `meters.do_status` |
| **Errores CRC** | Integer | #0 (rojo si >0) | `meters.crc_errors_last_poll` |

### Tabla Pre-factura

| Campo | Tipo | Formato |
|-------|------|---------|
| Locatario | String | Nombre + N local |
| Medidor | String | ID medidor |
| kWh Consumo | Decimal | #,##0.0 |
| kW Demanda Max | Decimal | #,##0.0 |
| kVArh Reactiva | Decimal | #,##0.0 |
| Cargo Energia | Integer | $ #,##0 |
| Cargo Demanda | Integer | $ #,##0 |
| Cargo Reactiva | Integer | $ #,##0 |
| Cargo Fijo | Integer | $ #,##0 |
| Total Neto | Integer | $ #,##0 (bold) |
| IVA | Integer | $ #,##0 |
| Total | Integer | $ #,##0 (bold, green) |
| Estado | Enum | Badge color |
| **kWh Exportado** | Decimal | #,##0.0 (verde si >0) |
| **Balance Neto** | Decimal | #,##0.0 (negativo = entrega neta) |

### Tabla Alertas

| Campo | Tipo | Formato |
|-------|------|---------|
| ID | String | ALR-XXXX |
| Tipo | Enum | Badge + icono (11 tipos) |
| Severidad | Enum | Badge Critica/Alta/Media/Baja |
| Edificio | String | Nombre |
| Medidor/Circuito | String | ID + ubicacion |
| Mensaje | String | Truncado 80 chars |
| Fecha/Hora | Datetime | dd/mm/aaaa HH:mm |
| Estado | Enum | Badge Activa/ACK/Resuelta |
| Asignado a | String | Nombre + avatar |
| Tiempo Abierta | Duration | Xh Xm (o Xd si >24h) |

### Tabla Auditoria

| Campo | Tipo | Formato |
|-------|------|---------|
| Timestamp | Datetime | dd/mm/aaaa HH:mm:ss.SSS |
| Usuario | String | Nombre + email |
| Rol | Enum | Badge |
| Accion | Enum | Verbo + color |
| Recurso | String | Tipo + ID |
| IP Origen | String | xxx.xxx.xxx.xxx |
| Detalle | JSON | Expandible (click para ver diff) |

---

## 6. Tipos de Alertas (26 filas)

22 tipos organizados en 4 categorias. Cada alerta define: umbral, severidad, escalamiento (L1 > L2 > L3), canal de notificacion, frecuencia de check y guia de accion por rol.

### Comunicacion (5 alertas)

| # | Tipo | Umbral Default | Severidad | Frecuencia |
|---|------|---------------|-----------|------------|
| 1 | Perdida de Comunicacion | Sin lectura >5 min | Critica | 1 min |
| 2 | Timeout/Error Modbus RTU | Latencia >5000ms x3 consecutivas | Alta | Cada lectura |
| 17 | Error Bus Modbus (CRC/Colision/Dir Duplicada) | CRC >5 en 15min / colision = critico | Alta/Critica | 15 min |
| 18 | Fallo Concentrador (PAC4220 / S7-1200) | Sin heartbeat >5 min (todos medidores del bus) | Critica | 1 min |
| 19 | Fallo Modulo MQTT / PLC S7-1200 | Perdida sesion MQTT >3 min / >5 reconexiones en 1h | Alta | 1 min |

### Electrica (5 alertas)

| # | Tipo | Umbral Default | Severidad | Frecuencia |
|---|------|---------------|-----------|------------|
| 3 | Sobretension | V >110% nominal | Critica | Cada lectura |
| 4 | Subtension | V <90% nominal | Alta | Cada lectura |
| 5 | THD Aviso | THD-V >3% o THD-I >8% | Media | 15 min |
| 6 | THD Critico | THD-V >8% o THD-I >20% | Alta | 15 min |
| 15 | Sobrecorriente en Fase | I >110% nominal (alta) / >125% (critica) | Alta/Critica | 15 min |
| 16 | Desequilibrio de Fases | Tension >2% (aviso) / >5% (critico) | Media/Alta | 15 min |

### Consumo (4 alertas)

| # | Tipo | Umbral Default | Severidad | Frecuencia |
|---|------|---------------|-----------|------------|
| 7 | Sobreconsumo | >130% promedio historico (misma hora/dia) | Alta | 1 hora |
| 8 | Peak Demand | kW >90% contratada (alta) / >100% (critica) | Alta/Critica | 1 min |
| 9 | Factor Potencia Bajo | FP <0.93 (alta) / <0.85 (critica) | Alta/Critica | 15 min |
| 14 | Exportacion Detectada | kWh_export >0 | Baja/Media | 15 min |

### Operativa (8 alertas)

| # | Tipo | Umbral Default | Severidad | Frecuencia |
|---|------|---------------|-----------|------------|
| 10 | Medidor Offline Prolongado | Sin lectura >60 min | Alta | 15 min |
| 11 | Bateria Baja (concentrador) | <20% (media) / <5% (alta) | Media/Alta | 30 min |
| 12 | Calibracion Requerida | Desviacion >2% o >12 meses | Baja | Diario |
| 13 | Disparo Breaker (DI) | DI=1 (Abierto) >30s | Critica | 15s-1min |
| 20 | Corte Total Suministro | >70% medidores offline en 2 min | Critica | 2 min |
| 21 | Fallo Salida Digital (DO) | Estado DO != comando >10s | Alta | 15s-1min |
| 22 | Error Autodiagnostico PAC | Bit error activo en registro diagnostico | Media/Alta | 15 min |

### Escalamiento Tipico
- **L1** (Operador/Tecnico): inmediato a 1h
- **L2** (Site Admin): 10 min a 24h segun severidad
- **L3** (Corp Admin/Proveedor): 1h a 1 semana

### Canales de Notificacion
- **Critica**: Email + WhatsApp + Push + SMS
- **Alta**: Email + WhatsApp + Push
- **Media**: Email + Push
- **Baja**: Email

---

## 7. Navegacion (42 filas)

### Estructura Menu Lateral

```
Dashboard (■)
├── Ejecutivo - Portafolio     /dashboard/executive
├── Ejecutivo - Edificio       /dashboard/executive/:siteId
└── Comparativo                /dashboard/compare

Monitoreo (⚡)
├── Tiempo Real                /monitoring/realtime
├── Drill-down Jerarquico     /monitoring/drilldown/:siteId
├── Dispositivos IoT           /monitoring/devices
├── Analisis de Demanda        /monitoring/demand/:siteId
├── Calidad de Energia         /monitoring/quality/:siteId
├── Tipo de Medidores          /monitoring/meters/type              [Rev 2.1]
├── Generacion/Exportacion     /monitoring/generation/:siteId       [Rev 2.1]
├── Mapa Bus Modbus RTU        /monitoring/modbus-map/:siteId       [Rev 2.1]
├── Historial Fallos           /monitoring/fault-history/:meterId   [Rev 2.1]
└── Diagnostico Concentrador   /monitoring/concentrator/:id         [Rev 2.1]

Facturacion (○)
├── Configuracion Tarifaria    /billing/rates
├── Generar Factura            /billing/generate
├── Aprobar Facturas           /billing/approve
├── Historial                  /billing/history
└── Mi Factura (Locatario)     /billing/my-invoice

Alertas (▲)
├── Panel Alertas              /alerts
├── Configuracion Reglas       /alerts/rules
└── Historial / SLA            /alerts/history

Reportes (►)
├── Centro de Reportes         /reports
└── Reportes Programados       /reports/scheduled

Analitica (◆)
├── Benchmarking               /analytics/benchmark
├── Tendencias y Proyeccion    /analytics/trends
└── Patrones y Anomalias       /analytics/patterns

Administracion (⚙)
├── Usuarios                   /admin/users
├── Edificios                  /admin/sites
├── Medidores                  /admin/meters
├── Locatarios                 /admin/tenants-units
├── Jerarquia Electrica        /admin/hierarchy/:siteId
└── Configuracion Tenant       /admin/tenant-config

Auditoria (●)
├── Log de Actividades         /audit/activities
├── Log de Cambios             /audit/changes
└── Log de Accesos             /audit/access

Integraciones (↔)
├── Estado Conexiones          /integrations/status
├── Configuracion APIs         /integrations/config
└── Log de Sincronizacion      /integrations/sync-log
```

---

## Notas Rev 2.1

Campos, permisos y alertas nuevos agregados en esta revision:

1. Identificacion tipo medidor Monofasico/Trifasico
2. Estado breaker/proteccion por entradas digitales (DI) del edge
3. Monitoreo energia exportada/generacion con semaforo visual
4. Variables por fase L1/L2/L3 para trifasico (kWh import/export T1/T2, kvarh, V, I, kW, kvar, FP, Hz)
5. Alertas #13-#22 (Disparo Breaker, Exportacion, Sobrecorriente, Desequilibrio, Error Bus, Fallo Concentrador, Fallo MQTT, Corte Total, Fallo DO, Autodiagnostico PAC)
6. Mapa Bus Modbus RTU con inventario por concentrador
7. Historial de fallos y mantenimiento con MTBF/MTTR
8. Diagnostico de concentrador (PAC4220 / S7-1200)

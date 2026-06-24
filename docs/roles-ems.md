# Roles EMS — Especificación de Perfiles

## Índice

1. [Perfil 1 — Gerencial](#perfil-1--gerencial)
2. [Perfil 2 — Operacional](#perfil-2--operacional)
3. [Perfil 3 — Técnico](#perfil-3--técnico)
4. [Perfil 4 — Auditor](#perfil-4--auditor)
5. [Perfil 5 — Súper-administrador (proveedor)](#perfil-5--súper-administrador-proveedor)

---

## Sistema de colores de estado (global, todos los niveles)

| Color | Significado |
|-------|-------------|
| Verde | Operación normal, sin alarmas activas, medición en tiempo real disponible |
| Amarillo/Ámbar | Alerta activa nivel warning (sobreconsumo leve, calidad degradada, fase desbalanceada) |
| Rojo | Alarma crítica activa (sobrecarga transformador, medidor offline >4h, sobreconsumo severo) |
| Gris | Sin datos disponibles en el período / medidor offline sin alarma activa |

---

## Perfil 1 — Gerencial

### Navegación jerárquica (3 niveles progresivos, sin abandonar pantalla principal)

| Nivel | Vista | Descripción |
|-------|-------|-------------|
| 1 | Vista país | Mapa del país (Chile/Perú/Colombia) con marcador por centro comercial. Color por estado energético. |
| 2 | Vista mall | Click en marcador → panel derecho con KPIs del mall y plano esquemático con pisos seleccionables. |
| 3 | Vista planta/piso | Plano del nivel con zonas/tiendas como bloques coloreados por estado energético en tiempo real. Solo lectura. |

### Pantallas del perfil gerencial

#### 1. Panel consolidado

**Propósito:** Landing al entrar. Estado del portafolio en <3 segundos (ARQ-07). Layout dos columnas.

**Selector de país** (barra superior): Chile / Perú / Colombia. Persiste durante sesión. Contexto geográfico global.

**Nivel 1 — Columna izquierda (Mapa geográfico):**
- Mapa satelital oscuro con marcador circular por centro comercial (ubicación real).
- Color del marcador según sistema de estados. Tamaño proporcional al consumo del período.
- Hover: tooltip con nombre mall, consumo actual [kW], variación % vs día anterior, nº alarmas activas.
- Click: activa vista detalle del mall en columna derecha (Nivel 2).
- Filtros del mapa:
  - Colorear por: estado de alarma (defecto) / consumo actual [kW] / variación consumo % / cobertura medición %.
  - Mostrar solo: todos (defecto) / alarma crítica activa / alerta warning activa / sin datos.
- Debajo del mapa: sparkline barras demanda últimas 24h + lista eventos críticos recientes (mall, descripción, tiempo transcurrido).

**Nivel 1 — Columna derecha (KPIs portafolio, sin mall seleccionado):**
- 4 tarjetas métricas (grilla 2×2):
  - Demanda agregada actual [MW] — variación % vs mismo momento día anterior.
  - Consumo acumulado del período [MWh] — variación % vs período anterior.
  - Costo acumulado del período [UF] — variación % vs período anterior.
  - Malls activos / total del portafolio — nº alertas críticas activas.

**Nivel 2 — Columna derecha (Detalle mall seleccionado):**
- Encabezado: nombre mall, país, hora local. Breadcrumb [País] → [Nombre del mall].
- 3 tarjetas métricas en fila:
  - Carga total actual [kW] — mini sparkline últimas 2h.
  - Voltaje promedio [V] — mini sparkline + rango min/max del día.
  - Tiendas/zonas en alarma — número con ícono alerta si >0.
- Indicadores circulares (gauges):
  - Voltaje actual [V] con rango normal (ej. 340–360V) en arco de color.
  - Corriente actual [A] con rango máximo.
  - Potencia activa [kW].
- Feed alertas en vivo del mall: últimas 4–5 alertas activas con severidad (URGENT/WARNING/INFO en badge color), hora, descripción, zona afectada. **Solo lectura** en perfil gerencial.
- Selector de piso: tabs P1/P2/P3/… Cada tab muestra indicador color si hay alarma activa en ese piso.

**Nivel 3 — Vista de planta/piso (al seleccionar un piso):**
- Ocupa columna central/izquierda reemplazando mapa geográfico.
- Plano esquemático: zonas/tiendas como bloques rectangulares/polígonos con nombre interior. Color por estado energético.
- Hover: tooltip con nombre tienda, consumo actual [kW], tipo y hora última alarma activa.
- **Solo lectura** — click en bloque no navega a acción.
- Zoom in/out con rueda mouse o gestos touch.
- Selector modo coloreo:
  - Por estado de alarma (defecto): verde/amarillo/rojo/gris.
  - Por intensidad de consumo: escala calor (azul→amarillo→rojo) según kWh/m².
  - Por variación de consumo: verde si baja, rojo si sube vs día anterior.
- Filtros:
  - Período de referencia: tiempo real / hoy / esta semana / este mes.
  - Mostrar solo zonas con: todas (defecto) / alarma activa / consumo sobre umbral.

---

#### 2. Consumo (jerárquico)

**Propósito:** Análisis drill-down del consumo desde portafolio hasta zona/piso. Mapa geográfico como punto de entrada. (DAT-11, DAT-22)

**Filtros globales (barra superior):**
- País: Chile / Perú / Colombia / Todos (multi-selección).
- Período: Mes actual / Trimestre actual / Año en curso / Últimos 12 meses / Rango personalizado (date picker). Defecto: mes actual.
- Métrica principal: Consumo [MWh] / Costo [UF] / Intensidad energética [kWh/m²] / Demanda máxima [kW]. Rige mapa + gráficos + tabla. (DAT-28)
- Granularidad temporal: Mensual / Semanal. Aplica a gráficos de tendencia.

**Panel izquierdo — Mapa geográfico:**
- Misma lógica que Panel consolidado pero marcadores coloreados por valor de métrica seleccionada (no por alarma). Escala de intensidad del color proporcional al valor. Tamaño proporcional al valor relativo del mall.
- Click marcador → drill-down en panel central/derecho.

**Panel central — Árbol jerárquico de consumo:**

Cuando no hay mall seleccionado (nivel portafolio/país):
- Lista de malls con columnas, coloreados por estado de alarma.

Al expandir/click en mapa (nivel mall):
- Fila expandida con gráfico tendencia: línea período seleccionado vs mismo período año anterior (comparación estacional — DAT-08).
- Tabla remarcadores del mall: ID, zona/piso, consumo [MWh], % del total mall, último valor leído, estado (activo/offline/CNR/estimado).

Al expandir mall (nivel zona/piso):
- Listado zonas: nombre, consumo [MWh], % del mall, variación % vs período anterior, estado medidor.
- Opción "Ver planta" → plano esquemático (misma lógica Panel consolidado Nivel 3).

**Filtros adicionales:**
- Ordenar malls por: consumo (mayor a menor) / costo / variación % (más críticos primero) / nombre.
- Mostrar solo: todos / con alarma crítica / con variación >X% (umbral configurable) / sin datos completos.
- Comparar con: período anterior / mismo período año anterior / promedio del portafolio.

---

#### 3. Costos y tendencias

**Propósito:** Vista financiera del consumo para control de gestión y proyecciones. (FIN-07, DAT-22)

**Filtros globales:**
- País: Chile / Perú / Colombia / Todos.
- Mall: multi-selección con buscador. Defecto: todos.
- Período: Mes actual / Trimestre actual / Año en curso / Últimos 12 meses / Rango personalizado.
- Moneda: UF / CLP / USD / PEN / COP. Conversión usa tipo cambio último día disponible (con fecha). (DAT-22)
- Agrupación de gráficos: Por país / Por mall / Por tipología de mall.

**Gráfico barras apiladas mensual (panel superior):**
- Eje Y: costo en moneda seleccionada. Barras apiladas por país o mall.
- Línea superpuesta eje Y secundario: precio medio energía [UF/MWh] (separa efecto precio vs volumen).
- Hover: tooltip con desglose costo por componente (energía/potencia/distribución) y nombre.
- Últimos 2 meses: cifras proyectadas con trama diferente.

**Análisis de variación — Waterfall chart (panel central):**
- Descompone variación costo total entre período anterior y actual: cambio volumen consumo / cambio precio energía / cambio mix malls / otros.
- Barras verdes = reducción, rojas = incremento.
- Aparece cuando hay datos de comparación disponibles.

**Tabla de costos por centro comercial (panel inferior):**
- Columnas: mall, país, consumo [MWh], precio medio [UF/MWh], costo total [UF o moneda], variación vs período anterior [%], proyección cierre mes [UF], proyección cierre año [UF].
- Filtros: ordenar por cualquier columna, mostrar solo variación >umbral, buscador por nombre.
- Exportación: botón "Exportar tabla" → CSV o Excel con datos filtrados.

---

#### 4. Reportes ejecutivos

**Propósito:** Generación y descarga de reportes para comités y directorio. (FIN-07, DAT-28)

**Configurador de reporte (panel izquierdo):**
- Alcance geográfico: Portafolio completo / País / Mall específico (con buscador). Portafolio → sección por país con resumen malls.
- Período: Mes / Trimestre / Año / Rango personalizado (hasta 5 años atrás — DAT-08).
- Comparación: vs período anterior / vs mismo período año anterior / sin comparación.
- Secciones a incluir (checkboxes): KPIs ejecutivos / Tendencia consumo / Ranking malls / Análisis costos / Calidad dato / Resumen alarmas / Mapa cobertura. Defecto: todas activadas.
- Métrica principal del reporte: Consumo / Costo / Intensidad (rige orden y énfasis — DAT-28).
- Formato salida: PDF (presentación con gráficos) / PPT (slides editables) / Excel (tablas).
- Idioma: Español / Inglés.

**Vista previa (panel derecho):**
- Thumbnails de páginas a generar. Se actualiza al cambiar filtros.
- Botón "Generar reporte" → generación en background, notifica cuando listo.

**Historial de reportes generados:**
- Tabla: fecha, usuario, alcance, período, formato, estado (generando/listo/error), link descarga.
- Retención mínima archivos: 12 meses (DAT-12). Buscador por fecha o alcance.

---

#### 5. Alarmas agregadas

**Propósito:** Resumen ejecutivo del estado de alertas del portafolio — sin detalle técnico de medidores. Vista de gestión, no de operación. (DAT-03, DAT-27)

**Filtros globales:**
- País: Chile / Perú / Colombia / Todos.
- Mall: multi-selección con buscador. Defecto: todos.
- Período: Hoy / Últimas 24h / Últimos 7 días / Últimos 30 días / Rango personalizado.
- Severidad: Todas / Solo críticas / Críticas y altas.
- Estado: Activas / Resueltas / Todas.

**Indicadores cabecera (tiempo real):**
- Total alarmas activas (badge rojo si hay críticas).
- Alarmas críticas activas — variación vs mismo momento ayer.
- Resueltas últimas 24h.
- Tiempo medio resolución del período [h] — indicador si sobre SLA esperado.

**Mapa geográfico alarmas (panel izquierdo):**
- Misma lógica mapa, pero siempre por estado alarma (ignora métrica).
- Click marcador → panel lateral con resumen alarmas del mall (sin detalle técnico medidores).

**Gráfico evolución alarmas — 30 días:**
- Barras apiladas por día: abiertas (rojo) / escaladas (naranja) / resueltas (verde).
- Hover: tooltip conteo exacto por severidad.
- Filtros: ver por severidades / solo críticas / solo warnings. Agrupar por: día (defecto) / semana / mall.

**Top 5 malls con más alarmas activas:**
- Nombre, país, nº críticas, nº warnings, tendencia vs semana anterior (↑↓→). Link "Ver malls" → Consumo jerárquico filtrado.

**Tabla alarmas agrupadas por mall:**
- Columnas: mall, país, críticas activas, warnings activas, resueltas en período, tiempo medio resolución [h], última alarma (hora + descripción).
- Ordenar por: nº críticas (defecto) / nº warnings / tiempo medio / última actividad. Buscador nombre. Exportar: CSV o PDF.
- **No muestra datos de medidores individuales ni localización técnica** — eso es perfil operacional.

---

#### 6. Exportar reportes

**Propósito:** Descarga ad-hoc de datos agregados para análisis externo, presentaciones o respaldo. (DAT-07, DAT-12, FIN-07)

**Configurador exportación:**
- Tipo contenido (multi-selección, ZIP o hojas Excel): Consumos agregados por mall / Costos y facturación / Calidad dato / Cobertura medición / Resumen alarmas.
- Alcance: Portafolio / País / Mall (multi-selección con buscador).
- Período: Mes / Trimestre / Año / Últimos 12 meses / Rango personalizado (máx 5 años — DAT-08).
- Granularidad: Mensual / Semanal. (Datos diarios o inferiores requieren perfil auditor.)
- Formato: PDF ejecutivo (con gráficos) / Excel (tablas) / CSV (solo datos).
- Moneda costos: UF / CLP / USD / PEN / COP.

**Nota:** Solo datos agregados por mall y período. No incluye datos crudos de medidores ni info identificable de locatarios.

**Vista previa:** Tabla resumen de datos a exportar: tipo, alcance, período, nº filas estimadas, tamaño aproximado.

**Cola de exportaciones:** Estado tiempo real (en cola/generando/listo/error). Notificación + link descarga. Historial con link válido 30 días.

**Aviso:** Para datos crudos, trazabilidad individual o paquetes firmados → requiere perfil auditor.

---

## Perfil 2 — Operacional

> Acceso a datos sensibles → **MFA obligatorio**. Escritura sobre gestión de alarmas y tickets. SSO Azure AD.

### Pantallas del perfil operacional

#### 1. Monitoreo en vivo

**Propósito:** Estado en tiempo real del parque de medidores. Pantalla principal del turno. (ARQ-08, DAT-24)

**Indicadores cabecera (actualizados cada 15 min):**

| Indicador | Descripción |
|-----------|-------------|
| Total medidores en portafolio | Conteo total |
| Total medidores en línea (%) | Porcentaje online |
| Total medidores offline | Conteo offline |
| Total con dato estancado >4h | DAT-24 |
| Total CNR pendientes | Cambios No Registrados |

**Mapa/grilla de centros comerciales:**
- Tarjeta por mall: nombre, país, % medidores online, última lectura, semáforo general.
- Click → grilla medidores del mall: serial, zona, estado, último valor, timestamp, variación vs día anterior.

**Histograma comportamiento parque (últimas 24h):**
- % medidores online por hora — detecta caídas masivas/parciales.

**Feed eventos recientes:**
- Lista cronológica: medidor offline, alarma abierta, backfill completado, CNR ingresada — con timestamp y mall.

---

#### 2. Alarmas y eventos

**Propósito:** Gestión operativa de alarmas. Lista accionable, priorizada. (DAT-03, DAT-27)

**Filtros cabecera:** Severidad (crítica/alta/media/baja) | Mall | País | Estado (abierta/asignada/escalada/resuelta) | Rango fecha.

**Lista alarmas (tabla principal):**
- Columnas: ID, severidad (badge color), descripción, mall, zona/medidor, fecha apertura, tiempo transcurrido, responsable, estado.
- Ordenada por severidad + antigüedad.
- Fila expandible: valor que disparó alarma, baseline esperado, historial acciones.

**Panel detalle alarma (al seleccionar fila):**
- Gráfico serie temporal medidor últimas 48h con línea de threshold.
- Botones acción: Asignar a mí / Asignar a otro / Escalar / Cerrar / Iniciar backfill automático (DAT-10).
- Campo comentario libre (pista auditoría — DAT-14, DAT-23).

**Resumen SLA alarmas:**
- % resueltas dentro/fuera SLA, por severidad y período (FIN-06).

---

#### 3. Tickets y SLA

**Propósito:** Seguimiento tickets propios y estado SLA contractual. (FIN-05, FIN-06)

**Semáforo SLA permanente (cabecera):**
- Uptime servicio (30 días) | Disponibilidad datos (%) | Tiempo medio resolución alarmas críticas [h] con umbral alerta visual.

**Tablero tickets:**
- Columnas: ID, descripción, tipo (alarma/CNR/solicitud), prioridad, fecha apertura, fecha compromiso SLA, estado, días restantes/vencidos.
- Filtro rápido: mis tickets / todos / por vencer / vencidos.

**Gráfico evolución SLA (últimos 3 meses):**
- Línea uptime real vs umbral contratado. Puntos incidente marcados.

**Historial penalizaciones SLA:**
- Tabla períodos con incumplimiento, causa raíz, crédito aplicado (FIN-06).

---

#### 4. Calidad y backfill

**Propósito:** Control proceso backfill y calidad datos por mall. (DAT-06, DAT-10, DAT-17)

**Scorecard calidad por mall:**
- Tabla: mall, % lecturas reales, % estimadas, % CNR, % backfill completado, tendencia (↑↓) — semáforo por fila.

**Panel backfill activo:**
- Lista procesos en curso: medidor, tipo gap (comunicación/sensor/configuración), período a reponer, % completado, ETA.
- Botón backfill manual en medidor específico.

**Histograma calidad dato (últimos 30 días):**
- Área apilada: real / estimado / CNR / faltante por día.

**Alertas degradación calidad:**
- Medidores con % lecturas reales bajando en últimos 7 días → lista con delta y causa.

---

#### 5. CNR pendientes

**Propósito:** Lista de Cambios No Registrados pendientes de resolver. (DAT-20)

**Indicadores cabecera:** Total CNR abiertas | con >7 días sin resolución | ingresadas hoy.

**Tabla CNR:**
- Columnas: ID, medidor, mall, período afectado, tipo (manual/automático), responsable, fecha ingreso, estado (pendiente/en revisión/aprobada/rechazada), valor estimado [kWh].
- Fila expandible: detalle ingreso, justificación, historial cambios estado.

**Acciones:** Asignar responsable / Cambiar estado / Agregar comentario / Exportar seleccionadas CSV.

---

#### 6. Mapa de cobertura

**Propósito:** Vista geográfica del estado parque medidores por recinto. (ARQ-08, Anexo 06)

**Mapa interactivo:**
- Marcadores por mall: verde (>95% online), amarillo (85–95%), rojo (<85% o alarma crítica).
- Click marcador: popup con nombre, país, % online, alarmas activas, último dato, acceso directo a grilla medidores.

**Panel lateral lista:**
- Malls ordenados por % online ascendente (más problemáticos primero). Buscador por nombre.

**Selector métrica marcador:** online % / alarmas activas / última lectura / calidad dato.

---

## Perfil 3 — Técnico

> Acceso a datos sensibles + escritura sobre maestro medidores → **MFA obligatorio**. SSO Azure AD.

### Pantallas del perfil técnico

#### 1. Mis órdenes

**Propósito:** Órdenes de trabajo asignadas al técnico autenticado. (INT-13, DAT-19)

**Indicadores cabecera:** Órdenes pendientes | en curso | cerradas hoy | vencidas (past SLA).

**Lista órdenes:**
- Columnas: ID, descripción, tipo (mantención/instalación/diagnóstico/CNR), mall, dirección/zona, prioridad, fecha asignación, fecha compromiso, estado.
- Ordenada por prioridad + fecha compromiso.
- Click → detalle completo con contexto técnico del medidor.

**Panel detalle orden:**
- Descripción problema + nivel urgencia.
- Nombre del medidor.
- Historial intervenciones previas en mismo activo (DAT-23).
- Botones: Iniciar / Pausar / Cerrar orden / Registrar intervención (formulario bitácora).

---

#### 2. Medidores / Remarcador

**Propósito:** Catálogo medidores del portafolio — búsqueda, localización, diagnóstico. (INT-14, ARQ-15, Anexo 09)

**Búsqueda y filtros:** Serial, tag, mall, zona, gateway, protocolo, estado. Filtros: país / mall / estado comunicación / tipo medidor / con alarma activa.

**Lista medidores:**
- Columnas: serial, nombre/tag, mall, zona, estado (online/offline/sin dato >4h), último dato, timestamp.

**Ficha medidor (al seleccionar):**
- Identificación: serial, fabricante, modelo, gateway asignado.
- Ubicación física: tipo sala (Anexo 09: Tipo 2/3/4), rack/tablero/posición.
- Estado comunicación: timestamp último dato, nº reintentos recientes, historial disponibilidad últimas 72h (barras 15 min — INT-13, INT-10).
- Serie temporal: últimas 48h con indicación gaps y tipo valor (real/estimado/CNR).
- Historial fallas e intervenciones: timeline con fecha, técnico, descripción, resultado (DAT-23).

---

#### 3. Diagnóstico comms

**Propósito:** Diagnóstico comunicaciones para medidor o gateway específico. (INT-13, INT-10)

**Selector activo:** Buscar por serial medidor o ID gateway.

**Panel diagnóstico:**
- Estado actual: online / offline / intermitente (datos con gaps).
- Último dato: valor, timestamp, tiempo transcurrido.
- Tasa éxito comunicación (últimas 24h): % intentos exitosos, nº reintentos, nº timeouts.
- Histograma disponibilidad (últimas 72h, resolución horaria): verde/rojo por hora.
- Últimos 10 eventos comunicación: fecha, tipo (éxito/timeout/error), código error.

**Herramientas diagnóstico:**
- Ping / test conexión al gateway (si arquitectura lo permite — INT-13).
- Forzar re-intento de lectura.
- Ver log comunicación raw (últimas 100 líneas).

---

#### 4. Reg. intervención (registro de intervención)

**Propósito:** Formulario bitácoras de trabajo en campo — escritura trazada. (DAT-19, DAT-23)

**Formulario:**
- Medidor/activo intervenido (autocompletado desde orden activa o búsqueda manual).
- Tipo intervención: inspección / reemplazo / configuración / reparación / instalación / otra.
- Descripción detallada (texto libre).
- Resultado: solucionado / pendiente piezas / requiere escalación.
- Adjuntos: fotos (máx 5, JPG/PNG), documentos (PDF).
- Firma digital del técnico (DAT-19).
- Checkbox "requiere CNR": pre-llena formulario CNR con datos medidor y período.

**Validaciones:** Campos obligatorios marcados. No se puede enviar sin firma.

**Al guardar:** Registro inmutable con timestamp servidor, usuario, hash integridad (DAT-19).

**Historial intervenciones:** Últimas 30 del usuario autenticado.

---

#### 5. Ingreso CNR manual

**Propósito:** Registro Cambios No Registrados manual por técnico. (DAT-20)

**Formulario:**
- Medidor (búsqueda serial o desde orden).
- Período afectado: fecha/hora inicio — fecha/hora fin.
- Valor real [kWh] (lectura manual o respaldo).
- Motivo CNR: falla comunicación / mantenimiento programado / reemplazo medidor / otro.
- Justificación (texto libre, mín 20 caracteres).
- Evidencia: foto o documento respaldo.
- Firma digital del técnico.

**Validaciones:**
- Valor queda marcado "dato manual — CNR" en todos los dashboards (DAT-20).
- Pista auditoría: usuario, timestamp, valor anterior si existía (DAT-14).
- No se puede retroeditar una vez firmado — solo "en revisión" por perfil operacional.

---

#### 6. Maestro medidores

**Propósito:** Administración inventario medidores — alta, edición, baja. Escritura trazada. (INT-14, ARQ-15)

**Lista maestro:**
- Tabla: serial, tag, mall, zona, protocolo, gateway, estado comms, fecha alta, estado activo (activo/baja/en mantención). Búsqueda y filtros completos.

**Formulario alta/edición:**
- Identificación: serial (único), fabricante, modelo, firmware, protocolo.
- Configuración comunicación: dirección Modbus / IP+puerto / gateway, tiempo muestreo.
- Ubicación: mall, zona, tipo sala (Anexo 09), rack/tablero, descripción ubicación física.
- Factor multiplicación / constante medición (si aplica).

**Cambios estado:**
- En mantención: medidor deja de generar alarmas comunicación durante período indicado.
- Baja: requiere confirmación, registra fecha/motivo, histórico datos se conserva.

**Pista cambios:** Toda modificación registrada: campo, valor anterior, valor nuevo, usuario, timestamp (DAT-19).

---

## Perfil 4 — Auditor

> Acceso a datos sensibles → **MFA obligatorio**. **Solo lectura**. Todo acceso registrado. SSO Azure AD.

### Pantallas del perfil auditor

#### 1. Calidad de datos

**Propósito:** Scorecard calidad dato por mall y período para verificación independiente. (DAT-06, DAT-17)

**Filtros:** Mall / País / Período (hasta 5 años — DAT-08) / Granularidad (mensual/diaria).

**Tabla scorecard:**
- Columnas: mall, período, lecturas esperadas, reales (#, %), estimadas (#, %), CNR (#, %), faltantes (#, %), tendencia vs período anterior.
- Semáforo por fila. Exportable CSV / PDF.

**Gráfico evolución calidad:** Línea % lecturas reales por mes, por mall.

**Detalle medidores baja calidad:** Click mall → lista medidores con % <umbral, causa más frecuente.

---

#### 2. Cuadratura agregación

**Propósito:** Verificar suma consumos locatarios cuadra con remarcador general del mall. (DAT-16)

**Selector:** Mall + Período.

**Tabla reconciliación:**
- Columnas: remarcador general [kWh], suma sub-medidores [kWh], diferencia [kWh y %], dentro tolerancia (sí/no — umbral configurable ±2%).
- Desglose por zona / piso / tipología.

**Análisis desviaciones:**
- Gráfico barras: diferencia mensual (remarcador − suma sub-medidores) últimos 12 meses.
- Tabla meses fuera tolerancia con link datos crudos.

**Exportación firmada:** Metadatos: usuario, fecha consulta, hash integridad (DAT-12).

---

#### 3. Pista de auditoría

**Propósito:** Timeline completo e inmutable de quién hizo qué y cuándo — 12 meses retención. (DAT-14, DAT-23, CYB-10)

**Filtros:** Usuario / Tipo acción (consulta/modificación/exportación/login) / Recurso (medidor/CNR/configuración) / Rango fechas.

**Timeline eventos:**
- Lista cronológica inversa: timestamp, usuario, acción, recurso afectado, valor anterior/posterior, IP/sesión.
- **Inmutable:** sin botones edición ni borrado (CYB-10).
- Paginación 100 eventos. Exportable completo CSV.

**Resumen actividad:**
- Heatmap acciones por día y hora (detecta actividad inusual).
- Top 10 usuarios por nº acciones en período.

---

#### 4. Trazabilidad / lineage

**Propósito:** Verificar linaje completo de cada lectura — desde medidor hasta valor mostrado. (DAT-19, DAT-20)

**Selector:** Medidor + Fecha/hora de la lectura a verificar.

**Panel linaje:**
- Valor mostrado en plataforma (tipo: real/estimado/CNR/backfill).
- Si real: timestamp lectura, gateway receptor, hora ingesta, transformaciones (factor conversión, etc).
- Si estimado: método (interpolación/modelo), período ausencia cubierto.
- Si CNR: usuario, timestamp ingreso, valor original reemplazado, justificación.
- Si backfill: proceso generador, período recuperado, calidad asignada.

**Comparación raw vs mostrado:**
- Tabla lado a lado: valor crudo / valor procesado / valor dashboard — cada transformación identificada (DAT-20).

---

#### 5. Datos crudos (raw)

**Propósito:** Acceso a datos sin procesar para análisis independiente. (DAT-07, DAT-12)

**Selector:** Medidor(es) + Período + Resolución (15 min / horaria / diaria).

**Vista previa:** Tabla primeras 100 filas: timestamp, valor raw, unidad, calidad (real/estimado/CNR), flag anomalía.

**Exportación:**
- Formatos: Parquet / CSV / JSON.
- Metadatos en header: usuario, fecha exportación, medidor(es), período, hash SHA-256 (DAT-12).
- Retención exports: 30 días en plataforma.

**Nota:** Datos exportados no pueden usarse para entrenar modelos ML fuera de PASA (DAT-30).

---

#### 6. Exportar evidencia

**Propósito:** Paquetes de evidencia firmados digitalmente para respaldo auditoría. (DAT-07, DAT-12)

**Configurador paquete:**
- Contenido: datos consumo / cuadratura / pista auditoría / scorecard calidad / linaje lecturas seleccionadas.
- Mall(es) y período.
- Formato: PDF (ejecutivo) + CSV (datos) en ZIP firmado.

**Firma digital:**
- Sello tiempo servidor, hash SHA-256, firma plataforma (DAT-12).
- Verificación integridad con herramienta pública.

**Historial evidencias:** Tabla: fecha, usuario, contenido, período, link descarga (válido 90 días).

---

## Perfil 5 — Súper-administrador (proveedor)

> Máximo privilegio. Acceso federado (identidad propia proveedor) + **MFA** + **JIT** (just-in-time). Todo auditado por PASA. **PAM obligatorio** (CYB-20).

### Pantallas del perfil súper-administrador

#### 1. Tenants y malls

**Propósito:** Gestión estructura multi-tenant del EMS. (ARQ-05, ARQ-16)

**Lista tenants:**
- Tabla: tenant ID, nombre mall, país, estado (activo/inactivo/en onboarding), nº medidores activos, nº usuarios activos, fecha alta, versión contrato.
- Filtros: país / estado / con alertas activas.

**Detalle tenant:**
- Config base: nombre, país, moneda, zona horaria, parámetros calidad, integración facturación.
- Estadísticas uso: usuarios activos (30 días), nº consultas API, volumen datos.
- Historial cambios configuración (DAT-19).

**Acciones:**
- Crear nuevo tenant / Activar / Desactivar (requiere aprobación PASA).
- Editar config base (todo en pista auditoría).

---

#### 2. Config y releases

**Propósito:** Gestión configuración como código y despliegue releases con gate aprobación. (ARQ-16, CYB-15)

**Pipeline releases:**
- Lista: versión, descripción cambios, estado (en desarrollo/QA/aprobación/producción).
- Por release: diff cambios, resultados tests QA, aprobaciones requeridas vs obtenidas.

**Control despliegue:**
- Botón "Solicitar despliegue a producción" → flujo aprobación (requiere aprobación rol PASA).
- Estado despliegue: etapas, logs tiempo real, rollback disponible.
- Historial: versión, fecha, responsable, resultado (éxito/rollback), link logs.

**Configuración como código:**
- Diff viewer cambios IaC entre versiones. Cambios versionados git con link commit.

---

#### 3. Usuarios y roles

**Propósito:** Administración usuarios, RBAC y revisión periódica permisos. (CYB-03, ARQ-05, FIN-01)

**Lista usuarios:**
- Tabla: nombre, email, tenant/mall, perfil (gerencial/operacional/técnico/auditor/súper-admin), estado (activo/inactivo/bloqueado), último acceso, MFA activo.
- Filtros: tenant / perfil / estado / sin acceso >90 días.

**Detalle usuario:**
- Permisos efectivos (recursos + acciones del RBAC).
- Historial accesos: últimas 30 sesiones con IP, duración, acciones.
- Historial cambios rol (DAT-14).

**Gestión:**
- Asignar/cambiar perfil: requiere justificación (pista auditoría).
- Revocar acceso (off-boarding — usuario inactivo; baja Azure AD lo deshabilita — ARQ-10).
- Revisión periódica: panel "permisos sin uso >90 días" con revocación masiva (CYB-03 — auditoría trimestral).
- Precio por usuario nuevo: referencia FIN-01.

---

#### 4. Observabilidad

**Propósito:** Monitoreo salud plataforma en tiempo real. (ARQ-08, ARQ-21, DAT-09)

**Health dashboard (cabecera):**
- Uptime servicio (30 días) | Latencia media API (ms) | Error rate (%) | Tiempo respuesta p95 (ms).
- Semáforo por componente: API principal / BD / cola mensajes / ingestión / backfill.

**Métricas ingestión:**
- Medidores reportando último ciclo (%) | Mensajes procesados/hora | En cola | Errores parsing (DAT-09).

**Gráficos tendencia (últimas 24h / 7 días):**
- Latencia API por endpoint (líneas).
- Tasa errores por tipo 4xx/5xx (barras).
- Throughput mensajes medidores (área).

**Alertas salud activas:** Lista alertas internas: componente, severidad, tiempo activa, estado.

---

#### 5. Integraciones

**Propósito:** Estado y configuración integraciones sistemas externos. (INT-13, INT-02, DAT-09)

**Lista integraciones activas:**
- Tabla: nombre, tipo (API REST/Modbus/DLMS/webhook/SFTP), tenant, estado (activo/degradado/error), último heartbeat, tasa éxito (7 días).

**Detalle integración:**
- Config técnica: endpoint, protocolo, credenciales (enmascaradas).
- Métricas: tasa éxito / errores por tipo / latencia media / volumen datos últimas 24h.
- Log últimos 100 eventos: timestamp, tipo, código resultado, payload resumido.

**Gestión:**
- Activar / Desactivar (con registro motivo).
- Forzar re-sincronización.
- Ver contrato interfaz (versión API, esquema datos) — sin exponer modelo interno (PI proveedor).

---

#### 6. Seguridad y PAM

**Propósito:** Cumplimiento seguridad y gestión cuentas privilegiadas. (CYB-13, CYB-18, CYB-20, CYB-12, CYB-16)

**Resumen seguridad:**
- Vulnerabilidades abiertas por severidad | Parches pendientes | Last scan date.
- Certificados TLS: días hasta vencimiento por servicio.
- % componentes con último parche <30 días (CYB-13).

**PAM — cuentas privilegiadas:**
- Lista cuentas activas: usuario, rol, fecha última revisión, próxima revisión, estado (activo/suspendido/en revisión — CYB-20).
- Bóveda credenciales: acceso JIT — técnico solicita, aprobación por tiempo limitado, sesión completa registrada.
- Historial uso: usuario, recurso accedido, duración, acciones (CYB-20).

**Gestión incidentes seguridad:**
- Lista incidentes abiertos: fecha detección, tipo, severidad, estado, responsable.
- Flujo notificación PASA en caso de brecha: formulario con envío automático <4h (CYB-16, PRI-02).

**Borrado criptográfico:** Herramienta y registro ejecución al término contrato (CYB-12).

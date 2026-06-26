# Manual de Usuario — Plataforma de Monitoreo Energético (EMS)

## Contenido

1. [Primeros Pasos](#1-primeros-pasos)
2. [Inicio de Sesión](#2-inicio-de-sesión)
3. [Navegación y Perfiles](#3-navegación-y-perfiles)
4. [Perfil Gerencial](#4-perfil-gerencial)
5. [Perfil Operacional](#5-perfil-operacional)
6. [Perfil Técnico](#6-perfil-técnico)
7. [Perfil Auditor](#7-perfil-auditor)
8. [Perfil Súper-Administrador](#8-perfil-súper-administrador)
9. [Vistas Compartidas](#9-vistas-compartidas)
10. [Mi Perfil y Privacidad](#10-mi-perfil-y-privacidad)
11. [Preguntas Frecuentes](#11-preguntas-frecuentes)

---

## 1. Primeros Pasos

### ¿Qué es esta plataforma?

Es un sistema web para visualizar y gestionar el consumo eléctrico de centros comerciales y edificios. Permite ver en tiempo real cuánta energía se consume, detectar anomalías, generar facturas y tomar decisiones informadas sobre eficiencia energética.

### ¿Qué necesito para acceder?

- Un navegador web actualizado (Chrome, Firefox, Edge o Safari).
- Una cuenta de usuario proporcionada por su administrador.
- Conexión a internet.

### ¿Qué voy a ver?

La plataforma usa un sistema de **perfiles** que determina qué pantallas ve cada usuario. Su administrador le asigna un perfil según su función:

| Perfil | Enfoque | Pantallas |
|--------|---------|-----------|
| **Gerencial** | Visión estratégica: costos, consumo, reportes | 6 pantallas |
| **Operacional** | Operación diaria: monitoreo, alertas, calidad | 6 pantallas |
| **Técnico** | Trabajo de campo: órdenes, diagnóstico, medidores | 6 pantallas |
| **Auditor** | Verificación: cuadratura, trazabilidad, evidencia | 6 pantallas |
| **Súper-admin** | Plataforma completa: seguridad, tenants, releases | 6 pantallas |
| **Locatario** | Solo su propia factura | 1 pantalla |

No se preocupe si no ve todas las opciones del menú — es normal. Cada perfil muestra solo lo relevante para su función.

---

## 2. Inicio de Sesión

### Cómo ingresar

1. Abra su navegador y vaya a la dirección de la plataforma (por ejemplo: `https://power-monitor.cloud`).
2. Se mostrará la pantalla de inicio de sesión con el título "EMS".
3. Haga clic en **"Iniciar sesión con Microsoft"** o **"Iniciar sesión con Google"**, según le haya indicado su administrador.
4. Ingrese su correo y contraseña en la ventana del proveedor (Microsoft o Google).
5. Si su cuenta tiene **verificación en dos pasos (MFA)** activada, se le pedirá un código adicional:
   - Abra la aplicación **Google Authenticator** o **Microsoft Authenticator** en su teléfono.
   - Ingrese el código de 6 dígitos que aparece.
6. Una vez verificado, ingresará automáticamente a la plataforma.

### Primera vez con MFA

Si es la primera vez que inicia sesión y su rol requiere verificación en dos pasos:

1. Después del login con Microsoft/Google, verá una pantalla con un código QR.
2. Abra la aplicación Authenticator en su teléfono (descárguela de la tienda si no la tiene).
3. En la app, seleccione "Agregar cuenta" y escanee el código QR.
4. Ingrese el código de 6 dígitos que genera la app.
5. **Guarde los códigos de recuperación** que se muestran — son su respaldo si pierde acceso al teléfono.

### Cierre de sesión

- Haga clic en su nombre o ícono de usuario en la esquina inferior del menú lateral.
- Seleccione **"Cerrar Sesión"**.

### Sesión expirada

Si permanece inactivo durante un período prolongado, la sesión se cerrará automáticamente por seguridad. Simplemente vuelva a iniciar sesión.

---

## 3. Navegación y Perfiles

### Menú lateral (Sidebar)

Al lado izquierdo encontrará el menú principal. Las secciones que ve dependen de su perfil asignado. El menú se organiza en grupos expandibles con sub-ítems.

### Cómo usar el menú

- **Haga clic** en un grupo para expandir sus sub-secciones.
- **Haga clic** en una sub-sección para ir a esa página.
- **Contraer el menú**: haga clic en el logo en la parte superior para colapsar el menú y tener más espacio.

### Seleccionar empresa

Si usted administra múltiples empresas, verá un selector de empresa en el menú lateral. Seleccione la empresa que desea visualizar antes de navegar. Las secciones que requieren empresa mostrarán un mensaje pidiéndole seleccionar una antes de mostrar datos.

### Sistema de colores de estado

En toda la plataforma se usa un sistema consistente de colores:

| Color | Significado |
|-------|-------------|
| **Verde** | Operación normal, sin alarmas activas |
| **Amarillo/Ámbar** | Alerta activa no crítica (ej: sobreconsumo leve, calidad degradada) |
| **Rojo** | Alarma crítica (ej: medidor offline >4h, sobrecarga) |
| **Gris** | Sin datos disponibles |

---

## 4. Perfil Gerencial

El perfil gerencial está diseñado para directivos y gerentes que necesitan una visión estratégica del portafolio energético. Sigue una jerarquía de tres niveles: País → Mall → Piso.

### 4.1 Panel Consolidado

**Ruta:** Panel Consolidado → Consolidado

Vista país con mapa geográfico de todos los centros comerciales. Cada marcador tiene un color según su estado energético.

**Lo que verá:**
- **Mapa interactivo** con marcadores coloreados por estado (verde/amarillo/rojo/gris).
- **KPIs de portafolio** (2×2): demanda agregada [MW], consumo acumulado [MWh], costo acumulado, malls activos.
- **Selector de país**: Chile, Perú, Colombia.
- **Lista de centros comerciales** con potencia actual y cantidad de medidores.
- **Eventos críticos recientes** en la parte inferior.

**Navegación de 3 niveles:**

1. **Nivel 1 — País**: el mapa y la lista de malls.
2. **Nivel 2 — Mall**: haga clic en un mall para ver su detalle (carga total, voltaje promedio, alertas, gauges de voltaje/corriente/potencia).
3. **Nivel 3 — Piso**: si el mall tiene pisos configurados, aparecerán tabs (P1, P2, P3...). Al seleccionar un piso, el mapa se reemplaza por un **plano esquemático** con zonas coloreadas.

**Plano de piso (Nivel 3):**
- Cada zona/tienda se muestra como un bloque con nombre, consumo actual y estado.
- **Modos de coloreo**: Estado alarma (defecto), Intensidad de consumo, Variación de consumo.
- **Hover**: pase el mouse sobre un bloque para ver tooltip con nombre y consumo.
- **Breadcrumb**: Chile → Mall Norte → Piso 1 — cada nivel es clickeable para volver atrás.

> Este nivel es solo lectura; el perfil gerencial no acciona sobre alarmas individuales.

### 4.2 Consumo Jerárquico

**Ruta:** Panel Consolidado → Consumo

Drill-down del consumo desde el portafolio completo hasta cada zona o medidor.

**Lo que verá:**
- **Tabla jerárquica** de malls con columnas de consumo, expandible a medidores individuales.
- **Filtros**: métrica (kWh, kW, kWh/m²), período, granularidad, país.
- **Semáforo por fila** según estado del medidor.
- **Ordenamiento y búsqueda** por nombre de mall.

### 4.3 Costos y Tendencias

**Ruta:** Panel Consolidado → Costos

Análisis financiero del consumo energético por centro comercial.

**Lo que verá:**
- **Gráfico de barras apiladas** por mall + línea de precio medio.
- **Selector de moneda**: CLP, PEN, COP, USD, UF.
- **Tabla de costos** por mall con búsqueda y ordenamiento.
- **Exportar CSV** con todos los datos.
- **Análisis waterfall** de variaciones.

### 4.4 Reportes Ejecutivos

**Ruta:** Reportes y Analítica → Ejecutivos

Generador de reportes configurables para presentaciones y directorio.

**Lo que verá:**
- **Configurador** (lado izquierdo): alcance (malls), período, comparación (período anterior / mismo mes año anterior / promedio portafolio), secciones a incluir, formato (PDF/PPT/Excel), idioma.
- **Vista previa** (lado derecho): grilla con los datos que se incluirán.
- **Historial** de reportes generados con búsqueda y descarga.

### 4.5 Exportar Reportes

**Ruta:** Reportes y Analítica → Exportar

Exportación masiva de datos por tipo de contenido.

**Lo que verá:**
- **Selector de contenido**: consumo, facturación, calidad de dato, cobertura, alertas.
- **Filtros**: alcance (malls), período, granularidad, formato (PDF/Excel/CSV), moneda.
- **Vista previa** de los datos a exportar.
- **Cola de exportaciones** con estado de cada solicitud.

### 4.6 Alarmas Agregadas

**Ruta:** Panel Consolidado → Alarmas

Visión consolidada de alarmas a nivel de portafolio.

**Lo que verá:**
- **4 KPIs**: alertas activas, críticas, resueltas en 24h, tiempo medio de resolución.
- **Gráfico de evolución 30 días** (barras por día).
- **Mapa** con marcadores coloreados por alarmas.
- **Top 5 malls** con más alarmas.
- **Tabla completa** con filtros y exportar CSV.

---

## 5. Perfil Operacional

El perfil operacional está diseñado para equipos que gestionan la operación diaria: supervisores de operación, coordinadores de mantenimiento y controladores de calidad.

### 5.1 Monitoreo en Vivo

**Ruta:** Monitoreo → En vivo

Vista en tiempo real del estado de todos los medidores del portafolio.

**Lo que verá:**
- **5 KPIs cabecera**: total medidores, % en línea, offline, stale (>4h sin dato), CNR pendientes.
- **Grilla de centros** coloreada por % de medidores en línea.
- **Tabla expandible** de medidores con último valor, timestamp y estado.
- **Histograma 24h** de comportamiento por hora.
- **Feed de eventos** en tiempo real.

### 5.2 Alarmas y Eventos

**Ruta:** Alertas → Gestión

Lista accionable de alertas con herramientas de gestión.

**Lo que verá:**
- **Tabla filtrable** por severidad, mall, país, estado, rango de fechas.
- **Panel de detalle** al seleccionar una alerta: valores disparadores vs umbrales, gráfico 48h del medidor.
- **SLA visual**: % dentro de SLA, fuera, por severidad, resueltas en período.
- **Acciones**: reconocer, resolver con notas, escalar.

### 5.3 Tickets y SLA

**Ruta:** Alertas → Tickets y SLA

Seguimiento de cumplimiento de SLA por severidad.

**Lo que verá:**
- **3 KPIs**: tickets abiertos, vencidos, cumplimiento SLA %.
- **Tabla de tickets** con colores SLA (verde = dentro de plazo, rojo = vencido).
- **Gráfico 12 semanas** de evolución SLA.
- **Historial de penalizaciones** por incumplimiento.

### 5.4 Calidad y Backfill

**Ruta:** Administración → Calidad y Backfill

Control del proceso de backfill y calidad de datos por mall.

**Lo que verá:**
- **3 KPIs**: calidad promedio, cantidad de centros, backfill activos.
- **Histograma 30 días**: barras apiladas real / estimado / faltante por día.
- **Scorecard por centro**: tabla con % real, % estimado, % CNR, tendencia, semáforo.
- **Panel backfill activo**: lista de procesos en curso con medidor, período y filas procesadas.
- **Alertas de degradación**: medidores sin dato reciente.

### 5.5 CNR Pendientes

**Ruta:** Administración → CNR Pendientes

Gestión de lecturas CNR (Consumo No Registrado) pendientes de resolución.

**Lo que verá:**
- **3 KPIs**: detectados, críticos (>24h), prolongados (>7 días).
- **Tabla de medidores** con gaps de datos, ordenados por horas sin lectura.
- **Detalle expandible** con acción sugerida.
- **Exportar CSV** con todos los CNR pendientes.

### 5.6 Mapa de Cobertura

**Ruta:** Monitoreo → Cobertura

Mapa geográfico mostrando la cobertura de medición por centro.

**Lo que verá:**
- **Mapa** con marcadores coloreados por % de medidores en línea.
- **Panel lateral** con búsqueda y lista de malls.
- **Cada mall**: nombre, % online, cantidad de medidores, alertas activas, última lectura.
- **Selector de métrica** del marcador: online %, alarmas, última lectura.

---

## 6. Perfil Técnico

El perfil técnico está diseñado para técnicos de campo que instalan, mantienen y diagnostican medidores eléctricos.

### 6.1 Mis Órdenes

**Ruta:** Órdenes → Mis órdenes

Cola de trabajo personal con órdenes de intervención asignadas.

**Lo que verá:**
- **4 KPIs**: pendientes, en curso, cerradas hoy, vencidas.
- **Tabla de órdenes** con tipo (correctivo, preventivo, instalación), prioridad, mall, estado.
- **Panel de detalle** al seleccionar: descripción, contexto técnico del medidor, historial de intervenciones.
- **Acciones**: Iniciar, Pausar, Cerrar orden.

### 6.2 Catálogo de Medidores

**Ruta:** Medidores → Catálogo

Búsqueda y consulta de todos los medidores del portafolio.

**Lo que verá:**
- **Búsqueda** por nombre o código + filtros (mall, estado, tipo medidor, alarma activa).
- **Tabla** con nombre, código, mall, última lectura, estado (online/offline/alarma).
- **Ficha de detalle** al seleccionar: especificaciones (serial, modelo, fase, protocolo), última lectura con gauges, historial de intervenciones.

### 6.3 Diagnóstico de Comunicaciones

**Ruta:** Medidores → Diagnóstico

Herramienta para diagnosticar problemas de comunicación con medidores.

**Lo que verá:**
- **Lista de medidores** con badges de estado (online verde, offline rojo).
- **Panel diagnóstico** al seleccionar: último dato, potencia, tiempo transcurrido, tasa de éxito 24h (%), protocolo y dirección.
- **Herramientas**: botones Reintentar lectura y Ver logs.

### 6.4 Registro de Intervención

**Ruta:** Registro → Intervención

Formulario para documentar intervenciones técnicas en medidores.

**Lo que verá:**
- **Formulario** (lado izquierdo): selector de medidor, tipo de intervención (correctiva, preventiva, instalación, retiro), descripción, resultado (exitoso, parcial, pendiente), checkbox "Genera CNR".
- **Historial** (lado derecho): últimas 30 intervenciones del técnico con fecha, medidor y resultado.

### 6.5 Ingreso CNR Manual

**Ruta:** Registro → Ingreso CNR

Formulario para registrar consumo no registrado (CNR) manualmente.

**Lo que verá:**
- **Formulario** (lado izquierdo): selector de medidor, rango de fechas, valor en kWh, motivo (falla comunicación, falla medidor, mantenimiento, otro), justificación (mínimo 20 caracteres).
- **Historial** (lado derecho): últimas 30 entradas CNR con fecha, medidor, valor y motivo.

### 6.6 Maestro de Medidores

**Ruta:** Medidores → Maestro

Tabla maestra con todos los medidores y sus configuraciones.

**Lo que verá:**
- **Búsqueda** + filtros de estado (Activo, Mantención, Inactivo) como pills.
- **Tabla completa**: serial, centro, protocolo, tipo, fase, estado.
- **Panel de detalle** al seleccionar: especificaciones técnicas completas.
- **Acciones**: Dar de baja (pasar a Mantención/Inactivo) o Activar.

---

## 7. Perfil Auditor

El perfil auditor está diseñado para auditores internos y externos que verifican la integridad y calidad de los datos energéticos.

### 7.1 Calidad de Datos

**Ruta:** Auditoría → Calidad de Datos

Scorecard de calidad del dato por mall y período para verificación independiente.

**Lo que verá:**
- **Filtros**: mall, período (7/30/90 días), granularidad (15 min, horaria, diaria).
- **Tabla scorecard** por centro: lecturas esperadas, reales (#, %), estimadas (#, %), CNR (#, %), faltantes (#, %), tendencia, semáforo.
- **Gráfico de evolución** (12 meses): % lecturas reales por mes (click en fila para filtrar por mall).
- **Detalle baja calidad**: al hacer click en un centro, lista de medidores con % real < 90%.
- **Exportar CSV** con todos los datos.

### 7.2 Cuadratura Agregación

**Ruta:** Auditoría → Cuadratura

Reconciliación entre remarcadores (medidores principales) y la suma de sub-medidores.

**Lo que verá:**
- **Filtro por mall** + botón Exportar CSV.
- **Tabla de reconciliación**: centro, remarcador [kWh], suma sub-medidores [kWh], diferencia [kWh], diferencia %, tolerancia (±2%).
- **Gráfico de desviaciones 12 meses**: barras por mes mostrando diferencia, con lista de meses fuera de tolerancia.

### 7.3 Trazabilidad / Lineage

**Ruta:** Auditoría → Trazabilidad

Rastreo del origen y transformación de cada lectura individual.

**Lo que verá:**
- **Selector de medidor** (lado izquierdo) + selector de fecha/hora.
- **Panel de linaje** (lado derecho): badge del tipo de lectura (Real, Estimado, CNR, Backfill) con color, pasos del proceso de transformación.
- **Tabla comparativa**: valor crudo vs valor procesado lado a lado (potencia, voltaje, corriente, factor de potencia).

### 7.4 Datos Crudos

**Ruta:** Auditoría → Datos Crudos

Acceso directo a los datos crudos sin procesar para verificación.

**Lo que verá:**
- **Selector de medidor(es)** + rango de fechas.
- **Pills de resolución**: 15 min, Horaria, Diaria.
- **Pills de formato de exportación**: CSV, JSON, Parquet.
- **Tabla de vista previa**: primeras 100 filas con timestamp, potencia, energía, voltaje, factor de potencia.
- **Botón exportar** con metadatos y hash SHA-256.

### 7.5 Exportar Evidencia

**Ruta:** Auditoría → Exportar Evidencia

Generación de paquetes de evidencia firmados para procesos de auditoría formal.

**Lo que verá:**
- **Configurador de paquete** (lado izquierdo): contenido a incluir (consumo, cuadratura, pista de auditoría, scorecard calidad, linaje), mall(es), período.
- **Historial de exportaciones** (lado derecho): fecha, contenido, período, centros incluidos, hash SHA-256 para verificación de integridad.

### 7.6 Pista de Auditoría

**Ruta:** Auditoría → Pista de Auditoría

Registro inmutable de todas las acciones realizadas en la plataforma.

**Lo que verá:**
- **Filtros**: usuario, tipo de acción, tipo de recurso, rango de fechas.
- **Tabla cronológica inversa**: fecha/hora, usuario, acción, recurso, IP.
- **Heatmap de actividad**: grilla día × hora mostrando concentración de acciones.
- **Top 10 usuarios** por cantidad de acciones.
- **Paginación** (100 registros por página) + exportar CSV.

---

## 8. Perfil Súper-Administrador

El perfil súper-administrador tiene acceso a toda la plataforma y herramientas adicionales de gestión de infraestructura, seguridad y multi-tenancy.

### 8.1 Dashboard Plataforma

**Ruta:** Dashboard → Plataforma

Vista global de toda la plataforma sin filtro por empresa.

**Lo que verá:**
- **7 KPIs**: empresas, edificios, medidores, lecturas totales, alertas activas, en línea, fuera de línea.
- **Tabla resumen por tenant**: empresa, edificios, medidores, alertas activas.

### 8.2 Tenants y Malls

**Ruta:** Administración → Tenants y Malls

Gestión de la estructura multi-tenant del EMS.

**Lo que verá:**
- **Filtros**: país, estado (activo/inactivo/onboarding), checkbox "con alertas activas".
- **Tabla de tenants**: nombre, país, estado, medidores activos, usuarios activos, fecha de alta, moneda.
- **Drawer de detalle** al hacer click: configuración base (nombre, país, moneda, timezone, slug), estadísticas de uso (usuarios activos 30d, consultas API, volumen de datos), historial de cambios de configuración.

### 8.3 Observabilidad

**Ruta:** Administración → Observabilidad

Dashboard de salud de la plataforma y métricas de infraestructura.

**Lo que verá:**
- **KPIs de salud**: uptime 30d %, medidores en línea/offline, error rate %, alertas activas.
- **Semáforo por componente**: API, Base de datos, Ingestión, Backfill — cada uno con estado verde/amarillo/rojo.
- **Métricas de ingestión**: lecturas/min, backfill pendiente, errores de parsing, jobs activos.
- **3 gráficos de tendencia** (7 días): latencia API, tasa de errores, throughput.
- **Alertas de salud activas** con descripción y hora.

### 8.4 Config y Releases

**Ruta:** Administración → Config y Releases

Pipeline de releases y gestión de configuración como código.

**Lo que verá:**
- **Versión actual** con badge "Producción".
- **Pipeline de releases**: tabla con versión, descripción, fecha, estado (En desarrollo / QA / Aprobación / Producción).
- **Configuración como código (Diff viewer)**: lista de archivos de configuración modificados con conteo de líneas añadidas/eliminadas. Haga click para expandir el diff. Dos modos de visualización:
  - **Unificado**: diff estilo git con líneas verdes (añadidas) y rojas (eliminadas).
  - **Lado a lado**: dos columnas, versión anterior a la izquierda y nueva a la derecha.
- **Actividad reciente**: tabla con acciones del audit log relacionadas.

### 8.5 Seguridad y PAM

**Ruta:** Administración → Seguridad y PAM

Panel de cumplimiento de seguridad y gestión de cuentas privilegiadas.

**Lo que verá:**
- **4 KPIs**: brechas abiertas, cuentas PAM, PAM inactivos, incidentes abiertos.
- **Reportes de brecha**: lista con descripción, fecha y estado (open/resolved).
- **Actividad de seguridad**: últimas acciones del audit log.
- **Vulnerabilidades por severidad**: CRITICAL, HIGH, MEDIUM, LOW con conteos.
- **Certificados TLS**: tabla con servicio y días restantes (rojo si <30 días).

**Cuentas privilegiadas (PAM):**
- Tabla con usuario, email, rol, **última revisión**, **próxima revisión**, estado (activo / en revisión / suspendido / inactivo).
- Las cuentas con revisión vencida (ciclo 90 días) se marcan automáticamente como "en revisión".

**Historial de uso PAM:**
- Tabla de acciones realizadas por usuarios privilegiados: usuario, recurso accedido, acción, fecha.

**Bóveda de credenciales (JIT):**
- Botón "Solicitar acceso" para acceso just-in-time a recursos privilegiados.
- Formulario: recurso (RDS, ECS Exec, S3 Admin, IAM Console), duración (15 min a 2 horas), justificación.
- La solicitud queda registrada y requiere aprobación.

**Incidentes de seguridad:**
- Tabla: fecha, tipo, descripción, severidad, estado (abierto/investigando/contenido/resuelto).

**Notificación de brecha (<4h):**
- Botón "Reportar brecha" para envío automático a PASA dentro de 4 horas (CYB-16, PRI-02).
- Formulario con descripción de la brecha detectada.

**Borrado criptográfico:**
- Herramienta de destrucción certificada de datos al término de contrato (CYB-12).
- Requiere escribir "CONFIRMAR" para ejecutar. Queda registrado en la pista de auditoría.

### 8.6 Integraciones

**Ruta:** Integraciones

Gestión de conexiones con sistemas externos.

**Lo que verá:**
- **Tabs**: Conectores, Webhooks, Deliveries, Gaps, Backfill, Health.
- **Grilla de conectores**: tipo, estado, último sync, mensaje de error.
- **Crear/editar** conectores con editor JSON de configuración.
- **Historial de sincronización** y logs de eventos.

---

## 9. Vistas Compartidas

Estas vistas están disponibles para múltiples perfiles según permisos.

### 9.1 Dashboard General

Página principal al ingresar. Muestra resumen rápido:
- **Consumo total** del período (kWh).
- **Potencia actual** en tiempo real (kW).
- **Cantidad de alertas** activas.
- **Gráfico de consumo** interactivo con selector de rango (1D, 1S, 1M, 3M, 6M, 1A).
- Haga click en un punto del gráfico para ir al detalle del medidor.

### 9.2 Dashboard Ejecutivo

Disponible para perfiles gerencial, operacional y auditor:
- **KPIs financieros**: costo total, costo por m², ahorro vs período anterior.
- **Ranking de edificios** por consumo o costo (clickeable).
- **Gráfico comparativo** entre edificios.

### 9.3 Dashboard Comparativo

Permite comparar el desempeño de varios edificios lado a lado con gráficos superpuestos de consumo, demanda y costos.

### 9.4 Medidores

Lista todos los medidores con búsqueda, filtros por edificio y estado. Haga click para ver detalle con gráficos de lecturas, calidad eléctrica y datos IoT.

### 9.5 Edificios

Lista todos los edificios con consumo del período. Haga click para ver tabs de Facturación y Medidores del edificio.

### 9.6 Mapa Interactivo

Vista geográfica con mapa indoor de centros comerciales:
- **47 malls** (20 con mapa interior + 27 con marcador).
- **Búsqueda de tiendas** por nombre.
- **Selector de piso** para malls con indoor.
- **5977 tiendas** buscables con superficie en m².

### 9.7 Alertas

Lista de alertas vigentes con:
- Severidad (Crítica/Alta/Media/Baja), tipo, edificio, medidor, fecha.
- Acciones: reconocer y resolver con notas.

### 9.8 Facturación

- **Facturas**: lista con período, edificio, monto, estado. Acciones: ver detalle, aprobar, anular, generar PDF.
- **Tarifas**: bloques horarios (punta, llano, valle) con precios por kWh.
- **Locatarios**: solo ven su propia factura.

### 9.9 Reportes y Analítica

- **Reportes**: informes configurables con descarga PDF/Excel y programación por email.
- **Benchmarking**: consumo por m² entre edificios.
- **Tendencias**: consumo mensual 12 meses con línea de tendencia.
- **Patrones**: análisis horario y semanal con detección de anomalías.

### 9.10 Administración General

Disponible según permisos:
- **Usuarios**: CRUD + importación masiva CSV/XLSX.
- **Roles**: configuración de permisos por módulo.
- **Empresas**: onboarding de nuevos tenants con roles automáticos.
- **Locatarios**: asignación de medidores a unidades.
- **Jerarquía**: árbol edificio → áreas → medidores.
- **API Keys y OAuth Clients**: para integraciones externas.
- **Calidad de Datos**: reporte SLO, balance, contratos ETL.
- **Auditoría**: registro de acciones con filtros y exportación.
- **Configuración**: logo, colores, timeout de sesión.

---

## 10. Mi Perfil y Privacidad

Acceda a su perfil haciendo clic en su nombre en el menú lateral.

### Datos personales

Vea sus datos registrados: nombre, email, rol asignado, edificios con acceso.

### Derechos de privacidad (Ley 21.719)

Puede ejercer los siguientes derechos:
- **Exportar mis datos**: descarga un archivo JSON con toda su información.
- **Rectificación**: solicite corregir datos incorrectos.
- **Oposición**: solicite que se dejen de procesar sus datos.
- **Bloqueo**: solicite suspender temporalmente el procesamiento.
- **Eliminación**: solicite que se eliminen sus datos (requiere aprobación del administrador).
- **Revocar consentimiento**: retire su consentimiento para el procesamiento de datos.

---

## 11. Preguntas Frecuentes

### ¿Por qué no veo ciertas secciones del menú?
Su administrador le asignó un perfil con pantallas específicas para su función. Si necesita acceso a una sección adicional, contacte a su administrador.

### ¿Cuántas pantallas tiene cada perfil?
Cada perfil tiene 6 pantallas dedicadas, más acceso a vistas compartidas (dashboard, medidores, edificios, alertas, etc.) según permisos. Total: 30 pantallas de perfil + vistas compartidas.

### ¿Cada cuánto se actualizan los datos?
Los datos de medidores se actualizan cada 15 minutos. Los gráficos en la vista de monitoreo en vivo se refrescan automáticamente cada 30 segundos.

### ¿Qué significan los colores de las alertas?
- **Rojo (Crítica)**: requiere atención inmediata (ej: medidor sin comunicación >2h).
- **Naranja (Alta)**: problema importante (ej: voltaje fuera de norma).
- **Amarillo (Media)**: situación a monitorear (ej: factor de potencia bajo).
- **Azul (Baja)**: informativo (ej: consumo por encima del promedio).

### ¿Qué es el factor de potencia y por qué importa?
El factor de potencia indica qué tan eficientemente se usa la energía eléctrica. Un valor de 1.0 es perfecto, y valores menores a 0.93 pueden generar recargos en la factura eléctrica.

### ¿Puedo ver datos de meses anteriores?
Sí. En cualquier gráfico, use el selector de rango temporal o arrastre la barra de navegación inferior para moverse en el tiempo.

### ¿Qué hago si un medidor aparece como "fuera de línea"?
1. Verifique que el medidor tenga alimentación eléctrica.
2. Revise la conexión de comunicación (cable de red o señal WiFi).
3. Si el problema persiste, contacte al equipo de soporte técnico.
4. Si es perfil técnico: use la pantalla de **Diagnóstico de Comunicaciones** para reintentar la lectura.

### ¿Cómo genero una factura?
1. Vaya a **Facturación → Facturas**.
2. Haga clic en **"Generar Factura"**.
3. Seleccione el edificio, locatario y período.
4. El sistema calculará automáticamente el consumo y aplicará la tarifa vigente.
5. Revise el monto y haga clic en **"Generar"**.

### ¿Qué es CNR?
CNR (Consumo No Registrado) son períodos donde no se recibieron datos del medidor. El perfil técnico puede ingresar valores CNR manualmente con justificación. El perfil auditor puede verificar estos valores en la pantalla de Trazabilidad.

### ¿Qué es el Nivel 3 del Panel Consolidado?
Es la vista de plano de piso que aparece al seleccionar un piso en el detalle de un mall. Muestra las zonas/tiendas como bloques coloreados según estado energético. Es una vista de solo lectura para el perfil gerencial.

### ¿Qué es el diff viewer en Config y Releases?
Muestra los cambios en la configuración de infraestructura entre versiones, similar a un diff de código. Los administradores pueden ver qué cambió (líneas verdes = añadido, rojas = eliminado) en dos modos: unificado o lado a lado.

### ¿Cómo contacto soporte?
Haga clic en el ícono de contacto en la parte inferior del menú lateral para ver las opciones de soporte disponibles (email, teléfono, WhatsApp).

---

*Versión del manual: 2.34.0 — Junio 2026*

# Plataforma EMS — Capacidades Actuales

> Documento comercial · Versión 2.35 · Junio 2026

---

## Qué es

Una plataforma web de **monitoreo y gestión energética** multi-cliente, accesible desde cualquier navegador. Permite a empresas con múltiples sitios (malls, edificios, plantas) visualizar su consumo eléctrico en tiempo real, controlar costos, gestionar alarmas y cumplir normativa — todo desde un único punto de acceso.

Actualmente opera con **875 medidores** distribuidos en **47 sitios** (malls) y recibe datos tanto de medidores tradicionales como de equipos IoT Siemens.

---

## Acceso y seguridad

- **Login con cuentas corporativas** — Microsoft 365 y Google. Sin contraseñas propias que administrar.
- **Autenticación en dos pasos (MFA)** — Código temporal desde app móvil (Google Authenticator, Microsoft Authenticator). Obligatorio para roles privilegiados. Flujo guiado en el primer login (descargar app, escanear QR, ingresar código).
- **Perfiles diferenciados** — Cada usuario ve solo las pantallas y datos que corresponden a su rol. Cinco perfiles predefinidos (ver sección siguiente).
- **Sesiones seguras** — Cierre automático por inactividad (configurable por empresa, 5 a 60 min). Tokens encriptados.
- **Cumplimiento Ley 21.719** (Protección de Datos Personales) — Derechos ARCO+ completos: acceso, rectificación, cancelación, oposición, bloqueo, portabilidad. Consentimiento con revocación. Notificación de brechas en menos de 24 horas.
- **Multi-empresa (multi-tenant)** — Cada empresa ve exclusivamente sus datos. Un usuario Globe Power puede operar transversalmente.
- **Personalización visual por empresa** — Logo, colores y título de la plataforma se adaptan automáticamente a la empresa del usuario (ej. tema PASA en azul, tema Siemens en teal).

---

## Cinco perfiles de usuario

La plataforma ofrece **30 pantallas** organizadas en 5 perfiles. Cada perfil tiene 6 vistas diseñadas para su función:

### 1. Gerencial

Para directivos y gerentes de operaciones. Visión consolidada del portafolio.

| Pantalla | Qué muestra |
|----------|-------------|
| Panel Consolidado | Mapa interactivo con semáforo por sitio (verde/amarillo/rojo). KPIs: demanda MW, consumo MWh, costo UF, sitios activos. Drill-down a nivel de piso con zonas coloreadas. |
| Consumo Jerárquico | Árbol expandible país → mall → medidor. Intensidad energética (kWh/m²). Ordenar por consumo, alertas o alfabético. |
| Costos y Tendencias | Gráfico de costos apilado por mall. Línea de precio unitario. Multi-moneda (CLP, UF, USD, PEN, COP). Exportar CSV. Descomposición waterfall (volumen/precio/mix/otros). |
| Alarmas Agregadas | Resumen ejecutivo de alarmas. Top 5 malls con más incidencias. Evolución 30 días. Tiempo medio de resolución. Mapa con marcadores coloreados por severidad. |
| Reportes Ejecutivos | Configurador de reportes (alcance, período, secciones, formato PDF/Excel/PPT, idioma). Historial de reportes generados con búsqueda. |
| Exportar Reportes | Exportación ad-hoc con estimación de tamaño. Cola de exportación con estado. |

### 2. Operacional

Para jefes de operación y supervisores de terreno. Control diario del parque.

| Pantalla | Qué muestra |
|----------|-------------|
| Monitoreo en Vivo | Estado de cada medidor (online/offline/stale). Histograma 24h de comportamiento del parque. Feed de eventos en tiempo real. KPI de CNR pendientes. |
| Alarmas y Eventos | Gestión de alarmas con filtro por mall y severidad. SLA por prioridad con desglose por severidad. Asignar, comentar y cerrar alarmas. Widgets visuales de cumplimiento SLA. |
| Tickets y SLA | Tablero de tickets derivados de alarmas. Cumplimiento SLA (%), resolución media, disponibilidad de datos. Evolución 12 semanas. Tabla de penalidades SLA. |
| Calidad y Backfill | Scorecard de calidad por sitio (lecturas reales vs estimadas vs faltantes). Tendencia mensual. Histograma 30 días (área apilada). Alertas de degradación. |
| CNR Pendientes | Lecturas no registradas. Detección automática de gaps (>4h = CNR, >24h = crítica). Exportar CSV. |
| Mapa de Cobertura | Mapa geográfico con marcadores coloreados por % de medidores online (verde >95%, ámbar 85-95%, rojo <85%). Popups con % online, cantidad de medidores y alertas. |

### 3. Técnico

Para electricistas y técnicos de mantenimiento. Trabajo de campo.

| Pantalla | Qué muestra |
|----------|-------------|
| Mis Órdenes | Órdenes de trabajo derivadas de alarmas. KPIs (pendientes/en curso/cerradas/vencidas). Filtros rápidos. Historial por medidor. |
| Catálogo Medidores | Buscador de medidores con filtros (mall, estado comunicación, tipo). Ficha técnica con última lectura. |
| Diagnóstico Comunicaciones | Estado de comunicación por medidor (online/offline/intermitente). Tasa de éxito 24h. Protocolo y dirección. Tiempo desde última lectura. |
| Registro Intervención | Formulario para registrar intervenciones de campo. Tipo, descripción, resultado, checkbox CNR. Historial de intervenciones. |
| Ingreso CNR Manual | Formulario para ingresar lecturas manuales con justificación (mínimo 20 caracteres). Historial de ingresos. |
| Maestro Medidores | Datos maestros del parque de medidores. Activar/dar de baja medidores. Filtro por estado. Detalle al hacer click. |

### 4. Auditor

Para auditores internos y de cumplimiento. Trazabilidad y evidencia.

| Pantalla | Qué muestra |
|----------|-------------|
| Cuadratura | Reconciliación medidor principal vs sub-medidores. Tolerancia ±2%. Diferencia kWh y %. Gráfico desviación 12 meses. Filtro por mall. Exportar CSV. |
| Trazabilidad | Lineage de cada lectura: origen, transformaciones, calidad. Tipo de lectura derivado de frescura del dato (real/estimado/CNR). |
| Datos Crudos | Vista de datos sin procesar (hasta 100 filas). Exportar CSV/JSON. Selector de resolución temporal. |
| Exportar Evidencia | Paquete de evidencia firmado (SHA-256). Selector de mall, período (1m/3m/12m) y contenido. Historial de exportaciones. |
| Calidad de Datos | Scorecard con filtros (mall/período/granularidad). Tabla con lecturas esperadas/reales/estimadas/CNR/faltantes y %. Gráfico evolución 12 meses. Detalle de medidores de baja calidad al hacer click. |
| Log de Auditoría | Registro completo de acciones (quién, qué, cuándo, desde dónde). Heatmap de actividad (día × hora). Top 10 usuarios. |

### 5. Súper-administrador

Para el equipo Globe Power. Gestión de la plataforma.

| Pantalla | Qué muestra |
|----------|-------------|
| Dashboard Plataforma | KPIs globales cross-empresa. Resumen de todos los tenants. |
| Gestión Empresas | Crear empresas con roles y administrador en un paso. Configuración por tenant. |
| Gestión Malls | Tabla de tenants (país, estado, medidores, usuarios, moneda). Detalle con historial de cambios. Filtros por país, estado y alertas. |
| Observabilidad | Salud de componentes. Métricas de ingesta. Gráficos de tendencia: latencia API, tasa de error, throughput de medidores (24h). KPIs derivados de datos reales. |
| Config y Releases | Configuración como código con visor de diffs (unificado y lado a lado). Conteo de líneas añadidas/eliminadas por archivo. Historial derivado de log de auditoría. |
| Seguridad y PAM | Cuentas privilegiadas con ciclo de revisión 90 días. Vault JIT (solicitud temporal con duración y justificación). Incidentes de seguridad. Notificación de brecha (<4h a PASA). Eliminación criptográfica con confirmación. Certificados TLS y vulnerabilidades. |

---

## Vistas compartidas (todos los perfiles)

Además de las 30 pantallas por perfil, todos los usuarios acceden a vistas transversales:

### Dashboard ejecutivo

- Gráfico de consumo y gasto por activo inmobiliario (toggle anual/mensual, tipo de gráfico barra/línea/área).
- 3 KPIs financieros: pagos recibidos, facturas por vencer, facturas vencidas — cada uno expandible con detalle y filtros.
- Tabla de edificios con navegación al detalle. Tabla de documentos vencidos por período.
- Click en cualquier punto del gráfico navega al detalle del medidor.

### Detalle de edificio

- Gráfico de facturación mensual con selector de métrica.
- Tabs: facturación (desglose por tienda al hacer click), listado de medidores (con carga CSV masiva), operadores.
- Navegación al detalle de cada medidor.

### Detalle de medidor

- 5 métricas eléctricas con gráfico dinámico (barra/línea) y tabla mensual.
- Click en fila de tabla abre lecturas del mes con resolución de 15 minutos.
- Gráfico interactivo con navigator temporal y marcadores de alertas.
- Panel IoT integrado para medidores Siemens (lectura en vivo, 11 variables, auto-refresh 30s).
- Resumen diario: potencia, voltaje, corriente, reactiva, factor de potencia, frecuencia.

### Comparativas

- Comparar consumo y costo entre edificios, agrupando por **tipo de tienda** (42 tipos) o por **nombre de tienda** (309 nombres).
- Selector multi-selección con búsqueda. Selector de mes.
- Gráfico con toggle barra/línea/área/torta y doble eje (consumo + costo).
- Tabla resumen con totales.

### Drill-down jerárquico

- Vista en árbol: edificio → concentradores → medidores.
- Navegación progresiva para entender la estructura eléctrica de cada sitio.

### Demanda eléctrica

- Gráfico de demanda con resolución temporal variable (15min a mensual).
- Comparación demanda pico vs demanda contratada.
- Ranking Top 10 picos de demanda.

### Calidad eléctrica

- 4 gráficos especializados con umbrales según normativa chilena (NCh Elec) e internacional (IEEE 519).
- Monitoreo de armónicos (THD), voltaje, frecuencia y factor de potencia.

### Historial de fallas

- Timeline cronológico de eventos de fallo por medidor.
- Permite analizar patrones de falla recurrentes.

### Monitoreo tiempo real

- Tabla de todos los medidores con 8 columnas (edificio, medidor, tienda, potencia, voltaje, corriente, FP, estado).
- Filtros avanzados en cascada. Actualización automática cada 60 segundos.
- Estado del medidor: Online (<30 min), Delay (<2h), Offline (>2h).

### Perfil personal y privacidad

- Página de perfil con datos personales, exportación JSON (portabilidad).
- Solicitud de rectificación, oposición, bloqueo, eliminación.
- Revocación de consentimiento.

---

## Mapa interactivo

- **47 sitios** visibles en mapa (20 con planos interiores, 27 con marcadores).
- **5.977 tiendas** buscables por nombre.
- Planos de piso reales con zonas coloreadas por estado energético.
- Selector de mall con badges (INDOOR/PIN), selector de piso, búsqueda de tienda con superficie (m²).
- Metadata por mall: superficie total, dirección, imagen.
- Sin dependencia de servicios externos en tiempo real — datos precargados.

---

## Conexión IoT (Siemens)

- Recepción directa de datos desde equipos **Siemens SENTRON** vía protocolo MQTT (IoT Core AWS).
- Datos cada 15 minutos: voltaje (L1/L2/L3), corriente (L1/L2/L3), potencia activa/reactiva, factor de potencia, frecuencia, THD, energía.
- Panel IoT integrado en la vista de detalle de cada medidor: lectura en vivo con auto-refresh cada 30 segundos.
- Alertas automáticas derivadas de anomalías (voltaje fuera de rango, factor de potencia bajo, THD elevado).
- Soporte para múltiples formatos de payload (POC3000, SENTRON flat, genérico).

---

## Facturación y costos

- **Dashboard financiero** con KPIs: pagos recibidos, facturas por vencer, facturas vencidas.
- Generación automática de facturas desde lecturas + bloques tarifarios (incluye IVA 19%).
- Aprobación, anulación y eliminación de facturas.
- Vista de tarifas con bloques horarios expandibles.
- Vista de facturas con filtros por edificio y estado, preview en PDF, descarga.
- Desglose por tienda al hacer click en cualquier factura.
- Multi-moneda: CLP, UF, USD, PEN, COP.

---

## Alertas inteligentes

- Motor de alertas automático que evalúa **22+ tipos de condición** cada 5 minutos.
- 6 familias: voltaje, corriente, potencia, factor de potencia, frecuencia, calidad de datos.
- 3 evaluadores de observabilidad de datos: quiebre de tendencia, pico de nulos, anomalía de volumen.
- Escalamiento automático según SLA por severidad (cada 10 min).
- Notificaciones por email (Amazon SES) y webhook.
- Historial completo con filtros, comentarios y resolución.
- Alertas visibles como marcadores rojos en gráficos de lecturas.

---

## Integraciones

- **Conectores configurables** para 5 protocolos industriales:
  - **BACnet** — protocolo estándar de automatización de edificios.
  - **SNMP** — monitoreo de equipos de red y UPS.
  - **REST** — integración con APIs de terceros.
  - **Webhook** — notificaciones push hacia sistemas externos.
  - **FTP** — intercambio de archivos con sistemas legacy.
- Cada conector con configuración JSON, timeout configurable, reintentos con backoff exponencial.
- Panel de salud por integración con logs paginados.
- Sincronización manual o programada.

---

## Reportes y exportación

- Reportes configurables: alcance (sitio/país/portafolio), período, secciones, formato (PDF, Excel, PPT).
- Exportación de datos crudos (CSV, JSON).
- Paquetes de evidencia firmados digitalmente (SHA-256) para auditoría.
- Exportación masiva con cola y estado de progreso.
- Colección Postman con 252 endpoints para integración técnica.

---

## Administración de usuarios

- Alta de usuarios con rol y sitios asignados, desde panel de administración.
- Invitación por email (y opcionalmente SMS) con instrucciones de acceso y MFA.
- Importación masiva desde CSV/XLSX con preview, validación y confirmación.
- Jerarquía de roles: cada nivel solo puede crear roles inferiores.
- Gestión de permisos granulares por módulo y acción.
- Impersonación de rol: un súper-administrador puede ver la plataforma como cualquier otro perfil.

---

## Self-service para empresas

- **Configuración de tenant** — cada empresa puede ajustar parámetros propios (timeout de sesión, minimización de datos, moneda).
- **API keys** — generación y gestión de claves propias para integración con sistemas internos.
- **Clientes OAuth** — registro de aplicaciones externas autorizadas para consumir la API.

---

## API externa para terceros

- API REST documentada (v1) para integración con sistemas de gestión.
- Autenticación por API key o OAuth.
- Endpoints de edificios, medidores, lecturas, facturas y exportación masiva.
- Rate limiting por key (3 niveles). Versionado con política de deprecación (6 meses).
- Filtros por calidad de dato, categoría de carga y rango temporal.

---

## Manual de usuario

- Documentación completa para usuarios no técnicos.
- Cubre las 30 pantallas organizadas por perfil.
- Incluye: login, MFA, navegación, cada módulo funcional, privacidad y FAQ.
- Disponible dentro del repositorio de la plataforma.

---

## Infraestructura y disponibilidad

- Desplegado en **AWS** (región us-east-1). Accesible desde `power-monitor.cloud`.
- Frontend servido desde CDN global (CloudFront) — carga rápida desde cualquier ubicación.
- Backend en contenedores (ECS Fargate) con escalamiento automático.
- Base de datos PostgreSQL administrada (RDS) con respaldo automático.
- Monitoreo con 6 alarmas CloudWatch + notificación SNS al equipo de operaciones.
- Pipeline de datos resiliente: si la conexión IoT se interrumpe, los datos se recuperan automáticamente al reconectarse.
- WAF (Web Application Firewall) con reglas gestionadas para protección contra ataques comunes.
- Escaneo automático de vulnerabilidades en contenedores (AWS Inspector).

---

## Cumplimiento normativo

| Normativa | Estado |
|-----------|--------|
| Ley 21.719 (Datos Personales Chile) | Completo — ARCO+, consentimiento, breach 24h, DPO |
| Anexo 07 PASA | ~88% cerrado — 77 de 99 requerimientos no funcionales |
| ISO 27001 | Controles implementados — auditoría, cifrado, gestión de accesos |
| OWASP Top 10 | Mitigado — validación de entrada, CSRF, XSS, inyección SQL |
| NCh Elec / IEEE 519 | Umbrales de calidad eléctrica configurados |
| CIS Hardening | Checklist generado (31 controles, 5 categorías) |

---

## Cifras clave

| Métrica | Valor |
|---------|-------|
| Medidores activos | 875 |
| Sitios (malls) | 47 |
| Tiendas mapeadas | 5.977 |
| Pantallas funcionales | 30 (por perfil) + vistas compartidas |
| Perfiles de usuario | 5 |
| Tests automatizados | 2.184 (backend + frontend) |
| Tipos de alerta | 22+ |
| Protocolos de integración | 5 (BACnet, SNMP, REST, Webhook, FTP) |
| Frecuencia de datos IoT | cada 15 min |
| Monedas soportadas | 5 (CLP, UF, USD, PEN, COP) |
| Lecturas históricas | ~2.6 millones |
| Endpoints API | 252 |

---

*Plataforma desarrollada por Globe Power. Operación y soporte por Hoktus.*

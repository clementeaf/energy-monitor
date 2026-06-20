# Manual de Usuario — Plataforma de Monitoreo Energético

## Contenido

1. [Primeros Pasos](#1-primeros-pasos)
2. [Inicio de Sesión](#2-inicio-de-sesión)
3. [Navegación General](#3-navegación-general)
4. [Dashboard](#4-dashboard)
5. [Monitoreo](#5-monitoreo)
6. [Alertas](#6-alertas)
7. [Facturación](#7-facturación)
8. [Reportes y Analítica](#8-reportes-y-analítica)
9. [Mapa](#9-mapa)
10. [Administración](#10-administración)
11. [Mi Perfil y Privacidad](#11-mi-perfil-y-privacidad)
12. [Preguntas Frecuentes](#12-preguntas-frecuentes)

---

## 1. Primeros Pasos

### ¿Qué es esta plataforma?

Es un sistema web para visualizar y gestionar el consumo eléctrico de edificios comerciales. Permite ver en tiempo real cuánta energía se está consumiendo, detectar anomalías, generar facturas y tomar decisiones informadas sobre eficiencia energética.

### ¿Qué necesito para acceder?

- Un navegador web actualizado (Chrome, Firefox, Edge o Safari).
- Una cuenta de usuario proporcionada por su administrador.
- Conexión a internet.

### ¿Qué voy a ver?

Dependiendo de su rol, verá distintas secciones. Por ejemplo:
- Un **técnico** ve datos eléctricos (voltaje, potencia, calidad).
- Un **gerente** ve costos, facturas y comparativas entre edificios.
- Un **locatario** ve solo su propia factura.

No se preocupe si no ve todas las opciones del menú — es normal. Su administrador configuró su acceso según su función.

---

## 2. Inicio de Sesión

### Cómo ingresar

1. Abra su navegador y vaya a la dirección de la plataforma (por ejemplo: `https://power-monitor.cloud`).
2. Se mostrará la pantalla de inicio de sesión.
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

## 3. Navegación General

### Menú lateral (Sidebar)

Al lado izquierdo de la pantalla encontrará el menú principal con las siguientes secciones (según su rol):

| Sección | Qué contiene |
|---------|-------------|
| **Dashboard** | Resúmenes y gráficos generales |
| **Monitoreo** | Medidores, edificios y mapa |
| **Alertas** | Notificaciones de eventos importantes |
| **Facturación** | Facturas y tarifas eléctricas |
| **Reportes y Analítica** | Informes y análisis de tendencias |
| **Integraciones** | Conexiones con sistemas externos |
| **Administración** | Gestión de usuarios, roles y configuración |

### Cómo usar el menú

- **Haga clic** en una sección para expandir sus subsecciones.
- **Haga clic** en una subsección para ir a esa página.
- **Contraer el menú**: haga clic en el logo en la parte superior para colapsar el menú y tener más espacio para el contenido.

### Seleccionar empresa

Si usted administra múltiples empresas, verá un selector de empresa en el menú lateral. Seleccione la empresa que desea visualizar antes de navegar a las secciones.

> Las secciones marcadas como "requieren empresa" mostrarán un mensaje pidiéndole seleccionar una empresa antes de mostrar datos.

---

## 4. Dashboard

El Dashboard es la página principal que ve al ingresar. Existen tres tipos:

### 4.1 Dashboard General

Muestra un resumen rápido del estado actual:
- **Consumo total** del período seleccionado (en kWh).
- **Potencia actual** en tiempo real (en kW).
- **Cantidad de alertas** activas.
- **Gráfico de consumo** en el tiempo (barras o línea).

Puede cambiar el rango de tiempo del gráfico usando los botones en la parte superior del gráfico: **1D** (un día), **1S** (una semana), **1M** (un mes), **3M**, **6M**, **1A** (un año).

### 4.2 Dashboard Ejecutivo

Diseñado para gerentes y directivos. Incluye:
- **KPIs financieros**: costo total, costo por m², ahorro vs período anterior.
- **Ranking de edificios** por consumo o costo.
- **Gráfico comparativo** entre edificios.
- **Tendencias de consumo** mensuales.

Para ver el detalle de un edificio específico, haga clic en su nombre en el ranking.

### 4.3 Dashboard Comparativo

Permite comparar el desempeño de varios edificios lado a lado:
- Seleccione los edificios que desea comparar.
- Vea gráficos superpuestos de consumo, demanda y costos.

### 4.4 Dashboard Plataforma (solo Super Admin)

Vista global de toda la plataforma, sin filtro por empresa. Muestra KPIs agregados de todos los tenants.

---

## 5. Monitoreo

### 5.1 Medidores

Lista todos los medidores eléctricos registrados. Cada fila muestra:
- **Nombre** del medidor.
- **Edificio** al que pertenece.
- **Última lectura** (fecha y valor).
- **Estado**: en línea (verde), fuera de línea (gris) o en alarma (rojo).

**Acciones disponibles:**
- **Buscar**: use el campo de búsqueda para encontrar un medidor por nombre o código.
- **Ver detalle**: haga clic en un medidor para ver sus lecturas históricas.
- **Filtrar por edificio**: use el selector de edificio para ver solo medidores de un sitio.

### 5.2 Edificios

Lista todos los edificios/sitios registrados:
- **Nombre y dirección** del edificio.
- **Cantidad de medidores** instalados.
- **Consumo del período** actual.

Haga clic en un edificio para ver su detalle, que incluye:
- Tabs de **Facturación** y **Medidores** del edificio.
- Gráficos de consumo específicos del sitio.

### 5.3 Detalle de Medidor

Al hacer clic en un medidor, verá:
- **Gráfico de lecturas** en el tiempo (potencia activa, reactiva, voltaje, etc.).
- **Selector de rango**: 1D, 1S, 1M, 3M, 6M, 1A.
- **Tabla de lecturas** con valores exactos por intervalo.
- **Calidad eléctrica**: voltaje, factor de potencia, distorsión armónica (THD).

### 5.4 Drill-down (Vista jerárquica)

Permite navegar desde el nivel de edificio hasta cada medidor individual:
- Edificio → Concentradores → Medidores.
- Haga clic en cada nivel para profundizar.

### 5.5 Demanda

Muestra la demanda eléctrica (potencia máxima):
- **Demanda actual** vs **demanda contratada**.
- **Top 10 picos** de demanda del período.
- Gráfico StockChart con navegación temporal.

### 5.6 Calidad Eléctrica

4 gráficos que muestran la calidad del suministro:
- **Voltaje** (debe estar entre 220V ±10%).
- **Factor de potencia** (debe ser ≥ 0.93).
- **THD de corriente** (distorsión armónica, máx 8% según norma IEEE 519).
- **Frecuencia** (debe ser 50Hz ±0.5%).

Las líneas punteadas rojas indican los umbrales normativos.

---

## 6. Alertas

### 6.1 Alertas Activas

Lista de alertas vigentes que requieren atención:
- **Severidad**: Crítica (rojo), Alta (naranja), Media (amarillo), Baja (azul).
- **Tipo**: medidor fuera de línea, voltaje fuera de rango, demanda excedida, etc.
- **Edificio y medidor** afectados.
- **Fecha** de detección.

**Acciones:**
- **Reconocer** (ACK): indica que usted ha visto la alerta y está trabajando en ella.
- **Resolver**: marca la alerta como resuelta cuando el problema se solucionó.

### 6.2 Historial / SLA

Muestra todas las alertas históricas, incluyendo las ya resueltas:
- Tiempo de respuesta (cuánto tardó en reconocerse).
- Tiempo de resolución.
- Filtros por severidad, estado, edificio y rango de fechas.

### 6.3 Reglas de Alerta

Los administradores pueden configurar cuándo se genera una alerta:
- **Medidor fuera de línea** más de X minutos.
- **Voltaje fuera de rango** (por encima o debajo del umbral).
- **Factor de potencia bajo** (< 0.93).
- **Demanda excede** la potencia contratada.
- Y más tipos según necesidad.

---

## 7. Facturación

### 7.1 Facturas

Lista de facturas generadas:
- **Período** (mes/año).
- **Edificio** y **locatario**.
- **Monto total** (en CLP).
- **Estado**: Pendiente, Aprobada, Anulada.

**Acciones según su rol:**
- **Ver detalle**: haga clic en una factura para ver el desglose (consumo por bloque horario, cargos, IVA).
- **Aprobar**: marca la factura como revisada y correcta.
- **Anular**: invalida una factura incorrecta.
- **Generar PDF**: descarga la factura en formato PDF.

> Si usted es **locatario**, solo verá las facturas de su propio local.

### 7.2 Tarifas

Muestra las tarifas eléctricas configuradas:
- **Nombre de la tarifa** y edificio asociado.
- **Bloques horarios**: punta, llano, valle con sus respectivos precios por kWh.
- **Cargos fijos**: demanda contratada, peaje, etc.

---

## 8. Reportes y Analítica

### 8.1 Reportes

Informes generados sobre consumo y operación:
- **Reportes disponibles**: consumo mensual, comparativo, eficiencia.
- **Descargar**: cada reporte se puede exportar en PDF o Excel.
- **Programar**: configure envíos automáticos por email (semanal, mensual).

### 8.2 Benchmarking

Compare el desempeño energético entre edificios:
- **Consumo por m²**: identifique cuáles edificios son más eficientes.
- **Ranking**: ordenado de menor a mayor consumo específico.
- **Filtros**: por período, región, tipo de edificio.

### 8.3 Tendencias

Gráficos de tendencia a largo plazo:
- **Consumo mensual** de los últimos 12 meses.
- **Línea de tendencia**: indica si el consumo está subiendo o bajando.
- **Proyección**: estimación para los próximos meses basada en datos históricos.

### 8.4 Patrones

Detecta patrones de consumo:
- **Patrón horario**: consumo típico por hora del día.
- **Patrón semanal**: días laborales vs fines de semana.
- **Anomalías**: días con consumo inusualmente alto o bajo.

---

## 9. Mapa

Vista geográfica de todos los edificios y centros comerciales:

### Cómo usar el mapa

1. **Seleccione un edificio** en el panel izquierdo usando el selector "Edificio".
2. El mapa centrará la vista en ese edificio.
3. Si el edificio tiene **mapa indoor** (interior), verá:
   - Los pisos del edificio en el selector "Nivel".
   - Las tiendas individuales dentro de cada piso.
   - Polígonos de colores mostrando las áreas de cada tienda.

### Buscar tiendas

1. Use el campo **"Buscar tienda..."** en el panel izquierdo.
2. Escriba el nombre de la tienda (ej: "Starbucks").
3. Seleccione la tienda de la lista.
4. El mapa volará hasta la ubicación de la tienda y mostrará:
   - Un marcador rojo en su posición.
   - Un popup con el nombre y los **metros cuadrados** del local.
   - El polígono de la tienda resaltado en rojo.

### Tipos de edificios en el mapa

- **Marcador azul con mapa indoor**: edificios con planos interiores detallados. Puede ver pisos, tiendas y áreas.
- **Marcador amarillo (PIN)**: edificios sin mapa interior. Solo muestra ubicación, dirección y superficie total.

### Cambiar de piso

Use el selector **"Nivel"** en el panel izquierdo para cambiar entre pisos del edificio.

---

## 10. Administración

> Esta sección solo es visible para usuarios con permisos de administración.

### 10.1 Usuarios

Gestión de usuarios de la plataforma:
- **Crear usuario**: ingrese nombre, email, rol y edificios asignados. El usuario recibirá una invitación por email.
- **Editar**: cambie el rol, edificios asignados o estado del usuario.
- **Desactivar**: deshabilite temporalmente el acceso de un usuario.
- **Importar**: cargue usuarios masivamente desde un archivo Excel/CSV.

### 10.2 Roles y Permisos

Configure qué puede ver y hacer cada tipo de usuario:

1. **Crear un rol**: haga clic en "Nuevo Rol", ingrese nombre y descripción.
2. **Asignar permisos**: marque las casillas de los módulos que este rol puede acceder:

| Grupo | Permisos disponibles |
|-------|---------------------|
| Dashboard | Ejecutivo (costos) / Técnico (datos eléctricos) |
| Monitoreo | Dispositivos, lecturas, historial de fallas |
| Alertas | Ver, crear reglas, resolver, eliminar |
| Facturación | Ver todas / ver propias / generar / aprobar / anular |
| Reportes | Ver, crear, programar |
| Integraciones | Ver, crear, editar conectores |
| Edificios y Medidores | Ver, crear, editar, eliminar |
| Administración | Usuarios, locatarios, jerarquía, roles, API keys, auditoría |

3. **Guardar**: el rol quedará disponible para asignar a usuarios.

**Ejemplo de roles comunes:**

| Rol | Qué ve | Qué NO ve |
|-----|--------|-----------|
| Técnico Eléctrico | Lecturas, calidad, alertas, dispositivos | Facturas, costos, reportes financieros |
| Gerente Financiero | Dashboard ejecutivo, facturas, tarifas, reportes | Datos técnicos, alertas, medidores |
| Locatario | Solo su propia factura | Todo lo demás |
| Administrador | Todo el sistema | — |

### 10.3 Empresas

Crear y gestionar las empresas (tenants) de la plataforma:
- Cada empresa tiene su propia configuración, usuarios, edificios y datos.
- Al crear una empresa se generan automáticamente los roles básicos.

### 10.4 Locatarios

Gestión de unidades de locatarios (tiendas/locales dentro de un edificio):
- **Crear**: asigne un nombre, edificio y medidores asociados.
- **Editar**: modifique la asignación de medidores.

### 10.5 Jerarquía

Vista en árbol de la estructura organizacional:
- Edificio → Áreas → Sub-áreas → Medidores.
- Permite organizar visualmente dónde está cada medidor.

### 10.6 API Keys y OAuth Clients

Para integraciones con sistemas externos:

**API Keys** (acceso simple):
1. Haga clic en "Crear API Key".
2. Asigne un nombre y seleccione los permisos.
3. **Copie la clave** — solo se muestra una vez.
4. Use la clave en el header `X-API-Key` de sus llamadas HTTP.

**OAuth Clients** (acceso estándar):
1. Haga clic en "Crear Cliente OAuth".
2. Asigne nombre y permisos.
3. Copie el `client_id` y `client_secret`.
4. Obtenga un token: `POST /api/oauth/token` con las credenciales.
5. Use el token en el header `Authorization: Bearer <token>`.

### 10.7 Calidad de Datos

Reporte que muestra la calidad de las lecturas por edificio:
- **Medidas**: lecturas reales recibidas del medidor.
- **Estimadas**: lecturas calculadas cuando faltan datos.
- **Inválidas**: lecturas descartadas por errores.

### 10.8 Auditoría

Registro de todas las acciones realizadas en la plataforma:
- Quién hizo qué, cuándo y desde dónde (IP).
- Filtros por usuario, tipo de acción y rango de fechas.
- Exportable para cumplimiento normativo.

### 10.9 Configuración

Ajustes generales de la empresa:
- Logo y colores de la interfaz.
- Tiempo de inactividad antes de cerrar sesión.
- Preferencias de notificación.

---

## 11. Mi Perfil y Privacidad

Acceda a su perfil haciendo clic en su nombre en el menú lateral.

### Datos personales

Vea sus datos registrados en la plataforma:
- Nombre, email, rol asignado, edificios con acceso.

### Derechos de privacidad (Ley 21.719)

Puede ejercer los siguientes derechos:
- **Exportar mis datos**: descarga un archivo JSON con toda su información.
- **Rectificación**: solicite corregir datos incorrectos.
- **Oposición**: solicite que se dejen de procesar sus datos.
- **Bloqueo**: solicite suspender temporalmente el procesamiento.
- **Eliminación**: solicite que se eliminen sus datos (requiere aprobación del administrador).
- **Revocar consentimiento**: retire su consentimiento para el procesamiento de datos.

---

## 12. Preguntas Frecuentes

### ¿Por qué no veo ciertas secciones del menú?
Su administrador configuró su rol con permisos específicos. Si necesita acceso a una sección adicional, contacte a su administrador.

### ¿Cada cuánto se actualizan los datos?
Los datos de medidores se actualizan cada 15 minutos. Los gráficos en la vista de tiempo real se refrescan automáticamente cada 30 segundos.

### ¿Qué significan los colores de las alertas?
- **Rojo (Crítica)**: requiere atención inmediata (ej: medidor sin comunicación por más de 2 horas).
- **Naranja (Alta)**: problema importante (ej: voltaje fuera de norma).
- **Amarillo (Media)**: situación a monitorear (ej: factor de potencia bajo).
- **Azul (Baja)**: informativo (ej: consumo por encima del promedio).

### ¿Cómo interpreto el gráfico de demanda?
- La **línea azul** muestra la demanda real (potencia máxima alcanzada).
- La **línea roja punteada** muestra la demanda contratada.
- Si la línea azul supera la roja, significa que se está excediendo la potencia contratada, lo que puede generar multas.

### ¿Qué es el factor de potencia y por qué importa?
El factor de potencia indica qué tan eficientemente se usa la energía eléctrica. Un valor de 1.0 es perfecto, y valores menores a 0.93 pueden generar recargos en la factura eléctrica.

### ¿Puedo ver datos de meses anteriores?
Sí. En cualquier gráfico, use el selector de rango temporal o arrastre la barra de navegación inferior para moverse en el tiempo.

### ¿Qué hago si un medidor aparece como "fuera de línea"?
1. Verifique que el medidor tenga alimentación eléctrica.
2. Revise la conexión de comunicación (cable de red o señal WiFi).
3. Si el problema persiste, contacte al equipo de soporte técnico.

### ¿Cómo genero una factura?
1. Vaya a **Facturación → Facturas**.
2. Haga clic en **"Generar Factura"**.
3. Seleccione el edificio, locatario y período.
4. El sistema calculará automáticamente el consumo y aplicará la tarifa vigente.
5. Revise el monto y haga clic en **"Generar"**.

### ¿Cómo contacto soporte?
Haga clic en el ícono de contacto en la parte inferior del menú lateral para ver las opciones de soporte disponibles (email, teléfono, WhatsApp).

---

*Versión del manual: 2.23.1 — Junio 2026*

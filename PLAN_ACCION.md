# PLAN DE ACCIÓN — POWER Digital®

> Ruta de implementación desde el prototipo actual (v0.1.0) hacia la plataforma completa según la especificación `POWER_Digital_Especificacion_Modulos.xlsx`.

---

## Estado Actual (v0.1.0)

El proyecto es un scaffold funcional con React 19 + Vite + TypeScript que implementa:

- 3 rutas básicas (listado edificios → detalle edificio → detalle local)
- 5 componentes UI genéricos (Layout, Card, Chart, DataTable, PageHeader)
- Mock data (5 edificios, 10 locales, consumo mensual)
- Capa de servicios con Axios (apuntando a mocks)
- React Query para cache, Zustand para UI state
- Diseño monocromático low-fidelity, responsivo

**No tiene:** autenticación, roles, dashboards ejecutivo/técnico, facturación, alertas, reportes, auditoría, integraciones, analítica, filtros globales, monitoreo real-time, jerarquía eléctrica.

---

## Fases de Implementación

La especificación define 3 fases de entrega: **Alpha**, **Beta** y **Core**. Este plan respeta ese orden y agrupa el trabajo en sprints lógicos dentro de cada fase.

---

## FASE 1 — ALPHA

> Fundamento del sistema: autenticación, monitoreo real-time, administración base y la jerarquía eléctrica.

### Sprint A1 · Fundación y Autenticación (M01)

> **Objetivo:** Login funcional con Microsoft y Google, modo demo para desarrollo, protección de rutas por rol.

---

#### BLOQUE 1 — Preparación del entorno y tipos (micro-tareas 1.1–1.5)

| # | Micro-tarea | Archivos | Detalle |
|---|-------------|----------|---------|
| 1.1 | Instalar dependencias de autenticación | `package.json` | `npm install @azure/msal-browser @azure/msal-react @react-oauth/google` |
| 1.2 | Crear archivo de variables de entorno | `.env`, `.env.example` | Variables: `VITE_MICROSOFT_CLIENT_ID`, `VITE_MICROSOFT_TENANT_ID`, `VITE_MICROSOFT_REDIRECT_URI`, `VITE_GOOGLE_CLIENT_ID`, `VITE_AUTH_MODE` (microsoft / google / demo). Agregar `.env` al `.gitignore`. El `.env.example` sirve de referencia sin valores reales. |
| 1.3 | Agregar tipos de autenticación | `src/types/auth.ts` | Tipos: `AuthProvider` (literal: 'microsoft' \| 'google' \| 'demo'), `Role` (literal union de los 7 roles: SUPER_ADMIN, CORP_ADMIN, SITE_ADMIN, OPERATOR, ANALYST, TENANT_USER, AUDITOR), `AuthUser` (id, email, name, role, provider, avatar?, siteIds), `AuthState` (user \| null, isAuthenticated, isLoading, error). |
| 1.4 | Agregar tipos globales del dominio | `src/types/index.ts` | Extender con interfaces: `Meter`, `HierarchyNode`, `Reading`, `Alert`, `Invoice`, `AuditLog`, `Tenant`, `Integration`. Basados en campos de la Hoja 5 de la especificación. |
| 1.5 | Configurar Vite para variables de entorno | `src/env.d.ts` | Declarar `ImportMetaEnv` con las 5 variables de `.env` para que TypeScript las reconozca sin error. |

---

#### BLOQUE 2 — Configuración de Microsoft MSAL (micro-tareas 2.1–2.5)

**Prerequisito en Azure Portal (manual, no es código):**
1. Ir a [Microsoft Entra admin center](https://entra.microsoft.com) → App registrations → New registration.
2. Nombre: "POWER Digital". Tipo cuenta: "Accounts in any organizational directory" (multi-tenant).
3. Redirect URI: plataforma "Single-page application (SPA)", valor `http://localhost:5173` (Vite default).
4. Anotar **Application (client) ID** y **Directory (tenant) ID**.
5. En API permissions: agregar `User.Read` (Microsoft Graph). Grant admin consent.

| # | Micro-tarea | Archivos | Detalle |
|---|-------------|----------|---------|
| 2.1 | Crear archivo de configuración MSAL | `src/auth/msalConfig.ts` | Exportar objeto `msalConfig` de tipo `Configuration` con: `auth.clientId` ← `import.meta.env.VITE_MICROSOFT_CLIENT_ID`, `auth.authority` ← `https://login.microsoftonline.com/{tenantId}`, `auth.redirectUri` ← `import.meta.env.VITE_MICROSOFT_REDIRECT_URI` (default `http://localhost:5173`), `auth.postLogoutRedirectUri` ← `/login`, `cache.cacheLocation` ← `'sessionStorage'`, `cache.storeAuthStateInCookie` ← `false`. Exportar `loginRequest` con `scopes: ['openid', 'profile', 'email', 'User.Read']`. |
| 2.2 | Crear instancia PublicClientApplication | `src/auth/msalInstance.ts` | Importar `PublicClientApplication` de `@azure/msal-browser`. Crear y exportar `const msalInstance = new PublicClientApplication(msalConfig)`. **Importante:** debe instanciarse fuera del árbol de React para evitar re-instanciación en re-renders. |
| 2.3 | Wrappear App con MsalProvider | `src/main.tsx` | Importar `MsalProvider` de `@azure/msal-react` y `msalInstance`. Envolver `<App />` con `<MsalProvider instance={msalInstance}>`. El orden de providers queda: StrictMode → MsalProvider → App (que dentro tiene QueryClientProvider → RouterProvider). |
| 2.4 | Crear helper de login Microsoft | `src/auth/microsoftAuth.ts` | Función `loginWithMicrosoft(instance)`: llama `instance.loginPopup(loginRequest)`. Retorna `AuthenticationResult`. Función `logoutMicrosoft(instance)`: llama `instance.logoutPopup()`. Función `getMicrosoftUser(account): AuthUser`: mapea los campos del account de MSAL (name, username, localAccountId) a nuestra interfaz `AuthUser`. |
| 2.5 | Crear hook useMicrosoftAuth | `src/hooks/auth/useMicrosoftAuth.ts` | Hook que usa `useMsal()` internamente. Expone: `login()`, `logout()`, `account` (activo), `isAuthenticated` (via `useIsAuthenticated()`), `inProgress`. Maneja `handleRedirectPromise` para el flujo de redirect si se usa en el futuro. |

---

#### BLOQUE 3 — Configuración de Google OAuth (micro-tareas 3.1–3.4)

**Prerequisito en Google Cloud Console (manual, no es código):**
1. Ir a [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials.
2. Create Credentials → OAuth client ID → Application type: "Web application".
3. Authorized JavaScript origins: `http://localhost:5173`.
4. Authorized redirect URIs: `http://localhost:5173`.
5. Anotar **Client ID**.
6. En OAuth consent screen: configurar nombre app, logo, scopes (`email`, `profile`, `openid`).

| # | Micro-tarea | Archivos | Detalle |
|---|-------------|----------|---------|
| 3.1 | Crear archivo de configuración Google | `src/auth/googleConfig.ts` | Exportar `googleClientId` ← `import.meta.env.VITE_GOOGLE_CLIENT_ID`. |
| 3.2 | Wrappear App con GoogleOAuthProvider | `src/main.tsx` | Importar `GoogleOAuthProvider` de `@react-oauth/google`. Envolver el árbol con `<GoogleOAuthProvider clientId={googleClientId}>`. El orden queda: StrictMode → MsalProvider → GoogleOAuthProvider → App. |
| 3.3 | Crear helper de login Google | `src/auth/googleAuth.ts` | Función `parseGoogleCredential(credential: string): AuthUser`: decodifica el JWT del credential response (es un ID token con payload en base64), extrae `sub`, `email`, `name`, `picture` y los mapea a `AuthUser`. No necesita librería externa: `JSON.parse(atob(credential.split('.')[1]))`. |
| 3.4 | Crear hook useGoogleAuth | `src/hooks/auth/useGoogleAuth.ts` | Hook que usa `useGoogleLogin` de `@react-oauth/google` internamente. Expone: `login()` (trigger del popup), `logout()` (limpia estado local), función callback `onSuccess` que parsea el credential y actualiza el auth store. |

---

#### BLOQUE 4 — Auth Store y Modo Demo (micro-tareas 4.1–4.4)

| # | Micro-tarea | Archivos | Detalle |
|---|-------------|----------|---------|
| 4.1 | Crear auth store con Zustand | `src/store/useAuthStore.ts` | Estado: `user: AuthUser \| null`, `isAuthenticated: boolean`, `isLoading: boolean`, `error: string \| null`. Acciones: `setUser(user)`, `clearUser()`, `setLoading(bool)`, `setError(msg)`. Persistir en sessionStorage con middleware `persist` de Zustand para mantener sesión al refrescar. |
| 4.2 | Crear datos mock de usuarios demo | `src/mocks/users.ts` | Array de 7 usuarios demo, uno por rol. Cada uno con: id, name, email ficticio, role, provider='demo', siteIds (según alcance del rol). Ejemplo: `{ id: 'demo-1', name: 'Admin Global', email: 'admin@demo.power', role: 'SUPER_ADMIN', provider: 'demo', siteIds: ['*'] }`. |
| 4.3 | Crear hook useDemoAuth | `src/hooks/auth/useDemoAuth.ts` | Hook que expone: `login(role: Role)`: busca el usuario mock correspondiente al rol, lo setea en el auth store. `logout()`: limpia store. Sin popup ni redirect, todo local. |
| 4.4 | Crear hook unificado useAuth | `src/hooks/auth/useAuth.ts` | Hook fachada que abstrae el proveedor activo. Detecta `VITE_AUTH_MODE` o el provider guardado en store. Expone API unificada: `login(provider?)`, `logout()`, `user`, `isAuthenticated`, `isLoading`. Internamente delega a `useMicrosoftAuth`, `useGoogleAuth` o `useDemoAuth` según corresponda. Este es el único hook que consumirán las páginas y componentes. |

---

#### BLOQUE 5 — Página de Login (micro-tareas 5.1–5.5)

| # | Micro-tarea | Archivos | Detalle |
|---|-------------|----------|---------|
| 5.1 | Crear componente LoginPage | `src/features/auth/LoginPage.tsx` | Página fullscreen centrada. Logo POWER Digital® arriba. Dos botones principales: "Continuar con Microsoft" (ícono MS) y "Continuar con Google" (ícono G). Separador "o". Sección inferior "Modo Demo" (solo visible si `VITE_AUTH_MODE === 'demo'` o en `import.meta.env.DEV`). Usa el hook `useAuth`. Si `isAuthenticated`, redirige a `/`. |
| 5.2 | Crear componente DemoRoleSelector | `src/features/auth/components/DemoRoleSelector.tsx` | Grid de 7 cards, una por rol. Cada card muestra: nombre del rol, nombre sistema (ej: SUPER_ADMIN), descripción corta, ejemplo de usuario. Al hacer click, llama `login('demo')` con el rol seleccionado. |
| 5.3 | Crear componente MicrosoftLoginButton | `src/features/auth/components/MicrosoftLoginButton.tsx` | Botón estilizado con ícono de Microsoft. Al click, llama al flujo de login Microsoft via `useAuth`. Muestra spinner durante `inProgress`. Muestra error si falla. |
| 5.4 | Crear componente GoogleLoginButton | `src/features/auth/components/GoogleLoginButton.tsx` | Botón estilizado con ícono de Google. Puede usar `GoogleLogin` de `@react-oauth/google` directamente (renderiza botón oficial) o botón custom con `useGoogleLogin`. Muestra error si falla. |
| 5.5 | Registrar ruta /login | `src/app/router.tsx` | Agregar ruta `{ path: '/login', element: <LoginPage /> }` **fuera** del layout principal (no tiene sidebar ni header). Es una ruta standalone. |

---

#### BLOQUE 6 — Protección de rutas (micro-tareas 6.1–6.5)

| # | Micro-tarea | Archivos | Detalle |
|---|-------------|----------|---------|
| 6.1 | Crear constantes de permisos | `src/auth/permissions.ts` | Objeto `PERMISSIONS` que replica la matriz de la Hoja 1 (sección 1.2). Estructura: `{ [módulo]: { [acción]: Role[] } }`. Ejemplo: `PERMISSIONS.DASHBOARD_EXECUTIVE['view_portfolio'] = ['SUPER_ADMIN', 'CORP_ADMIN', 'ANALYST', 'AUDITOR']`. Helper `hasPermission(role: Role, module: string, action: string): boolean`. |
| 6.2 | Crear componente ProtectedRoute | `src/components/auth/ProtectedRoute.tsx` | Wrapper que lee `useAuth()`. Si `isLoading` → spinner. Si `!isAuthenticated` → `<Navigate to="/login" />`. Si `allowedRoles` prop definido y rol del usuario no está en la lista → `<Navigate to="/unauthorized" />`. Si pasa todo → renderiza `children` u `<Outlet />`. |
| 6.3 | Crear página Unauthorized | `src/features/auth/UnauthorizedPage.tsx` | Página simple: "No tienes permiso para acceder a esta sección". Botón "Volver al inicio". Registrar ruta `/unauthorized`. |
| 6.4 | Envolver rutas existentes con ProtectedRoute | `src/app/router.tsx` | El grupo de rutas con `<Layout />` ahora pasa por `<ProtectedRoute>`. La ruta `/login` queda fuera. Estructura: `[{ path: '/login', element: <LoginPage /> }, { element: <ProtectedRoute><Layout /></ProtectedRoute>, children: [...rutas existentes] }]`. |
| 6.5 | Agregar info de usuario al Layout | `src/components/ui/Layout.tsx` | En el header o sidebar: mostrar avatar + nombre del usuario logueado. Botón/link de "Cerrar sesión" que llama `useAuth().logout()`. Mostrar badge con el rol actual. |

---

#### BLOQUE 7 — Verificación y testing manual (micro-tareas 7.1–7.4)

| # | Micro-tarea | Archivos | Detalle |
|---|-------------|----------|---------|
| 7.1 | Test flujo demo completo | — | Verificar: abrir app → redirige a /login → click en rol demo → entra a la app → sidebar muestra nombre/rol → logout → vuelve a /login. |
| 7.2 | Test flujo Microsoft | — | Verificar: click "Continuar con Microsoft" → popup de Azure → login → redirect → app muestra usuario real → logout. Requiere `.env` con client ID real. |
| 7.3 | Test flujo Google | — | Verificar: click "Continuar con Google" → popup/redirect de Google → consent → app muestra usuario real → logout. Requiere `.env` con client ID real. |
| 7.4 | Test protección de rutas | — | Verificar: acceder a `/buildings/1` sin login → redirige a `/login`. Loguearse como TENANT_USER → intentar acceder a `/admin/users` → redirige a `/unauthorized`. |

---

#### Resumen de archivos nuevos (Sprint A1, Bloques 1-7)

```
src/
├── auth/
│   ├── msalConfig.ts          ← Configuración MSAL (clientId, authority, scopes)
│   ├── msalInstance.ts        ← Instancia PublicClientApplication (singleton)
│   ├── googleConfig.ts        ← Client ID de Google
│   ├── microsoftAuth.ts       ← Helpers login/logout/parseUser Microsoft
│   ├── googleAuth.ts          ← Helper parseGoogleCredential
│   └── permissions.ts         ← Matriz de permisos por rol/módulo/acción
├── components/
│   └── auth/
│       └── ProtectedRoute.tsx ← Guard de ruta autenticada + roles
├── features/
│   └── auth/
│       ├── LoginPage.tsx      ← Página principal de login
│       ├── UnauthorizedPage.tsx
│       └── components/
│           ├── DemoRoleSelector.tsx
│           ├── MicrosoftLoginButton.tsx
│           └── GoogleLoginButton.tsx
├── hooks/
│   └── auth/
│       ├── useMicrosoftAuth.ts
│       ├── useGoogleAuth.ts
│       ├── useDemoAuth.ts
│       └── useAuth.ts        ← Hook fachada unificado (el que se usa en la app)
├── mocks/
│   └── users.ts              ← 7 usuarios demo, uno por rol
├── store/
│   └── useAuthStore.ts       ← Estado de autenticación (Zustand + persist)
├── types/
│   └── auth.ts               ← AuthProvider, Role, AuthUser, AuthState
├── env.d.ts                   ← Tipado de variables de entorno Vite
.env                           ← Variables reales (no se commitea)
.env.example                   ← Plantilla de referencia (se commitea)
```

#### Archivos modificados

```
src/main.tsx                   ← Agregar MsalProvider + GoogleOAuthProvider
src/app/App.tsx                ← Sin cambios (ya tiene QueryClient + Router)
src/app/router.tsx             ← Agregar /login, /unauthorized, ProtectedRoute wrapper
src/components/ui/Layout.tsx   ← Agregar user info + logout en header/sidebar
src/types/index.ts             ← Extender con tipos del dominio
.gitignore                     ← Agregar .env
```

---

### Sprint A1 · Tareas originales restantes

| # | Tarea | Detalle |
|---|-------|---------|
| 5 | Refactorizar Layout con filtros globales | Agregar al header: selector de edificio (dropdown con search), período rápido (segmented control: Hoy/7d/30d/90d/12m/Personalizado), date range picker. Persistir entre navegaciones. |
| 6 | Crear store global de filtros | Zustand store: `selectedSiteId`, `period`, `dateRange`, `autoRefresh`. Todos los módulos leen de aquí. |

### Sprint A2 · Dashboard Técnico — Real-Time (M03)

| # | Tarea | Detalle |
|---|-------|---------|
| 7 | Mock data de medidores y lecturas | Datos para ~20 medidores Siemens PAC3200 con lecturas: kWh, kW, kVArh, FP, V, I, THD. Timestamps cada 15s-5min. |
| 8 | Vista Monitoreo Real-Time | Ruta `/monitoring/realtime`. Gauges por variable (V, I, kW, FP) con Custom SVG. Gráfico streaming últimas 4h (D3.js/uPlot, sliding window). Tabla medidores con última lectura + estado conexión. |
| 9 | Toggle auto-refresh | Componente toggle con intervalo seleccionable (5s/15s/30s/60s/Off). Badge con countdown visible. |
| 10 | Semáforos de estado | Indicadores visuales online/offline/error por medidor. Dot color junto al nombre en tablas y dropdowns. |

### Sprint A3 · Dashboard Técnico — Drill-down Jerárquico (M03)

| # | Tarea | Detalle |
|---|-------|---------|
| 11 | Modelo de jerarquía eléctrica | Estructura de árbol 5 niveles: Edificio → Tablero General → Subtablero → Circuito → Medidor. Mock data con nodos y relaciones padre-hijo. |
| 12 | Vista Drill-down | Ruta `/monitoring/drilldown/:siteId`. Treemap jerárquico (D3.js) donde área = consumo kWh, color = eficiencia. Click en nodo = drill-down. Breadcrumb clickeable para subir niveles. |
| 13 | Barras por circuito | Barras horizontales por circuito del nodo seleccionado. Color por % del total del padre. Ordenable por consumo/nombre. |
| 14 | Histórica del nodo | Gráfico de línea con histórico del nodo seleccionado en el treemap. Variable configurable. |

### Sprint A4 · Dashboard Técnico — Dispositivos IoT (M03)

| # | Tarea | Detalle |
|---|-------|---------|
| 15 | Vista Estado Dispositivos | Ruta `/monitoring/devices`. Dona online/offline/error (Recharts). Timeline de desconexiones (D3). Tabla inventario: medidor, modelo, IP, último contacto, uptime %, estado. |
| 16 | Filtros de dispositivos | Edificio, Estado (online/offline/error), Modelo medidor, Ordenar por uptime. |

### Sprint A5 · Administración Base (M07)

| # | Tarea | Detalle |
|---|-------|---------|
| 17 | Gestión de Edificios/Sites | Ruta `/admin/sites`. CRUD completo. Tabla: nombre, dirección, m², pisos, locatarios, medidores, estado, potencia contratada. Filtros: estado, región/ciudad, búsqueda. |
| 18 | Gestión de Medidores | Ruta `/admin/meters`. CRUD. Tabla: ID, modelo Siemens, serial, edificio, tablero, IP, protocolo, estado, última lectura. Filtros: edificio, modelo, estado, protocolo. |
| 19 | Editor de Jerarquía Eléctrica | Ruta `/admin/hierarchy/:siteId`. Tree editor visual interactivo (edificio → tablero → subtablero → circuito). Tabla nodos: nombre, nivel, medidor asignado, estado. |
| 20 | Configuración del Tenant | Ruta `/admin/tenant-config`. Formulario de parámetros globales. Solo Super Admin. |

### Sprint A6 · Navegación y Estructura

| # | Tarea | Detalle |
|---|-------|---------|
| 21 | Refactorizar sidebar con menú completo | Implementar menú de 9 secciones con íconos según Hoja 7. Submenús colapsables. Visibilidad condicionada por rol. |
| 22 | Implementar todas las rutas | Registrar las ~30 rutas de la Hoja 7 en el router. Páginas placeholder para módulos no implementados aún. |

---

## FASE 2 — BETA

> Dashboards ejecutivos, facturación, alertas, reportes, auditoría y gestión de usuarios.

### Sprint B1 · Dashboard Ejecutivo (M02)

| # | Tarea | Detalle |
|---|-------|---------|
| 23 | Vista Portafolio | Ruta `/dashboard/executive`. Barras apiladas consumo por edificio con breakdown por bloque horario punta/llano/valle (Recharts). Dona distribución costo: energía/demanda/reactiva/fijos. Línea tendencia mensual año actual vs anterior. |
| 24 | Vista por Edificio | Ruta `/dashboard/executive/:siteId`. Línea consumo diario multi-serie por tablero. Gauge FP semicircular (Custom SVG, zonas rojo/amarillo/verde). Barras demanda máxima. Heatmap consumo horario (D3.js, horas x días, escala verde→rojo). KPI cards: kWh total, kW peak, FP promedio, costo estimado, alertas activas. |
| 25 | Filtros del ejecutivo | Edificios comparativo (multi-select chips, mín 2, máx 10), Métrica (dropdown), Granularidad (segmented: diario/semanal/mensual con lógica automática según rango). |

### Sprint B2 · Dashboard Ejecutivo — Comparativo (M02)

| # | Tarea | Detalle |
|---|-------|---------|
| 26 | Vista Comparativo | Ruta `/dashboard/compare`. Barras agrupadas kWh/m². Scatter demanda vs superficie. Radar multi-KPI (hasta 5 edificios, Recharts). Tabla ranking edificios por eficiencia. |

### Sprint B3 · Dashboard Técnico — Demanda y Calidad (M03)

| # | Tarea | Detalle |
|---|-------|---------|
| 27 | Análisis de Demanda | Ruta `/monitoring/demand/:siteId`. Línea demanda 15min + línea referencia demanda contratada (roja). Área de peak shaving. Heatmap semanal (D3). Tabla picos por día. Toggle comparar mismo período año anterior. |
| 28 | Calidad de Energía | Ruta `/monitoring/quality/:siteId`. Línea THD por fase. Gauge FP instantáneo. Barras armónicos individuales. Timeline eventos de calidad. Tabla eventos: fecha, tipo, duración, severidad. Fase: Core (pero depende de datos de Alpha). |

### Sprint B4 · Facturación Energética (M04)

| # | Tarea | Detalle |
|---|-------|---------|
| 29 | Configuración Tarifaria | Ruta `/billing/rates`. Tabla tarifas vigentes: tipo, valor, horario, fecha inicio/fin. Tabla bloques horarios. Filtros: edificio, tipo tarifa BT/AT, vigencia activa/histórica. CRUD para Super Admin y Site Admin. |
| 30 | Generación de Factura | Ruta `/billing/generate`. Workflow multi-paso. Barras consumo por locatario. Dona distribución cargo. Tabla pre-factura completa: locatario, medidor, kWh, kW, kVArh, cargo energía, cargo demanda, cargo reactiva, cargo fijo, total neto, IVA (19%), total. Los 12 campos de la Hoja 5. |
| 31 | Aprobación de Facturas | Ruta `/billing/approve`. Tabla facturas pendientes con acciones aprobar/rechazar. Filtros: período, edificio, estado. |
| 32 | Historial de Facturación | Ruta `/billing/history`. Línea evolución monto mensual por locatario. Barras comparativo mes anterior. Tabla histórico con filtros: período, edificio, locatario (search), estado, ordenar por monto/fecha. |
| 33 | Portal Locatario | Ruta `/billing/my-invoice`. Vista simplificada. Línea mi consumo mensual (6 meses). Barras mi consumo vs promedio edificio. Tabla mis facturas con PDF descargable. Solo rol Locatario. |

### Sprint B5 · Centro de Alertas (M05)

| # | Tarea | Detalle |
|---|-------|---------|
| 34 | Panel de Alertas Activas | Ruta `/alerts`. Dona por severidad con total en centro (Recharts). Timeline 24h (Custom D3). Barras por tipo. Tabla alertas: ID (ALR-XXXX), tipo (11 tipos), severidad (badge color), edificio, medidor, mensaje (truncado 80 chars), hora, estado, asignado a, tiempo abierta. |
| 35 | Filtros de alertas | Edificio (multi-select), Severidad (chips coloreados con contador), Tipo (dropdown agrupado: Comunicación/Eléctrica/Consumo/Operativa), Estado (segmented: Activas/ACK/Resueltas/Todas), Asignado a (dropdown con avatar). |
| 36 | Detalle de Alerta | Vista detalle. Línea de la variable que disparó la alerta con umbral marcado. Timeline acciones tomadas. Tabla acciones: usuario, acción, timestamp, comentario. |
| 37 | Configuración de Reglas | Ruta `/alerts/rules`. Tabla reglas: tipo, variable, operador, umbral, severidad, destinatarios, canal, activa S/N. CRUD para Super Admin y Site Admin. |
| 38 | Motor de alertas (mock) | Implementar lógica de evaluación de los 11 tipos de alertas con sus umbrales default, severidades y frecuencias de check (Hoja 6). Simular escalamiento L1→L2→L3. |

### Sprint B6 · Reportes (M06)

| # | Tarea | Detalle |
|---|-------|---------|
| 39 | Centro de Reportes | Ruta `/reports`. Card selector visual con 9 tipos de reporte + ícono y descripción. Al seleccionar, carga filtros específicos. |
| 40 | Generador de reportes | Motor de generación PDF/Excel. Filtros: período, edificios (multi-select), formato (radio: PDF/Excel/CSV). Implementar al menos: Reporte Ejecutivo, Reporte de Consumo Detallado, Reporte de Facturación. |
| 41 | Reportes Programados | Ruta `/reports/scheduled`. Modal de configuración: frecuencia (diario/semanal/mensual), destinatarios (emails), día/hora envío. Pausar/reanudar. Solo roles Admin. |

### Sprint B7 · Administración Avanzada (M07)

| # | Tarea | Detalle |
|---|-------|---------|
| 42 | Gestión de Usuarios | Ruta `/admin/users`. CRUD. Tabla: nombre, email, rol, edificios, estado, último acceso, fecha creación. Filtros: rol (dropdown), edificio (multi-select), estado (segmented: activo/inactivo/bloqueado), búsqueda nombre/email. |
| 43 | Gestión de Locatarios | Ruta `/admin/tenants-units`. CRUD. Tabla: nombre, RUT, local, m², medidor asignado, contrato, estado. Filtros: edificio, estado, búsqueda nombre/RUT. |

### Sprint B8 · Auditoría y Logs (M08)

| # | Tarea | Detalle |
|---|-------|---------|
| 44 | Log de Actividades | Ruta `/audit/activities`. Línea actividad por hora. Barras por tipo acción. Tabla: timestamp (con milisegundos), usuario, rol, acción, recurso, IP, detalle (expandible con diff JSON). Filtros: rango datetime (precisión al minuto), usuario (search), acción (dropdown agrupado), recurso, edificio. |
| 45 | Log de Cambios de Configuración | Ruta `/audit/changes`. Tabla: timestamp, usuario, entidad, campo, valor anterior, valor nuevo. Filtros: período, entidad (tarifa/usuario/medidor/regla), usuario. |
| 46 | Log de Accesos | Ruta `/audit/access`. Heatmap accesos por hora/día. Barras intentos fallidos. Tabla: timestamp, usuario, IP, método auth, resultado (exitoso/fallido/bloqueado), ubicación. |

---

## FASE 3 — CORE

> Analítica avanzada, reportes especializados, calidad de energía e integraciones.

### Sprint C1 · Analítica Avanzada (M10)

| # | Tarea | Detalle |
|---|-------|---------|
| 47 | Benchmarking entre Edificios | Ruta `/analytics/benchmark`. Radar multi-KPI (Recharts). Barras kWh/m² ranking con línea promedio portafolio. Scatter eficiencia vs tamaño. Boxplot distribución consumo. Tabla ranking: edificio, m², kWh, kWh/m², FP, costo/m², posición. |
| 48 | Tendencias y Proyección | Ruta `/analytics/trends`. Línea histórica + proyección (punteada) con área de confianza (gris). Barras variación % mes a mes. Tabla predicciones: mes, kWh estimado, rango, confianza %. Filtros: edificio, variable, horizonte (1/3/6/12 meses), granularidad. |
| 49 | Análisis de Patrones | Ruta `/analytics/patterns`. Heatmap consumo por hora/día semana (D3). Cluster análisis (scatter). Línea día típico vs atípico. Tabla anomalías: fecha, hora, valor, esperado, desviación %. Filtro sensibilidad detección (alta/media/baja). |

### Sprint C2 · Reportes Especializados (M06)

| # | Tarea | Detalle |
|---|-------|---------|
| 50 | Reporte SLA / Disponibilidad | PDF. Gauge uptime %. Timeline interrupciones. Barras por causa. Tabla incidentes. |
| 51 | Reporte ESG / Huella de Carbono | PDF. Barras tonCO2 por edificio. Línea tendencia emisiones. Tabla factores emisión. Filtro: estándar GRI/SASB/Huella Chile. |
| 52 | Reporte Benchmarking | PDF/Excel. Radar multi-KPI. Scatter kWh/m² vs costo. Ranking horizontal. Tabla comparativa completa. |
| 53 | Reporte de Inventario | Excel. Tabla medidores completa: edificio, modelo, serial, ubicación, IP, estado, fecha instalación, uptime. |
| 54 | Reporte de Alertas/Compliance | PDF. Barras alertas por mes/tipo. Gauge SLA. Timeline escalamientos. Tabla alertas críticas. |

### Sprint C3 · Historial SLA de Alertas (M05)

| # | Tarea | Detalle |
|---|-------|---------|
| 55 | Historial y SLA de Alertas | Ruta `/alerts/history`. Línea tendencia alertas mensuales. Barras tiempo medio resolución por tipo (Recharts). Gauge % SLA cumplido. Tabla histórico: mes, total alertas, resueltas, tiempo medio, SLA %. |

### Sprint C4 · Integraciones (M09)

| # | Tarea | Detalle |
|---|-------|---------|
| 56 | Estado de Conexiones | Ruta `/integrations/status`. Semáforos estado por integración. Timeline últimas sincronizaciones. Tabla: nombre, tipo (Datalake/ERP/SSO/MQTT), estado, última sync, registros, errores. |
| 57 | Configuración API / Datalake | Ruta `/integrations/config`. Formulario. Tabla endpoints: URL, método, auth, frecuencia, último status. Solo Super Admin. |
| 58 | Log de Sincronización | Ruta `/integrations/sync-log`. Línea registros sincronizados por día. Tabla: timestamp, integración, dirección, registros, status, error. |

### Sprint C5 · MFA y Seguridad (M01)

| # | Tarea | Detalle |
|---|-------|---------|
| 59 | MFA (segundo factor) | Formulario de segundo factor. Según política de rol (Hoja 1): MFA obligatorio para Super Admin, Corp Admin, Auditor; MFA estándar para Site Admin; opcional para Locatario. |

---

## Mapa de Librerías por Gráfico

| Gráfico | Librería | Módulos donde se usa |
|---------|----------|---------------------|
| Barras verticales/horizontales/apiladas | Recharts | M02, M03, M04, M05, M06, M10 |
| Línea / Área / Multi-serie | Recharts | M02, M03, M04, M05, M06, M10 |
| Dona (donut) | Recharts | M02, M04, M05 |
| Radar / Spider | Recharts | M02, M10 |
| Gauge semicircular/circular | Custom SVG | M02, M03, M05 |
| Heatmap (matriz) | D3.js | M02, M03, M10 |
| Treemap jerárquico | D3.js | M03 |
| Timeline horizontal | Custom D3 | M05, M08 |
| Streaming sliding window | D3.js / uPlot | M03 |
| Scatter / Boxplot | Recharts | M02, M10 |

---

## Convenciones de Desarrollo

### Estructura de Archivos

Cada módulo nuevo sigue el patrón existente:

```
src/features/{módulo}/
├── {Módulo}Page.tsx              # Página principal
├── {Sub}Page.tsx                 # Subpáginas
└── components/
    ├── {Componente}Chart.tsx     # Gráficos específicos
    ├── {Componente}Table.tsx     # Tablas específicas
    └── {Componente}Filter.tsx    # Filtros específicos
```

### Nomenclatura de Rutas

Todas las rutas siguen la Hoja 7:

```
/dashboard/executive           /monitoring/realtime
/dashboard/executive/:siteId   /monitoring/drilldown/:siteId
/dashboard/compare             /monitoring/devices
/billing/rates                 /monitoring/demand/:siteId
/billing/generate              /monitoring/quality/:siteId
/billing/approve               /alerts
/billing/history               /alerts/rules
/billing/my-invoice            /alerts/history
/reports                       /analytics/benchmark
/reports/scheduled             /analytics/trends
/admin/users                   /analytics/patterns
/admin/sites                   /audit/activities
/admin/meters                  /audit/changes
/admin/tenants-units           /audit/access
/admin/hierarchy/:siteId       /integrations/status
/admin/tenant-config           /integrations/config
/login                         /integrations/sync-log
```

### Permisos por Rol (referencia rápida)

| Módulo | SUPER_ADMIN | CORP_ADMIN | SITE_ADMIN | OPERATOR | ANALYST | TENANT_USER | AUDITOR |
|--------|:-----------:|:----------:|:----------:|:--------:|:-------:|:-----------:|:-------:|
| Dash. Ejecutivo | CRUD | R | R | — | R | — | R |
| Dash. Técnico | CRUD | R | R | R | R | — | R |
| Facturación | CRUD | CRU | CRU | — | — | R (propia) | R |
| Alertas | CRUD | R | CRU | CRU | — | R (propias) | R |
| Reportes | CRUD | CRU | CRU | R | CRU | — | R |
| Administración | CRUD | CRU | CRU (su edificio) | — | — | — | R |
| Auditoría | CRUD | R | R (su edificio) | — | — | — | R |
| Integraciones | CRUD | R | — | — | — | — | R |

---

## Reglas del Proyecto

1. **Mock-first**: toda feature se implementa primero con datos mock realistas antes de conectar APIs reales.
2. **Feature flags**: cada módulo se puede habilitar/deshabilitar sin romper el resto.
3. **Responsivo**: toda vista debe funcionar en mobile (375px), tablet (768px) y desktop (1440px+).
4. **Accesibilidad**: labels en formularios, roles ARIA en componentes interactivos, navegación por teclado.
5. **Paleta monocromática**: se mantiene el diseño low-fidelity actual hasta que se integre el design system definitivo.
6. **TypeScript estricto**: sin `any`. Todas las interfaces en `types/`.
7. **CHANGELOG.md**: toda feature mergeada se documenta en el changelog con formato semver.

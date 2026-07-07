# CLAUDE.md

## Purpose
Fuente única de contexto operativo. Detalle extenso vive en `docs/context/`.

- **Regla de mantenimiento:** si se agrega o cambia un patrón real, actualizar este archivo y/o los archivos de contexto.
- **Regla de verdad:** si hay conflicto entre este archivo y el código, el código manda; luego corregir.

## Prompt Mínimo
- Arranque base: `Read CLAUDE.md`
- Con tarea: `Read CLAUDE.md. Hoy voy a [tarea].`
- Si necesitas detalle específico: leer el archivo de `docs/context/` correspondiente.

## Contexto Detallado (docs/context/)
| Archivo | Contenido |
|---------|-----------|
| [`db-schema.md`](docs/context/db-schema.md) | Tablas, columnas, relaciones, migraciones |
| [`api-endpoints.md`](docs/context/api-endpoints.md) | Todos los endpoints con params y responses |
| [`frontend-views.md`](docs/context/frontend-views.md) | Vistas, gráficos, hooks, cache, tipos TS, flujo |
| [`auth-rbac.md`](docs/context/auth-rbac.md) | Auth flow, RBAC, scoping, onboarding |
| [`ingest-pipeline.md`](docs/context/ingest-pipeline.md) | Drive pipeline, promotion, agregados, billing import |
| [`../ops/rds-migrations-via-ecs-exec.md`](docs/ops/rds-migrations-via-ecs-exec.md) | Migraciones SQL prod vía ECS Exec (RDS privado) |
| [`functional-spec.md`](docs/context/functional-spec.md) | XLSX spec, alertas objetivo, navegación objetivo |
| [`key-files.md`](docs/context/key-files.md) | Archivos clave backend/frontend/infra |
| [`CHANGELOG.md`](CHANGELOG.md) | Notas por release; la entrada más reciente está al inicio del archivo |

## Próxima Sesión

### Completado (2026-07-07)
- **2.43.0:** Security pentest + switcher fixes + test cleanup. **3 security fixes en prod (ECS rev 20):** refresh token 500→401 (double rollback), JWT TTL 24h→15min (reduce window de token robado), PII export step-up auth (`iat` check, rechaza si >5min). **11 switcher bugs corregidos:** auditor routes dentro de RequireTenantLayout, platform routes fuera, tenant change limpia operator/building + navega, role change preserva URL, deselect en operator/building switchers, cache invalidation selectiva, sessionStorage persistence (zustand persist). **188→0 test failures** en 20 archivos (mocks faltantes, UI text stale, nav structure). **Pentest framework completo: 113 tests en 14 fases, zero deps.** Fases 1–7 (básicas): auth, tenant isolation, authz, injection, rate limit, data exposure, internal endpoints. Fases 8–11 (agresivas): fuzzing (108 SQLi + 8 XSS + 5 SSTI + encoding bypass + param pollution + CSV injection), race conditions, token attacks (JWT forging/cookie tossing/TOCTOU), infra (TLS/headers/debug scan/SSRF). Fases 12–14 (avanzadas): blind SQLi timing (48 pg_sleep payloads), JWT secret cracking offline (~2.7M candidatos: diccionario + numérico 0–999999 + strings cortos + rockyou), XXE/deserialization (XML entity injection, proto pollution deep, mass assignment 7 campos peligrosos, JSON bomb 1000 niveles, unicode smuggling). **Resultado final: 91 PASS, 0 FAIL, 22 WARN.** WARNs: rate limit sin Redis (infra), timing side-channel MFA (bajo riesgo), falta datos test para race conditions, cookie flags parciales en clear-session. [CHANGELOG — 2.43.0-alpha.0](CHANGELOG.md)

### Completado (2026-07-06)
- **2.42.0:** Wireframe alignment pass 2. Sidebar tenant scoping (entries `platformOnly` ocultas cuando tenant seleccionado). Panel Consolidado: filtros debajo del título, KPIs 4 cards separadas, sparkline+eventos en cards, placeholder 24h, tooltip variación %, gauges Nivel 2 (Factor potencia) y Nivel 3 (Potencia activa), severity labels español. Consumo Jerárquico: árbol 3 niveles (mall→zona→medidor), mall multi-select, períodos completos, filtro variación > X%, markers intensidad métrica, TrendSparkline con comparación funcional. Costos y Tendencias: mall multi-select, sort columnas, filtro variación umbral, columna país. Alarmas Agregadas: layout 3 filas (KPIs / mapa+evolución / top5+tabla). Exportar Reportes: 7 gaps wireframe cerrados. Reportes Ejecutivos: preview cards con visuals. Monitoreo en Vivo: histograma flex, serial+zona en grilla, feed CNR. Mapa Cobertura: popup enriquecido con link grilla. Reg. Intervención / Ingreso CNR: layout compacto. Nav: profile landing directo, RequirePerms sin redirect (fix loop), permisos site_admin ampliados. Aggregated queries deshabilitadas (no hay datos julio en prod). [CHANGELOG — 2.42.0-alpha.0](CHANGELOG.md)
- **2.41.0:** Wireframe alignment pass 1. Tenant scoping sidebar, Panel Consolidado Nivel 1/2/3 alineado, Consumo Jerárquico alineado. [CHANGELOG — 2.41.0-alpha.0](CHANGELOG.md)
- **2.40.0:** Spec audit 30/30 pantallas alineadas con `docs/roles-ems.md`. Todos los datos `Math.sin/cos` reemplazados por queries reales (`useAggregatedReadingsQuery`). KPI variación % real (yesterday vs today). Sparklines, histogramas, charts de evolución — todos reales. Filtros desconectados wired a API (fecha audit, período alarmas, date range datos crudos). Dos módulos backend nuevos: `CnrModule` (tabla `cnr_records`, migración 14) y `InterventionsModule` (tabla `interventions`, migración 15). Frontend: localStorage eliminado de Ingreso CNR y Reg. Intervención (ahora POST a API). CNR Pendientes: híbrido API + auto-detectados. Mapa Cobertura: 4 métricas funcionales. Alarmas Agregadas: sortable, escaladas bar, map click-through. Maestro Medidores: "en mantención" alcanzable. Tenants: activate/deactivate wired. Observabilidad: APM endpoint. Proxy default → prod. Backend desplegado ECS rev 17 (`spec-audit-20260706`). Migraciones 14–15 aplicadas. [CHANGELOG — 2.40.0-alpha.0](CHANGELOG.md)

### Completado (2026-07-04)
- **2.39.0:** UX overhaul + PII fix + docs site. Panel Consolidado: layout compacto (mapa 65%/panel 35%), sparkline+eventos eliminados (datos falsos), alertas infinite scroll 20 en 20. Seguridad PAM: 5 paneles en una fila, todo clickeable con Drawer, vulnerabilidades como pills. MapView: fix markers desaparecían al click (referencia inestable `polygons=[]`). Audit logs: PII decrypt (`pii:...` → email real). Proxy prod: `VITE_API_TARGET=https://power-monitor.cloud npm run dev` (zero Docker). Docs site Docusaurus desplegado en `power-monitor.cloud/docs/` (49 páginas API Reference + guías + auth + API Keys). Backend deployed (`pii-fix-20260704`). [CHANGELOG — 2.39.0-alpha.0](CHANGELOG.md)

### Completado (2026-07-03)
- **2.38.0:** Alineación total con spec Roles EMS. Navegación podada: 77 items extra eliminados, perfil Locatario eliminado (no en spec), duplicado Auditor corregido. 129 gaps de contenido cerrados (20 Gerencial + 27 Operacional + 27 Técnico + 27 Auditor + 28 Súper-admin). Cada perfil muestra exactamente sus 6 pantallas spec. Filtros mapa, sparklines demanda, marcadores proporcionales, chart SVG línea/48h/72h, date pickers, tooltips enriquecidos, columnas spec faltantes, botones acción, exportaciones firmadas, métricas detalle, multi-select, firma digital placeholders. 788 frontend tests. [CHANGELOG — 2.38.0-alpha.0](CHANGELOG.md)
- **2.37.0:** IoT prod activation + trend chart. Migraciones 12/13/54 en prod. Tenant Siemens corregido. [CHANGELOG — 2.37.0-alpha.0](CHANGELOG.md)

### Completado (2026-06-30)
- **2.36.0:** IoT device auto-discovery + asignación libre. Lambda auto-registra dispositivos desconocidos en `iot_devices`. IoT Rule inyecta `clientid()` para identificar por certificado TLS. IotDevicesPage (`/admin/iot-devices`) con tabla, filtros, panel detalle con payload sample, drawer asignación (edificio→medidor). Campo `iot_device_id` en meters. Device map dinámico desde DB (zero hardcoding). Migraciones 12–13. 43 Lambda / 1307 backend / 903 frontend tests. [CHANGELOG — 2.36.0-alpha.0](CHANGELOG.md)

### Completado (2026-06-26)
- **2.35.0:** Spec Roles EMS 100% completo (30/30 pantallas). CalidadDatosPage auditor. Panel Consolidado Nivel 3 (plano piso con zonas coloreadas). Config Releases diff viewer (unified + side-by-side). TenantsMallsPage (gestión multi-tenant). SeguridadPamPage completa (PAM review cycle, JIT vault, incidentes, breach notification, crypto deletion). Manual de usuario reescrito (30 pantallas). 890 tests. [CHANGELOG — 2.35.0-alpha.0](CHANGELOG.md)
- **2.34.0:** 10 wireframe component gaps cerrados (ArcGauge, waterfall, alarm map, SLA widgets, penalties, quality histogram, deviation chart, heatmap, trend charts, TLS/vulns). [CHANGELOG — 2.34.0-alpha.0](CHANGELOG.md)
- **2.33.0:** Perfiles Auditor + Súper-admin alineados. CuadraturaPage (filtro mall, export CSV). TrazabilidadPage (tipo lectura derivado de frescura). DatosCrudos (100 filas). ExportarEvidencia (selector mall/período). Observabilidad (KPIs reales, no hardcoded). [CHANGELOG — 2.33.0-alpha.0](CHANGELOG.md)
- **2.32.0:** Perfil Técnico alineado. MedidoresCatalogo (filtros mall/status/tipo). MisOrdenes (meter ID, Pausar). DiagnosticoComms (tasa éxito, tiempo). MaestroMedidores (detalle + dar de baja/activar). [CHANGELOG — 2.32.0-alpha.0](CHANGELOG.md)
- **2.31.0:** Perfil Operacional alineado. MonitoreoVivo (CNR KPI, histograma 24h, feed enriquecido). AlarmasEventos (filtro mall, SLA por severidad). CalidadBackfill (tendencia). CnrPendientes (export CSV). MapaCobertura (markers coloreados). [CHANGELOG — 2.31.0-alpha.0](CHANGELOG.md)
- **2.30.0:** Perfil Gerencial alineado con spec Roles EMS. MapView con markers coloreados por status + popups enriquecidos + onClick. Panel Consolidado Nivel 2 con breadcrumb y voltaje. Consumo con intensidad kWh/m² + sort/filter. Costos con stacked chart por mall + línea precio + PEN/COP + export CSV. Alarmas con gráfico evolución 30d + resolución media. Reportes con PPT + search historial. Fix PlatformDashboard crash. [CHANGELOG — 2.30.0-alpha.0](CHANGELOG.md)
- **2.29.0:** 9 gaps de spec Roles EMS cerrados (4 parciales + 5 stubs → todos con datos reales). 828 frontend tests / 69 suites. Zero stubs. Las 30 pantallas del spec ahora usan datos de API o derivados. [CHANGELOG — 2.29.0-alpha.0](CHANGELOG.md)
- **2.28.0:** IoT frontend integrado. Parser para formato SENTRON flat (keys español). Migración 54 (building + meter Siemens en DB). Frontend: rutas, endpoints, hook y panel IoT en MeterDetailPage (lectura en vivo, auto-refresh 30s). 9 errores TS build preexistentes corregidos. Data real de Siemens confirmada. Pendiente: Siemens debe agregar ID por medidor para escalar a 100+. [CHANGELOG — 2.28.0-alpha.0](CHANGELOG.md)
- **2.27.0:** IoT pipeline reactivado. Bucket S3 `energy-monitor-iot-ingest` (lifecycle Glacier 30d). VPC endpoint S3 Gateway (gratis). Lambda `iot-ingest-prod-ingest` desplegada. IoT Rule actualizada. Pipeline verificado E2E (IoT Core → S3 → Lambda → RDS). Certs enviados a Siemens. [CHANGELOG — 2.27.0-alpha.0](CHANGELOG.md)

### Completado (2026-06-24)
- **2.26.0:** IoT ingest Lambda reescrita para formato EAV v2. Parser chain (POC3000 + genérico flat). Device map configurable por env var. 26 tests. [CHANGELOG — 2.26.0-alpha.0](CHANGELOG.md)
- **2.25.0:** Profile-based sidebar + 25 pantallas nuevas según spec `docs/roles-ems.md`. 5 perfiles: Gerencial (6 pantallas), Operacional (6), Técnico (6), Auditor (4 nuevas + 2 existentes), Súper-admin (3 nuevas + 3 existentes). Sidebar usa `PROFILE_NAV[profile]` lookup (zero ifs). `UserProfile` type, `ROLE_TO_PROFILE` mapping, `EnergyStatus` system. 777 frontend tests. [CHANGELOG — 2.25.0-alpha.0](CHANGELOG.md)

### Completado (2026-06-22)
- **2.24.0:** Login simplificado — OAuth directo, sin slug. Título "EMS". Dashboard: chart stretch vertical, click en punto → detalle medidor, edificios y facturas clickeables a sus vistas. [CHANGELOG — 2.24.0-alpha.0](CHANGELOG.md)

### Completado (2026-06-20)
- **2.23.2:** Guards validan UUID antes de query (no solo `oauth:` prefix). External API acepta `admin_buildings:read` + `buildings:read` via `RequireAnyPermission`. Invoices acepta `billing:view_own`. 3 roles ejemplo probados E2E. Manual de usuario 12 secciones (`docs/manual-usuario.md`). [CHANGELOG — 2.23.2-alpha.0](CHANGELOG.md)
- **2.23.1:** Fix external API 500 para OAuth clients. Guards crasheaban con `sub` no-UUID. [CHANGELOG — 2.23.1-alpha.0](CHANGELOG.md)
- **2.23.0:** 27 Parque Arauco marker malls (scraper Playwright + Nominatim → DB). Mall dropdown INDOOR/PIN. Metadata (m², dirección) en sidebar. Migration 53. Deploy prod: S3→ECS restore pattern para seeds grandes. 47 malls total (20 indoor + 27 markers), 5977 stores, 946 tiles. [CHANGELOG — 2.23.0-alpha.0](CHANGELOG.md)

### Completado (2026-06-18)
- **2.22.0:** Mapa interactivo MapLibre GL JS (`/map`). 20 malls (incl. PASA Open Temuco + SC52) con indoor mapping (PBF tiles en DB, zero deps externas). MapvxModule (4 endpoints). 5785 tiendas buscables. Store search + pin + m². 575+ tiles cached. Migraciones 50–52. 304 frontend / 1294 backend tests. [CHANGELOG — 2.22.0-alpha.0](CHANGELOG.md)

### Completado (2026-06-16)
- **2.21.1:** Migraciones prod 47–49 aplicadas. Fix MFA validate 401 (`last_activity_at` missing). Logging diagnóstico MFA. Script `apply-prod-migrations-2.21.sh`. [CHANGELOG — 2.21.1-alpha.0](CHANGELOG.md)

### Completado (2026-06-15)
- **2.21.0:** 11 Anexo 07 gaps resolvibles cerrados (77%→~88%). Breach 24h, API observability, data observability evaluators, cert rotation, data minimization, CIS audit, docs ZIP. 1294 backend / 295 frontend tests. [CHANGELOG — 2.21.0-alpha.0](CHANGELOG.md)
- **2.20.0:** 39 Anexo 07 gaps cerrados (47%→~85%). AWS infra scripts listos (WAF, GuardDuty, Inspector, Read Replica, Terraform). 1252 backend / 295 frontend tests. [CHANGELOG — 2.20.0-alpha.0](CHANGELOG.md)

### Completado (2026-06-13)
- **2.19.0:** Fix scroll horizontal en 44 tablas (`overflow-y-auto` → `overflow-auto`). Eliminado doble scroll en páginas con tablas (Tiempo Real, Medidores, Locatarios, Mapeos). Reportes: layout side-by-side. [CHANGELOG — 2.19.0-alpha.0](CHANGELOG.md)

### Completado (2026-06-08)
- **2.18.0:** Perf analytics (`groupBy`, `meterRole`, compare-buildings); fix Highcharts arearange; seed demo integraciones/reportes; tabs Integraciones. [CHANGELOG — 2.18.0-alpha.0](CHANGELOG.md)
- **Prod:** backend `meter-role-20260608-135454` + frontend desplegado en `power-monitor.cloud`.
- **Migraciones 47–49 aplicadas en prod** (2026-06-16). Script: `apply-prod-migrations-2.21.sh`.

### Completado (2026-06-07)
- **2.17.0 prod:** Backend ECS + frontend `power-monitor.cloud`; migr. RDS `43–46`; login OAuth+MFA OK. [CHANGELOG — 2.17.0-alpha.0](CHANGELOG.md)
- **PASA lecturas:** 875 medidores / ~2.6M readings (ene 2026). Script `scripts/pasa-readings/`. [Drive](https://drive.google.com/drive/folders/1VwbEPmoB1fXvhJTDMaP_6m3bBMYLi0-V).
- **Import masiva IMP-070/071/072:** edificios, locatarios, medidores.

### Completado (2026-06-06)
- **Import masiva usuarios:** CSV/XLSX → validate → preview → commit. Backend `UserImportModule` (7 endpoints). Frontend tab **Importar** en Usuarios. Migración `41-user-import-prereq`. [CHANGELOG — 2.15.0-alpha.0](CHANGELOG.md)
- **Plataforma self-admin:** ingest gaps, backfill, webhooks, data governance, regions, SSO tenant, OAuth clients, integraciones BACnet/SNMP + tabs salud.

### Completado (2026-05-21)
- **Portfolio matview:** `portfolio_summary` pre-agrega readings por tenant/día. 16s → 5ms. Refresh diario en `DataRetentionService`.
- **RDS upgrade:** `db.t3.micro` → `db.t3.small` (2 GB RAM, +$14/mes).
- **Login UI:** Botón Google custom (mismo estilo que Microsoft). Bandera Chile corregida (estrella 5 puntas, azul solo cuadro superior izquierdo).
- **AWS cleanup:** ECR lifecycle 5 imágenes, CloudWatch 30d, 7 CloudFront eliminadas, 4 certs emotiox eliminados, IAM role emotiox eliminado.
- **ECS Exec + test user:** `test-api@energymonitor.dev` (super_admin). 28/28 endpoints OK.
- **Fixes:** `/rectification-requests` 500 (columna `notes`). `/invoices` y `/meters` paginación server-side (`{ data, total, limit, offset }`). CloudWatch 6 alarmas + SNS `clemente@hoktus.ai`. [CHANGELOG — 2.12.1-alpha.0](CHANGELOG.md)

### Completado (2026-05-30)
- **SMS invitaciones:** `SnsSmsService` vía SNS. Al crear usuario con teléfono se envía SMS con instrucciones de acceso (URL, proveedor OAuth, MFA). Email mejorado con pasos claros.
- **MFA UX guiado:** Login muestra pasos numerados (descargar app, escanear QR, ingresar código), links descarga Authenticator, recovery codes con explicación clara.
- **User form:** `authProviderId` removido (se llena solo en primer login). Campo teléfono opcional. `ageVerified` implícito. `auth_provider_id` nullable en DB.
- **Benchmark perf:** `groupBy=building` agrega server-side (78K → 450 filas).
- **Readings cross-tenant:** super_admin sin tenant consulta todos los tenants.
- **Roles cross-tenant:** `GET /roles` deduplica por slug para super_admin. [CHANGELOG — 2.14.0-alpha.0](CHANGELOG.md)

### Completado (2026-05-29)
- **Globe Power page redesign:** 10 secciones con contenido real de Figma. PainPoints eliminado. Navbar habilitado, ruta activa.
- **Users cross-tenant:** `GET /users` soporta `crossTenant` + `buildingIds`. PII descifrado. Ruta fuera de `RequireTenantLayout`.
- **Deploy prod:** Backend ECS + Frontend S3/CF. [CHANGELOG — 2.13.0-alpha.0](CHANGELOG.md)

### Completado (2026-05-20)
- **MFA QR on login:** Usuarios nuevos con `require_mfa` ven QR directo en `/login` después de OAuth.
- **CSP fix:** Google Sign-In SDK — `script-src` + `'unsafe-inline'`, `style-src` + `accounts.google.com`.
- **Tenant header:** `tenantId` como header `x-tenant-id` en vez de query param. Resuelve 400 `forbidNonWhitelisted`.
- **Session 24h:** `maxSessionMinutes` 30 → 1440. Cookie access token 15min → 24h. Roles auto-actualizados al startup.
- **Dashboard Ejecutivo perf:** Portfolio query sin JOIN — two-step (meter IDs + `ANY(ids)` en continuous aggregate). 11–18s → <1s. Rango chart derivado de timestamps reales. Ranking usa potencia actual. Cache 5min. [CHANGELOG — 2.12.0-alpha.0](CHANGELOG.md)

### Completado (2026-05-14)
- **Globe Power page:** `/globe-power` con 7 secciones (rama `feat/globe-landing-globe-power`). Hero 3 slides (logo Globe Power, lorem ipsum). Presencia ("Operamos a lo largo de todo Chile", 3 stats placeholder). Propuesta de valor (lorem ipsum). Pain points 2×2 (Cobros Ineficientes, Falta de Control, Oportunidades Perdidas, Mantenimientos Correctivos — textos reales). Arquitectura completa (acordeón 4 items). Banner Alianza con Siemens (imagen `alianza.png`). Proceso 4 pasos (Consumo real, Medición SENTRON, Procesamiento, Facturación exacta) con pills. Navbar Globe Power habilitado. [CHANGELOG — 2.11.0-alpha.0](CHANGELOG.md)
- **Globe Landing fixes (prod):** Card "Ir a Globe Modular" conectada a `/globe-modular`. Logo Globe Modular reemplaza logo Globe Services en ModularHero. Imagen emergencia reemplazada. ModularProjects: gradiente dual-layer Figma (`#1C1C1CE5`/`#3C3C3CE5`), carousel mobile con peek 85% + swipe touch. Deploy a distribución correcta (`E28IBIJXQLJUQ7` / `cuenta-1016`).
- **Teatria deploy:** Build y deploy a CloudFront `E2AUHDZIWKSAHF`. DNS `www.teatria.cl` → CNAME OK. Certificado ACM solicitado (pendiente validación CNAME en GoDaddy). Apex `teatria.cl` sin DNS (requiere forwarding en GoDaddy).

### Completado (2026-05-13)
- **Globe Modular page:** `/globe-modular` con 7 secciones. Hero 3 slides (textos Figma). Soluciones 3 filas alternadas (Minería/Educación/Edificación). Propuesta de valor 3 cards. Proceso 5 pasos con descripciones expandibles. Proyectos destacados (Alianza Francesa, Municipalidad Las Condes, EDF Laberintos) con carousel mobile y video popup YouTube en Minería. Clientes logo carousel. Contacto con custom selectors (Región 16 opciones, Tipo proyecto 3 opciones), placeholders reales, checkbox términos. Navbar: Globe Modular habilitado, Globe Power oculto, fix hover dropdown. Mobile responsive (mob1-5 Figma). Imágenes destacados reemplazadas con fotos finales. [CHANGELOG — 2.10.0-alpha.0](CHANGELOG.md)

### Completado (2026-05-07)
- **Ley 21.719 compliance gaps cerrados:** Admin panel rectificación (`/admin/rectification-requests`) con approve/reject/execute. Aviso privacidad pre-OAuth en LoginPage (Art. 10). Export audit logs sin límite en portabilidad. Purge audit logs 2yr en cron diario. Gratuidad explícita en privacy policy. [CHANGELOG — 2.9.1-alpha.0](CHANGELOG.md)

### Completado (2026-05-06)
- **Ley 21.719 compliance completo:** MFA enforcement por rol (`require_mfa`), modal política privacidad post-login con versionado, página `/profile` (datos, export JSON, rectificación, oposición, bloqueo, eliminación, revocación consentimiento). Admin: `/admin/deletion-requests` (aprobar/rechazar/ejecutar anonimización PII). Endpoints públicos: `GET /privacy/policy` + `GET /privacy/processing-registry`. Breach notification con timer 72h. Cron retención diario (purga tokens 30d, anonimiza inactivos 2yr). Rectificación email via solicitud admin. 3 migraciones SQL. 4 docs legales (`docs/privacy/`). 737 tests backend / 260 tests frontend. 4 deploys a prod (ECS+S3+CF). [CHANGELOG — 2.9.0-alpha.0](CHANGELOG.md)
- **Globe Services polish & mobile:** Hero crossfade sin layout shift, logo actualizado, columnas top-aligned. Soluciones: pills `#F6E7DE` con scroll horizontal mobile. Cards: colores Figma exactos, imagen modernización. Industrias: progress bar auto-advance (6s, estilo runway.com), acordeón mobile, 10 descripciones. Presencia: íconos PNG, stats verticales centrados mobile. Lab: pill glassmorphism, 506/670px. Contact: opciones por página. Deploy script actualizado (bucket + CF ID). Spacing mobile reducido. [CHANGELOG — 2.8.1-alpha.0](CHANGELOG.md)

### Completado (2026-05-04)
- **Globe Services page:** React Router (`/` = Inicio, `/globe-services` = Globe Services). 8 secciones: Breadcrumb, ServicesHero (3 banners), ServicesSolutions (6 pills), ServicesCards (4 filas alternadas con imágenes), ServicesIndustries (10 industrias, accordion desktop / pills mobile), ServicesPresence (stats), ServicesClients (carousel), ServicesLab (banner 670px). Contact `bgColor` prop (`#BA6347`). 17 imágenes comprimidas (170MB→8.3MB). [CHANGELOG — 2.8.0-alpha.0](CHANGELOG.md)

### Completado (2026-04-27)
- **Security hardening:** Auditoría completa backend+frontend. 8 fixes backend (ValidationPipe `forbidNonWhitelisted`, MFA bypass cerrado, Swagger prod disabled, logout `__Host-` cookies, DTO `@IsIn`, SSRF re-validation sync, env vars expandidas, JWT_SECRET min 32 chars). 6 fixes frontend (Google OAuth credential flow, `/components` dev-only, rutas duplicadas, open redirect, ErrorBoundary dev-only, faviconUrl scheme validation). Redis-backed throttler (`REDIS_URL` opcional). 737 tests backend / 260 tests frontend. Deploy programado 2026-04-28 03:00 CLT via GitHub Actions (`security-patch-v2.yml`): rota secrets, build+push Docker→ECR, update ECS, deploy frontend S3+CloudFront. [CHANGELOG — 2.7.0-alpha.0](CHANGELOG.md)

### Completado (2026-04-25)
- **Tenant isolation + operator billing strip + session modal:** 33 tests aislamiento multi-tenant (buildings, meters, tenant-units, hierarchy, users, tenants). `billing:*` removido de operator en prod + auto-strip en onboarding. Hierarchy valida building ownership. Users valida building ownership en assignBuildings. SessionExpiredModal en frontend. Drawer slide animation. 260 tests frontend / 34 suites. 117 tests backend isolation. [CHANGELOG — 2.6.0-alpha.0](CHANGELOG.md)
- **Multi-tenant scoping + role hierarchy + platform dashboard:** Backend `crossTenant` flag para Globe Power sin empresa seleccionada. Buildings/meters/alerts/readings cross-tenant. `PlatformDashboardPage` con KPIs globales. Role hierarchy enforcement (`hierarchy_level`): cada nivel solo crea inferiores. `RequireTenantLayout` en router — módulos que requieren empresa bloqueados hasta seleccionar. `usePermissions` fix: usuarios reales usan permisos DB, no map estático. PASA roles clonados en prod. Footer phone fix. [CHANGELOG — 2.5.0-alpha.0](CHANGELOG.md)
- **Globe Landing SEO & share preview:** Título → "Grupo Globe", meta OG/Twitter con imagen 1200x630, favicon logo, lang `es`. Route 53 zona redundante eliminada. [CHANGELOG — 2.5.0-alpha.0](CHANGELOG.md)

### Completado (2026-04-24)
- **Operator filter system + data migration:** `useOperatorFilter` hook mapea `viewAsRole` a modos v1 (Holding/Multi Operador/Operador/Técnico/Locatario). Dashboard, Realtime, Alerts, Buildings filtran por operador. Técnico bloqueado de dashboard financiero. 2.6M readings migradas a RDS (v1→v2 con UUID mapping). [CHANGELOG — 2.4.0-alpha.0](CHANGELOG.md)
- **Globe Landing Figma pixel-perfect:** 11 secciones rediseñadas desde Figma MCP. [CHANGELOG — 2.3.0-alpha.0](CHANGELOG.md)
- **Prod deploy + cross-tenant + health:** Health endpoint, super_admin cross-tenant, refresh token `__Host-` cookie, operator/building switchers, CloudFront `plataforma.globepower.cl`, iot-ingest redeployed, RDS synced. [CHANGELOG — 2.2.0-alpha.0](CHANGELOG.md)
- **Meter drill-down + billing + multi-tenant theming + UX:** MeterDetailPage y MeterReadingsPage portan flujo v1. BuildingDetailPage con tabs Facturación/Medidores. Dashboard KPIs financieros. DropdownSelect en 24 páginas. InvoicesPage status tabs + 15-row scroll + preview Drawer. AlertsPage status tabs + resolve Drawer. Sidebar smooth collapse + TenantSwitcher (selector empresa con search, aplica theme). Themes PASA (azul) y Siemens (teal) via `data-theme`. Tenant PASA creado, 5 malls reasignados. PDF URL fix. Auth preserva ruta. [CHANGELOG — 2.1.0-alpha.0](CHANGELOG.md)
- **Role impersonation + query perf + UX:** super_admin switcher de rol con dropdown custom. `DISTINCT ON` → `LEFT JOIN LATERAL` en readings/latest. DevicesPage y MetersByTypePage con search + infinite scroll. Sidebar collapse via logo. Generación y Mapa Modbus ocultos. Drawer phantom fix. [CHANGELOG — 2.0.0-alpha.0](CHANGELOG.md)

### Completado (2026-04-23)
- **Realtime filters + token refresh fix:** RealtimePage con KPI compactos, filtro status/búsqueda, 15 filas + infinite scroll. Fix refresh token: backend lee cookie httpOnly cuando body vacío (elimina 401 intermitentes). [CHANGELOG — 1.9.0-alpha.0](CHANGELOG.md)
- **Table state pattern + super_admin bypass:** `TableStateBody` reutilizable (skeleton/error/vacío en tbody). super_admin omnipotente frontend+backend. Drawer z-[9999]. Login spinner fix. Sidebar sub-items con ring activo. Migración permisos admin. [CHANGELOG — 1.8.0-alpha.0](CHANGELOG.md)
- **Tenant onboarding:** CompaniesPage en `/admin/companies` — crear empresa con roles + admin en un paso. Drawer con formulario completo, resultado con roles creados. [CHANGELOG — 1.7.0-alpha.0](CHANGELOG.md)
- **V1 design grid + Globe Power colors:** Sidebar numerado (01-10) con sub-items expandibles, Header con banderas CL/CO/PE + WhatsApp + Email + menú usuario, paleta Globe Power (green/grey/brand). 30 tablas con sticky header + scroll interno. Alertas clickeables con highlight en destino. RealtimePage infinite scroll 15 rows. [CHANGELOG — 1.6.0-alpha.0](CHANGELOG.md)
- **Globe Landing overhaul:** Hero carousel 3 slides con copy dinámico, Values con overlay descripción, Innovation con text overlay + nuevas imágenes, custom ServiceSelect en Contacto, footer logos carousel, responsive mobile-first en todas las secciones. [CHANGELOG — 1.5.0-alpha.0](CHANGELOG.md)
- **Skeleton loading + dashboard perf:** Chart skeleton estilo TradingView (SVG curve, volume bars, shimmer). Dashboard: waterfall 3-queries → fast path via `useMetersQuery` (2+1 paralelo). RealtimePage: skeleton tabla 8 columnas. Fix `@IsUUID` → `@IsString` en LatestQueryDto (seed UUIDs no RFC 4122). [CHANGELOG — 1.4.0-alpha.0](CHANGELOG.md)
- **Docs + deploy:** monitoreo-v2 documentación completa (6 docs), `globe-landing/deploy.sh` para S3+CloudFront (globepower/energymonitor/both). [CHANGELOG — 1.3.1-alpha.0](CHANGELOG.md)
- **Monitoreo-v2 Sidebar, roles, seguridad, design system:** Acordeón 7 grupos, `RequirePerms` en 47 rutas, RolesPage con módulos/capacidades, 8 componentes atómicos refinados, 28 tests brute-force, 8 permisos nuevos en DB. [CHANGELOG — 1.3.0-alpha.0](CHANGELOG.md)
- **Globe Landing Figma Design System:** Tokens, paleta, Navbar 6 links, Buttons 3 tipos, imágenes reales, hover effects, carousel 1043×117. [CHANGELOG — 1.2.0-alpha.0](CHANGELOG.md)

### Completado (2026-04-22)
- **Globe Landing UI polish:** Hero con overlay oscuro, carousel infinito de logos (blanco, 2/3 ancho, esquina redondeada), CTA+flechas junto a subtítulo, dots placeholder, navbar links a la derecha, About con botón pill alineado derecha, Footer con fila de logos clientes. [CHANGELOG — 1.1.2-alpha.0](CHANGELOG.md)
- **Globe Landing redesign:** Todas las secciones reemplazadas desde PDF "Inicio Globe Power.pdf". [CHANGELOG — 1.1.1-alpha.0](CHANGELOG.md)

### Completado (2026-04-21)
- **XLSX spec completo (monitoreo-v2):** 12 vistas nuevas + MFA. B1-B7 completos. [CHANGELOG — 1.1.0-alpha.0](CHANGELOG.md)

### Completado (2026-04-16)
- **Self-service + IoT + SonarQube (monitoreo-v2):** TenantSettingsPage, ApiKeysPage, RolesPage (con grid permisos), IotReadingsModule (EAV, 5 endpoints), CronBuilder, TablePrimitives, SonarQube QG OK. [CHANGELOG — 1.0.0-alpha.0](CHANGELOG.md)

### Completado (2026-04-15)
- **Security hardening (monitoreo-v2):** SSRF blocker, HTML escape PDFs, constant-time API key, JWT strict validation, refresh token theft detection, ReDoS, `__Host-` cookies. [CHANGELOG — 0.99.1-alpha.0](CHANGELOG.md)
- **Platform hardening (monitoreo-v2):** Conectores reales (4 tipos), API externa v1, tenant onboarding, TimescaleDB, ISO 27001. [CHANGELOG — 0.99.0-alpha.0](CHANGELOG.md)

### Completado (2026-04-02)
- **Drawer + Header cleanup (monitoreo-v2):** `Drawer` en `components/ui/` (dialog nativo, side/size/footer). `UserForm` migrado de Modal a Drawer. Header sin selector edificios. [CHANGELOG — 0.98.0-alpha.0](CHANGELOG.md)
- **Componentes UI (monitoreo-v2):** `DropdownSelect`, `DataTable`, `Button`, `Toggle`, `Card` en `components/ui/`. Agnósticos, tipados, tema vía `var(--color-primary)`. [CHANGELOG — 0.97.0-alpha.0](CHANGELOG.md)
- **Responsividad desktop:** 11 tablas con `overflow-x-auto`, grids con breakpoints `lg:`, `max-w-screen-2xl` en layout
- **Bugfixes:** Sidebar hooks crash, HierarchyPage loading infinito, permisos frontend corregidos, seed buildings + jerarquía + RBAC hierarchy create/delete
- **UI integraciones (monitoreo-v2):** `IntegrationsPage` en `/integrations`; CRUD, config JSON, sync stub, logs paginados; `integrationsEndpoints` + `useIntegrationsQuery`; `Modal.dialogClassName`. [CHANGELOG — 0.96.0-alpha.0](CHANGELOG.md)
- **Email SES (monitoreo-v2):** `SesEmailService` + `@aws-sdk/client-ses`; env opcionales `SES_FROM_EMAIL`, `ALERT_EMAIL_RECIPIENTS`, `SES_REGION`; alertas + invitaciones; sin env solo logs. Runbook SES, `.env.example`. [CHANGELOG — 0.95.0-alpha.0](CHANGELOG.md)
- **Deuda técnica (hardening / docs):** `JsonLoggerService` + `LOG_FORMAT` + `trust proxy` en prod; `notifyUserCreated` (traza `[USER_INVITE]`); Vitest + `*.test.ts`; `CLAUDE.md` Known Issues alineado con código (Helmet/Throttler ya existían).
- **Fase 7 — Reportes e integraciones** — `ReportsModule` + `IntegrationsModule`; frontend `ReportsPage` `/reports` e `IntegrationsPage` `/integrations`. [CHANGELOG — 0.92 / 0.96](CHANGELOG.md)
- **Fase 8.1–8.2 — Dashboards ejecutivo / comparativo** — `ExecutiveDashboardPage`, `CompareDashboardPage`, `dashboardAggregations.ts`. [CHANGELOG — 0.93.0-alpha.0](CHANGELOG.md)
- **Fase 8.3–8.5 — Monitoreo (tipo / generación / Modbus)** — `MetersByTypePage`, `GenerationSitePage`, `ModbusMapPage`; rutas bajo `/monitoring/meters/type`, `/monitoring/generation`, `/monitoring/modbus-map` (sin cambios de API). [CHANGELOG — 0.94.0-alpha.0](CHANGELOG.md)
- **Fase 6 — Alertas avanzadas** — engine + evaluadores + escalamiento + notificaciones + frontend:
  - Backend: AlertEngineService (cron 5min), 6 evaluadores (22+ tipos), EscalationService (cron 10min)
  - Backend: NotificationService (email log + webhook), NotificationLog entity
  - Backend: `POST /alert-engine/evaluate`, `GET /notification-logs`
  - Backend: 358 tests total, 37 suites
  - Frontend: AlertRulesPage (config por familia, toggle, edición modal)
  - Frontend: EscalationPage (SLA, alertas abiertas con tiempo)
  - Frontend: NotificationsPage (historial con filtros y paginación)
  - 3 rutas nuevas: `/alerts/rules`, `/alerts/escalation`, `/alerts/notifications`
- **Fase 5 — Admin** — módulo completo backend + frontend:
  - Backend: `UsersModule` — CRUD + asignación rol + buildings (`GET/POST/PATCH/DELETE /users`, `GET/PATCH /users/:id/buildings`) — 12 tests
  - Backend: `AuditLogsModule` — `GET /audit-logs` con filtros (userId, action, resourceType, dateRange, paginación) — 7 tests
  - Backend: 331 tests total, 32 suites
  - Frontend: `UsersPage` — tabla CRUD, form con rol/buildings/proveedor auth
  - Frontend: `TenantsPage` — tabla locatarios CRUD con filtro edificio
  - Frontend: `HierarchyPage` — vista árbol recursiva con CRUD nodos
  - Frontend: `AuditPage` — tabla logs paginada con filtros y badges HTTP
  - API layer: tipos `user.ts` + `tenant-unit.ts` + `audit-log.ts`, endpoints + hooks CRUD
  - 4 rutas admin conectadas (reemplazaron PlaceholderPage)
- **Fase 4 — Facturación** — módulo completo backend + frontend:
  - Backend: `POST /invoices/generate` (cálculo desde readings + tariff blocks, transaccional), `GET /invoices/:id/pdf` (HTML invoice)
  - Backend: 9 tests nuevos (299 total, 28 suites)
  - Frontend: `TariffsPage` — tabla tarifas CRUD + bloques horarios expandibles, filtro edificio
  - Frontend: `InvoicesPage` — tabla facturas con filtros (edificio, estado), modal detalle line items, acciones aprobar/anular/eliminar, modal generación wizard
  - API layer: tipos `tariff.ts` + `invoice.ts`, `tariffsEndpoints` + `invoicesEndpoints`, hooks CRUD + generate
  - Sidebar: "Facturas" + "Tarifas" como entradas separadas

### Completado (2026-04-01)
- **Fase 3 — Vistas de monitoreo** — 6 páginas nuevas bajo `/monitoring/*`:
  - `RealtimePage` — lecturas en vivo, auto-refresh 30s, status online/offline/alarma
  - `DrilldownPage` — vista jerárquica: edificio → concentradores → medidores
  - `DemandPage` — StockChart demanda, peak vs contratada, Top 10 peaks
  - `QualityPage` — 4 charts calidad eléctrica, umbrales NCh/IEEE 519
  - `DevicesPage` — tabla unificada medidores + concentradores
  - `FaultHistoryPage` — timeline eventos de fallo
- **API layer** — tipos, endpoints y hooks para hierarchy, concentrators, fault-events
- **Fase 2 backend** — 6 módulos, 40 endpoints, 152 tests nuevos
- **Fase 1 frontend** — API layer, BuildingsPage, MetersPage, AlertsPage, DashboardPage
- **PLAN_ACCION.md** — Fases 1-3 completas

### Completado (2026-03-30)
- **ReadingsModule** — Read-only: `GET /readings` (time-series con downsampling vía `time_bucket`), `GET /readings/latest` (última lectura por medidor), `GET /readings/aggregated` (hourly/daily/monthly). Tenant + buildingIds RBAC
- **Dashboard layout** — Semáforo alertas movido a fila de controles. Cards y tabla Facturas Vencidas aprovechan espacio vertical completo
- **AlertsModule** — `GET /alerts` (filtros status/severity/buildingId/meterId), `GET /:id`, `PATCH /:id/acknowledge`, `PATCH /:id/resolve`. Tenant + buildingIds RBAC
- **AlertRulesModule** — CRUD reglas de alerta. Reglas globales (sin building) visibles cross-building
- **Tech debt cleanup** — TenantMiddleware y RolesGuard eliminados, DELETE → 204, `strict: true`, coverage threshold 80%, audit log con Logger, `access_level` limpiado, FK audit preservado, decoradores extraídos, dirs vacíos eliminados
- **BuildingsModule** — CRUD con tenant scoping + buildingIds RBAC
- **MetersModule** — CRUD con tenant + buildingIds scoping + filtro buildingId
- **138 tests, 16 suites** en backend

### Completado (2026-03-25)
- **Charts agnósticos** — `Chart`, `StockChart`, `MonthlyChart` + `chart-config.ts` en monitoreo-v2. Colores via CSS vars, sin acoplamiento a tema
- **Storybook 9** — catálogo de componentes en puerto 6006. Stories para los 3 charts
- **Fix login Microsoft** — race condition en `useSessionResolver` (esperaba MSAL `InteractionStatus.None`)
- **Layout cleanup** — sidebar sin iconos, "Cerrar Sesión" al fondo del sidebar
- **monitoreo-v2 frontend + auth e2e** — React 19, Vite 8, Tailwind v4. Login funcional con Microsoft (redirect) y Google (implicit + userinfo). Theming dinamico desde tenant. Session flag evita 401 innecesario. Seed tenant+user en TimescaleDB
- **monitoreo-v2 backend scaffold** — NestJS 11 + TimescaleDB (Docker), multi-tenant, ISO 27001, auth OAuth (JWKS jose), JWT httpOnly cookies, refresh token rotation (FOR UPDATE), audit log hypertable, rate limiting, helmet
- Fix operator filter: Siemens bypasses `useOperatorFilter` en Buildings, Alerts, Realtime
- Fix POC3000 VARIABLE_MAP: 10 variables corregidas en `iot-ingest` Lambda
- Backfill 123 filas IoT en prod (reactive, frequency, energy, THD) via dbVerify
- Alertas IoT: endpoint `/iot-readings/alerts` + `useAlerts` theme-aware
- dbVerify: nueva función `backfillIotReadings` para re-extraer de `raw_json`

### Completado (2026-03-24)
- IoT Core Siemens: Thing `siemens-poc3000`, certs TLS, policy `powercenter/*`, regla S3
- Lambda `iot-ingest`: S3 → tabla `iot_readings` cada 15 min, deduplicación unique index
- Multi-tema frontend: toggle PASA/Siemens, colores CSS variables, logo/favicon/título dinámicos
- Backend `IotReadingsModule`: 9 endpoints PASA-compatibles desde `iot_readings`
- Hooks theme-aware: mismas vistas, distinta fuente de datos según tema
- Siemens POC3000 conectado y enviando 451 variables cada 15 min

### Completado (2026-03-22)
- Globe Landing desplegado en globepower.cl (CF `EHRW4X3FSU1YQ`)

### Pendiente
- **Pipeline ingestión PASA** — no existe en prod. Última lectura en `readings`: 25 abril 2026. 2.6M rows históricas. Necesita: Lambda o ECS scheduled task para Drive→S3→RDS diario. Sin esto, todas las vistas con datos agregados muestran placeholders.
- **Timescale Cloud** — plan de migración en `docs/ops/timescale-migration-plan.md`. RDS PostgreSQL no soporta CAGGs nativos. `readings_daily`/`readings_hourly` son vistas SQL regulares (no CAGGs). `portfolio_summary` matview tiene datos solo hasta abril (depende de datos frescos en `readings`).
- **SSO Azure AD PASA** — credenciales App Registration del cliente.
- **UAT Anexo 07** — checklist formal post-SSO.
- **IoT escalamiento** — resuelto: `clientid()` en IoT Rule identifica dispositivos por certificado TLS. Lambda auto-registra desconocidos en `iot_devices`. Asignación libre desde UI (`/admin/iot-devices`). Pendiente: coordinación logística para saber qué Thing va a qué locación.
- Salida sandbox SES, billing AWS, DNS opcional `plataforma.globepower.cl` (prod usa `power-monitor.cloud`).

### Prompt de retoma
```
Read CLAUDE.md. Retomando monitoreo-v2.
Prod: power-monitor.cloud — 2.43.0; PASA 875 medidores; migr. prod 1–55 (incl. 14 cnr_records, 15 interventions).
Docs: power-monitor.cloud/docs/ — Docusaurus, 50 páginas, API Keys documentadas.
Mapa: 47 malls (20 indoor + 27 markers), 5977 stores, 946 tiles.
IMPORTANTE: última lectura en readings es 25 abril 2026. No hay pipeline de ingestión PASA activo. Aggregated queries deshabilitadas en frontend (placeholder data). Plan Timescale en docs/ops/timescale-migration-plan.md.
Security: JWT TTL 15min (was 24h). Step-up auth en /me/export y /me/deletion-request (iat <5min). Refresh token theft detection. Pentest 113 tests / 14 fases: 91 PASS, 0 FAIL, 22 WARN. Incluye blind SQLi, JWT cracking (~2.7M), XXE, race conditions, fuzzing agresivo. Framework en scripts/pentest/.
Backend: ECS rev 20 (jwt-stepup-20260707). CnrModule + InterventionsModule.
Frontend: 773/773 tests pass. Switcher bugs corregidos (11). sessionStorage persistence.
Perfiles: 5 perfiles EMS. Navegación + contenido + datos alineados a spec.
IoT: auto-discovery activo. clientid() en IoT Rule. Asignación libre desde /admin/iot-devices.
Pendiente: Redis para rate limiting distribuido (sin REDIS_URL, throttle in-memory por instancia), pipeline ingestión PASA (no hay datos desde abril), Timescale Cloud (plan en docs/ops/), SSO Azure PASA, firma digital (técnico), Parquet export (auditor).
```

## Prioridad Actual de Acceso
`rol → vistas → acciones`. Un usuario invitado entra con rol asignado que define qué vistas y acciones puede ejecutar.

## Project Overview
Plataforma de monitoreo energético multi-cliente. Dos temas: **PASA** (875 medidores PAC en 5 edificios, billing, drill-down jerárquico) y **Siemens** (POC3000 vía IoT Core MQTT, datos eléctricos puros). Mismas vistas, distinta fuente de datos según tema.

### monitoreo-v2
Rewrite multi-tenant de la plataforma. Vive en `monitoreo-v2/`.
- **Backend:** NestJS 11 + TimescaleDB (PG16) + Docker. Auth OAuth → JWT httpOnly cookies. ISO 27001.
- **Frontend:** React 19 + Vite 8 + Tailwind v4. Auth cookie-based (sin sessionStorage). Theming dinamico desde tenant. Storybook 9.
- **Target deploy:** AWS ECS Fargate. API externa para terceros.

## Tech Stack
- **Frontend:** React 19, Vite 8, TypeScript 5.9, Tailwind CSS v4, Highcharts Stock 12, TanStack Query v5, TanStack Table v8, Zustand 5, React Router v7
- **Backend:** NestJS 11, TypeORM 0.3, PostgreSQL 16, @vendia/serverless-express, jose (JWT/JWKS)
- **Infra:** AWS Lambda (Node 20, Serverless v3), ECS Fargate, API Gateway HTTP, RDS PostgreSQL, S3+CloudFront, EventBridge, AWS IoT Core (MQTT)
- **Auth:** MSAL v5 (Microsoft), @react-oauth/google
- **Testing:** Jest 30 (backend, 1307 tests / 144 suites). Frontend: Vitest + @testing-library/react (903 tests / 69 suites).

## Architecture
```
CloudFront (energymonitor.click)
├── /* → S3 (frontend SPA)
└── /api/* → API Gateway → Lambda (NestJS, cached bootstrap)
                              └── RDS PostgreSQL (VPC, 3 subnets)

EventBridge (15 min) → Lambda synthetic-readings-generator → RDS (+ prune + cache refresh)
EventBridge (5 min) → Lambda offlineAlerts → RDS
EventBridge (daily 03:00 Chile) → ECS Fargate drive-pipeline → Drive→S3→RDS

Siemens POC3000 → MQTT (IoT Core) → Rule powercenter_to_s3 → S3
EventBridge (15 min) → Lambda iot-ingest → S3 → RDS (iot_readings)
```

## Frontend Patterns
- **CSP (prod):** `vite/csp-meta-plugin.ts` + `vite/csp-policy.ts` inyectan meta en `build` solamente; ver `docs/context/frontend-views.md` (monitoreo-v2).
- **API layer (3-file):** `services/routes.ts` → `services/endpoints.ts` → `hooks/queries/use<Entity>.ts`
- **State:** TanStack Query (server) | Zustand useAuthStore + useAppStore (sessionStorage, incl. userMode + selectedOperator + selectedBuilding + selectedStoreMeterId + theme)
- **Multi-tema:** `useAppStore.theme` (`'pasa'|'siemens'`) → CSS variables `[data-theme="siemens"]` en `<html>` + hooks detectan tema y cambian fuente de datos. Config en `lib/themes.ts`
- **Routing:** `appRoutes.ts` → `router.tsx` (lazy + ErrorBoundary + Suspense + ProtectedRoute)
- **Feature folders:** `features/<domain>/<Domain>Page.tsx` + `components/`
- **Shared utils:** `lib/formatters.ts`, `lib/constants.ts`, `lib/aggregations.ts`, `lib/chartConfig.ts`
- **Shared UI:** `Drawer`, `DropdownSelect`, `DataTable`, `Button`, `Toggle`, `Card`, `DataWidget`, `Modal`, `ConfirmDialog`, `QueryStateView` en `components/ui/`
- **Shared hooks:** `useClickOutside`, `useOperatorFilter` en `hooks/`
- **Styling:** Tailwind v4 tokens PA: `text-pa-text`, `text-pa-text-muted`, `text-pa-navy`, `bg-white`, `border-pa-border`, `text-pa-blue`, `hover:bg-gray-100`
- **StockChart:** afterSetExtremes → pickResolution(rangeMs) → refetch; keepPreviousData
- **Highcharts init:** import único desde `lib/highcharts-init.ts` (Stock + more en misma instancia)

## Backend Patterns
- **NestJS module (4-file):** entity → service → controller → module. Registrar en app.module.ts.
- **TypeORM:** autoLoadEntities, synchronize: false. Raw SQL con `this.dataSource.query()`. rawVal() para pg minúsculas.
- **Auth:** Guard global JWT + `@RequirePermissions(module, action)` + `RolesGuard`
- **Validation:** Global ValidationPipe({ whitelist, forbidNonWhitelisted, transform }). DTOs con class-validator.
- **Swagger:** `/api/docs` — OpenAPI (dev only, disabled in production). Configurado via `@nestjs/swagger` en main.ts.
- **Error handling:** service null → controller NotFoundException; auth null on failure
- **IoT module:** `IotReadingsModule` — 9 endpoints read-only desde tabla `iot_readings`. Endpoints PASA-compatibles (`buildings`, `meters-latest`, `monthly`, `meter-readings`, `alerts`) devuelven misma interfaz que módulos PASA con conversión de unidades (W→kW, Wh→kWh). Alertas generadas on-the-fly desde anomalías (voltaje, PF, potencia, THD)
- **IoT devices module:** `IotDevicesModule` — CRUD + assign/unassign dispositivos IoT descubiertos. Lambda auto-registra en `iot_devices`. Asignación libre a cualquier meter desde UI. Device map dinámico desde `meters.iot_device_id`.

## Data Flow (end-to-end)
```
routes.ts → endpoints.ts → useX.ts → Axios Bearer → CloudFront → API Gateway → Lambda
→ controller → service → raw SQL → PostgreSQL → JSON → TanStack Query → React → Highcharts/Table
```

## Development

Detalle completo: [`monitoreo-v2/docs/deploy.md`](monitoreo-v2/docs/deploy.md).

**Flujo recomendado (hot reload):** solo DB en Docker; backend y frontend en el host.

```bash
cd monitoreo-v2 && docker compose up -d timescaledb
cd monitoreo-v2/backend && cp .env.example .env && npm ci && npm run start:dev
cd monitoreo-v2/frontend && npm ci && npm run dev
cd monitoreo-v2/frontend && npm run test
```

**Flujo sin Docker (frontend contra prod):** no requiere Docker ni backend local.

```bash
cd monitoreo-v2/frontend
VITE_API_TARGET=https://power-monitor.cloud npm run dev
```

Proxy reescribe cookies `__Host-` + `Secure` para funcionar en localhost HTTP. Login OAuth funciona.

**Flujo opcional:** `docker compose up --build` levanta DB + API en contenedores (imagen prod, sin watch).

**Docs site:** Docusaurus en `monitoreo-v2/docs-site/`. Deploy: `npm run deploy` (build + S3 sync + CF invalidation). Vive en `power-monitor.cloud/docs/`.

**DB local (compose):** `DB_HOST=127.0.0.1 DB_PORT=5434 DB_NAME=monitoreo_v2 DB_PASSWORD=monitoreo2026` — contenedor `monitoreo-v2-db`. Legacy `pg-arauco`: `DB_NAME=arauco DB_PASSWORD=arauco`.

## Environment Variables
- **Backend Lambda:** `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET`, `COOKIE_SECRET`, `FRONTEND_URL`, `GOOGLE_CLIENT_ID`, `MICROSOFT_CLIENT_ID`, `NODE_ENV`; opcional `LOG_FORMAT=json`; opcional `RDS_CA_BUNDLE_PATH`; opcional `CONFIG_ENCRYPTION_KEY` (AES-256-GCM para secrets en integration config). En producción `JWT_SECRET` (min 32 chars), `COOKIE_SECRET`, `FRONTEND_URL`, `DB_HOST`, `DB_PASSWORD`, `MICROSOFT_TENANT_ID`, `MICROSOFT_CLIENT_ID`, `GOOGLE_CLIENT_ID` son requeridos (bootstrap falla sin ellos). Opcional `REDIS_URL` para rate limiting distribuido (multi-instancia ECS).
- **Email (SES):** opcional `SES_FROM_EMAIL` (identidad verificada en SES), `SES_REGION` (default `AWS_REGION` / `us-east-1`), `ALERT_EMAIL_RECIPIENTS` (coma-separados) para alertas/escalamiento; `notifyUserCreated` envía al email del usuario cuando `SES_FROM_EMAIL` está definido. Ver [AWS Runbook — SES](docs/aws-runbook.md#amazon-ses-email-saliente).
- **Frontend:** `VITE_AUTH_MODE`, `VITE_MICROSOFT_CLIENT_ID`, `VITE_MICROSOFT_TENANT_ID`, `VITE_GOOGLE_CLIENT_ID`

## Conventions
- **Idioma:** Español en UI/labels/changelog. Inglés en código/variables/commits.
- **Files:** PascalCase componentes, camelCase hooks/services (frontend). kebab-case con sufijo (backend).
- **Exports:** Named exports everywhere (excepto `api` Axios default).
- **TypeScript:** strict ambos. Backend: experimentalDecorators. Frontend: verbatimModuleSyntax.
- **Formatting:** 2-space, single quotes, semicolons, trailing commas. No Prettier.

## Deploy
- **Usar:** [AWS Runbook](docs/aws-runbook.md) + [Deploy Skill](skills/deploy.md)
- **Frontend monitoreo-v2:** `cd monitoreo-v2/frontend && npm run build && aws s3 sync dist/ s3://power-monitor-frontend/ --exclude "docs/*" --region us-east-1 && aws cloudfront create-invalidation --distribution-id E1SNFETXON2VSI --paths "/*" --region us-east-1`
- **NUNCA usar `--delete`** en el sync — borra la carpeta `docs/` (Docusaurus) que vive en el mismo bucket bajo `/docs/`.

## Known Issues & Tech Debt
- **DB TLS (RDS):** `rejectUnauthorized: true` con bundle CA `backend/certs/rds-global-bundle.pem` (o `RDS_CA_BUNDLE_PATH`). Legacy Nest (`backend/`), Lambdas (`offlineAlerts`, `dbVerify`, `iot-ingest`), monitoreo-v2 API y scripts `infra/**/*.mjs` / `scripts/*.mjs` alineados; override local: `DB_SSL` / sin PEM solo en dev según script.
- **Tokens en el browser:** cookie httpOnly para JWT de app (15min TTL, auto-refresh via interceptor 401→`/auth/refresh`); MSAL usa `sessionStorage` solo para el flujo OAuth Microsoft; flag `has_session` en `localStorage` evita `/me` redundante (no almacena secretos). Step-up auth en `/auth/me/export` y `/auth/me/deletion-request` (rechaza si JWT `iat` > 5 min).
- **Idle timeout (CYB-06):** `IdleTimeoutGuard` global revoca sesión tras inactividad (default 15min, configurable por tenant `idleTimeoutMinutes` 5–60). Frontend `useIdleTimeout` espeja el timeout client-side. `last_activity_at` en `refresh_tokens` (migración `49`).
- **API hardening:** Helmet (HSTS 1yr, Referrer-Policy, COOP), `ThrottlerGuard` (3 tiers, Redis-backed con `REDIS_URL`), CORS whitelist, `trust proxy` en prod, body size limit 1mb. API key: rate limiting per-key + constant-time hash (timingSafeEqual) + `__Host-` cookie prefix. Tenant cross-access guard, PII redaction, env validation (8 vars + JWT_SECRET min 32 chars), config encryption AES-256-GCM. SSRF blocker en connectors + re-validation at sync (DNS rebinding). HTML escape en PDFs. JWT strict payload validation. Refresh token theft detection. ReDoS-safe glob patterns. Swagger disabled in production. `forbidNonWhitelisted` en ValidationPipe. MFA validate solo para usuarios con MFA habilitado.
- **Pentest framework:** `scripts/pentest/runner.mjs` — 113 tests en 14 fases contra prod. Zero deps (native fetch). Setup: `scripts/pentest/setup-keys.mjs` crea API keys. Ejecutar: `PENTEST_KEY_A=... PENTEST_BEARER=... node scripts/pentest/runner.mjs`. Fases 1–7 (API keys), 8–14 (Bearer token). Resultado 2.43.0: 91 PASS, 0 FAIL, 22 WARN. Incluye: ~2.7M JWT secret candidates, 48 blind SQLi timing, 108 fuzzing payloads, race conditions, XXE, mass assignment, JSON bomb. Pendiente: Redis para rate limiting distribuido.
- **Tests frontend:** Vitest + @testing-library/react + jsdom (`npm run test` en `monitoreo-v2/frontend`). 773 tests. E2E: Playwright 23 tests contra prod (`E2E_TOKEN=<token> npx playwright test --workers=1`).
- **Invitaciones / email:** alta de usuario desde admin emite traza `[USER_INVITE]`; con `SES_FROM_EMAIL` definido se envía también por SES al destinatario. Alertas usan `SES_FROM_EMAIL` + `ALERT_EMAIL_RECIPIENTS`. En sandbox SES solo destinatarios verificados hasta solicitar salida de sandbox en AWS.
- **Ley 21.719 compliance:** ARCO+ completo (acceso, rectificación, cancelación, oposición, bloqueo, portabilidad). Consentimiento con revocación. MFA enforcement por rol. Retención automática (cron diario). Breach notification 72h. Endpoints públicos: `/privacy/policy`, `/privacy/processing-registry`. Docs legales en `monitoreo-v2/docs/privacy/` (DPA AWS, EIPD, transferencia internacional, DPO). Pendiente solo: firma EIPD, verificar DPA AWS, designar DPO, monitorear lista países adecuados de la Agencia.

## Playbooks Opcionales
- Componente nuevo: `patterns/playbooks/new-component.md`
- Chart nuevo: `patterns/playbooks/new-chart.md`
- Endpoint nuevo: `patterns/playbooks/new-endpoint.md`
- Flujo end-to-end: `patterns/playbooks/new-fullstack-flow.md`

## Contexto Externo
- Spec funcional XLSX: `docs/POWER_Digital_Especificacion_Modulos-rev2.1.xlsx` (ver `docs/context/functional-spec.md`)
- Documento externo complementario: `/Users/clementefalcone/Desktop/personal/Proyectos/Proyectos/energy-monitor.md`

## References
[CHANGELOG](CHANGELOG.md) (último: 2.39.0-alpha.0) | [Docs Site](https://power-monitor.cloud/docs/) | [MapVX Cache](monitoreo-v2/backend/scripts/seed-mapvx-tiles.mjs) | [Issues & Fixes](docs/ISSUES_&_FIXES.md) | [Auth Microsoft](docs/auth-microsoft-data-scope.md) | [AWS Runbook](docs/aws-runbook.md)

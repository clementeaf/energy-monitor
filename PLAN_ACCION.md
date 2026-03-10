# PLAN_ACCION.md

## Propósito
Roadmap resumido del producto y del endurecimiento técnico del repo.

- Este archivo no reemplaza a `CLAUDE.md`.
- `CLAUDE.md` define cómo trabajar hoy.
- Este archivo define hacia dónde empujar el producto y la plataforma.

## Fuente funcional y regla de verdad

- Blueprint funcional objetivo: `docs/POWER_Digital_Especificacion_Modulos-rev2.1.xlsx`.
- Estado real actual: código en frontend, backend e infra.
- Contexto operativo mínimo: `CLAUDE.md`.
- Si hay conflicto, para implementación inmediata manda el código; para roadmap y expansión funcional manda el XLSX.

## Prioridad actual de acceso

- Prioridad vigente: `rol -> vistas -> acciones`.
- En la práctica del repo, `module` debe tratarse como `vista`.
- Cada rol debe definir qué vistas están disponibles y qué acciones están habilitadas dentro de cada vista.
- El flujo objetivo de onboarding es invitación por link con rol preasignado; el usuario invitado no debería requerir configuración manual extra de permisos para acceder a sus vistas.
- Las etapas futuras deben leerse bajo esta regla, especialmente dashboard, administración, auditoría e invitaciones.

## Estado actual consolidado

### Base ya lograda en el repo
- [x] Login SSO básico.
- [x] Página de sin acceso.
- [x] Listado de edificios.
- [x] Detalle de edificio.
- [x] Detalle de medidor.
- [x] Vista base de dispositivos IoT.
- [x] Panel base de alertas.
- [x] Drill-down jerárquico base.
- [x] Backend NestJS + PostgreSQL + AWS Lambda operativos.

### Cobertura frente al mapa objetivo del XLSX
- Acceso: existe login básico con selección de contexto y link de invitación firmado con expiración; falta MFA y el envío/reemisión transaccional de invitaciones.
- Dashboard: no existen aún las vistas ejecutivas ni comparativas.
- Monitoreo: existen tiempo real base, drill-down base y dispositivos bajo la ruta objetivo; faltan demanda, calidad, tipo de medidor, generación, mapa Modbus, fallos y concentradores.
- Alertas: existe panel base en `/alerts` con detalle operativo; faltan reglas e historial SLA.
- Facturación, reportes, analítica, administración avanzada, auditoría e integraciones: pendientes.

## Estado Actual

### Ya resuelto en el repo
- Backend NestJS conectado a PostgreSQL con endpoints de buildings, meters, hierarchy, alerts y auth.
- Frontend React con vistas de edificios, detalle, drill-down, medidores, gráficos y auth.
- El catálogo real de vistas implementadas ya está persistido en DB dentro de `modules`, con route path y metadata de navegación.
- Los endpoints de datos ya restringen buildings, meters, hierarchy y alerts según los `siteIds` asignados al usuario; los roles globales conservan acceso transversal.
- Infra AWS con CloudFront + S3 + API Gateway + Lambda + RDS + EventBridge.
- Generación sintética de lecturas y offline alerts en ejecución separada.

### Deuda técnica vigente
- Falta usar el sitio seleccionado en frontend como filtro server-side adicional para usuarios multisite.
- Cobertura de tests todavía mínima y centrada en controllers/guards.
- `offline-alerts.ts` sigue con cold start completo.
- No hay retention/partitioning para `readings`.
- Tokens en `sessionStorage`.
- Sin rate limiting ni security headers.

## Mapa objetivo de vistas según XLSX

### 1. Acceso y contexto
- [x] Login / autenticación SSO.
- [x] Selección de contexto edificio o portafolio.
- [ ] MFA o segundo factor.

### 2. Dashboard
- [ ] `/dashboard/executive` — dashboard ejecutivo de portafolio.
- [ ] `/dashboard/executive/:siteId` — dashboard ejecutivo por edificio.
- [ ] `/dashboard/compare` — comparativo entre edificios.

### 3. Monitoreo
- [x] `/monitoring/realtime` — monitoreo técnico en tiempo real base.
- [x] `/monitoring/drilldown/:siteId` — ruta y naming alineados al target funcional base.
- [x] `/monitoring/devices` — inventario y estado de dispositivos alineado a la ruta objetivo.
- [ ] `/monitoring/demand/:siteId` — análisis de demanda.
- [ ] `/monitoring/quality/:siteId` — calidad de energía.
- [ ] `/monitoring/meters/type` — tipo de medidor y estado breaker.
- [ ] `/monitoring/generation/:siteId` — generación y exportación.
- [ ] `/monitoring/modbus-map/:siteId` — mapa de bus Modbus RTU.
- [ ] `/monitoring/fault-history/:meterId` — historial de fallos y mantenimiento.
- [ ] `/monitoring/concentrator/:concentratorId` — diagnóstico de concentrador.

### 4. Facturación
- [ ] `/billing/rates` — configuración tarifaria.
- [ ] `/billing/generate` — generación de factura.
- [ ] `/billing/approve` — aprobación de facturas.
- [ ] `/billing/history` — historial de facturación.
- [ ] `/billing/my-invoice` — portal locatario.

### 5. Alertas
- [x] `/alerts` — panel base de alertas activas.
- [x] Vista de detalle de alerta con timeline y acciones.
- [ ] `/alerts/rules` — configuración de reglas.
- [ ] `/alerts/history` — historial y SLA.

### 6. Reportes
- [ ] `/reports` — centro de reportes.
- [ ] `/reports/scheduled` — reportes programados.
- [ ] Tipos de reporte: ejecutivo, consumo detallado, demanda, facturación, SLA/disponibilidad, ESG, benchmarking, inventario, alertas/compliance.

### 7. Analítica
- [ ] `/analytics/benchmark` — benchmarking.
- [ ] `/analytics/trends` — tendencias y proyección.
- [ ] `/analytics/patterns` — patrones y anomalías.

### 8. Administración
- [x] `/admin/users` — gestión base de usuarios e invitaciones.
- [x] `/admin/sites` — gestión base de edificios o sites.
- [x] `/admin/meters` — gestión base de medidores y concentradores.
- [ ] `/admin/tenants-units` — gestión de locatarios.
- [x] `/admin/hierarchy/:siteId` — inspección base de jerarquía eléctrica.
- [ ] `/admin/tenant-config` — configuración global tenant.

### 9. Auditoría
- [ ] `/audit/activities` — log de actividades.
- [ ] `/audit/changes` — log de cambios.
- [ ] `/audit/access` — log de accesos.

### 10. Integraciones
- [ ] `/integrations/status` — estado de conexiones.
- [ ] `/integrations/config` — configuración APIs y datalake.
- [ ] `/integrations/sync-log` — log de sincronización.

## Etapas de implementación priorizadas

### Etapa 1 · Blindaje de plataforma y cierre Alpha
Objetivo: asegurar la base técnica y alinear las primeras vistas objetivo con lo que ya existe en frontend y backend.

Incluye:
1. Auth guards y enforcement RBAC reales en backend.
2. Corrección de queries con interpolación insegura.
3. Tests mínimos para auth, buildings, meters, hierarchy y alerts.
4. Selección de contexto tras login.
5. `/monitoring/realtime`.
6. Alineación de `/iot-devices` hacia `/monitoring/devices`.
7. Normalización de drill-down al target `/monitoring/drilldown/:siteId`.
8. Robustecimiento del panel `/alerts` y detalle de alerta.
9. Base administrativa mínima: `/admin/sites`, `/admin/meters`, `/admin/hierarchy/:siteId`.

### Corte post-Etapa 1 · Base de invitaciones y acceso preasignado
Objetivo: convertir el onboarding actual en invite-first para que el rol preasignado gobierne vistas y acciones desde el primer login, sin provisión manual por SQL ni autocreación abierta.

Incluye:
1. Permitir usuarios preprovisionados sin `provider` ni `external_id` hasta su primer login.
2. Enlazar identidad OAuth contra invitaciones existentes por email en `auth/me`.
3. Exponer `/admin/users` como base administrativa de invitaciones.
4. Exponer `/roles` para alimentar el catálogo de roles en frontend.
5. Validar asignación de sitios según rol antes de provisionar acceso.

### Etapa 2 · Dashboards ejecutivos y monitoreo analítico
Objetivo: cubrir el núcleo visible de producto usando la data ya disponible en lecturas, jerarquía y overview.

Incluye:
1. `/dashboard/executive`.
2. `/dashboard/executive/:siteId`.
3. `/dashboard/compare`.
4. `/monitoring/demand/:siteId`.
5. `/monitoring/quality/:siteId`.
6. `/monitoring/meters/type`.

### Etapa 3 · Operación avanzada y alertas maduras
Objetivo: expandir monitoreo técnico hacia operación avanzada y reglas de negocio de alertas.

Incluye:
1. `/monitoring/generation/:siteId`.
2. `/monitoring/modbus-map/:siteId`.
3. `/monitoring/fault-history/:meterId`.
4. `/monitoring/concentrator/:concentratorId`.
5. `/alerts/rules`.
6. `/alerts/history`.
7. Ampliación del catálogo de alertas más allá de `METER_OFFLINE`.

### Etapa 4 · Facturación y tenant
Objetivo: habilitar el flujo de negocio para locatarios y facturación energética.

Incluye:
1. `/billing/rates`.
2. `/billing/generate`.
3. `/billing/approve`.
4. `/billing/history`.
5. `/billing/my-invoice`.
6. `/admin/tenants-units`.

### Etapa 5 · Administración, reportes, auditoría e integraciones
Objetivo: completar operación administrativa, cumplimiento y conectividad empresarial.

Incluye:
1. Expandir `/admin/users` con edición, revocación y lifecycle más completo.
2. `/admin/tenant-config`.
3. `/reports`.
4. `/reports/scheduled`.
5. `/audit/activities`, `/audit/changes`, `/audit/access`.
6. `/integrations/status`, `/integrations/config`, `/integrations/sync-log`.

### Etapa 6 · Analítica avanzada y cierre Core
Objetivo: explotar histórico, proyección y benchmarking una vez consolidada la base operativa.

Incluye:
1. `/analytics/benchmark`.
2. `/analytics/trends`.
3. `/analytics/patterns`.
4. Reportes ESG, benchmarking y compliance con datos consistentes.

## Implementaciones pendientes por etapa

### Etapa 1 · Checklist de trabajo
- [x] Agregar auth guards o mecanismo equivalente real en backend para data endpoints.
- [x] Llevar RBAC backend al mismo nivel mínimo que `ProtectedRoute`.
- [x] Parametrizar queries de consumo en buildings.
- [x] Cubrir con tests mínimos auth, buildings, meters, hierarchy y alerts.
- [x] Implementar selección de contexto después del login.
- [x] Implementar `/monitoring/realtime`.
- [x] Migrar o redirigir `/iot-devices` hacia `/monitoring/devices`.
- [x] Alinear `/monitoring/drilldown/:buildingId` al target `/monitoring/drilldown/:siteId`.
- [x] Completar `/alerts` con detalle operativo de alerta.
- [x] Implementar `/admin/sites`.
- [x] Implementar `/admin/meters`.
- [x] Implementar `/admin/hierarchy/:siteId`.

Estado: Etapa 1 cerrada como baseline funcional.

### Corte post-Etapa 1 · Checklist de trabajo
- [x] Permitir usuarios preprovisionados sin `provider` ni `external_id` hasta su primer login.
- [x] Dejar de autocrear usuarios no invitados en `auth/me`.
- [x] Enlazar identidad OAuth por email contra invitaciones existentes.
- [x] Implementar `/admin/users` para provisionar email, rol y sitios.
- [x] Exponer `/roles` para el formulario de invitaciones.
- [x] Validar roles que requieren al menos un sitio asignado.
- [x] Cubrir el binding invite-first con tests backend.

Estado: baseline invite-first operativo sobre login SSO actual.

### Corte post-Etapa 1 · Invitación con link firmado
Objetivo: cerrar el gap entre provisión administrativa y activación del primer acceso SSO mediante un token firmado con expiración y validación pública.

Incluye:
1. Persistir token hash y expiración de invitación en `users`.
2. Devolver el token al crear invitaciones desde `/admin/users`.
3. Exponer validación pública de `/invitations/:token`.
4. Requerir el token en el primer `auth/me` cuando la invitación fue emitida con link firmado.
5. Agregar la vista pública `/invite/:token` y el catálogo `INVITATION_ACCEPT`.

### Corte post-Etapa 1 · Invitación con link firmado · Checklist de trabajo
- [x] Persistir token hash y expiración en backend.
- [x] Exponer validación pública de invitación.
- [x] Consumir token durante el primer login SSO.
- [x] Emitir link de invitación desde `/admin/users`.
- [x] Agregar vista pública `/invite/:token` en frontend.
- [x] Cubrir el flujo base con tests backend y builds.

Estado: invitación con link firmado operativa; pendiente envío/reemisión administrativa completa.

### Corte post-Etapa 1 · Scoping backend por sitio
Objetivo: dejar de exponer datos globales a usuarios con acceso limitado a uno o más sitios, manteniendo roles globales con acceso transversal.

Incluye:
1. Resolver `siteIds` y alcance global dentro del `authContext` reutilizable.
2. Restringir `/buildings`, `/meters`, `/hierarchy` y `/alerts` por asignación de sitios.
3. Restringir `POST /alerts/sync-offline` al subconjunto de medidores visible para el usuario.
4. Responder `404` cuando un recurso exista pero quede fuera del alcance del usuario.
5. Cubrir helpers y controllers afectados con tests backend.

### Corte post-Etapa 1 · Scoping backend por sitio · Checklist de trabajo
- [x] Incluir `siteIds` y alcance global en el `authContext` del backend.
- [x] Filtrar listados de buildings y meters por sitios asignados.
- [x] Restringir detalle y series de meter/building por sitio asignado.
- [x] Restringir hierarchy por sitio asignado.
- [x] Restringir alerts y `sync-offline` por sitio asignado.
- [x] Cubrir helpers y controllers de scoping con tests backend.

Estado: scoping backend por sitio operativo para endpoints de datos.

### Etapa 1 · Orden recomendado de ejecución
1. Agregar auth guards o mecanismo equivalente real en backend para data endpoints.
2. Llevar RBAC backend al mismo nivel mínimo que `ProtectedRoute`.
3. Parametrizar queries de consumo en buildings.
4. Cubrir con tests mínimos auth, buildings, meters, hierarchy y alerts.
5. Implementar selección de contexto después del login.
6. Implementar `/monitoring/realtime`.
7. Migrar o redirigir `/iot-devices` hacia `/monitoring/devices`.
8. Alinear `/monitoring/drilldown/:buildingId` al target `/monitoring/drilldown/:siteId`.
9. Completar `/alerts` con detalle operativo de alerta.
10. Implementar `/admin/sites`.
11. Implementar `/admin/meters`.
12. Implementar `/admin/hierarchy/:siteId`.

### Etapa 1 · Desglose técnico del punto 1
Objetivo: dejar de validar JWT manualmente sólo en `AuthController` y pasar a enforcement reutilizable sobre endpoints de datos.

Subtareas:
- [x] Crear `AuthGuard` reusable en backend que extraiga Bearer token, invoque `AuthService.verifyToken()` y rechace `401` cuando falte o falle.
- [x] Adjuntar el payload verificado al request para evitar revalidación manual en cada controller.
- [x] Crear decorador tipo `@CurrentUser()` o equivalente para acceder al usuario autenticado desde controllers/guards.
- [x] Crear decorador `@Public()` para exponer sólo endpoints que deban quedar públicos de forma explícita.
- [x] Aplicar el `AuthGuard` a todos los módulos de datos hoy públicos: buildings, meters, hierarchy y alerts.
- [x] Mantener `AuthController` con guard reusable en vez de lógica manual duplicada.
- [x] Actualizar Swagger para reflejar Bearer auth en endpoints protegidos.
- [ ] Validar que frontend siga resolviendo `/auth/me` y luego consuma los endpoints protegidos con el token actual.
- [ ] Agregar tests mínimos del guard: sin header -> `401`, token inválido -> `401`, token válido -> acceso.
- [ ] Registrar cualquier excepción explícita de endpoints públicos en `CLAUDE.md` si la decisión cambia el contexto operativo base.

Archivos candidatos a tocar:
- `backend/src/auth/` para guard, decoradores y helpers.
- `backend/src/auth/auth.controller.ts` para quitar extracción manual repetida.
- `backend/src/buildings/buildings.controller.ts`.
- `backend/src/meters/meters.controller.ts`.
- `backend/src/hierarchy/hierarchy.controller.ts`.
- `backend/src/alerts/alerts.controller.ts`.
- [x] `backend/src/main.ts` o módulo auth si se decide guard global con excepciones `@Public()`.

### Etapa 1 · Desglose técnico del punto 2
Objetivo: pasar de autenticación válida a autorización real por módulo/acción en backend, alineada con la matriz ya existente en DB seed y frontend.

Base actual detectada:
- La DB ya tiene módulos y acciones seed en `sql/002_seed.sql`.
- El frontend ya usa una matriz equivalente en `frontend/src/auth/permissions.ts`.
- El backend ya puede resolver permisos por rol con `RolesService.getPermissionsByRoleId()`.
- Falta aplicar esa información en guards/decorators por endpoint.

Subtareas:
- [x] Definir metadata reusable tipo `@RequirePermissions(module, action)` para endpoints protegidos.
- [x] Implementar `RolesGuard` o equivalente que lea el usuario autenticado, resuelva permisos efectivos y rechace `403` si no corresponde.
- [x] Extender el request autenticado con datos suficientes para evitar consultas redundantes cuando sea posible.
- [x] Resolver si el guard cargará permisos desde DB en cada request o si reutilizará `resolveUser()` / `resolvePermissions()` con estrategia simple de bajo riesgo.
- [x] Mapear endpoints actuales a módulos/acciones existentes del seed.
- [x] Proteger `buildings` con `BUILDINGS.view`.
- [x] Proteger `meters` con `METERS.view`.
- [x] Proteger `hierarchy` con `DASHBOARD_TECHNICAL.view` como módulo canónico temporal.
- [x] Proteger lectura de alertas con `ALERTS.view`.
- [x] Proteger mutaciones de alertas (`sync-offline`, `acknowledge`) con `ALERTS.manage`.
- [x] Documentar cualquier desalineación entre seed SQL y matriz frontend para evitar drift.
- [x] Actualizar Swagger y documentación operativa si cambia el contrato visible de autorización.
- [x] Agregar tests mínimos de RBAC: usuario autenticado sin permiso -> `403`, con permiso -> acceso, mutación sin `manage` -> `403`.
- [x] Verificar compatibilidad con roles reales usados por el frontend actual.

Mapeo inicial propuesto para endpoints actuales:
- [x] `GET /buildings`, `GET /buildings/:id`, `GET /buildings/:id/meters`, `GET /buildings/:id/consumption` -> `BUILDINGS.view`.
- [x] `GET /meters/*` -> `METERS.view`.
- [x] `GET /hierarchy/*` -> `DASHBOARD_TECHNICAL.view`.
- [x] `GET /alerts` -> `ALERTS.view`.
- [x] `POST /alerts/sync-offline`, `PATCH /alerts/:id/acknowledge` -> `ALERTS.manage`.

Decisiones de diseño cerradas:
1. `hierarchy` queda bajo `DASHBOARD_TECHNICAL.view` por ser parte del monitoreo técnico y por alinear con los roles ya usados en la ruta drill-down del frontend.
2. `acknowledge` requiere `ALERTS.manage` para mantener una frontera clara entre lectura operativa y mutación de estado.
3. El guard de roles resuelve permisos desde DB cuando el endpoint declara metadata RBAC; cache o memoización quedan como optimización posterior.

Archivos candidatos a tocar:
- `backend/src/auth/` para decorators/guards nuevos.
- `backend/src/roles/roles.service.ts` para helper de chequeo puntual si conviene.
- `backend/src/buildings/buildings.controller.ts`.
- `backend/src/meters/meters.controller.ts`.
- `backend/src/hierarchy/hierarchy.controller.ts`.
- `backend/src/alerts/alerts.controller.ts`.
- Tests backend cuando exista carpeta/convención de pruebas.

Validación implementada:
- Test automatizado de `401` sin token.
- Test automatizado de `401` con token inválido.
- Test automatizado de `403` con token válido pero rol sin permiso.
- Test automatizado de acceso correcto con permiso requerido.
- Test automatizado de mutación sin `manage` -> `403`.

Desalineaciones detectadas:
- `frontend/src/auth/permissions.ts` sigue alineado con el seed SQL.
- `frontend/src/app/appRoutes.ts` hoy permite algunos accesos por rol más amplios que la matriz módulo/acción en `meters` e `iot-devices`; backend pasa a obedecer la matriz canónica.

### Etapa 2 · Checklist de trabajo
- [ ] Implementar `/dashboard/executive`.
- [ ] Implementar `/dashboard/executive/:siteId`.
- [ ] Implementar `/dashboard/compare`.
- [ ] Implementar `/monitoring/demand/:siteId`.
- [ ] Implementar `/monitoring/quality/:siteId`.
- [ ] Implementar `/monitoring/meters/type`.

### Etapa 3 · Checklist de trabajo
- [ ] Implementar `/monitoring/generation/:siteId`.
- [ ] Implementar `/monitoring/modbus-map/:siteId`.
- [ ] Implementar `/monitoring/fault-history/:meterId`.
- [ ] Implementar `/monitoring/concentrator/:concentratorId`.
- [ ] Implementar `/alerts/rules`.
- [ ] Implementar `/alerts/history`.
- [ ] Modelar y persistir reglas de alertas configurables.
- [ ] Expandir backend para múltiples tipos de alertas del XLSX.

### Etapa 4 · Checklist de trabajo
- [ ] Implementar `/billing/rates`.
- [ ] Implementar `/billing/generate`.
- [ ] Implementar `/billing/approve`.
- [ ] Implementar `/billing/history`.
- [ ] Implementar `/billing/my-invoice`.
- [ ] Crear entidades y flujos de tenant, invoice y tarifario.
- [ ] Implementar `/admin/tenants-units`.

### Etapa 5 · Checklist de trabajo
- [ ] Expandir `/admin/users` con edición, revocación y lifecycle completo de invitación.
- [ ] Implementar `/admin/tenant-config`.
- [ ] Implementar `/reports`.
- [ ] Implementar `/reports/scheduled`.
- [ ] Implementar `/audit/activities`.
- [ ] Implementar `/audit/changes`.
- [ ] Implementar `/audit/access`.
- [ ] Implementar `/integrations/status`.
- [ ] Implementar `/integrations/config`.
- [ ] Implementar `/integrations/sync-log`.

### Etapa 6 · Checklist de trabajo
- [ ] Implementar `/analytics/benchmark`.
- [ ] Implementar `/analytics/trends`.
- [ ] Implementar `/analytics/patterns`.
- [ ] Implementar reportes ESG, benchmarking y compliance sobre histórico consolidado.

## Prioridades

### P1 · Blindaje de plataforma
1. Agregar auth guards o equivalente real en backend.
2. Corregir queries con interpolación peligrosa.
3. Cubrir flujos críticos con tests mínimos de backend.
4. Mejorar seguridad HTTP y manejo de sesión.

### P2 · Robustez operativa
1. Reducir cold starts en lambdas programadas.
2. Definir estrategia de partición o retención para `readings`.
3. Mejorar observabilidad y logging estructurado.
4. Formalizar verificación de deploy y rollback operativo.

### P3 · Expansión funcional
1. Dashboards ejecutivos y comparativos.
2. Facturación, tenants e integraciones.
3. Auditoría y administración avanzada.
4. Analítica energética y reportes.

## Fases

### Fase Alpha
- Cerrar brechas de seguridad y consistencia.
- Fortalecer monitoreo técnico, jerarquía y alertas.
- Completar base de auth y permisos reales backend.

### Fase Beta
- Incorporar módulos de negocio: facturación, auditoría, reportes, usuarios e integraciones.
- Mejorar vistas ejecutivas y comparativas.

### Fase Core
- Escalar analítica, calidad de energía, demanda y automatización operacional.
- Preparar crecimiento de datos, observabilidad y performance.

## Regla de ejecución
Cada cambio relevante debe salir con:
1. Código funcionando.
2. `CLAUDE.md` actualizado si cambia un patrón real.
3. `patterns/` ajustado si cambia una receta de ejecución.
4. Validación mínima del flujo afectado.
5. `PLAN_ACCION.md` actualizado si cambia el backlog, la etapa priorizada o el estado de una vista objetivo derivada del XLSX.

## Regla de mantenimiento del roadmap
Cuando se use el XLSX para planificar producto:
1. Normalizar primero el mapa objetivo de vistas.
2. Convertir ese mapa en etapas priorizadas.
3. Traducir cada etapa a checklist ejecutable con items marcables.
4. Mantener sincronizados `PLAN_ACCION.md` y `CLAUDE.md`.

## Lectura recomendada
- Operación diaria: `CLAUDE.md`
- Ejecución puntual: `patterns/`
- Roadmap: `PLAN_ACCION.md`

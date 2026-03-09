# PLAN_ACCION.md

## Propósito
Roadmap resumido del producto y del endurecimiento técnico del repo.

- Este archivo no reemplaza a `CLAUDE.md`.
- `CLAUDE.md` define cómo trabajar hoy.
- Este archivo define hacia dónde empujar el producto y la plataforma.

## Estado Actual

### Ya resuelto en el repo
- Backend NestJS conectado a PostgreSQL con endpoints de buildings, meters, hierarchy, alerts y auth.
- Frontend React con vistas de edificios, detalle, drill-down, medidores, gráficos y auth.
- Infra AWS con CloudFront + S3 + API Gateway + Lambda + RDS + EventBridge.
- Generación sintética de lecturas y offline alerts en ejecución separada.

### Deuda técnica vigente
- Falta enforcement real de auth y RBAC en data endpoints backend.
- Existe riesgo de SQL injection en consumo de buildings.
- No hay tests relevantes.
- `offline-alerts.ts` sigue con cold start completo.
- No hay retention/partitioning para `readings`.
- Tokens en `sessionStorage`.
- Sin rate limiting ni security headers.

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

## Lectura recomendada
- Operación diaria: `CLAUDE.md`
- Ejecución puntual: `patterns/`
- Roadmap: `PLAN_ACCION.md`

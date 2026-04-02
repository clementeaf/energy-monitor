# Functional Spec (XLSX)

La especificación funcional externa vive en `docs/POWER_Digital_Especificacion_Modulos-rev2.1.xlsx`.

- Sirve como blueprint de producto, no como reflejo exacto del código actual.
- Si hay conflicto, el código manda para comportamiento presente; el XLSX manda para intención funcional y roadmap.

## Hojas útiles
- `1. Roles y Permisos`: RBAC, autenticación y sesión.
- `2. Módulos - Resumen`: módulos, vistas, roles y fase.
- `5. Datos y Campos`: tablas, KPIs, formatos y fuentes.
- `6. Tipos de Alertas`: catálogo de alertas, umbrales, severidad y escalamiento.
- `7. Navegación`: menú, rutas y acceso por rol.

## Alertas objetivo
- 22 tipos de alertas/fallos (solo `METER_OFFLINE` implementado hoy).
- Familias: comunicación, eléctrica, consumo, operativa, generación, bus/concentrador.
- Cada alerta: variable monitoreada, umbral, severidad, escalamiento, canal, frecuencia, guía por rol.

## Navegación objetivo
- Menú más amplio que el router histórico MVP.
- Rutas objetivo (XLSX): `/monitoring/meters/type`, `/monitoring/generation/:siteId`, `/monitoring/modbus-map/:siteId`, `/billing/generate`, etc. Ver `PLAN_ACCION.md` Fase 8.
- **Implementadas en monitoreo-v2:** `/dashboard/executive`, `/dashboard/compare`, `/monitoring/realtime`, `/monitoring/drilldown/:siteId`, `/monitoring/devices`, `/monitoring/demand/:siteId`, `/monitoring/quality/:siteId`, `/monitoring/fault-history/:meterId`, `/billing/rates`, `/billing` (facturas).

## Mapa objetivo y backlog
- Mapa de vistas normalizado en `PLAN_ACCION.md`.
- Todo objetivo del XLSX que no exista en rutas implementadas = backlog funcional.

## Regla de planificación
- Normalizar mapa objetivo de vistas → etapas priorizadas en `PLAN_ACCION.md`.
- Actualizar código, `PLAN_ACCION.md` y `CLAUDE.md` al completar vistas.

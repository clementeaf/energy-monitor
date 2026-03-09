# Playbook: Use Excel Spec

## Úsalo para
- Entender el alcance funcional objetivo del producto.
- Alinear nuevas vistas, rutas, filtros, RBAC y tablas con la especificación.
- Resolver dudas de producto cuando el código actual todavía no implementa todo.

## Archivo canónico
- `docs/POWER_Digital_Especificacion_Modulos-rev2.1.xlsx`

## Regla de uso
- Leer primero `CLAUDE.md`.
- Ir al Excel solo si falta contexto funcional o de roadmap.
- No leer el workbook completo si no hace falta.

## Orden eficiente de lectura
1. `2. Módulos - Resumen` para entender alcance por módulo y fase.
2. `7. Navegación` para rutas, menú y acceso por rol.
3. `5. Datos y Campos` para tablas, KPIs y formatos display.
4. `1. Roles y Permisos` para RBAC, autenticación y sesión.
5. `3. Filtros Detallados` si la duda es de UX operativa.
6. `4. Gráficos y Visualizaciones` si la duda es de charts.
7. `6. Tipos de Alertas` si la duda es de reglas, severidad o escalamiento.

## Cómo interpretarlo
- El Excel define intención funcional y roadmap del producto.
- El código define el comportamiento real actual.
- Si hay conflicto, para implementación inmediata manda el código.
- Si el cambio apunta al target de producto, usar el Excel como guía y luego actualizar `CLAUDE.md`.

## Qué ya sabemos del workbook
- Hoja 1: roles, políticas de autenticación, sesión máxima y matriz de permisos.
- Hoja 2: catálogo de módulos, vistas, filtros, roles y fase.
- Hoja 5: campos por tabla/vista, formato display, sort/export y fuente.
- Hoja 7: navegación, rutas y roles con acceso.

## Checklist
1. Identificar la hoja mínima necesaria.
2. Extraer solo filas relevantes.
3. Comparar con código actual.
4. Documentar en `CLAUDE.md` si el hallazgo se vuelve patrón operativo.
# Playbook: New Endpoint

## Úsalo para
- Crear un endpoint nuevo en NestJS.
- Extender un módulo existente con una operación nueva.

## Pasos backend
1. Verificar si cambia schema. Si sí, crear migration SQL.
2. Crear o ajustar entity si aplica.
3. Implementar lógica en `service.ts`.
4. Exponer endpoint en `controller.ts` con Swagger.
5. Registrar o ajustar `module.ts`.
6. Si es módulo nuevo, importarlo en `app.module.ts`.

## Regla de implementación
- Usar QueryBuilder para consultas simples.
- Usar SQL crudo para agregaciones, CTEs o queries complejas.
- Parametrizar inputs siempre que no sean literales controlados.
- Mapear salida a camelCase si viene de SQL raw.

## Si lo consume frontend
1. Agregar tipos.
2. Agregar route builder.
3. Agregar endpoint client.
4. Agregar hook de query.
5. Conectar página o componente.

## Checklist
1. Swagger actualizado.
2. Query segura.
3. Shape de respuesta estable.
4. Frontend alineado si corresponde.
5. `CLAUDE.md` actualizado si el patrón cambió.
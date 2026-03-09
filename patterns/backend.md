# Backend Patterns

> Anexo secundario. El contexto operativo base vive en `CLAUDE.md`.

## Cuándo leer esto
- Crear módulo o endpoint nuevo.
- Agregar query SQL, DTO o entity.
- Ajustar auth manual, Swagger o validación.

## Playbook puntual
- Endpoint nuevo: `patterns/playbooks/new-endpoint.md`

## Receta rápida: nuevo endpoint backend
1. Crear migration SQL si cambia schema.
2. Crear o ajustar `entity.ts`.
3. Implementar lógica en `service.ts`.
4. Exponer endpoint en `controller.ts`.
5. Registrar `module.ts`.
6. Importar módulo en `app.module.ts`.

## Estructura esperada
```text
backend/src/<domain>/
  <entity>.entity.ts
  <domain>.service.ts
  <domain>.controller.ts
  <domain>.module.ts
```

## Query patterns

### Cuándo usar QueryBuilder
- Búsquedas simples por entidad.
- Consultas cortas con filtros básicos.

### Cuándo usar SQL crudo
- Agregaciones temporales.
- CTE recursivos.
- LATERAL subqueries.
- Resúmenes complejos de medidores, hierarchy o alerts.

### Regla crítica
- Parametrizar inputs siempre que no sean literales controlados.
- Si usas interpolación, debe ser solo para fragmentos cerrados como `date_trunc` controlado.

## Controller patterns
- Decoradores Swagger en español.
- `NotFoundException` cuando service retorna `null`.
- Auth manual solo donde corresponde hoy.
- Query params ISO 8601 para rangos de fechas.

## Auth actual
- `AuthController` extrae token manualmente.
- `verifyToken()` retorna `null` en fallo.
- Data endpoints siguen públicos hasta cerrar deuda técnica.

## Validación y respuestas
- Global `ValidationPipe({ whitelist: true, transform: true })`.
- DTOs con `class-validator` cuando aplica.
- Mapear snake_case a camelCase de forma explícita.
- Convertir números con `Number()` cuando la query raw devuelve strings.

## Lambda y serverless
- `serverless.ts` cachea bootstrap.
- `offline-alerts.ts` no cachea y sigue como deuda técnica.
- Infra scripts en `infra/` usan `pg` directo y no forman parte del build NestJS.

## Checklist de cierre
1. Schema y entity alineados.
2. Query segura.
3. Swagger actualizado.
4. Controller devuelve forma esperada por frontend.
5. `CLAUDE.md` actualizado si cambió el patrón.

# Playbook: New Fullstack Flow

## Úsalo para
- Crear una funcionalidad completa de punta a punta.
- Conectar un nuevo flujo entre UI, API, DB y eventualmente AWS.

## Secuencia mínima
1. Definir el dato que entra, se persiste o se calcula.
2. Resolver backend: schema, service, controller.
3. Resolver frontend: types, routes, endpoints, hook, UI.
4. Verificar permisos o visibilidad de ruta.
5. Validar el flujo completo con datos reales o consistentes.

## Orden recomendado
```text
Schema
→ Service
→ Controller
→ Frontend types
→ Frontend API layer
→ Query hook
→ Page/component
→ Route/RBAC
→ Validation
```

## Cuándo entra AWS
- Si necesita scheduler, lambda standalone, env vars nuevas o deploy adicional.
- En ese caso leer también `patterns/playbooks/new-scheduled-lambda.md`.

## Checklist
1. Endpoint y UI hablan el mismo contrato.
2. Estados loading/error/empty definidos.
3. No hay lógica duplicada entre frontend y backend.
4. Documentación base y receta actualizadas si el flujo se vuelve patrón.
# Fullstack Patterns

> Anexo secundario. El contexto operativo base vive en `CLAUDE.md`.

## Cuándo leer esto
- Crear una feature end-to-end.
- Conectar una vista nueva con endpoint nuevo.
- Agregar una serie temporal, resumen o módulo completo.

## Playbook puntual
- Flujo nuevo: `patterns/playbooks/new-fullstack-flow.md`

## Receta rápida: feature end-to-end

### Backend
1. Migration si cambia schema.
2. Entity.
3. Service.
4. Controller.
5. Module.
6. Registro en `app.module.ts`.

### Frontend
1. Tipos.
2. Routes.
3. Endpoints.
4. Hook de query.
5. Página o componente.
6. Ruta y RBAC.

## Flujo estándar
```text
Frontend route builder
→ frontend endpoint
→ query hook
→ Axios
→ API Gateway / Lambda
→ controller
→ service
→ PostgreSQL
→ JSON
→ cache TanStack Query
→ UI
```

## Casos típicos

### Nueva página de lectura o análisis
- Backend expone endpoint GET.
- Frontend consume con TanStack Query.
- UI renderiza cards, tablas o charts.

### Nueva alerta o workflow operativo
- Backend agrega lógica de service o lambda programada.
- Persistencia en `alerts` o tabla nueva.
- Frontend agrega vista de resumen o detalle.

### Nueva integración AWS
- Definir env vars.
- Ajustar `serverless.yml` o script en `infra/`.
- Documentar en `CLAUDE.md` y `patterns/devops.md` si cambia el patrón.

## Definition of done
1. Endpoint y tipos alineados.
2. UI consume datos reales sin mocks intermedios innecesarios.
3. Rutas y permisos definidos.
4. Flujo probado en el nivel mínimo razonable.
5. Documentación base actualizada.

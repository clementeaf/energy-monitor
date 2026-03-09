# Frontend Patterns

> Anexo secundario. El contexto operativo base vive en `CLAUDE.md`.

## Cuándo leer esto
- Crear una página, componente o feature nueva.
- Conectar UI a un endpoint existente o nuevo.
- Registrar rutas, auth UI o RBAC frontend.

## Playbooks puntuales
- Componente nuevo: `patterns/playbooks/new-component.md`
- Chart nuevo: `patterns/playbooks/new-chart.md`

## Receta rápida: nueva feature frontend
1. Agregar o ajustar tipos en `frontend/src/types`.
2. Agregar route builder en `frontend/src/services/routes.ts`.
3. Agregar fetch function en `frontend/src/services/endpoints.ts`.
4. Crear hook `frontend/src/hooks/queries/useX.ts`.
5. Re-exportar hook en `frontend/src/hooks/index.ts` si aplica.
6. Crear página en `frontend/src/features/<domain>/<Domain>Page.tsx`.
7. Crear componentes de soporte en `frontend/src/features/<domain>/components/`.
8. Registrar metadata en `frontend/src/app/appRoutes.ts`.
9. Registrar lazy route en `frontend/src/app/router.tsx`.

## Estructura esperada
```text
features/<domain>/
  <Domain>Page.tsx
  components/
    <Component>.tsx
```

## Datos y queries

### Patrón fijo
```text
routes.ts      → arma URL
endpoints.ts   → llama Axios
useX.ts        → usa TanStack Query
Page.tsx       → consume hook
```

### Cache
- `Infinity`: buildings, building detail, auth/me.
- `30s` + refetch `30s`: meters overview, alerts.
- `0` + `keepPreviousData`: charts y series temporales.

## Componentes nuevos

### Página nueva
- Export nombrado.
- `PageHeader` arriba.
- `ErrorBoundary` + `Suspense` vienen desde routing.
- Skeleton dedicado si la vista tiene carga perceptible.

### Tabla nueva
- Usar `components/ui/DataTable.tsx`.
- Definir columnas con TanStack Table.
- Mantener props simples y datos ya normalizados desde hooks.

### Gráfico nuevo
- Si es serie temporal navegable, usar `StockChart`.
- Si es gráfico simple o sincronizado con tabla, usar `Chart`.
- Mantener resolución dinámica fuera del componente gráfico si depende del rango.

### Card o resumen
- Reusar `Card`.
- Evitar lógica de fetch dentro de componentes presentacionales.

## Routing y RBAC
- Declarar ruta y `allowedRoles` en `appRoutes.ts`.
- Registrar lazy import en `router.tsx`.
- Backend no protege roles en data endpoints; frontend sí filtra navegación.

## Auth UI
- Consumir `useAuth()` como fachada única.
- No leer proveedores específicos desde páginas normales.
- 401 ya limpia sesión desde interceptor Axios.

## Convenciones React
- `useParams<{id: string}>()` con `!` solo cuando la ruta garantiza el param.
- `useRef` para guards mutables.
- `useMemo` para derivados útiles.
- `useCallback` solo si el handler se pasa a children.
- `import type` para imports de tipos.

## Convenciones visuales
- Tailwind tokens: `text-text`, `text-muted`, `text-subtle`, `bg-base`, `bg-raised`, `bg-accent`, `border-border`.
- Grid común: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`.
- UI en español, código en inglés.

## Checklist de cierre
1. Ruta registrada.
2. Hook de query con key estable.
3. Loading y error definidos.
4. Tipos frontend alineados con backend real.
5. `CLAUDE.md` actualizado si cambió el patrón.

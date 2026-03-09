# Playbook: New Component

## Úsalo para
- Crear un componente visual nuevo.
- Extraer UI desde una página existente.
- Agregar una card, bloque de resumen o sección reusable.

## Dónde vive
- Componente de feature: `frontend/src/features/<domain>/components/`.
- Componente UI reusable: `frontend/src/components/ui/`.

## Pasos
1. Definir si es presentacional o si solo compone otros componentes.
2. Si es reusable, mantener API mínima: `children`, `className`, props específicas.
3. Si depende de datos remotos, resolver fetch en hook o página, no dentro del componente.
4. Crear interfaz `Props` explícita.
5. Exportar con named export.
6. Aplicar tokens Tailwind del proyecto.
7. Integrarlo en la página o contenedor correspondiente.

## Regla de diseño
- UI en español.
- Código en inglés.
- Sin lógica de negocio oculta dentro de componentes puramente visuales.

## Checklist
1. Props claras y pequeñas.
2. Sin fetch interno innecesario.
3. Reusa `Card`, `PageHeader`, `Chart`, `StockChart` o `DataTable` si aplica.
4. Respeta spacing y tokens existentes.
5. Si introduce un patrón nuevo, actualizar `CLAUDE.md`.
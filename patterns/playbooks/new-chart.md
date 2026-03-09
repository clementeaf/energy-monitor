# Playbook: New Chart

## Úsalo para
- Agregar un gráfico nuevo en una vista existente o nueva.
- Conectar una serie temporal a `Chart` o `StockChart`.

## Elección rápida
- `StockChart`: series temporales con rango, navigator o cambio dinámico de resolución.
- `Chart`: gráficos simples, sincronizados o sin navegación temporal.

## Pasos
1. Confirmar el endpoint y la forma de datos.
2. Tipar la respuesta en `frontend/src/types` si falta.
3. Crear o reutilizar hook de query.
4. Transformar datos en la página o en helper cercano.
5. Elegir `Chart` o `StockChart`.
6. Si el rango cambia la resolución, seguir la lógica `≤36h → 15min`, `≤7d → hourly`, `>7d → daily` cuando aplique.
7. Mostrar loading y empty state razonables.

## Series temporales
- Mantener `keepPreviousData` para evitar flash al cambiar rango.
- No meter la lógica de fetch dentro del wrapper de chart.
- Mantener nombres de series y labels en español si son visibles al usuario.

## Checklist
1. Datos tipados.
2. Hook con query key estable.
3. Tooltip, ejes y labels coherentes.
4. Resolución alineada con backend.
5. Sin duplicar lógica ya existente en otras páginas.
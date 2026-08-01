import type { ReactElement } from 'react';

/**
 * Fallback compacto cuando el render del gráfico/tabla falla (datos inesperados, bug en Highcharts, etc.).
 * No sustituye el manejo de errores de red; eso va en QueryStateView.
 */
export function WidgetRenderErrorFallback(props: { error: Error; reset: () => void }): ReactElement {
  const { error, reset } = props;
  return (
    <div
      className="flex min-h-[8rem] flex-col items-center justify-center gap-2 rounded-lg border border-warning/30 bg-warning/10/90 p-4 text-center"
      role="alert"
    >
      <p className="text-xs font-medium text-warning">Error al renderizar este bloque</p>
      <p className="line-clamp-2 max-w-full text-xs text-warning/80">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="rounded border border-warning px-2 py-1 text-xs font-medium text-warning hover:bg-warning/10"
      >
        Reintentar
      </button>
    </div>
  );
}

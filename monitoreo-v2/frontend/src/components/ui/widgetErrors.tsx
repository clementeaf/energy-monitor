import type { ReactElement } from 'react';

/**
 * Fallback compacto cuando el render del gráfico/tabla falla (datos inesperados, bug en Highcharts, etc.).
 * No sustituye el manejo de errores de red; eso va en QueryStateView.
 */
export function WidgetRenderErrorFallback(props: { error: Error; reset: () => void }): ReactElement {
  const { error, reset } = props;
  return (
    <div
      className="flex min-h-[8rem] flex-col items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50/90 p-4 text-center"
      role="alert"
    >
      <p className="text-xs font-medium text-amber-950">Error al renderizar este bloque</p>
      <p className="line-clamp-2 max-w-full text-[11px] text-amber-900/80">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="rounded border border-amber-800 px-2 py-1 text-xs font-medium text-amber-950 hover:bg-amber-100"
      >
        Reintentar
      </button>
    </div>
  );
}

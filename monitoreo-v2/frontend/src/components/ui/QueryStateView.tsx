import type { ReactElement, ReactNode } from 'react';
import { getFetchErrorMessage } from '../../lib/fetchError';

export type QueryStateVariant = 'page' | 'widget';

export interface QueryStateViewProps {
  phase: 'loading' | 'error' | 'empty' | 'ready';
  error: unknown;
  onRetry: () => void;
  /** Contenido cuando phase === 'ready' */
  children: ReactNode;
  /** Texto cuando no hay filas / datos */
  emptyTitle?: string;
  emptyDescription?: string;
  /** Refetch en curso con datos ya mostrados (indicador discreto) */
  isFetching?: boolean;
  /**
   * page: área principal de una vista.
   * widget: bloque (tabla/gráfico) sin tumbar el resto de la pantalla.
   */
  variant?: QueryStateVariant;
}

/**
 * Superficie de datos: loading, error (con reintento), vacío o contenido principal.
 * @param props - Fase desde useQueryState y copy opcional para vacío
 * @returns Sección con un solo estado visible
 */
export function QueryStateView(props: QueryStateViewProps): ReactElement {
  const {
    phase,
    error,
    onRetry,
    children,
    emptyTitle = 'Sin datos',
    emptyDescription = 'No hay información para mostrar en este momento.',
    isFetching = false,
    variant = 'page',
  } = props;

  if (phase === 'loading') {
    return <QueryLoadingPanel variant={variant} />;
  }

  if (phase === 'error') {
    return (
      <QueryErrorPanel
        variant={variant}
        message={getFetchErrorMessage(error)}
        onRetry={onRetry}
      />
    );
  }

  if (phase === 'empty') {
    return <QueryEmptyPanel variant={variant} title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="relative">
      {isFetching ? (
        <div
          className={`pointer-events-none absolute right-0 top-0 z-10 flex items-center gap-2 rounded-md bg-white/90 shadow-sm ring-1 ring-gray-200 ${
            variant === 'widget' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs text-gray-500'
          }`}
          aria-live="polite"
        >
          <span
            className={`inline-block animate-spin rounded-full border-2 border-gray-300 border-t-gray-600 ${
              variant === 'widget' ? 'size-2.5' : 'size-3'
            }`}
            aria-hidden
          />
          Actualizando
        </div>
      ) : null}
      {children}
    </div>
  );
}

function QueryLoadingPanel(props: { variant: QueryStateVariant }): ReactElement {
  const { variant } = props;
  const isWidget = variant === 'widget';
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-white ${
        isWidget ? 'min-h-[8rem] gap-2 p-4' : 'min-h-[12rem] gap-4 p-8'
      }`}
    >
      <div
        className={`animate-spin rounded-full border-2 border-gray-200 border-t-gray-700 ${
          isWidget ? 'size-8' : 'size-10'
        }`}
        role="status"
        aria-label="Cargando"
      />
      <p className={isWidget ? 'text-xs text-gray-500' : 'text-sm text-gray-500'}>Cargando datos…</p>
    </div>
  );
}

function QueryErrorPanel(props: {
  variant: QueryStateVariant;
  message: string;
  onRetry: () => void;
}): ReactElement {
  const { variant, message, onRetry } = props;
  const isWidget = variant === 'widget';
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50/80 text-center ${
        isWidget ? 'min-h-[8rem] gap-2 p-4' : 'min-h-[12rem] gap-4 p-8'
      }`}
      role="alert"
    >
      <p className={isWidget ? 'max-w-full text-xs text-red-900' : 'max-w-md text-sm text-red-900'}>
        {message}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className={
          isWidget
            ? 'rounded border border-red-900 px-2 py-1 text-xs font-medium text-red-950 hover:bg-red-100'
            : 'rounded-md bg-red-900 px-4 py-2 text-sm font-medium text-white hover:bg-red-800'
        }
      >
        Reintentar
      </button>
    </div>
  );
}

function QueryEmptyPanel(props: {
  variant: QueryStateVariant;
  title: string;
  description: string;
}): ReactElement {
  const { variant, title, description } = props;
  const isWidget = variant === 'widget';
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50/80 text-center ${
        isWidget ? 'min-h-[8rem] gap-1 p-4' : 'min-h-[12rem] gap-2 p-8'
      }`}
    >
      <p className={isWidget ? 'text-xs font-medium text-gray-700' : 'text-sm font-medium text-gray-700'}>
        {title}
      </p>
      <p
        className={
          isWidget ? 'line-clamp-3 max-w-full text-[11px] text-gray-500' : 'max-w-md text-sm text-gray-500'
        }
      >
        {description}
      </p>
    </div>
  );
}

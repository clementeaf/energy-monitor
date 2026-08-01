import type { ReactElement } from 'react';
import { Link } from 'react-router';
import { APP_ROUTES } from '../../app/routes';

/**
 * Spinner mientras carga el chunk lazy de la vista actual.
 */
export function PageLoadFallback(): ReactElement {
  return (
    <div className="flex min-h-[12rem] flex-col items-center justify-center gap-3 rounded-lg border border-border bg-background p-8">
      <div
        className="size-10 animate-spin rounded-full border-2 border-border border-t-gray-700"
        role="status"
        aria-label="Cargando vista"
      />
      <p className="text-sm text-muted">Cargando vista…</p>
    </div>
  );
}

/**
 * Error en el área principal (vista lazy o render); no desmonta sidebar/header.
 */
export function MainContentErrorFallback(props: { error: Error; reset: () => void }): ReactElement {
  const { error, reset } = props;
  return (
    <div
      className="flex min-h-[12rem] flex-col items-center justify-center gap-4 rounded-lg border border-warning/30 bg-warning/10/90 p-8 text-center"
      role="alert"
    >
      <p className="text-sm font-medium text-warning">No se pudo mostrar esta vista</p>
      <p className="max-w-md text-xs text-warning/90">{error.message}</p>
      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-warning px-4 py-2 text-sm font-medium text-brand-fg hover:bg-warning/80"
        >
          Reintentar
        </button>
        <Link
          to={APP_ROUTES.dashboard}
          className="rounded-md border border-warning px-4 py-2 text-sm font-medium text-warning hover:bg-warning/10"
        >
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}

/**
 * Error en layout (sidebar, header o contenedor); nivel intermedio.
 */
export function LayoutErrorFallback(props: { error: Error; reset: () => void }): ReactElement {
  const { error, reset } = props;
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-raised p-8 text-center" role="alert">
      <p className="text-lg font-medium text-foreground">Problema en el panel principal</p>
      <p className="max-w-md text-sm text-muted">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-brand-fg hover:bg-foreground"
      >
        Reintentar
      </button>
    </div>
  );
}

/**
 * Error global: proveedores o árbol raíz.
 */
export function AppErrorFallback(props: { error: Error; reset: () => void }): ReactElement {
  const { error, reset } = props;
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-8 text-center" role="alert">
      <p className="text-lg font-medium text-foreground">La aplicación encontró un error</p>
      <p className="max-w-md text-sm text-muted">{error.message}</p>
      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={reset}
          className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface"
        >
          Intentar de nuevo
        </button>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-brand-fg hover:bg-foreground"
        >
          Recargar página
        </button>
      </div>
    </div>
  );
}

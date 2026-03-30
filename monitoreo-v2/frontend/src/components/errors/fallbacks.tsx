import type { ReactElement } from 'react';
import { Link } from 'react-router';
import { APP_ROUTES } from '../../app/routes';

/**
 * Spinner mientras carga el chunk lazy de la vista actual.
 */
export function PageLoadFallback(): ReactElement {
  return (
    <div className="flex min-h-[12rem] flex-col items-center justify-center gap-3 rounded-lg border border-gray-200 bg-white p-8">
      <div
        className="size-10 animate-spin rounded-full border-2 border-gray-200 border-t-gray-700"
        role="status"
        aria-label="Cargando vista"
      />
      <p className="text-sm text-gray-500">Cargando vista…</p>
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
      className="flex min-h-[12rem] flex-col items-center justify-center gap-4 rounded-lg border border-amber-200 bg-amber-50/90 p-8 text-center"
      role="alert"
    >
      <p className="text-sm font-medium text-amber-950">No se pudo mostrar esta vista</p>
      <p className="max-w-md text-xs text-amber-900/90">{error.message}</p>
      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-amber-900 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800"
        >
          Reintentar
        </button>
        <Link
          to={APP_ROUTES.dashboard}
          className="rounded-md border border-amber-800 px-4 py-2 text-sm font-medium text-amber-950 hover:bg-amber-100"
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
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-gray-100 p-8 text-center" role="alert">
      <p className="text-lg font-medium text-gray-900">Problema en el panel principal</p>
      <p className="max-w-md text-sm text-gray-600">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
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
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white p-8 text-center" role="alert">
      <p className="text-lg font-medium text-gray-900">La aplicación encontró un error</p>
      <p className="max-w-md text-sm text-gray-600">{error.message}</p>
      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={reset}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
        >
          Intentar de nuevo
        </button>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Recargar página
        </button>
      </div>
    </div>
  );
}

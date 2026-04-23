import type { ReactNode } from 'react';

type Phase = 'loading' | 'error' | 'empty' | 'ready';

interface TableStateBodyProps {
  phase: Phase;
  colSpan: number;
  error?: unknown;
  onRetry?: () => void;
  emptyMessage?: string;
  /** Number of skeleton rows to show */
  skeletonRows?: number;
  /** Widths for each skeleton cell (e.g. ['w-20','w-32','w-24']) */
  skeletonWidths?: string[];
  children: ReactNode;
}

/**
 * Renders table body with loading skeleton, error message, empty state,
 * or actual content. Always inside <tbody> so the table header stays visible.
 */
export function TableStateBody({
  phase,
  colSpan,
  error,
  onRetry,
  emptyMessage = 'No hay datos registrados.',
  skeletonRows = 5,
  skeletonWidths,
  children,
}: Readonly<TableStateBodyProps>) {
  if (phase === 'loading') {
    const widths = skeletonWidths ?? Array.from({ length: colSpan }, () => 'w-24');
    return (
      <tbody className="divide-y divide-gray-200">
        {Array.from({ length: skeletonRows }, (_, i) => (
          <tr key={i}>
            {widths.map((w, j) => (
              <td key={j} className="whitespace-nowrap px-4 py-3">
                <div className={`h-4 ${w} animate-pulse rounded bg-gray-200`} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    );
  }

  if (phase === 'error') {
    const message = error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message: unknown }).message)
        : 'Error al cargar los datos.';

    return (
      <tbody>
        <tr>
          <td colSpan={colSpan} className="px-4 py-12 text-center">
            <div className="flex flex-col items-center gap-3">
              <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <p className="text-sm text-red-600">{message}</p>
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                >
                  Reintentar
                </button>
              )}
            </div>
          </td>
        </tr>
      </tbody>
    );
  }

  if (phase === 'empty') {
    return (
      <tbody>
        <tr>
          <td colSpan={colSpan} className="px-4 py-12 text-center">
            <div className="flex flex-col items-center gap-2">
              <svg className="h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25 2.25M12 13.875l2.25-2.25M12 13.875l-2.25 2.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
              </svg>
              <p className="text-sm text-gray-500">{emptyMessage}</p>
            </div>
          </td>
        </tr>
      </tbody>
    );
  }

  return <tbody className="divide-y divide-gray-200">{children}</tbody>;
}

import { DataWidget } from '../../components/ui/DataWidget';
import { useQueryState } from '../../hooks/useQueryState';
import { useBuildingsQuery } from '../../hooks/queries/useBuildingsQuery';

/**
 * Vista Edificios: el título sigue visible; carga/error/vacío quedan en el bloque de datos.
 * @returns Página de listado
 */
export function BuildingsPage() {
  const query = useBuildingsQuery();
  const qs = useQueryState(query, {
    isEmpty: (data) => data === undefined || data.length === 0,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-gray-900">Edificios</h1>

      <DataWidget
        phase={qs.phase}
        error={qs.error}
        onRetry={() => {
          void query.refetch();
        }}
        isFetching={query.isFetching && qs.phase === 'ready'}
        emptyTitle="Sin edificios"
        emptyDescription="No hay edificios registrados para este tenant. Cuando existan datos, aparecerán aquí."
      >
        <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
          {(query.data ?? []).map((b) => (
            <li key={b.id} className="px-4 py-3 text-sm">
              <span className="font-medium text-gray-900">{b.name}</span>
              <span className="ml-2 text-gray-500">{b.code}</span>
            </li>
          ))}
        </ul>
      </DataWidget>
    </div>
  );
}

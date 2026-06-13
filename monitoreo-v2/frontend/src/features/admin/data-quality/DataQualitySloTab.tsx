import { DataWidget } from '../../../components/ui/DataWidget';
import { Th, Td } from '../../../components/ui/TablePrimitives';
import { useQueryState } from '../../../hooks/useQueryState';
import { useSloBreachesQuery } from '../../../hooks/queries/useDataQualityQuery';

/**
 * Recent data SLO breach events tab.
 */
export function DataQualitySloTab() {
  const query = useSloBreachesQuery(50);
  const qs = useQueryState(query, { isEmpty: (d) => d === undefined || d.length === 0 });

  return (
    <DataWidget
      phase={qs.phase}
      error={qs.error}
      onRetry={() => { query.refetch(); }}
      emptyTitle="Sin incumplimientos SLO"
      emptyDescription="No hay breaches de frescura o calidad registrados."
    >
      <div className="max-h-[65vh] overflow-auto panel">
        <table className="min-w-full divide-y divide-border">
          <thead className="sticky top-0 z-10 bg-surface">
            <tr>
              <Th>Tipo SLO</Th>
              <Th>Fecha</Th>
              <Th>Detalle</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(query.data ?? []).map((row) => (
              <tr key={row.id} className="hover:bg-surface">
                <Td className="font-medium">{row.sloType}</Td>
                <Td>{new Date(row.breachedAt).toLocaleString('es-CL')}</Td>
                <Td className="max-w-md truncate font-mono text-xs" title={JSON.stringify(row.detail)}>
                  {JSON.stringify(row.detail)}
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DataWidget>
  );
}

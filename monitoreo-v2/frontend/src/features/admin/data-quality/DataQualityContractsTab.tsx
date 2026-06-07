import { DataWidget } from '../../../components/ui/DataWidget';
import { Th, Td } from '../../../components/ui/TablePrimitives';
import { useQueryState } from '../../../hooks/useQueryState';
import { useDataContractsQuery } from '../../../hooks/queries/useDataQualityQuery';
import {
  READINGS_EXPORT_CONTRACT_DEFAULT,
  READINGS_EXPORT_CONTRACT_HEADER,
} from '../../../types/data-governance';

/**
 * Read-only data export contracts reference for ETL integrators.
 */
export function DataQualityContractsTab() {
  const query = useDataContractsQuery();
  const qs = useQueryState(query, { isEmpty: (d) => d === undefined || d.length === 0 });

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-surface p-4 text-sm text-muted">
        <p className="font-medium text-foreground">Header ETL requerido</p>
        <p className="mt-1">
          En exportaciones externas incluya{' '}
          <code className="rounded bg-raised px-1 font-mono text-xs">{READINGS_EXPORT_CONTRACT_HEADER}</code>
          {' '}= <code className="rounded bg-raised px-1 font-mono text-xs">{READINGS_EXPORT_CONTRACT_DEFAULT}</code>
        </p>
      </div>

      <DataWidget
        phase={qs.phase}
        error={qs.error}
        onRetry={() => { query.refetch(); }}
        emptyTitle="Sin contratos"
        emptyDescription="No hay contratos de datos activos en la base."
      >
        <div className="overflow-x-auto panel">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-surface">
              <tr>
                <Th>Nombre</Th>
                <Th>Version</Th>
                <Th>Vigente desde</Th>
                <Th>Formatos</Th>
                <Th>Alcance</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(query.data ?? []).map((c) => (
                <tr key={c.id} className="hover:bg-surface">
                  <Td className="font-medium">{c.name}</Td>
                  <Td>{c.version}</Td>
                  <Td>{new Date(c.effectiveFrom).toLocaleDateString('es-CL')}</Td>
                  <Td>{(c.schemaJson.formats ?? []).join(', ') || '—'}</Td>
                  <Td>{c.tenantId ? 'Tenant' : 'Global'}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataWidget>
    </div>
  );
}

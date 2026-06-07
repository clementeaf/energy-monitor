import { useState } from 'react';
import { DropdownSelect } from '../../components/ui/DropdownSelect';
import { TableStateBody } from '../../components/ui/TableStateBody';
import { Th, Td } from '../../components/ui/TablePrimitives';
import { useQueryState } from '../../hooks/useQueryState';
import { usePermissions } from '../../hooks/usePermissions';
import { useIngestGapsQuery } from '../../hooks/queries/useIngestGapsQuery';
import type { IngestGapStatus } from '../../types/ingest-gap';

/**
 * Open/resolved ingest gaps detected by cron (missing readings buckets).
 */
export function IntegrationsIngestGapsTab() {
  const { has } = usePermissions();
  const canRead = has('integrations', 'read');
  const [statusFilter, setStatusFilter] = useState<IngestGapStatus | ''>('open');

  const query = useIngestGapsQuery(
    statusFilter ? { status: statusFilter, limit: 100 } : { limit: 100 },
    { enabled: canRead },
  );
  const qs = useQueryState(query, { isEmpty: (d) => d === undefined || d.data.length === 0 });

  if (!canRead) {
    return <div className="py-12 text-center text-muted">No tiene permisos para ver brechas de ingest.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <DropdownSelect
          options={[
            { value: 'open', label: 'Abiertas' },
            { value: 'resolved', label: 'Resueltas' },
            { value: '', label: 'Todas' },
          ]}
          value={statusFilter}
          onChange={(v) => { setStatusFilter(v as IngestGapStatus | ''); }}
          className="w-40"
        />
        <span className="text-sm text-muted">{query.data?.total ?? 0} brechas</span>
      </div>

      <div className="overflow-x-auto panel">
        <table className="min-w-full divide-y divide-border">
          <thead className="sticky top-0 z-10 bg-surface">
            <tr>
              <Th>Medidor</Th>
              <Th>Inicio brecha</Th>
              <Th>Fin brecha</Th>
              <Th>Detectado</Th>
              <Th>Estado</Th>
            </tr>
          </thead>
          <TableStateBody phase={qs.phase} colSpan={5} emptyMessage="No hay brechas de ingest.">
            {(query.data?.data ?? []).map((gap) => (
              <tr key={gap.id} className="hover:bg-surface">
                <Td className="font-mono text-xs">{gap.meterId.slice(0, 8)}</Td>
                <Td>{new Date(gap.gapStart).toLocaleString('es-CL')}</Td>
                <Td>{new Date(gap.gapEnd).toLocaleString('es-CL')}</Td>
                <Td>{new Date(gap.detectedAt).toLocaleString('es-CL')}</Td>
                <Td>{gap.status === 'open' ? 'Abierta' : 'Resuelta'}</Td>
              </tr>
            ))}
          </TableStateBody>
        </table>
      </div>
    </div>
  );
}

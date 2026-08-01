import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { DropdownSelect } from '../../components/ui/DropdownSelect';
import { TableStateBody } from '../../components/ui/TableStateBody';
import { Th, Td } from '../../components/ui/TablePrimitives';
import { useQueryState } from '../../hooks/useQueryState';
import { usePermissions } from '../../hooks/usePermissions';
import {
  useBackfillJobsQuery,
  useCreateBackfillJob,
  useProcessBackfillJob,
} from '../../hooks/queries/useBackfillJobsQuery';
import { useMetersQuery } from '../../hooks/queries/useMetersQuery';
import type { BackfillJobStatus } from '../../types/backfill-job';

const STATUS_LABELS: Record<BackfillJobStatus, string> = {
  pending: 'Pendiente',
  running: 'En ejecucion',
  completed: 'Completado',
  failed: 'Fallido',
};

/**
 * Backfill jobs list and enqueue form (admin/integrations).
 */
export function IntegrationsBackfillTab() {
  const { has } = usePermissions();
  const canRead = has('integrations', 'read');
  const canCreate = has('integrations', 'create');
  const canUpdate = has('integrations', 'update');

  const query = useBackfillJobsQuery({ enabled: canRead });
  const qs = useQueryState(query, { isEmpty: (d) => d === undefined || d.length === 0 });
  const metersQuery = useMetersQuery();
  const createMutation = useCreateBackfillJob();
  const processMutation = useProcessBackfillJob();

  const [formOpen, setFormOpen] = useState(false);
  const [meterId, setMeterId] = useState('');
  const [fromTs, setFromTs] = useState('');
  const [toTs, setToTs] = useState('');

  if (!canRead) {
    return <div className="py-12 text-center text-muted">No tiene permisos para ver jobs de backfill.</div>;
  }

  const meterOptions = [
    { value: '', label: 'Seleccionar medidor...' },
    ...(metersQuery.data ?? []).map((m) => ({ value: m.id, label: `${m.name} (${m.code})` })),
  ];

  const handleCreate = (): void => {
    if (!meterId || !fromTs || !toTs) return;
    createMutation.mutate(
      { meterId, fromTs: new Date(fromTs).toISOString(), toTs: new Date(toTs).toISOString() },
      {
        onSuccess: () => {
          setFormOpen(false);
          setMeterId('');
          setFromTs('');
          setToTs('');
        },
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">Reprocesamiento historico de lecturas (worker stub hasta conectar fuente real).</p>
        {canCreate && (
          <Button variant="secondary" onClick={() => { setFormOpen(true); }}>Encolar job</Button>
        )}
      </div>

      <div className="overflow-x-auto panel">
        <table className="min-w-full divide-y divide-border">
          <thead className="sticky top-0 z-10 bg-surface">
            <tr>
              <Th>Medidor</Th>
              <Th>Desde</Th>
              <Th>Hasta</Th>
              <Th>Estado</Th>
              <Th>Filas</Th>
              <Th>Creado</Th>
              {canUpdate && <Th>Accion</Th>}
            </tr>
          </thead>
          <TableStateBody phase={qs.phase} colSpan={canUpdate ? 7 : 6} emptyMessage="No hay jobs de backfill.">
            {(query.data ?? []).map((job) => (
              <tr key={job.id} className="hover:bg-surface">
                <Td className="font-mono text-xs">{job.meterId.slice(0, 8)}</Td>
                <Td>{new Date(job.fromTs).toLocaleString('es-CL')}</Td>
                <Td>{new Date(job.toTs).toLocaleString('es-CL')}</Td>
                <Td>{STATUS_LABELS[job.status]}</Td>
                <Td>{job.rowsProcessed}</Td>
                <Td>{new Date(job.createdAt).toLocaleString('es-CL')}</Td>
                {canUpdate && (
                  <Td>
                    {job.status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => { processMutation.mutate(job.id); }}
                        disabled={processMutation.isPending}
                        className="text-sm text-foreground hover:underline disabled:opacity-50"
                      >
                        Ejecutar
                      </button>
                    )}
                  </Td>
                )}
              </tr>
            ))}
          </TableStateBody>
        </table>
      </div>

      <Modal open={formOpen} onClose={() => { setFormOpen(false); }} title="Nuevo backfill job">
        <div className="space-y-3">
          <label className="block text-sm font-medium">Medidor
            <DropdownSelect options={meterOptions} value={meterId} onChange={setMeterId} className="mt-1 w-full" />
          </label>
          <label className="block text-sm font-medium">Desde
            <input type="datetime-local" value={fromTs} onChange={(e) => { setFromTs(e.target.value); }} className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm" />
          </label>
          <label className="block text-sm font-medium">Hasta
            <input type="datetime-local" value={toTs} onChange={(e) => { setToTs(e.target.value); }} className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm" />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => { setFormOpen(false); }}>Cancelar</Button>
            <Button onClick={handleCreate} loading={createMutation.isPending} disabled={!meterId || !fromTs || !toTs}>Encolar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

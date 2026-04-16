import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { DataWidget } from '../../components/ui/DataWidget';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useQueryState } from '../../hooks/useQueryState';
import { useMetersQuery, useCreateMeter, useUpdateMeter, useDeleteMeter } from '../../hooks/queries/useMetersQuery';
import { useBuildingsQuery } from '../../hooks/queries/useBuildingsQuery';
import { usePermissions } from '../../hooks/usePermissions';
import { MeterForm } from './MeterForm';
import type { Meter, CreateMeterPayload, UpdateMeterPayload } from '../../types/meter';

export function MetersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const buildingId = searchParams.get('buildingId') ?? undefined;
  const { has } = usePermissions();
  const canWrite = has('admin_meters', 'create');

  const buildingsQuery = useBuildingsQuery();
  const metersQuery = useMetersQuery(buildingId);
  const qs = useQueryState(metersQuery, {
    isEmpty: (data) => data === undefined || data.length === 0,
  });

  const createMutation = useCreateMeter();
  const updateMutation = useUpdateMeter();
  const deleteMutation = useDeleteMeter();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Meter | null>(null);
  const [deleting, setDeleting] = useState<Meter | null>(null);

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (m: Meter) => { setEditing(m); setFormOpen(true); };
  const closeForm = () => { setFormOpen(false); setEditing(null); };

  const handleSubmit = (payload: CreateMeterPayload | UpdateMeterPayload) => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, payload: payload as UpdateMeterPayload }, { onSuccess: closeForm });
    } else {
      createMutation.mutate(payload as CreateMeterPayload, { onSuccess: closeForm });
    }
  };

  const handleDelete = () => {
    if (!deleting) return;
    deleteMutation.mutate(deleting.id, { onSuccess: () => { setDeleting(null); } });
  };

  const handleBuildingChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val) {
      setSearchParams({ buildingId: val });
    } else {
      setSearchParams({});
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Medidores</h1>

        <div className="flex gap-2">
          <select
            value={buildingId ?? ''}
            onChange={handleBuildingChange}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700"
          >
            <option value="">Todos los edificios</option>
            {(buildingsQuery.data ?? []).map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>

          {canWrite && (
            <button
              type="button"
              onClick={openCreate}
              className="rounded-md bg-[var(--color-primary,#3D3BF3)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Nuevo Medidor
            </button>
          )}
        </div>
      </div>

      <DataWidget
        phase={qs.phase}
        error={qs.error}
        onRetry={() => { void metersQuery.refetch(); }}
        isFetching={metersQuery.isFetching && qs.phase === 'ready'}
        emptyTitle="Sin medidores"
        emptyDescription={buildingId ? 'No hay medidores en este edificio.' : 'No hay medidores registrados.'}
      >
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <Th>Nombre</Th>
                <Th>Codigo</Th>
                <Th>Tipo</Th>
                <Th>Fase</Th>
                <Th>Modelo</Th>
                <Th>Estado</Th>
                {canWrite && <Th>Acciones</Th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {(metersQuery.data ?? []).map((m) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <Td className="font-medium text-gray-900">{m.name}</Td>
                  <Td>{m.code}</Td>
                  <Td>{m.meterType}</Td>
                  <Td>{m.phaseType === 'three_phase' ? 'Trifasico' : 'Monofasico'}</Td>
                  <Td>{m.model ?? '—'}</Td>
                  <Td><StatusBadge active={m.isActive} /></Td>
                  {canWrite && (
                    <Td>
                      <div className="flex gap-1">
                        <ActionBtn label="Editar" onClick={() => { openEdit(m); }} />
                        <ActionBtn label="Eliminar" onClick={() => { setDeleting(m); }} variant="danger" />
                      </div>
                    </Td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataWidget>

      <MeterForm
        open={formOpen}
        onClose={closeForm}
        onSubmit={handleSubmit}
        isPending={createMutation.isPending || updateMutation.isPending}
        meter={editing}
        defaultBuildingId={buildingId}
      />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => { setDeleting(null); }}
        onConfirm={handleDelete}
        title="Eliminar Medidor"
        message={`Eliminar "${deleting?.name}"? Esta accion no se puede deshacer.`}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}

function Th({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
      {children}
    </th>
  );
}

function Td({ children, className = '' }: Readonly<{ children: React.ReactNode; className?: string }>) {
  return <td className={`whitespace-nowrap px-4 py-3 text-sm text-gray-700 ${className}`}>{children}</td>;
}

function StatusBadge({ active }: Readonly<{ active: boolean }>) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
        active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
      }`}
    >
      {active ? 'Activo' : 'Inactivo'}
    </span>
  );
}

function ActionBtn({ label, onClick, variant = 'default' }: Readonly<{ label: string; onClick: () => void; variant?: 'default' | 'danger' }>) {
  const cls = variant === 'danger'
    ? 'text-red-600 hover:bg-red-50'
    : 'text-gray-600 hover:bg-gray-100';
  return (
    <button type="button" onClick={onClick} className={`rounded px-2 py-1 text-xs font-medium ${cls}`}>
      {label}
    </button>
  );
}

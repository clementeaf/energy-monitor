import { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import { DropdownSelect } from '../../components/ui/DropdownSelect';
import { TableStateBody } from '../../components/ui/TableStateBody';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useQueryState } from '../../hooks/useQueryState';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import { useMetersQuery, useCreateMeter, useUpdateMeter, useDeleteMeter } from '../../hooks/queries/useMetersQuery';
import { useBuildingsQuery } from '../../hooks/queries/useBuildingsQuery';
import { usePermissions } from '../../hooks/usePermissions';
import { MeterForm } from './MeterForm';
import type { Meter, CreateMeterPayload, UpdateMeterPayload } from '../../types/meter';

export function MetersPage() {
  const navigate = useNavigate();
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

  const allMeters = metersQuery.data ?? [];
  const { visible: meters, hasMore, sentinelRef, total } = useInfiniteScroll(allMeters, [buildingId]);

  const buildingMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const b of buildingsQuery.data ?? []) m.set(b.id, b.name);
    return m;
  }, [buildingsQuery.data]);
  const showBuildingCol = !buildingId;

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

  const handleBuildingChange = (val: string) => {
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
          <DropdownSelect
            options={[
              { value: '', label: 'Todos los edificios' },
              ...(buildingsQuery.data ?? []).map((b) => ({ value: b.id, label: b.name })),
            ]}
            value={buildingId ?? ''}
            onChange={handleBuildingChange}
            className="w-48"
          />

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

      <div className="max-h-[70vh] overflow-y-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="sticky top-0 z-10 bg-gray-50">
            <tr>
              {showBuildingCol && <Th>Edificio</Th>}
              <Th>Nombre</Th>
              <Th>Codigo</Th>
              <Th>Tipo</Th>
              <Th>Fase</Th>
              <Th>Modelo</Th>
              <Th>Estado</Th>
              {canWrite && <Th>Acciones</Th>}
            </tr>
          </thead>
          <TableStateBody
            phase={qs.phase}
            colSpan={(canWrite ? 7 : 6) + (showBuildingCol ? 1 : 0)}
            error={qs.error}
            onRetry={() => { metersQuery.refetch(); }}
            emptyMessage="No hay medidores registrados."
            skeletonWidths={['w-28', 'w-20', 'w-20', 'w-20', 'w-24', 'w-16', 'w-20']}
          >
            {meters.map((m) => (
              <tr
                key={m.id}
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => navigate(`/monitoring/meter/${m.id}`)}
              >
                {showBuildingCol && <Td>{buildingMap.get(m.buildingId) ?? '—'}</Td>}
                <Td className="font-medium text-gray-900">{m.name}</Td>
                <Td>{m.code}</Td>
                <Td>{m.meterType}</Td>
                <Td>{m.phaseType === 'three_phase' ? 'Trifasico' : 'Monofasico'}</Td>
                <Td>{m.model ?? '—'}</Td>
                <Td><StatusBadge active={m.isActive} /></Td>
                {canWrite && (
                  <Td>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <ActionBtn label="Editar" onClick={() => { openEdit(m); }} />
                      <ActionBtn label="Eliminar" onClick={() => { setDeleting(m); }} variant="danger" />
                    </div>
                  </Td>
                )}
              </tr>
            ))}
          </TableStateBody>
        </table>
        {hasMore && <div ref={sentinelRef} className="h-4" />}
        {total > 0 && (
          <p className="px-4 py-2 text-xs text-pa-text-muted">
            Mostrando {meters.length} de {total}
          </p>
        )}
      </div>

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

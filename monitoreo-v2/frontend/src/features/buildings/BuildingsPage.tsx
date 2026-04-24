import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { TableStateBody } from '../../components/ui/TableStateBody';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useQueryState } from '../../hooks/useQueryState';
import { useBuildingsQuery, useCreateBuilding, useUpdateBuilding, useDeleteBuilding } from '../../hooks/queries/useBuildingsQuery';
import { usePermissions } from '../../hooks/usePermissions';
import { useOperatorFilter } from '../../hooks/useOperatorFilter';
import { BuildingForm } from './BuildingForm';
import type { Building, CreateBuildingPayload, UpdateBuildingPayload } from '../../types/building';

export function BuildingsPage() {
  const query = useBuildingsQuery();
  const qs = useQueryState(query, {
    isEmpty: (data) => data === undefined || data.length === 0,
  });
  const navigate = useNavigate();
  const { has } = usePermissions();
  const { isHolding, isFilteredMode, needsSelection, operatorBuildingIds } = useOperatorFilter();
  const canWrite = isHolding && has('admin_buildings', 'create');

  // Filter buildings by operator
  const filteredBuildings = useMemo(() => {
    const all = query.data ?? [];
    if (!isFilteredMode || !operatorBuildingIds) return all;
    return all.filter((b) => operatorBuildingIds.has(b.id));
  }, [query.data, isFilteredMode, operatorBuildingIds]);

  if (needsSelection) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-pa-text-muted">Selecciona un operador en la barra lateral para ver edificios.</p>
      </div>
    );
  }

  const createMutation = useCreateBuilding();
  const updateMutation = useUpdateBuilding();
  const deleteMutation = useDeleteBuilding();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Building | null>(null);
  const [deleting, setDeleting] = useState<Building | null>(null);

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (b: Building) => { setEditing(b); setFormOpen(true); };
  const closeForm = () => { setFormOpen(false); setEditing(null); };

  const handleSubmit = (payload: CreateBuildingPayload | UpdateBuildingPayload) => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, payload: payload as UpdateBuildingPayload }, { onSuccess: closeForm });
    } else {
      createMutation.mutate(payload as CreateBuildingPayload, { onSuccess: closeForm });
    }
  };

  const handleDelete = () => {
    if (!deleting) return;
    deleteMutation.mutate(deleting.id, { onSuccess: () => { setDeleting(null); } });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Edificios</h1>
        {canWrite && (
          <button
            type="button"
            onClick={openCreate}
            className="rounded-md bg-[var(--color-primary,#3D3BF3)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Nuevo Edificio
          </button>
        )}
      </div>

      <div className="max-h-[70vh] overflow-y-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="sticky top-0 z-10 bg-gray-50">
            <tr>
              <Th>Nombre</Th>
              <Th>Codigo</Th>
              <Th>Direccion</Th>
              <Th className="text-right">Area (m2)</Th>
              <Th>Estado</Th>
              {canWrite && <Th>Acciones</Th>}
            </tr>
          </thead>
          <TableStateBody
            phase={qs.phase}
            colSpan={canWrite ? 6 : 5}
            error={qs.error}
            onRetry={() => { query.refetch(); }}
            emptyMessage="No hay edificios registrados."
            skeletonWidths={['w-28', 'w-20', 'w-32', 'w-20', 'w-16', 'w-20']}
          >
            {filteredBuildings.map((b) => (
              <tr
                key={b.id}
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => { navigate(`/buildings/${b.id}`); }}
              >
                <Td className="font-medium text-gray-900">{b.name}</Td>
                <Td>{b.code}</Td>
                <Td>{b.address ?? '—'}</Td>
                <Td className="text-right">{b.areaSqm ? Number(b.areaSqm).toLocaleString('es-CL') : '—'}</Td>
                <Td><StatusBadge active={b.isActive} /></Td>
                {canWrite && (
                  <Td>
                    <div className="flex gap-1" role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); }} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') e.stopPropagation(); }}>
                      <ActionBtn label="Editar" onClick={() => { openEdit(b); }} />
                      <ActionBtn label="Eliminar" onClick={() => { setDeleting(b); }} variant="danger" />
                    </div>
                  </Td>
                )}
              </tr>
            ))}
          </TableStateBody>
        </table>
      </div>

      <BuildingForm
        open={formOpen}
        onClose={closeForm}
        onSubmit={handleSubmit}
        isPending={createMutation.isPending || updateMutation.isPending}
        building={editing}
      />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => { setDeleting(null); }}
        onConfirm={handleDelete}
        title="Eliminar Edificio"
        message={`Eliminar "${deleting?.name}"? Esta accion no se puede deshacer.`}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}

function Th({ children, className = '' }: Readonly<{ children: React.ReactNode; className?: string }>) {
  return (
    <th className={`px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 ${className}`}>
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

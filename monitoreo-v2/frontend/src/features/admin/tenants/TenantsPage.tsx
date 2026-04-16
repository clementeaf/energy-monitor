import { useState } from 'react';
import { DataWidget } from '../../../components/ui/DataWidget';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { Th, Td, StatusBadge, ActionBtn } from '../../../components/ui/TablePrimitives';
import { useQueryState } from '../../../hooks/useQueryState';
import {
  useTenantUnitsQuery, useCreateTenantUnit, useUpdateTenantUnit, useDeleteTenantUnit,
} from '../../../hooks/queries/useTenantUnitsQuery';
import { useBuildingsQuery } from '../../../hooks/queries/useBuildingsQuery';
import { usePermissions } from '../../../hooks/usePermissions';
import { TenantUnitForm } from './TenantUnitForm';
import type { TenantUnit, CreateTenantUnitPayload, UpdateTenantUnitPayload } from '../../../types/tenant-unit';

export function TenantsPage() {
  const [buildingFilter, setBuildingFilter] = useState<string>('');
  const query = useTenantUnitsQuery(buildingFilter || undefined);
  const buildingsQuery = useBuildingsQuery();
  const qs = useQueryState(query, {
    isEmpty: (data) => data === undefined || data.length === 0,
  });
  const { has } = usePermissions();
  const canWrite = has('admin_tenants_units', 'create');

  const createMutation = useCreateTenantUnit();
  const updateMutation = useUpdateTenantUnit();
  const deleteMutation = useDeleteTenantUnit();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TenantUnit | null>(null);
  const [deleting, setDeleting] = useState<TenantUnit | null>(null);

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (t: TenantUnit) => { setEditing(t); setFormOpen(true); };
  const closeForm = () => { setFormOpen(false); setEditing(null); };

  const handleSubmit = (payload: CreateTenantUnitPayload | UpdateTenantUnitPayload) => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, payload: payload as UpdateTenantUnitPayload }, { onSuccess: closeForm });
    } else {
      createMutation.mutate(payload as CreateTenantUnitPayload, { onSuccess: closeForm });
    }
  };

  const handleDelete = () => {
    if (!deleting) return;
    deleteMutation.mutate(deleting.id, { onSuccess: () => { setDeleting(null); } });
  };

  const buildings = buildingsQuery.data ?? [];
  const buildingName = (id: string) => buildings.find((b) => b.id === id)?.name ?? id;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Locatarios</h1>
        <div className="flex items-center gap-3">
          <select
            value={buildingFilter}
            onChange={(e) => { setBuildingFilter(e.target.value); }}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Todos los edificios</option>
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          {canWrite && (
            <button
              type="button"
              onClick={openCreate}
              className="rounded-md bg-[var(--color-primary,#3D3BF3)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Nuevo Locatario
            </button>
          )}
        </div>
      </div>

      <DataWidget
        phase={qs.phase}
        error={qs.error}
        onRetry={() => { query.refetch(); }}
        isFetching={query.isFetching && qs.phase === 'ready'}
        emptyTitle="Sin locatarios"
        emptyDescription="No hay locatarios registrados."
      >
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <Th>Nombre</Th>
                <Th>Codigo</Th>
                <Th>Edificio</Th>
                <Th>Contacto</Th>
                <Th>Email Contacto</Th>
                <Th>Estado</Th>
                {canWrite && <Th></Th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {(query.data ?? []).map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <Td className="font-medium text-gray-900">{t.name}</Td>
                  <Td>{t.unitCode}</Td>
                  <Td>{buildingName(t.buildingId)}</Td>
                  <Td>{t.contactName ?? '—'}</Td>
                  <Td>{t.contactEmail ?? '—'}</Td>
                  <Td><StatusBadge active={t.isActive} /></Td>
                  {canWrite && (
                    <Td>
                      <div className="flex gap-1">
                        <ActionBtn label="Editar" onClick={() => { openEdit(t); }} />
                        <ActionBtn label="Eliminar" onClick={() => { setDeleting(t); }} variant="danger" />
                      </div>
                    </Td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataWidget>

      <TenantUnitForm
        open={formOpen}
        onClose={closeForm}
        onSubmit={handleSubmit}
        isPending={createMutation.isPending || updateMutation.isPending}
        tenantUnit={editing}
        buildings={buildings}
      />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => { setDeleting(null); }}
        onConfirm={handleDelete}
        title="Eliminar Locatario"
        message={`Eliminar "${deleting?.name}"? Esta accion no se puede deshacer.`}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}


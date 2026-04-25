import { useState } from 'react';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { DropdownSelect } from '../../../components/ui/DropdownSelect';
import { TableStateBody } from '../../../components/ui/TableStateBody';
import { Th, Td, StatusBadge, ActionBtn } from '../../../components/ui/TablePrimitives';
import { useQueryState } from '../../../hooks/useQueryState';
import { useInfiniteScroll } from '../../../hooks/useInfiniteScroll';
import {
  useTenantUnitsQuery, useCreateTenantUnit, useUpdateTenantUnit, useDeleteTenantUnit,
} from '../../../hooks/queries/useTenantUnitsQuery';
import { useBuildingsQuery } from '../../../hooks/queries/useBuildingsQuery';
import { usePermissions } from '../../../hooks/usePermissions';
import { TenantUnitForm } from './TenantUnitForm';
import type { TenantUnit, CreateTenantUnitPayload, UpdateTenantUnitPayload } from '../../../types/tenant-unit';

const COL_COUNT = 7;
const SKELETON_WIDTHS = ['w-28', 'w-16', 'w-24', 'w-24', 'w-32', 'w-16', 'w-20'];

export function TenantsPage() {
  const [buildingFilter, setBuildingFilter] = useState<string>('');
  const query = useTenantUnitsQuery(buildingFilter || undefined);
  const buildingsQuery = useBuildingsQuery();
  const qs = useQueryState(query, {
    isEmpty: (data) => data === undefined || data.length === 0,
  });
  const { has } = usePermissions();
  const canWrite = has('admin_tenants_units', 'create');

  const allTenants = query.data ?? [];
  const { visible: visibleTenants, hasMore, sentinelRef, total } = useInfiniteScroll(allTenants, [buildingFilter]);

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
        <h1 className="text-lg font-semibold text-pa-text">Locatarios</h1>
        <div className="flex items-center gap-3">
          <DropdownSelect
            options={[
              { value: '', label: 'Todos los edificios' },
              ...buildings.map((b) => ({ value: b.id, label: b.name })),
            ]}
            value={buildingFilter}
            onChange={(val) => { setBuildingFilter(val); }}
            className="w-48"
          />
          {canWrite && (
            <button
              type="button"
              onClick={openCreate}
              className="rounded-lg bg-pa-blue px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-pa-blue-light"
            >
              Nuevo Locatario
            </button>
          )}
        </div>
      </div>

      <div className="max-h-[70vh] overflow-y-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="sticky top-0 z-10 bg-gray-50">
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
          <TableStateBody
            phase={qs.phase}
            colSpan={canWrite ? COL_COUNT : COL_COUNT - 1}
            error={qs.error}
            onRetry={() => { query.refetch(); }}
            emptyMessage="No hay locatarios registrados."
            skeletonWidths={SKELETON_WIDTHS}
          >
            {visibleTenants.map((t) => (
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
          </TableStateBody>
        </table>
        {hasMore && <div ref={sentinelRef} className="h-4" />}
      </div>
      {total > 0 && <p className="px-4 py-2 text-xs text-pa-text-muted">Mostrando {visibleTenants.length} de {total}</p>}

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

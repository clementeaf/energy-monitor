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
import { TenantUnitImportTab } from './TenantUnitImportTab';
import type { TenantUnit, CreateTenantUnitPayload, UpdateTenantUnitPayload } from '../../../types/tenant-unit';
import { PageHeader } from '../../../components/ui/PageHeader';

type TenantsTab = 'list' | 'import';

const TAB_CLASS = (active: boolean): string =>
  `rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
    active ? 'bg-brand text-brand-fg' : 'text-muted hover:bg-surface hover:text-foreground'
  }`;

const COL_COUNT = 8;
const SKELETON_WIDTHS = ['w-28', 'w-16', 'w-20', 'w-24', 'w-24', 'w-32', 'w-16', 'w-20'];

export function TenantsPage() {
  const [activeTab, setActiveTab] = useState<TenantsTab>('list');
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
    <div className="flex h-full flex-col gap-6 overflow-hidden">
      <div className="flex items-center justify-between">
        <PageHeader title="Locatarios" eyebrow="Administración" />
        <div className="flex items-center gap-3">
          {activeTab === 'list' ? (
            <DropdownSelect
              options={[
                { value: '', label: 'Todos los edificios' },
                ...buildings.map((b) => ({ value: b.id, label: b.name })),
              ]}
              value={buildingFilter}
              onChange={(val) => { setBuildingFilter(val); }}
              className="w-48"
            />
          ) : null}
          {canWrite && activeTab === 'list' && (
            <button
              type="button"
              onClick={openCreate}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-fg transition-colors hover:bg-brand-hover"
            >
              Nuevo Locatario
            </button>
          )}
        </div>
      </div>

      {canWrite ? (
        <nav className="flex gap-2" aria-label="Locatarios">
          <button type="button" className={TAB_CLASS(activeTab === 'list')} onClick={() => { setActiveTab('list'); }}>
            Lista
          </button>
          <button type="button" className={TAB_CLASS(activeTab === 'import')} onClick={() => { setActiveTab('import'); }}>
            Importar
          </button>
        </nav>
      ) : null}

      {activeTab === 'import' && canWrite ? (
        <TenantUnitImportTab onViewTenants={() => { setActiveTab('list'); }} />
      ) : (
      <div className="min-h-0 flex-1 overflow-auto panel">
        <table className="min-w-full divide-y divide-border">
          <thead className="sticky top-0 z-10 bg-surface">
            <tr>
              <Th>Nombre</Th>
              <Th>Codigo</Th>
              <Th>ID externo</Th>
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
              <tr key={t.id} className="hover:bg-surface">
                <Td className="font-medium text-foreground">{t.name}</Td>
                <Td>{t.unitCode}</Td>
                <Td>{t.externalUnitId ?? '—'}</Td>
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
        {total > 0 && <p className="px-4 py-2 text-xs text-muted">Mostrando {visibleTenants.length} de {total}</p>}
      </div>
      )}

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

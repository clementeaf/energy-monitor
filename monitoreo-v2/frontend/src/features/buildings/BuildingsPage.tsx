import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { TableStateBody } from '../../components/ui/TableStateBody';
import { PageHeader } from '../../components/ui/PageHeader';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useQueryState } from '../../hooks/useQueryState';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import { useBuildingsQuery, useCreateBuilding, useUpdateBuilding, useDeleteBuilding } from '../../hooks/queries/useBuildingsQuery';
import { useTenantsAdminQuery } from '../../hooks/queries/useTenantsQuery';
import { usePermissions } from '../../hooks/usePermissions';
import { useOperatorFilter } from '../../hooks/useOperatorFilter';
import { useAppStore } from '../../store/useAppStore';
import { BuildingForm } from './BuildingForm';
import { BuildingImportTab } from './BuildingImportTab';
import type { Building, CreateBuildingPayload, UpdateBuildingPayload } from '../../types/building';

type BuildingsTab = 'list' | 'import';

const TAB_CLASS = (active: boolean): string =>
  `rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
    active ? 'bg-brand text-brand-fg' : 'text-muted hover:bg-surface hover:text-foreground'
  }`;

export function BuildingsPage() {
  const [activeTab, setActiveTab] = useState<BuildingsTab>('list');
  const query = useBuildingsQuery();
  const qs = useQueryState(query, {
    isEmpty: (data) => data === undefined || data.length === 0,
  });
  const navigate = useNavigate();
  const { has, isSuperAdmin } = usePermissions();
  const { isHolding, isFilteredMode, needsSelection, operatorBuildingIds } = useOperatorFilter();
  const selectedTenantId = useAppStore((s) => s.selectedTenantId);
  const isCrossTenant = isSuperAdmin && !selectedTenantId;
  const tenantsQuery = useTenantsAdminQuery();
  const tenantMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of tenantsQuery.data ?? []) m.set(t.id, t.name);
    return m;
  }, [tenantsQuery.data]);
  const canWrite = isHolding && has('admin_buildings', 'create');

  // Filter buildings by operator
  const filteredBuildings = useMemo(() => {
    const all = query.data ?? [];
    if (!isFilteredMode || !operatorBuildingIds) return all;
    return all.filter((b) => operatorBuildingIds.has(b.id));
  }, [query.data, isFilteredMode, operatorBuildingIds]);

  const { visible: visibleBuildings, hasMore, sentinelRef, total } = useInfiniteScroll(filteredBuildings);

  if (needsSelection) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted">Selecciona un edificio en la barra lateral para ver edificios.</p>
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
    <div className="space-y-6">
      <PageHeader
        title="Edificios"
        eyebrow="Monitoreo"
        actions={canWrite && activeTab === 'list' ? (
          <button
            type="button"
            onClick={openCreate}
            className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-fg hover:opacity-90"
          >
            Nuevo Edificio
          </button>
        ) : undefined}
      />

      {canWrite ? (
        <nav className="flex gap-2" aria-label="Edificios">
          <button type="button" className={TAB_CLASS(activeTab === 'list')} onClick={() => { setActiveTab('list'); }}>
            Lista
          </button>
          <button type="button" className={TAB_CLASS(activeTab === 'import')} onClick={() => { setActiveTab('import'); }}>
            Importar
          </button>
        </nav>
      ) : null}

      {activeTab === 'import' && canWrite ? (
        <BuildingImportTab onViewBuildings={() => { setActiveTab('list'); }} />
      ) : (
      <div className="overflow-auto panel">
        <table className="min-w-full divide-y divide-border">
          <thead className="sticky top-0 z-10 bg-surface">
            <tr>
              {isCrossTenant && <Th>Empresa</Th>}
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
            colSpan={(canWrite ? 6 : 5) + (isCrossTenant ? 1 : 0)}
            error={qs.error}
            onRetry={() => { query.refetch(); }}
            emptyMessage="No hay edificios registrados."
            skeletonWidths={['w-28', 'w-20', 'w-32', 'w-20', 'w-16', 'w-20']}
          >
            {visibleBuildings.map((b) => (
              <tr
                key={b.id}
                className="cursor-pointer hover:bg-surface"
                onClick={() => { navigate(`/buildings/${b.id}`); }}
              >
                {isCrossTenant && <Td>{tenantMap.get(b.tenantId) ?? '—'}</Td>}
                <Td className="font-medium text-foreground">{b.name}</Td>
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
        {hasMore && <div ref={sentinelRef} className="h-4" />}
      </div>
      )}
      {total > 0 && activeTab === 'list' && <p className="px-4 py-2 text-xs text-muted">Mostrando {visibleBuildings.length} de {total}</p>}

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
    <th className={`px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted ${className}`}>
      {children}
    </th>
  );
}

function Td({ children, className = '', title }: Readonly<{ children: React.ReactNode; className?: string; title?: string }>) {
  return <td className={`whitespace-nowrap px-4 py-3 text-sm text-foreground ${className}`} title={title}>{children}</td>;
}

function StatusBadge({ active }: Readonly<{ active: boolean }>) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
        active ? 'bg-green-100 text-green-700' : 'bg-raised text-muted'
      }`}
    >
      {active ? 'Activo' : 'Inactivo'}
    </span>
  );
}

function ActionBtn({ label, onClick, variant = 'default' }: Readonly<{ label: string; onClick: () => void; variant?: 'default' | 'danger' }>) {
  const cls = variant === 'danger'
    ? 'text-red-600 hover:bg-red-50'
    : 'text-muted hover:bg-surface';
  return (
    <button type="button" onClick={onClick} className={`rounded px-2 py-1 text-xs font-medium ${cls}`}>
      {label}
    </button>
  );
}

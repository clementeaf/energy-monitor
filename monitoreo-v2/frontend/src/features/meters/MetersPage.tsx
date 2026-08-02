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
import { useOperatorFilter } from '../../hooks/useOperatorFilter';
import { MeterForm } from './MeterForm';
import { MeterImportTab } from './MeterImportTab';
import { LOAD_CATEGORY_LABELS } from '../../lib/site-metadata-labels';
import type { LoadCategory } from '../../types/site-metadata';
import type { Meter, CreateMeterPayload, UpdateMeterPayload } from '../../types/meter';
import { PageHeader } from '../../components/ui/PageHeader';

type MetersTab = 'list' | 'import';

const TAB_CLASS = (active: boolean): string =>
  `rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
    active ? 'bg-brand text-brand-fg' : 'text-muted hover:bg-surface hover:text-foreground'
  }`;

export function MetersPage() {
  const [activeTab, setActiveTab] = useState<MetersTab>('list');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const buildingId = searchParams.get('buildingId') ?? undefined;
  const { has } = usePermissions();
  const canWrite = has('admin_meters', 'create');

  const { isFilteredMode, needsSelection, operatorMeterIds } = useOperatorFilter();

  const buildingsQuery = useBuildingsQuery();
  const metersQuery = useMetersQuery(buildingId);
  const qs = useQueryState(metersQuery, {
    isEmpty: (data) => data === undefined || data.length === 0,
  });

  const createMutation = useCreateMeter();
  const updateMutation = useUpdateMeter();
  const deleteMutation = useDeleteMeter();

  const rawMeters = metersQuery.data ?? [];
  const allMeters = useMemo(() => {
    if (!isFilteredMode || !operatorMeterIds) return rawMeters;
    return rawMeters.filter((m) => operatorMeterIds.has(m.id));
  }, [rawMeters, isFilteredMode, operatorMeterIds]);
  const { visible: meters, hasMore, sentinelRef, total } = useInfiniteScroll(allMeters, [buildingId, operatorMeterIds]);

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

  if (needsSelection) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-2xl font-semibold tracking-tight text-foreground">Selecciona un edificio</p>
          <p className="mt-1 text-sm text-muted">Usa el selector en la barra superior para elegir un edificio.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Medidores" eyebrow="Monitoreo" />

        <div className="flex gap-2">
          {activeTab === 'list' ? (
            <DropdownSelect
              options={[
                { value: '', label: 'Todos los edificios' },
                ...(buildingsQuery.data ?? []).map((b) => ({ value: b.id, label: b.name })),
              ]}
              value={buildingId ?? ''}
              onChange={handleBuildingChange}
              className="w-48"
            />
          ) : null}

          {canWrite && activeTab === 'list' ? (
            <button
              type="button"
              onClick={openCreate}
              className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-fg hover:opacity-90"
            >
              Nuevo Medidor
            </button>
          ) : null}
        </div>
      </div>

      {canWrite ? (
        <nav className="flex gap-2" aria-label="Medidores">
          <button type="button" className={TAB_CLASS(activeTab === 'list')} onClick={() => { setActiveTab('list'); }}>
            Lista
          </button>
          <button type="button" className={TAB_CLASS(activeTab === 'import')} onClick={() => { setActiveTab('import'); }}>
            Importar
          </button>
        </nav>
      ) : null}

      {activeTab === 'import' && canWrite ? (
        <MeterImportTab onViewMeters={() => { setActiveTab('list'); }} />
      ) : (
      <div className="overflow-auto panel">
        <table className="min-w-full divide-y divide-border">
          <thead className="sticky top-0 z-10 bg-surface">
            <tr>
              {showBuildingCol && <Th>Edificio</Th>}
              <Th>Nombre</Th>
              <Th>Codigo</Th>
              <Th>Tipo</Th>
              <Th>Carga</Th>
              <Th>Fase</Th>
              <Th>Modelo</Th>
              <Th>Estado</Th>
              {canWrite && <Th>Acciones</Th>}
            </tr>
          </thead>
          <TableStateBody
            phase={qs.phase}
            colSpan={(canWrite ? 8 : 7) + (showBuildingCol ? 1 : 0)}
            error={qs.error}
            onRetry={() => { metersQuery.refetch(); }}
            emptyMessage="No hay medidores registrados."
            skeletonWidths={['w-28', 'w-20', 'w-20', 'w-20', 'w-20', 'w-24', 'w-16', 'w-20']}
          >
            {meters.map((m) => (
              <tr
                key={m.id}
                className="cursor-pointer hover:bg-surface"
                onClick={() => navigate(`/monitoring/meter/${m.id}`)}
              >
                {showBuildingCol && <Td>{buildingMap.get(m.buildingId) ?? '—'}</Td>}
                <Td className="font-medium text-foreground">{m.name}</Td>
                <Td>{m.code}</Td>
                <Td>{m.meterType}</Td>
                <Td>
                  {m.loadCategory
                    ? LOAD_CATEGORY_LABELS[m.loadCategory as LoadCategory] ?? m.loadCategory
                    : '—'}
                </Td>
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
          <p className="px-4 py-2 text-xs text-muted">
            Mostrando {meters.length} de {total}
          </p>
        )}
      </div>
      )}

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
    <th className="px-4 py-2 text-left text-xs font-medium text-muted">
      {children}
    </th>
  );
}

function Td({ children, className = '' }: Readonly<{ children: React.ReactNode; className?: string }>) {
  return <td className={`whitespace-nowrap px-4 py-3 text-sm text-foreground ${className}`}>{children}</td>;
}

function StatusBadge({ active }: Readonly<{ active: boolean }>) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
        active ? 'bg-success/10 text-success' : 'bg-raised text-muted'
      }`}
    >
      {active ? 'Activo' : 'Inactivo'}
    </span>
  );
}

function ActionBtn({ label, onClick, variant = 'default' }: Readonly<{ label: string; onClick: () => void; variant?: 'default' | 'danger' }>) {
  const cls = variant === 'danger'
    ? 'text-danger hover:bg-danger/10'
    : 'text-muted hover:bg-surface';
  return (
    <button type="button" onClick={onClick} className={`rounded px-2 py-1 text-xs font-medium ${cls}`}>
      {label}
    </button>
  );
}

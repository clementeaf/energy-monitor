import { useState } from 'react';
import { DropdownSelect } from '../../components/ui/DropdownSelect';
import { TableStateBody } from '../../components/ui/TableStateBody';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useQueryState } from '../../hooks/useQueryState';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import { usePermissions } from '../../hooks/usePermissions';
import { useBuildingsQuery } from '../../hooks/queries/useBuildingsQuery';
import {
  useTariffsQuery,
  useTariffBlocksQuery,
  useCreateTariff,
  useUpdateTariff,
  useDeleteTariff,
  useCreateTariffBlock,
  useDeleteTariffBlock,
} from '../../hooks/queries/useTariffsQuery';
import type { Tariff, CreateTariffPayload, UpdateTariffPayload, CreateTariffBlockPayload } from '../../types/tariff';

export function TariffsPage() {
  const [buildingFilter, setBuildingFilter] = useState<string>('');
  const tariffsQuery = useTariffsQuery(buildingFilter || undefined);
  const buildingsQuery = useBuildingsQuery();
  const qs = useQueryState(tariffsQuery, { isEmpty: (d) => !d || d.length === 0 });
  const { has } = usePermissions();
  const canWrite = has('billing', 'create');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Tariff | null>(null);
  const [deleting, setDeleting] = useState<Tariff | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const createMutation = useCreateTariff();
  const updateMutation = useUpdateTariff();
  const deleteMutation = useDeleteTariff();

  const allTariffs = tariffsQuery.data ?? [];
  const { visible: visibleTariffs, hasMore, sentinelRef, total } = useInfiniteScroll(allTariffs, [buildingFilter]);

  const openCreate = () => { setEditing(null); setFormBuildingId(''); setFormOpen(true); };
  const openEdit = (t: Tariff) => { setEditing(t); setFormOpen(true); };
  const closeForm = () => { setFormOpen(false); setEditing(null); setFormBuildingId(''); };

  const [formBuildingId, setFormBuildingId] = useState('');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (editing) {
      const payload: UpdateTariffPayload = {
        name: fd.get('name') as string,
        effectiveFrom: fd.get('effectiveFrom') as string,
        effectiveTo: (fd.get('effectiveTo') as string) || undefined,
        isActive: fd.get('isActive') === 'on',
      };
      updateMutation.mutate({ id: editing.id, payload }, { onSuccess: closeForm });
    } else {
      const payload: CreateTariffPayload = {
        buildingId: formBuildingId,
        name: fd.get('name') as string,
        effectiveFrom: fd.get('effectiveFrom') as string,
        effectiveTo: (fd.get('effectiveTo') as string) || undefined,
        isActive: fd.get('isActive') === 'on',
      };
      createMutation.mutate(payload, { onSuccess: closeForm });
    }
  };

  const handleDelete = () => {
    if (!deleting) return;
    deleteMutation.mutate(deleting.id, { onSuccess: () => setDeleting(null) });
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Tarifas</h1>
        <div className="flex items-center gap-3">
          <DropdownSelect
            options={[
              { value: '', label: 'Todos los edificios' },
              ...(buildingsQuery.data?.map((b) => ({ value: b.id, label: b.name })) ?? []),
            ]}
            value={buildingFilter}
            onChange={(val) => setBuildingFilter(val)}
            className="w-48"
          />
          {canWrite && (
            <button
              type="button"
              onClick={openCreate}
              className="rounded-md bg-[var(--color-primary,#3D3BF3)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              + Nueva Tarifa
            </button>
          )}
        </div>
      </div>

      <div className="overflow-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-white">
            <tr className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Vigencia</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Bloques</th>
              {canWrite && <th className="px-4 py-3 text-right">Acciones</th>}
            </tr>
          </thead>
          <TableStateBody
            phase={qs.phase}
            colSpan={canWrite ? 5 : 4}
            error={qs.error}
            onRetry={() => { tariffsQuery.refetch(); }}
            emptyMessage="No hay tarifas configuradas."
            skeletonWidths={['w-32', 'w-28', 'w-20', 'w-24', ...(canWrite ? ['w-20'] : [])]}
          >
            {visibleTariffs.map((tariff) => (
              <TariffRow
                key={tariff.id}
                tariff={tariff}
                expanded={expandedId === tariff.id}
                onToggle={() => setExpandedId(expandedId === tariff.id ? null : tariff.id)}
                canWrite={canWrite}
                onEdit={() => openEdit(tariff)}
                onDelete={() => setDeleting(tariff)}
              />
            ))}
          </TableStateBody>
        </table>
        {hasMore && <div ref={sentinelRef} className="h-4" />}
      </div>
      {total > 0 && <p className="px-4 py-2 text-xs text-pa-text-muted">Mostrando {visibleTariffs.length} de {total}</p>}

      <Modal open={formOpen} onClose={closeForm} title={editing ? 'Editar Tarifa' : 'Nueva Tarifa'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!editing && (
            <div>
              <div className="mb-1 block text-sm font-medium text-gray-700">Edificio</div>
              <DropdownSelect
                options={[
                  { value: '', label: 'Seleccionar...' },
                  ...(buildingsQuery.data?.map((b) => ({ value: b.id, label: b.name })) ?? []),
                ]}
                value={formBuildingId}
                onChange={(val) => setFormBuildingId(val)}
                className="w-full"
              />
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Nombre</label>
            <input name="name" required defaultValue={editing?.name ?? ''} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Desde</label>
              <input name="effectiveFrom" type="date" required defaultValue={editing?.effectiveFrom ?? ''} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Hasta</label>
              <input name="effectiveTo" type="date" defaultValue={editing?.effectiveTo ?? ''} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input name="isActive" type="checkbox" defaultChecked={editing?.isActive ?? true} />
            Activa
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={closeForm} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="rounded-md bg-[var(--color-primary,#3D3BF3)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
              {editing ? 'Guardar' : 'Crear'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Eliminar Tarifa"
        message={`¿Eliminar la tarifa "${deleting?.name}"? Esta acción no se puede deshacer.`}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}

function TariffRow({
  tariff,
  expanded,
  onToggle,
  canWrite,
  onEdit,
  onDelete,
}: {
  tariff: Tariff;
  expanded: boolean;
  onToggle: () => void;
  canWrite: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <>
      <tr className="hover:bg-gray-50">
        <td className="px-4 py-3 font-medium text-gray-900">{tariff.name}</td>
        <td className="px-4 py-3 text-gray-600">
          {tariff.effectiveFrom}{tariff.effectiveTo ? ` — ${tariff.effectiveTo}` : ' — vigente'}
        </td>
        <td className="px-4 py-3">
          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${tariff.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {tariff.isActive ? 'Activa' : 'Inactiva'}
          </span>
        </td>
        <td className="px-4 py-3">
          <button type="button" onClick={onToggle} className="text-sm text-[var(--color-primary,#3D3BF3)] hover:underline">
            {expanded ? 'Ocultar' : 'Ver bloques'}
          </button>
        </td>
        {canWrite && (
          <td className="px-4 py-3 text-right">
            <button type="button" onClick={onEdit} className="mr-2 text-sm text-gray-500 hover:text-gray-700">Editar</button>
            <button type="button" onClick={onDelete} className="text-sm text-red-500 hover:text-red-700">Eliminar</button>
          </td>
        )}
      </tr>
      {expanded && (
        <tr>
          <td colSpan={canWrite ? 5 : 4} className="bg-gray-50 px-4 py-3">
            <TariffBlocksPanel tariffId={tariff.id} canWrite={canWrite} />
          </td>
        </tr>
      )}
    </>
  );
}

function TariffBlocksPanel({ tariffId, canWrite }: Readonly<{ tariffId: string; canWrite: boolean }>) {
  const blocksQuery = useTariffBlocksQuery(tariffId);
  const createBlock = useCreateTariffBlock();
  const deleteBlock = useDeleteTariffBlock();
  const [addOpen, setAddOpen] = useState(false);

  const handleAddBlock = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload: CreateTariffBlockPayload = {
      blockName: fd.get('blockName') as string,
      hourStart: Number(fd.get('hourStart')),
      hourEnd: Number(fd.get('hourEnd')),
      energyRate: Number(fd.get('energyRate')),
      demandRate: Number(fd.get('demandRate') || 0),
      reactiveRate: Number(fd.get('reactiveRate') || 0),
      fixedCharge: Number(fd.get('fixedCharge') || 0),
    };
    createBlock.mutate({ tariffId, payload }, { onSuccess: () => setAddOpen(false) });
  };

  if (blocksQuery.isPending) return <p className="text-sm text-gray-400">Cargando bloques...</p>;
  if (blocksQuery.isError) return <p className="text-sm text-red-500">Error cargando bloques</p>;

  const blocks = blocksQuery.data ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase text-gray-500">Bloques Horarios</span>
        {canWrite && (
          <button type="button" onClick={() => setAddOpen(!addOpen)} className="text-xs text-[var(--color-primary,#3D3BF3)] hover:underline">
            {addOpen ? 'Cancelar' : '+ Agregar bloque'}
          </button>
        )}
      </div>

      {addOpen && (
        <form onSubmit={handleAddBlock} className="grid grid-cols-2 gap-2 rounded border border-gray-200 bg-white p-3 lg:grid-cols-7">
          <input name="blockName" placeholder="Nombre (ej: punta)" required className="rounded border border-gray-300 px-2 py-1 text-xs" />
          <input name="hourStart" type="number" min={0} max={23} placeholder="H inicio" required className="rounded border border-gray-300 px-2 py-1 text-xs" />
          <input name="hourEnd" type="number" min={0} max={23} placeholder="H fin" required className="rounded border border-gray-300 px-2 py-1 text-xs" />
          <input name="energyRate" type="number" step="0.0001" placeholder="$/kWh" required className="rounded border border-gray-300 px-2 py-1 text-xs" />
          <input name="demandRate" type="number" step="0.0001" placeholder="$/kW" className="rounded border border-gray-300 px-2 py-1 text-xs" />
          <input name="reactiveRate" type="number" step="0.0001" placeholder="$/kVArh" className="rounded border border-gray-300 px-2 py-1 text-xs" />
          <button type="submit" disabled={createBlock.isPending} className="rounded bg-[var(--color-primary,#3D3BF3)] px-2 py-1 text-xs text-white hover:opacity-90 disabled:opacity-50">
            Crear
          </button>
        </form>
      )}

      {blocks.length === 0 ? (
        <p className="text-sm text-gray-400">Sin bloques configurados</p>
      ) : (
        <table className="w-full text-xs">
          <thead className="sticky top-0 z-10 bg-white">
            <tr className="text-left text-gray-500">
              <th className="pb-1">Bloque</th>
              <th className="pb-1">Horario</th>
              <th className="pb-1 text-right">$/kWh</th>
              <th className="pb-1 text-right">$/kW</th>
              <th className="pb-1 text-right">$/kVArh</th>
              <th className="pb-1 text-right">Cargo Fijo</th>
              {canWrite && <th className="pb-1 text-right">Acciones</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {blocks.map((b) => (
              <tr key={b.id}>
                <td className="py-1 font-medium">{b.blockName}</td>
                <td className="py-1">{String(b.hourStart).padStart(2, '0')}:00 — {String(b.hourEnd).padStart(2, '0')}:00</td>
                <td className="py-1 text-right">{b.energyRate}</td>
                <td className="py-1 text-right">{b.demandRate}</td>
                <td className="py-1 text-right">{b.reactiveRate}</td>
                <td className="py-1 text-right">{b.fixedCharge}</td>
                {canWrite && (
                  <td className="py-1 text-right">
                    <button
                      type="button"
                      onClick={() => deleteBlock.mutate({ tariffId, blockId: b.id })}
                      className="text-red-500 hover:text-red-700"
                    >
                      Eliminar
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

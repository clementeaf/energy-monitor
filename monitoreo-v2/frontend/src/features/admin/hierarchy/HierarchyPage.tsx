import { useState } from 'react';
import { DataWidget } from '../../../components/ui/DataWidget';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { Modal } from '../../../components/ui/Modal';
import { useQueryState } from '../../../hooks/useQueryState';
import { useBuildingsQuery } from '../../../hooks/queries/useBuildingsQuery';
import {
  useHierarchyByBuildingQuery,
  useCreateHierarchyNode, useUpdateHierarchyNode, useDeleteHierarchyNode,
} from '../../../hooks/queries/useHierarchyQuery';
import { usePermissions } from '../../../hooks/usePermissions';
import type { HierarchyNode, HierarchyLevelType, CreateHierarchyNodePayload, UpdateHierarchyNodePayload } from '../../../types/hierarchy';

const LEVEL_LABELS: Record<HierarchyLevelType, string> = {
  floor: 'Piso',
  zone: 'Zona',
  panel: 'Tablero',
  circuit: 'Circuito',
  sub_circuit: 'Sub-Circuito',
};

const LEVEL_COLORS: Record<HierarchyLevelType, string> = {
  floor: 'bg-blue-50 text-blue-700',
  zone: 'bg-purple-50 text-purple-700',
  panel: 'bg-amber-50 text-amber-700',
  circuit: 'bg-green-50 text-green-700',
  sub_circuit: 'bg-gray-100 text-gray-600',
};

export function HierarchyPage() {
  const buildingsQuery = useBuildingsQuery();
  const buildings = buildingsQuery.data ?? [];
  const [selectedBuilding, setSelectedBuilding] = useState('');
  const buildingId = selectedBuilding || (buildings[0]?.id ?? '');

  const query = useHierarchyByBuildingQuery(buildingId);
  const qs = useQueryState(query, {
    isEmpty: (data) => data === undefined || data.length === 0,
  });
  const { has } = usePermissions();
  const canWrite = has('admin_hierarchy', 'create');

  const createMutation = useCreateHierarchyNode();
  const updateMutation = useUpdateHierarchyNode();
  const deleteMutation = useDeleteHierarchyNode();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<HierarchyNode | null>(null);
  const [parentId, setParentId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<HierarchyNode | null>(null);

  const openCreate = (pid: string | null = null) => { setEditing(null); setParentId(pid); setFormOpen(true); };
  const openEdit = (n: HierarchyNode) => { setEditing(n); setFormOpen(true); };
  const closeForm = () => { setFormOpen(false); setEditing(null); setParentId(null); };

  const handleSubmit = (payload: CreateHierarchyNodePayload | UpdateHierarchyNodePayload) => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, payload: payload as UpdateHierarchyNodePayload }, { onSuccess: closeForm });
    } else {
      createMutation.mutate(payload as CreateHierarchyNodePayload, { onSuccess: closeForm });
    }
  };

  const handleDelete = () => {
    if (!deleting) return;
    deleteMutation.mutate(deleting.id, { onSuccess: () => { setDeleting(null); } });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Jerarquia Electrica</h1>
        <div className="flex items-center gap-3">
          <select
            value={selectedBuilding}
            onChange={(e) => { setSelectedBuilding(e.target.value); }}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          {canWrite && (
            <button
              type="button"
              onClick={() => { openCreate(null); }}
              className="rounded-md bg-[var(--color-primary,#3D3BF3)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Nuevo Nodo Raiz
            </button>
          )}
        </div>
      </div>

      <DataWidget
        phase={qs.phase}
        error={qs.error}
        onRetry={() => { void query.refetch(); }}
        isFetching={query.isFetching && qs.phase === 'ready'}
        emptyTitle="Sin jerarquia"
        emptyDescription="No hay nodos de jerarquia para este edificio."
      >
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          {(query.data ?? []).map((node) => (
            <TreeNode
              key={node.id}
              node={node}
              depth={0}
              canWrite={canWrite}
              onAdd={openCreate}
              onEdit={openEdit}
              onDelete={setDeleting}
            />
          ))}
        </div>
      </DataWidget>

      <NodeFormModal
        open={formOpen}
        onClose={closeForm}
        onSubmit={handleSubmit}
        isPending={createMutation.isPending || updateMutation.isPending}
        node={editing}
        buildingId={buildingId}
        parentId={parentId}
      />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => { setDeleting(null); }}
        onConfirm={handleDelete}
        title="Eliminar Nodo"
        message={`Eliminar "${deleting?.name}" y todos sus hijos? Esta accion no se puede deshacer.`}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}

function TreeNode({
  node, depth, canWrite, onAdd, onEdit, onDelete,
}: {
  node: HierarchyNode;
  depth: number;
  canWrite: boolean;
  onAdd: (parentId: string) => void;
  onEdit: (n: HierarchyNode) => void;
  onDelete: (n: HierarchyNode) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div style={{ marginLeft: depth * 20 }}>
      <div className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-gray-50">
        <button
          type="button"
          onClick={() => { setExpanded(!expanded); }}
          className="flex size-5 items-center justify-center text-gray-400"
        >
          {hasChildren ? (expanded ? '▼' : '▶') : '·'}
        </button>
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${LEVEL_COLORS[node.levelType]}`}>
          {LEVEL_LABELS[node.levelType]}
        </span>
        <span className="text-sm font-medium text-gray-900">{node.name}</span>
        {canWrite && (
          <div className="ml-auto flex gap-1">
            <button
              type="button"
              onClick={() => { onAdd(node.id); }}
              className="rounded px-2 py-0.5 text-xs text-blue-600 hover:bg-blue-50"
            >
              + Hijo
            </button>
            <button
              type="button"
              onClick={() => { onEdit(node); }}
              className="rounded px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-100"
            >
              Editar
            </button>
            <button
              type="button"
              onClick={() => { onDelete(node); }}
              className="rounded px-2 py-0.5 text-xs text-red-600 hover:bg-red-50"
            >
              Eliminar
            </button>
          </div>
        )}
      </div>
      {expanded && hasChildren && node.children!.map((child) => (
        <TreeNode
          key={child.id}
          node={child}
          depth={depth + 1}
          canWrite={canWrite}
          onAdd={onAdd}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

function NodeFormModal({
  open, onClose, onSubmit, isPending, node, buildingId, parentId,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateHierarchyNodePayload | UpdateHierarchyNodePayload) => void;
  isPending: boolean;
  node: HierarchyNode | null;
  buildingId: string;
  parentId: string | null;
}) {
  const isEdit = !!node;
  const [name, setName] = useState(node?.name ?? '');
  const [levelType, setLevelType] = useState<HierarchyLevelType>(node?.levelType ?? 'floor');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEdit) {
      const payload: UpdateHierarchyNodePayload = {};
      if (name !== node.name) payload.name = name;
      if (levelType !== node.levelType) payload.levelType = levelType;
      onSubmit(payload);
    } else {
      onSubmit({
        buildingId,
        name,
        levelType,
        ...(parentId ? { parentId } : {}),
      });
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar Nodo' : 'Nuevo Nodo'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nombre" required>
          <input
            value={name}
            onChange={(e) => { setName(e.target.value); }}
            required
            maxLength={255}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </Field>

        <Field label="Tipo" required>
          <select
            value={levelType}
            onChange={(e) => { setLevelType(e.target.value as HierarchyLevelType); }}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            {(Object.keys(LEVEL_LABELS) as HierarchyLevelType[]).map((lt) => (
              <option key={lt} value={lt}>{LEVEL_LABELS[lt]}</option>
            ))}
          </select>
        </Field>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending || !name}
            className="rounded-md bg-[var(--color-primary,#3D3BF3)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? 'Guardando...' : isEdit ? 'Guardar' : 'Crear'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-gray-700">
        {label}{required && <span className="text-red-500"> *</span>}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

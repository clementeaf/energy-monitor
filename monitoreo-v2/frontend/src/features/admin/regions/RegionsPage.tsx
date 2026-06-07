import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { TableStateBody } from '../../../components/ui/TableStateBody';
import { Th, Td, ActionBtn } from '../../../components/ui/TablePrimitives';
import { PageHeader } from '../../../components/ui/PageHeader';
import { usePermissions } from '../../../hooks/usePermissions';
import {
  useRegionsQuery,
  useCreateRegion,
  useUpdateRegion,
  useDeleteRegion,
} from '../../../hooks/queries/useRegionsQuery';
import type { Region } from '../../../types/region';

/**
 * CRUD admin page for tenant geographic regions.
 */
export function RegionsPage() {
  const { has } = usePermissions();
  const canRead = has('admin_buildings', 'read');
  const canWrite = has('admin_buildings', 'create');

  const query = useRegionsQuery({ enabled: canRead });
  const createMutation = useCreateRegion();
  const updateMutation = useUpdateRegion();
  const deleteMutation = useDeleteRegion();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Region | null>(null);
  const [deleting, setDeleting] = useState<Region | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [countryCode, setCountryCode] = useState('CL');

  if (!canRead) {
    return <div className="py-12 text-center text-muted">No tiene permisos para ver regiones.</div>;
  }

  const openCreate = (): void => {
    setEditing(null);
    setCode('');
    setName('');
    setCountryCode('CL');
    setFormOpen(true);
  };

  const openEdit = (row: Region): void => {
    setEditing(row);
    setCode(row.code);
    setName(row.name);
    setCountryCode(row.countryCode);
    setFormOpen(true);
  };

  const handleSubmit = (): void => {
    if (!code.trim() || !name.trim()) return;
    if (editing) {
      updateMutation.mutate(
        { id: editing.id, payload: { code, name, countryCode } },
        { onSuccess: () => { setFormOpen(false); } },
      );
    } else {
      createMutation.mutate(
        { code, name, countryCode },
        { onSuccess: () => { setFormOpen(false); } },
      );
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Regiones" eyebrow="Administración" />
      {canWrite && (
        <Button onClick={openCreate}>Nueva region</Button>
      )}

      <div className="overflow-x-auto panel">
        <table className="min-w-full divide-y divide-border">
          <thead className="sticky top-0 z-10 bg-surface">
            <tr>
              <Th>Codigo</Th>
              <Th>Nombre</Th>
              <Th>Pais</Th>
              {canWrite && <Th>Acciones</Th>}
            </tr>
          </thead>
          <TableStateBody
            phase={query.isPending ? 'loading' : (query.data?.length ? 'ready' : 'empty')}
            colSpan={canWrite ? 4 : 3}
            emptyMessage="No hay regiones registradas."
          >
            {(query.data ?? []).map((row: Region) => (
              <tr key={row.id} className="hover:bg-surface">
                <Td className="font-medium">{row.code}</Td>
                <Td>{row.name}</Td>
                <Td>{row.countryCode}</Td>
                {canWrite && (
                  <Td>
                    <div className="flex gap-1">
                      <ActionBtn label="Editar" onClick={() => { openEdit(row); }} />
                      <ActionBtn label="Eliminar" onClick={() => { setDeleting(row); }} variant="danger" />
                    </div>
                  </Td>
                )}
              </tr>
            ))}
          </TableStateBody>
        </table>
      </div>

      <Modal open={formOpen} onClose={() => { setFormOpen(false); }} title={editing ? 'Editar region' : 'Nueva region'}>
        <div className="space-y-3">
          <label className="block text-sm font-medium">Codigo
            <input value={code} onChange={(e) => { setCode(e.target.value); }} className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm" />
          </label>
          <label className="block text-sm font-medium">Nombre
            <input value={name} onChange={(e) => { setName(e.target.value); }} className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm" />
          </label>
          <label className="block text-sm font-medium">Pais (ISO)
            <input value={countryCode} onChange={(e) => { setCountryCode(e.target.value.toUpperCase().slice(0, 2)); }} maxLength={2} className="mt-1 w-20 rounded-md border border-border px-3 py-2 text-sm uppercase" />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => { setFormOpen(false); }}>Cancelar</Button>
            <Button onClick={handleSubmit} loading={createMutation.isPending || updateMutation.isPending}>Guardar</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => { setDeleting(null); }}
        onConfirm={() => {
          if (deleting) deleteMutation.mutate(deleting.id, { onSuccess: () => { setDeleting(null); } });
        }}
        title="Eliminar region"
        message={`Eliminar "${deleting?.name}"?`}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}

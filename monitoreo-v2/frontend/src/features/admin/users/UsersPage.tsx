import { useState } from 'react';
import { DataWidget } from '../../../components/ui/DataWidget';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { Th, Td, StatusBadge, ActionBtn } from '../../../components/ui/TablePrimitives';
import { useQueryState } from '../../../hooks/useQueryState';
import { useUsersQuery, useCreateUser, useUpdateUser, useDeleteUser } from '../../../hooks/queries/useUsersQuery';
import { usePermissions } from '../../../hooks/usePermissions';
import { UserForm } from './UserForm';
import type { UserListItem, CreateUserPayload, UpdateUserPayload } from '../../../types/user';

export function UsersPage() {
  const query = useUsersQuery();
  const qs = useQueryState(query, {
    isEmpty: (data) => data === undefined || data.length === 0,
  });
  const { has } = usePermissions();
  const canWrite = has('admin_users', 'create');

  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const deleteMutation = useDeleteUser();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<UserListItem | null>(null);
  const [deleting, setDeleting] = useState<UserListItem | null>(null);

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (u: UserListItem) => { setEditing(u); setFormOpen(true); };
  const closeForm = () => { setFormOpen(false); setEditing(null); };

  const handleSubmit = (payload: CreateUserPayload | UpdateUserPayload) => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, payload: payload as UpdateUserPayload }, { onSuccess: closeForm });
    } else {
      createMutation.mutate(payload as CreateUserPayload, { onSuccess: closeForm });
    }
  };

  const handleDelete = () => {
    if (!deleting) return;
    deleteMutation.mutate(deleting.id, { onSuccess: () => { setDeleting(null); } });
  };

  const roles = uniqueRoles(query.data ?? []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Usuarios</h1>
        {canWrite && (
          <button
            type="button"
            onClick={openCreate}
            className="rounded-md bg-[var(--color-primary,#3D3BF3)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Nuevo Usuario
          </button>
        )}
      </div>

      <DataWidget
        phase={qs.phase}
        error={qs.error}
        onRetry={() => { query.refetch(); }}
        isFetching={query.isFetching && qs.phase === 'ready'}
        emptyTitle="Sin usuarios"
        emptyDescription="No hay usuarios registrados para este tenant."
      >
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <Th>Email</Th>
                <Th>Nombre</Th>
                <Th>Rol</Th>
                <Th>Proveedor</Th>
                <Th>Estado</Th>
                <Th>Ultimo Login</Th>
                {canWrite && <Th></Th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {(query.data ?? []).map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <Td className="font-medium text-gray-900">{u.email}</Td>
                  <Td>{u.displayName ?? '—'}</Td>
                  <Td>
                    <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                      {u.role.name}
                    </span>
                  </Td>
                  <Td className="capitalize">{u.authProvider}</Td>
                  <Td><StatusBadge active={u.isActive} /></Td>
                  <Td>{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString('es-CL') : '—'}</Td>
                  {canWrite && (
                    <Td>
                      <div className="flex gap-1">
                        <ActionBtn label="Editar" onClick={() => { openEdit(u); }} />
                        <ActionBtn label="Eliminar" onClick={() => { setDeleting(u); }} variant="danger" />
                      </div>
                    </Td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataWidget>

      <UserForm
        open={formOpen}
        onClose={closeForm}
        onSubmit={handleSubmit}
        isPending={createMutation.isPending || updateMutation.isPending}
        user={editing}
        roles={roles}
      />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => { setDeleting(null); }}
        onConfirm={handleDelete}
        title="Eliminar Usuario"
        message={`Eliminar "${deleting?.email}"? Esta accion no se puede deshacer.`}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}

function uniqueRoles(users: UserListItem[]): { id: string; name: string; slug: string }[] {
  const map = new Map<string, { id: string; name: string; slug: string }>();
  for (const u of users) {
    if (!map.has(u.role.id)) map.set(u.role.id, u.role);
  }
  return Array.from(map.values());
}

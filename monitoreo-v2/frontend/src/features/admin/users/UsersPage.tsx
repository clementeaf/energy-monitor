import { useState } from 'react';
import { TableStateBody } from '../../../components/ui/TableStateBody';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { Th, Td, StatusBadge, ActionBtn } from '../../../components/ui/TablePrimitives';
import { useQueryState } from '../../../hooks/useQueryState';
import { useInfiniteScroll } from '../../../hooks/useInfiniteScroll';
import { useUsersQuery, useCreateUser, useUpdateUser, useDeleteUser } from '../../../hooks/queries/useUsersQuery';
import { usePermissions } from '../../../hooks/usePermissions';
import { UserForm } from './UserForm';
import { UserImportTab } from './UserImportTab';
import type { UserListItem, CreateUserPayload, UpdateUserPayload } from '../../../types/user';
import { PageHeader } from '../../../components/ui/PageHeader';

type UsersTab = 'list' | 'import';

const TAB_CLASS = (active: boolean): string =>
  `rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
    active ? 'bg-brand text-brand-fg' : 'text-muted hover:bg-surface hover:text-foreground'
  }`;

export function UsersPage() {
  const [activeTab, setActiveTab] = useState<UsersTab>('list');
  const query = useUsersQuery();
  const qs = useQueryState(query, {
    isEmpty: (data) => data === undefined || data.length === 0,
  });
  const { has } = usePermissions();
  const canWrite = has('admin_users', 'create');

  const allUsers = query.data ?? [];
  const { visible: visibleUsers, hasMore, sentinelRef, total } = useInfiniteScroll(allUsers);

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuarios"
        eyebrow="Administración"
        actions={canWrite && activeTab === 'list' ? (
          <button
            type="button"
            onClick={openCreate}
            className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-fg hover:opacity-90"
          >
            Nuevo Usuario
          </button>
        ) : undefined}
      />

      {canWrite ? (
        <nav className="flex gap-2" aria-label="Usuarios">
          <button type="button" className={TAB_CLASS(activeTab === 'list')} onClick={() => { setActiveTab('list'); }}>
            Lista
          </button>
          <button type="button" className={TAB_CLASS(activeTab === 'import')} onClick={() => { setActiveTab('import'); }}>
            Importar
          </button>
        </nav>
      ) : null}

      {activeTab === 'import' && canWrite ? (
        <UserImportTab onViewUsers={() => { setActiveTab('list'); }} />
      ) : (
        <>
          <div className="max-h-[70vh] overflow-auto panel">
            <table className="min-w-full divide-y divide-border">
              <thead className="sticky top-0 z-10 bg-surface">
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
              <TableStateBody
                phase={qs.phase}
                colSpan={canWrite ? 7 : 6}
                error={qs.error}
                onRetry={() => { query.refetch(); }}
                emptyMessage="No hay usuarios registrados."
                skeletonWidths={['w-32', 'w-28', 'w-20', 'w-20', 'w-16', 'w-24', 'w-20']}
              >
                {visibleUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-surface">
                    <Td className="font-medium text-foreground">{u.email}</Td>
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
              </TableStateBody>
            </table>
            {hasMore && <div ref={sentinelRef} className="h-4" />}
          </div>
          {total > 0 && <p className="px-4 py-2 text-xs text-muted">Mostrando {visibleUsers.length} de {total}</p>}
        </>
      )}

      <UserForm
        open={formOpen}
        onClose={closeForm}
        onSubmit={handleSubmit}
        isPending={createMutation.isPending || updateMutation.isPending}
        user={editing}
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

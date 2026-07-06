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

const PROFILE_FILTER_OPTIONS = [
  { key: 'all', label: 'Todos los perfiles' },
  { key: 'super_admin', label: 'Súper Admin' },
  { key: 'corp_admin', label: 'Gerencial' },
  { key: 'site_admin', label: 'Operacional' },
  { key: 'operator', label: 'Técnico' },
  { key: 'auditor', label: 'Auditor' },
];

const STATUS_FILTER_OPTIONS = [
  { key: 'all', label: 'Todos' },
  { key: 'active', label: 'Activos' },
  { key: 'inactive', label: 'Inactivos' },
  { key: 'no_access_90d', label: 'Sin acceso >90d' },
];

export function UsersPage() {
  const [activeTab, setActiveTab] = useState<UsersTab>('list');
  const [profileFilter, setProfileFilter] = useState('all');
  const [statusFilterVal, setStatusFilterVal] = useState('all');
  const query = useUsersQuery();
  const qs = useQueryState(query, {
    isEmpty: (data) => data === undefined || data.length === 0,
  });
  const { has } = usePermissions();
  const canWrite = has('admin_users', 'create');

  const rawUsers = query.data ?? [];
  const allUsers = rawUsers.filter((u) => {
    if (profileFilter !== 'all' && u.role?.slug !== profileFilter) return false;
    if (statusFilterVal === 'active' && !u.isActive) return false;
    if (statusFilterVal === 'inactive' && u.isActive) return false;
    if (statusFilterVal === 'no_access_90d') {
      const last = u.lastLoginAt ? new Date(u.lastLoginAt).getTime() : 0;
      if (Date.now() - last < 90 * 86_400_000) return false;
    }
    return true;
  });
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

      {/* Filters */}
      {activeTab === 'list' && (
        <div className="flex flex-wrap items-center gap-2">
          <select value={profileFilter} onChange={(e) => setProfileFilter(e.target.value)} className="rounded-md border border-border bg-background px-2 py-1 text-[11px] text-foreground outline-none">
            {PROFILE_FILTER_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
          <select value={statusFilterVal} onChange={(e) => setStatusFilterVal(e.target.value)} className="rounded-md border border-border bg-background px-2 py-1 text-[11px] text-foreground outline-none">
            {STATUS_FILTER_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
          <span className="text-[11px] text-muted">{allUsers.length} usuarios</span>
        </div>
      )}

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

          {/* Spec-required panels */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Permisos sin uso >90 días */}
            <div className="panel p-4">
              <h3 className="mb-2 text-[13px] font-medium text-foreground">Permisos sin uso &gt;90 días</h3>
              {(() => {
                const stale = rawUsers.filter((u) => {
                  const last = u.lastLoginAt ? new Date(u.lastLoginAt).getTime() : 0;
                  return u.isActive && (Date.now() - last > 90 * 86_400_000);
                });
                return stale.length > 0 ? (
                  <>
                    <ul className="max-h-32 space-y-1 overflow-y-auto text-[12px]">
                      {stale.map((u) => (
                        <li key={u.id} className="flex items-center justify-between">
                          <span className="text-foreground">{u.email}</span>
                          <span className="text-[10px] text-muted">{u.role?.name ?? '—'}</span>
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      disabled={updateMutation.isPending}
                      onClick={() => {
                        if (!window.confirm(`Revocar acceso a ${stale.length} usuario(s) sin login en >90 dias?`)) return;
                        stale.forEach((u) => {
                          updateMutation.mutate({ id: u.id, payload: { isActive: false } });
                        });
                      }}
                      className="mt-2 rounded-md border border-red-300 px-2 py-1 text-[11px] text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      Revocar acceso masivo ({stale.length})
                    </button>
                  </>
                ) : <p className="text-[12px] text-muted">Todos los usuarios con acceso reciente.</p>;
              })()}
            </div>

            {/* Referencia precio + offboarding */}
            <div className="panel p-4">
              <h3 className="mb-2 text-[13px] font-medium text-foreground">Gestión</h3>
              <div className="space-y-2 text-[12px]">
                <p className="text-muted">Precio referencia: <span className="font-medium text-foreground">0.5 UF/usuario/mes</span> (FIN-01)</p>
                <p className="text-muted">Off-boarding: Desactivar usuario → Azure AD lo deshabilita (ARQ-10)</p>
                <p className="text-muted">Asignar/cambiar perfil requiere justificación en pista auditoría.</p>
                <p className="text-muted">Auditoría trimestral: CYB-03</p>
              </div>
            </div>
          </div>
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

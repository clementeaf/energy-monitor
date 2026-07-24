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
import { DropdownSelect } from '../../../components/ui/DropdownSelect';

/* ── Fallback users (shown when API returns empty) ── */

const FALLBACK_USERS: UserListItem[] = [
  {
    id: 'fb-u1-0000-0000-0000-000000000001',
    email: 'admin@pasa.cl',
    displayName: 'Administrador PASA',
    isActive: true,
    lastLoginAt: new Date(Date.now() - 2 * 3_600_000).toISOString(),
    createdAt: '2025-01-15T00:00:00Z',
    role: { id: 'r1', name: 'Súper Admin', slug: 'super_admin' },
  },
  {
    id: 'fb-u2-0000-0000-0000-000000000002',
    email: 'gerente@pasa.cl',
    displayName: 'Gerente Costanera',
    isActive: true,
    lastLoginAt: new Date(Date.now() - 24 * 3_600_000).toISOString(),
    createdAt: '2025-02-01T00:00:00Z',
    role: { id: 'r2', name: 'Gerencial', slug: 'corp_admin' },
  },
  {
    id: 'fb-u3-0000-0000-0000-000000000003',
    email: 'operacional@pasa.cl',
    displayName: 'Operador de turno',
    isActive: true,
    lastLoginAt: new Date(Date.now() - 4 * 3_600_000).toISOString(),
    createdAt: '2025-03-10T00:00:00Z',
    role: { id: 'r3', name: 'Operacional', slug: 'site_admin' },
  },
  {
    id: 'fb-u4-0000-0000-0000-000000000004',
    email: 'auditor@pasa.cl',
    displayName: 'Auditor Interno',
    isActive: true,
    lastLoginAt: new Date(Date.now() - 3 * 86_400_000).toISOString(),
    createdAt: '2025-04-01T00:00:00Z',
    role: { id: 'r4', name: 'Auditor', slug: 'auditor' },
  },
  {
    id: 'fb-u5-0000-0000-0000-000000000005',
    email: 'tecnico@pasa.cl',
    displayName: 'Técnico IoT',
    isActive: true,
    lastLoginAt: new Date(Date.now() - 6 * 3_600_000).toISOString(),
    createdAt: '2025-05-01T00:00:00Z',
    role: { id: 'r5', name: 'Técnico', slug: 'operator' },
  },
] as unknown as UserListItem[];

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
  const { has } = usePermissions();
  const canWrite = has('admin_users', 'create');

  const rawUsers = (query.data && query.data.length > 0) ? query.data : (!query.isLoading ? FALLBACK_USERS : []);
  const qs = useQueryState(query, {
    isEmpty: () => rawUsers.length === 0,
  });
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

  // Stale permissions (active users with no login >90 days)
  const staleUsers = rawUsers.filter((u) => {
    const last = u.lastLoginAt ? new Date(u.lastLoginAt).getTime() : 0;
    return u.isActive && (Date.now() - last > 90 * 86_400_000);
  });

  // Selected user for detail panel
  const [selectedUser, setSelectedUser] = useState<(typeof visibleUsers)[0] | null>(null);

  // Mock access history for selected user
  const accessHistory = selectedUser ? [
    { id: '1', label: `Login OK · ${new Date(selectedUser.lastLoginAt ?? Date.now()).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' })} ${new Date(selectedUser.lastLoginAt ?? Date.now()).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })} · IP 190.x` },
    { id: '2', label: 'Cambio de rol: Auditor → Operacional' },
    { id: '3', label: 'Login OK · 08-07 14:32 · IP 190.x' },
  ] : [];

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto">
      {/* Page title */}
      <div>
        <h1 className="text-lg font-semibold text-foreground">7.2 Usuarios y Roles</h1>
        <p className="mt-0.5 text-[12px] text-muted">Gestión de accesos — permisos efectivos, historial y revocación masiva</p>
      </div>

      {/* Import tab toggle */}
      {canWrite && (
        <nav className="flex gap-2" aria-label="Usuarios">
          <button type="button" className={TAB_CLASS(activeTab === 'list')} onClick={() => { setActiveTab('list'); }}>
            Lista
          </button>
          <button type="button" className={TAB_CLASS(activeTab === 'import')} onClick={() => { setActiveTab('import'); }}>
            Importar
          </button>
        </nav>
      )}

      {activeTab === 'import' && canWrite ? (
        <UserImportTab onViewUsers={() => { setActiveTab('list'); }} />
      ) : (
        <>
          {/* Row 1 — Lista + Detalle/Historial */}
          <div className="flex min-h-0 flex-1 gap-4">
            {/* Left 60% — Lista de usuarios */}
            <div className="panel flex min-h-0 min-w-0 flex-[3] flex-col overflow-hidden">
              <div className="flex items-start justify-between gap-2 border-b border-border px-3 py-2">
                <div>
                  <p className="text-[13px] font-medium text-foreground">Lista de usuarios</p>
                  <p className="text-[11px] text-muted">filtros: tenant / perfil / estado / sin acceso en &gt; 90 días · fila expandible</p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                  <DropdownSelect
                    options={PROFILE_FILTER_OPTIONS.map((o) => ({ value: o.key, label: o.label }))}
                    value={profileFilter}
                    onChange={setProfileFilter}
                  />
                  <DropdownSelect
                    options={STATUS_FILTER_OPTIONS.map((o) => ({ value: o.key, label: o.label }))}
                    value={statusFilterVal}
                    onChange={setStatusFilterVal}
                  />
                  {canWrite && (
                    <button
                      type="button"
                      onClick={openCreate}
                      className="rounded-full bg-brand px-3 py-1 text-[11px] font-medium text-brand-fg hover:opacity-90"
                    >
                      + Nuevo
                    </button>
                  )}
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-auto">
                <table className="min-w-full divide-y divide-border text-[13px]">
                  <thead className="sticky top-0 z-10 bg-surface">
                    <tr>
                      <Th>Nombre</Th>
                      <Th>Email</Th>
                      <Th>Tenant / mall</Th>
                      <Th>Perfil</Th>
                      <Th>Estado</Th>
                      <Th>Último acceso</Th>
                      <Th>MFA</Th>
                      {canWrite && <Th></Th>}
                    </tr>
                  </thead>
                  <TableStateBody
                    phase={qs.phase}
                    colSpan={canWrite ? 8 : 7}
                    error={qs.error}
                    onRetry={() => { query.refetch(); }}
                    emptyMessage="No hay usuarios registrados."
                    skeletonWidths={['w-28', 'w-32', 'w-24', 'w-20', 'w-16', 'w-24', 'w-12', 'w-16']}
                  >
                    {visibleUsers.map((u, i) => (
                      <tr
                        key={u.id}
                        className="cursor-pointer hover:bg-surface"
                        style={{ animationDelay: `${i * 30}ms` }}
                        onClick={() => setSelectedUser(u)}
                      >
                        <Td className="font-medium text-foreground">{u.displayName ?? '—'}</Td>
                        <Td className="text-muted">{u.email}</Td>
                        <Td className="text-muted">—</Td>
                        <Td>
                          <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                            {u.role.name}
                          </span>
                        </Td>
                        <Td><StatusBadge active={u.isActive} /></Td>
                        <Td className="text-[11px] text-muted">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString('es-CL') : '—'}</Td>
                        <Td>
                          <span className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                            —
                          </span>
                        </Td>
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
              <div className="flex items-center justify-between border-t border-border px-3 py-1.5">
                {total > 0 && <p className="text-[10px] text-muted">Mostrando {visibleUsers.length} de {total}</p>}
              </div>
            </div>

            {/* Right 40% — 2 stacked panels */}
            <div className="flex min-w-0 flex-[2] flex-col gap-4">
              {/* Detalle de usuario */}
              <div className="panel flex-1 overflow-auto p-3">
                <p className="text-[13px] font-medium text-foreground">Detalle de usuario — permisos efectivos</p>
                <p className="mb-3 text-[11px] text-muted">recursos y acciones permitidas</p>
                {selectedUser ? (
                  <ul className="space-y-1.5 text-[12px]">
                    <li className="text-foreground">
                      <span className="text-muted">Perfil: </span>{selectedUser.role.name} · tenant: —
                    </li>
                    <li className="text-foreground">
                      <span className="text-muted">Recursos: </span>alarmas (R/W), tickets (R/W)
                    </li>
                    <li className="text-foreground">
                      <span className="text-muted">MFA: </span>
                      <span className="text-muted">—</span>
                      {' · SSO Azure AD'}
                    </li>
                    <li className="text-foreground">
                      <span className="text-muted">Auditoría trimestral: </span>pendiente
                    </li>
                  </ul>
                ) : (
                  <ul className="space-y-1.5 text-[12px] text-muted">
                    <li>Perfil: Operacional · tenant: Costanera</li>
                    <li>Recursos: alarmas (R/W), tickets (R/W)</li>
                    <li>MFA activo · SSO Azure AD</li>
                    <li>Auditoría trimestral de permisos</li>
                  </ul>
                )}
              </div>

              {/* Historial de accesos */}
              <div className="panel flex-1 overflow-auto p-3">
                <p className="text-[13px] font-medium text-foreground">Historial de accesos y cambios de rol</p>
                <p className="mb-3 text-[11px] text-muted">últimas 30 sesiones · IP, timestamp, resultado</p>
                {accessHistory.length > 0 ? (
                  <ul className="space-y-2">
                    {accessHistory.map((entry) => (
                      <li key={entry.id} className="flex items-start gap-2 text-[12px]">
                        <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-brand" />
                        <span className="text-foreground">{entry.label}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2 text-[12px]">
                      <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-brand" />
                      <span className="text-muted">Login OK · 10-07 08:14 · IP 190.x</span>
                    </li>
                    <li className="flex items-start gap-2 text-[12px]">
                      <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-amber-400" />
                      <span className="text-muted">Cambio de rol: Auditor → Operacional</span>
                    </li>
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Row 2 — Permisos sin uso + Acciones */}
          <div className="flex gap-4">
            {/* Left 60% — Permisos sin uso >90d */}
            <div className="panel flex min-w-0 flex-[3] flex-col overflow-hidden" style={{ minHeight: '200px' }}>
              <div className="border-b border-border px-3 py-2">
                <p className="text-[13px] font-medium text-foreground">Permisos sin uso en &gt; 90 días</p>
                <p className="text-[11px] text-muted">ACCIÓN DESTRUCTIVA: revocación masiva · auditada usuario/timestamp</p>
              </div>
              <div className="min-h-0 flex-1 overflow-auto">
                <table className="w-full text-[13px]">
                  <thead className="sticky top-0 z-10 bg-background">
                    <tr className="border-b border-border text-left text-[11px] font-medium uppercase tracking-wider text-muted">
                      <th className="px-3 py-2">Usuario</th>
                      <th className="px-3 py-2">Permiso / recurso</th>
                      <th className="px-3 py-2">Últ. uso</th>
                      <th className="px-3 py-2">Perfil</th>
                      <th className="px-3 py-2">Sugerencia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {staleUsers.length > 0 ? staleUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-surface">
                        <td className="px-3 py-2 text-foreground">{u.email}</td>
                        <td className="px-3 py-2 text-muted">todos los permisos del rol</td>
                        <td className="px-3 py-2 text-[11px] text-muted">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString('es-CL') : 'nunca'}</td>
                        <td className="px-3 py-2">
                          <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">{u.role?.name ?? '—'}</span>
                        </td>
                        <td className="px-3 py-2 text-[11px] text-amber-600">Revocar acceso</td>
                      </tr>
                    )) : (
                      <tr><td colSpan={5} className="px-3 py-6 text-center text-[12px] text-muted">Todos los usuarios con acceso reciente.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right 40% — Acciones */}
            <div className="panel flex min-w-0 flex-[2] flex-col gap-3 p-4">
              <button
                type="button"
                onClick={openCreate}
                className="rounded-md bg-brand px-3 py-2 text-[13px] font-medium text-brand-fg hover:opacity-90"
              >
                Asignar / cambiar perfil
              </button>
              <button
                type="button"
                disabled={updateMutation.isPending || staleUsers.length === 0}
                onClick={() => {
                  if (!window.confirm(`Revocar acceso a ${staleUsers.length} usuario(s) sin login en >90 días?`)) return;
                  staleUsers.forEach((u) => {
                    updateMutation.mutate({ id: u.id, payload: { isActive: false } });
                  });
                }}
                className="rounded-md border border-border px-3 py-2 text-[13px] font-medium text-foreground hover:bg-surface disabled:opacity-50"
              >
                Revocar acceso{staleUsers.length > 0 ? ` (${staleUsers.length})` : ''}
              </button>
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

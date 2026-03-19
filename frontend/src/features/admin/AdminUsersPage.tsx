import { useState } from 'react';
import { useUsers, useCreateDirectUser, useDeleteUsers, useResendInvitation } from '../../hooks/queries/useUsers';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Drawer } from '../../components/ui/Drawer';
import { SectionBanner } from '../../components/ui/SectionBanner';
import type { AdminUser } from '../../services/endpoints';

const ROLE_DISPLAY: Record<string, string> = {
  'Super Administrador': 'Super Administrador N5',
  'Administrador Corporativo': 'Administrador N4',
  'Administrador de Edificio': 'Usuario N3',
  'Operador': 'Usuario N3',
  'Analista': 'Tecnico N2',
  'Usuario Tienda': 'Auditor N1',
};

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  active:   { label: 'Activo',    cls: 'bg-green-50 text-green-700' },
  invited:  { label: 'Invitado',  cls: 'bg-blue-50 text-blue-700' },
  expired:  { label: 'Expirado',  cls: 'bg-amber-50 text-amber-700' },
  disabled: { label: 'Deshabilitado', cls: 'bg-red-50 text-red-700' },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_LABELS[status] ?? { label: status, cls: 'bg-gray-50 text-gray-600' };
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${s.cls}`}>
      {s.label}
    </span>
  );
}

function ProviderBadge({ provider }: { provider: string | null }) {
  if (!provider) return <span className="text-pa-text-muted">—</span>;
  return (
    <span className="text-[12px] text-pa-text-muted capitalize">{provider}</span>
  );
}

function UserRow({ user, selected, onToggle }: { user: AdminUser; selected: boolean; onToggle: () => void }) {
  const initials = user.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <tr className="border-b border-pa-border last:border-b-0 hover:bg-gray-50">
      <td className="px-3 py-2.5">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="h-3.5 w-3.5 rounded border-pa-border accent-pa-blue"
        />
      </td>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pa-navy text-[10px] font-semibold text-white">
            {initials}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-pa-text">{user.name}</p>
            <p className="truncate text-[12px] text-pa-text-muted">{user.email}</p>
          </div>
        </div>
      </td>
      <td className="px-3 py-2.5 text-[13px] text-pa-text">{ROLE_DISPLAY[user.roleLabel] ?? user.roleLabel}</td>
      <td className="px-3 py-2.5"><ProviderBadge provider={user.provider} /></td>
      <td className="px-3 py-2.5"><StatusBadge status={user.invitationStatus} /></td>
      <td className="px-3 py-2.5 text-[12px] text-pa-text-muted">
        {new Date(user.createdAt).toLocaleDateString('es-CL')}
      </td>
    </tr>
  );
}

const MODE_TO_ROLE: Record<string, number> = {
  holding: 2,        // CORP_ADMIN
  multi_operador: 4, // OPERATOR
  operador: 6,       // TENANT_USER
  tecnico: 5,        // ANALYST
};

const MODE_OPTIONS = [
  { value: 'holding', label: 'Holding' },
  { value: 'multi_operador', label: 'Multi Operador' },
  { value: 'operador', label: 'Operador' },
  { value: 'tecnico', label: 'Técnico' },
];

const ROLE_OPTIONS = [
  { value: 'super_admin', label: 'Super Administrador N5' },
  { value: 'admin', label: 'Administrador N4' },
  { value: 'usuario', label: 'Usuario N3' },
  { value: 'tecnico', label: 'Tecnico N2' },
  { value: 'auditor', label: 'Auditor N1' },
];

function AddUserForm({ onClose }: { onClose: () => void }) {
  const mutation = useCreateDirectUser();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [phone, setPhone] = useState('');
  const [userMode, setUserMode] = useState('holding');
  const [role, setRole] = useState('usuario');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !name.trim()) return;
    const payload = { email: email.trim(), name: name.trim(), jobTitle: jobTitle.trim() || undefined, phone: phone.trim() || undefined, roleId: MODE_TO_ROLE[userMode], siteIds: [], userMode };
    mutation.mutate(payload, { onSuccess: () => onClose() });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-pa-text">Nombre</label>
        <input
          type="text"
          placeholder="Nombre completo"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-pa-border px-3 py-2 text-sm text-pa-text outline-none focus:border-pa-blue"
          required
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-pa-text">Email</label>
        <input
          type="email"
          placeholder="correo@ejemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-pa-border px-3 py-2 text-sm text-pa-text outline-none focus:border-pa-blue"
          required
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-pa-text">Cargo</label>
        <input
          type="text"
          placeholder="Ej: Gerente de Operaciones"
          value={jobTitle}
          onChange={(e) => setJobTitle(e.target.value)}
          className="w-full rounded-lg border border-pa-border px-3 py-2 text-sm text-pa-text outline-none focus:border-pa-blue"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-pa-text">Teléfono</label>
        <input
          type="tel"
          placeholder="+56 9 1234 5678"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full rounded-lg border border-pa-border px-3 py-2 text-sm text-pa-text outline-none focus:border-pa-blue"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-pa-text">Modo</label>
        <select
          value={userMode}
          onChange={(e) => setUserMode(e.target.value)}
          className="w-full rounded-lg border border-pa-border px-3 py-2 text-sm text-pa-text outline-none focus:border-pa-blue"
        >
          {MODE_OPTIONS.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-pa-text">Rol</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="w-full rounded-lg border border-pa-border px-3 py-2 text-sm text-pa-text outline-none focus:border-pa-blue"
        >
          {ROLE_OPTIONS.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>
      {mutation.error && (
        <p className="text-sm text-red-600">
          {(mutation.error as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Error al crear usuario'}
        </p>
      )}
      <div className="flex items-center gap-2 pt-2">
        <button
          type="submit"
          disabled={mutation.isPending}
          className="rounded-lg bg-pa-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-pa-blue-light disabled:opacity-50"
        >
          {mutation.isPending ? 'Creando...' : 'Agregar usuario'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-4 py-2 text-sm text-pa-text-muted transition-colors hover:bg-gray-100"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

export function AdminUsersPage() {
  const { data: users, isLoading } = useUsers();
  const resendMutation = useResendInvitation();
  const deleteMutation = useDeleteUsers();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [resendingIds, setResendingIds] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const HIDDEN_EMAILS = ['darwin@hoktus.com', 'carriagadafalcone@gmail.com'];
  const visibleUsers = users?.filter((u) => !HIDDEN_EMAILS.includes(u.email));

  function toggleAll() {
    if (!visibleUsers) return;
    if (selected.size === visibleUsers.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(visibleUsers.map((u) => u.id)));
    }
  }

  async function handleResend() {
    const ids = [...selected];
    if (ids.length === 0) return;
    setResendingIds(new Set(ids));
    for (const id of ids) {
      try {
        await resendMutation.mutateAsync(id);
      } catch {
        // continue with next
      }
    }
    setResendingIds(new Set());
    setSelected(new Set());
  }

  const isResending = resendingIds.size > 0;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <SectionBanner title="Administración Usuarios">
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <>
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                disabled={deleteMutation.isPending}
                className="rounded-lg border border-red-400 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-600 hover:text-white disabled:opacity-50"
              >
                {deleteMutation.isPending
                  ? 'Eliminando...'
                  : `Eliminar (${selected.size})`}
              </button>
              <button
                type="button"
                onClick={handleResend}
                disabled={isResending}
                className="rounded-lg border border-pa-blue px-3 py-1.5 text-sm font-medium text-pa-blue transition-colors hover:bg-pa-blue hover:text-white disabled:opacity-50"
              >
                {isResending
                  ? `Enviando (${resendingIds.size})...`
                  : `Reenviar invitación (${selected.size})`}
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="rounded-lg bg-pa-blue px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-pa-blue-light"
          >
            + Agregar usuario
          </button>
        </div>
      </SectionBanner>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Agregar usuario" size="sm">
        <AddUserForm onClose={() => setDrawerOpen(false)} />
      </Drawer>

      <div className="mt-3 flex-1 overflow-auto rounded-xl border border-pa-border bg-white">
        {isLoading ? (
          <div className="animate-pulse space-y-3 p-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 rounded-lg bg-raised" />
            ))}
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-pa-border bg-surface text-[12px] font-semibold uppercase tracking-wide text-pa-text-muted">
                <th className="px-3 py-2 w-8">
                  <input
                    type="checkbox"
                    checked={!!visibleUsers?.length && selected.size === visibleUsers.length}
                    onChange={toggleAll}
                    className="h-3.5 w-3.5 rounded border-pa-border accent-pa-blue"
                  />
                </th>
                <th className="px-3 py-2">Usuario</th>
                <th className="px-3 py-2">Rol</th>
                <th className="px-3 py-2">Proveedor</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Creado</th>
              </tr>
            </thead>
            <tbody>
              {visibleUsers?.map((u) => (
                <UserRow
                  key={u.id}
                  user={u}
                  selected={selected.has(u.id)}
                  onToggle={() => toggleSelect(u.id)}
                />
              ))}
              {visibleUsers?.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-sm text-pa-text-muted">
                    No hay usuarios registrados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Eliminar usuarios"
        message={`Se eliminarán ${selected.size} usuario(s) y sus datos asociados. Esta acción no se puede deshacer.`}
        onConfirm={() => {
          deleteMutation.mutate([...selected], {
            onSuccess: () => {
              setSelected(new Set());
              setConfirmDelete(false);
            },
          });
        }}
        onCancel={() => setConfirmDelete(false)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}

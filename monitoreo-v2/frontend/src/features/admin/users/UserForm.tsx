import { useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { useBuildingsQuery } from '../../../hooks/queries/useBuildingsQuery';
import type { UserListItem, CreateUserPayload, UpdateUserPayload } from '../../../types/user';

interface UserFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateUserPayload | UpdateUserPayload) => void;
  isPending: boolean;
  user?: UserListItem | null;
  roles: { id: string; name: string; slug: string }[];
}

export function UserForm({ open, onClose, onSubmit, isPending, user, roles }: UserFormProps) {
  const isEdit = !!user;
  const [email, setEmail] = useState(user?.email ?? '');
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [authProvider, setAuthProvider] = useState<'microsoft' | 'google'>(user?.authProvider ?? 'google');
  const [authProviderId, setAuthProviderId] = useState('');
  const [roleId, setRoleId] = useState(user?.roleId ?? (roles[0]?.id ?? ''));
  const [selectedBuildingIds, setSelectedBuildingIds] = useState<string[]>([]);

  const buildingsQuery = useBuildingsQuery();
  const buildings = buildingsQuery.data ?? [];

  const toggleBuilding = (id: string) => {
    setSelectedBuildingIds((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id],
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEdit) {
      const payload: UpdateUserPayload = {};
      if (displayName !== (user.displayName ?? '')) payload.displayName = displayName || undefined;
      if (roleId !== user.roleId) payload.roleId = roleId;
      onSubmit(payload);
    } else {
      onSubmit({
        email,
        displayName: displayName || undefined,
        authProvider,
        authProviderId,
        roleId,
        buildingIds: selectedBuildingIds.length > 0 ? selectedBuildingIds : undefined,
      });
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar Usuario' : 'Nuevo Usuario'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {!isEdit && (
          <Field label="Email" required>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); }}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </Field>
        )}

        <Field label="Nombre">
          <input
            value={displayName}
            onChange={(e) => { setDisplayName(e.target.value); }}
            maxLength={255}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </Field>

        {!isEdit && (
          <>
            <Field label="Proveedor Auth" required>
              <select
                value={authProvider}
                onChange={(e) => { setAuthProvider(e.target.value as 'microsoft' | 'google'); }}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="google">Google</option>
                <option value="microsoft">Microsoft</option>
              </select>
            </Field>

            <Field label="ID Proveedor" required>
              <input
                value={authProviderId}
                onChange={(e) => { setAuthProviderId(e.target.value); }}
                required
                placeholder="ID externo del proveedor OAuth"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </Field>
          </>
        )}

        <Field label="Rol" required>
          <select
            value={roleId}
            onChange={(e) => { setRoleId(e.target.value); }}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            {roles.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </Field>

        {!isEdit && buildings.length > 0 && (
          <Field label="Edificios (opcional)">
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-gray-200 p-2">
              {buildings.map((b) => (
                <label key={b.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedBuildingIds.includes(b.id)}
                    onChange={() => { toggleBuilding(b.id); }}
                  />
                  {b.name}
                </label>
              ))}
            </div>
          </Field>
        )}

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
            disabled={isPending || (!isEdit && (!email || !authProviderId))}
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

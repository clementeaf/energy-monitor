import { type ColumnDef } from '@tanstack/react-table';
import { useEffect, useMemo, useState, type ComponentProps } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { DataTable } from '../../components/ui/DataTable';
import { BuildingsPageSkeleton } from '../../components/ui/Skeleton';
import { Card } from '../../components/ui/Card';
import { useBuildings } from '../../hooks/queries/useBuildings';
import { useAdminUsers, useCreateUserInvitation, useRoleOptions } from '../../hooks/queries/useAdminUsers';
import { appRoutes, buildPath } from '../../app/appRoutes';
import type { AdminUserAccount, CreateUserInvitationResult, RoleOption } from '../../types';

const invitationStatusLabel: Record<AdminUserAccount['invitationStatus'], string> = {
  invited: 'Invitado pendiente',
  active: 'Activo',
  disabled: 'Deshabilitado',
  expired: 'Invitación expirada',
};

type FormSubmitEvent = Parameters<NonNullable<ComponentProps<'form'>['onSubmit']>>[0];

function providerLabel(provider: AdminUserAccount['provider']) {
  if (!provider) return 'Pendiente';
  return provider === 'google' ? 'Google' : 'Microsoft';
}

function buildColumns(siteNames: Map<string, string>): ColumnDef<AdminUserAccount, unknown>[] {
  return [
    { accessorKey: 'email', header: 'Email' },
    { accessorKey: 'name', header: 'Nombre' },
    {
      accessorKey: 'roleLabel',
      header: 'Rol',
    },
    {
      accessorKey: 'invitationStatus',
      header: 'Estado',
      cell: ({ row }) => invitationStatusLabel[row.original.invitationStatus],
    },
    {
      accessorKey: 'provider',
      header: 'Proveedor',
      cell: ({ row }) => providerLabel(row.original.provider),
    },
    {
      accessorKey: 'siteIds',
      header: 'Sitios',
      cell: ({ row }) => {
        if (row.original.siteIds.length === 0) {
          return <span className="text-muted">Global</span>;
        }

        return row.original.siteIds.map((siteId) => siteNames.get(siteId) ?? siteId).join(', ');
      },
    },
  ];
}

export function AdminUsersPage() {
  const { data: users, isLoading: usersLoading } = useAdminUsers();
  const { data: roles, isLoading: rolesLoading } = useRoleOptions();
  const { data: buildings, isLoading: buildingsLoading } = useBuildings();
  const createInvitation = useCreateUserInvitation();

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [roleId, setRoleId] = useState<number | null>(null);
  const [siteIds, setSiteIds] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [generatedInviteLink, setGeneratedInviteLink] = useState<string | null>(null);
  const [generatedInviteExpiry, setGeneratedInviteExpiry] = useState<string | null>(null);

  useEffect(() => {
    if (!roleId && roles && roles.length > 0) {
      setRoleId(roles[0].id);
    }
  }, [roleId, roles]);

  const selectedRole = useMemo(
    () => roles?.find((role) => role.id === roleId) ?? null,
    [roleId, roles],
  );

  const siteNames = useMemo(() => {
    const names = new Map<string, string>();
    for (const building of buildings ?? []) {
      names.set(building.id, building.name);
    }
    return names;
  }, [buildings]);

  const columns = useMemo(() => buildColumns(siteNames), [siteNames]);

  if (usersLoading || rolesLoading || buildingsLoading) {
    return <BuildingsPageSkeleton />;
  }

  function toggleSite(siteId: string) {
    setSiteIds((current) =>
      current.includes(siteId)
        ? current.filter((value) => value !== siteId)
        : [...current, siteId],
    );
  }

  async function handleSubmit(event: FormSubmitEvent) {
    event.preventDefault();
    setFormError(null);
    setSuccessMessage(null);
    setGeneratedInviteLink(null);
    setGeneratedInviteExpiry(null);

    if (!roleId) {
      setFormError('Selecciona un rol para continuar.');
      return;
    }

    if (selectedRole?.requiresSiteScope && siteIds.length === 0) {
      setFormError('Ese rol requiere al menos un sitio asignado.');
      return;
    }

    try {
      const createdInvitation: CreateUserInvitationResult = await createInvitation.mutateAsync({
        email,
        name,
        roleId,
        siteIds,
        isActive,
      });

      setEmail('');
      setName('');
      setSiteIds([]);
      setIsActive(true);
      setGeneratedInviteLink(
        `${globalThis.location.origin}${buildPath(appRoutes.invitationAccept.path, { token: createdInvitation.invitationToken })}`,
      );
      setGeneratedInviteExpiry(createdInvitation.invitationExpiresAt);
      setSuccessMessage('Invitación registrada. Comparte el link generado para activar el primer acceso SSO.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo crear la invitación';
      setFormError(message);
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader title="Administración de Usuarios" />

      <Card className="mb-4">
        <p className="text-sm text-muted">
          Provisiona accesos por invitación con rol y sitios preasignados. El backend sólo activará vistas y acciones para usuarios que ya tengan este registro.
        </p>
      </Card>

      <Card className="mb-4">
        <form className="grid gap-4 lg:grid-cols-2" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-2 text-sm text-muted">
            <span>Nombre</span>
            <input
              className="border border-border bg-base px-3 py-2 text-text outline-none focus:border-accent"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ej. Operador Turno A"
              required
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-muted">
            <span>Email</span>
            <input
              className="border border-border bg-base px-3 py-2 text-text outline-none focus:border-accent"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="usuario@empresa.com"
              required
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-muted">
            <span>Rol</span>
            <select
              className="border border-border bg-base px-3 py-2 text-text outline-none focus:border-accent"
              value={roleId ?? ''}
              onChange={(event) => setRoleId(Number(event.target.value))}
              required
            >
              {(roles ?? []).map((role: RoleOption) => (
                <option key={role.id} value={role.id}>{role.labelEs}</option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-3 pt-7 text-sm text-muted">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
            />
            <span>Dejar invitación habilitada para primer login</span>
          </label>

          <div className="lg:col-span-2">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-text">Sitios asignados</p>
              <p className="text-xs text-subtle">
                {selectedRole?.requiresSiteScope
                  ? 'Este rol requiere al menos un sitio.'
                  : 'Opcional. Si no asignas sitios, el acceso queda global para este rol.'}
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {(buildings ?? []).map((building) => (
                <label key={building.id} className="flex items-center gap-2 border border-border bg-base px-3 py-2 text-sm text-muted">
                  <input
                    type="checkbox"
                    checked={siteIds.includes(building.id)}
                    onChange={() => toggleSite(building.id)}
                  />
                  <span className="text-text">{building.name}</span>
                </label>
              ))}
            </div>
          </div>

          {(formError || successMessage) && (
            <div className="lg:col-span-2">
              {formError && <p className="text-sm text-red-400">{formError}</p>}
              {successMessage && <p className="text-sm text-emerald-400">{successMessage}</p>}
              {generatedInviteLink && (
                <div className="mt-3 space-y-2 border border-border bg-base p-3 text-sm text-muted">
                  <p className="text-text">Link de invitación</p>
                  <input
                    readOnly
                    value={generatedInviteLink}
                    className="w-full border border-border bg-surface px-3 py-2 text-xs text-text outline-none"
                  />
                  {generatedInviteExpiry && (
                    <p className="text-xs text-subtle">
                      Expira: {new Date(generatedInviteExpiry).toLocaleString('es-CL')}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="lg:col-span-2 flex justify-end">
            <button
              type="submit"
              className="border border-border bg-raised px-4 py-2 text-sm font-medium text-text transition-colors hover:border-accent disabled:cursor-not-allowed disabled:opacity-60"
              disabled={createInvitation.isPending}
            >
              {createInvitation.isPending ? 'Guardando...' : 'Crear invitación'}
            </button>
          </div>
        </form>
      </Card>

      <div className="min-h-0 flex-1 overflow-hidden">
        <DataTable
          data={users ?? []}
          columns={columns}
          className="h-full"
        />
      </div>
    </div>
  );
}
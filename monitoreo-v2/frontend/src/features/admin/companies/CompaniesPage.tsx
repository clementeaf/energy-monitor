import { useState, useMemo } from 'react';
import { useTenantsAdminQuery, useCreateTenant, useUpdateTenant } from '../../../hooks/queries/useTenantsQuery';
import { TableStateBody } from '../../../components/ui/TableStateBody';
import { useQueryState } from '../../../hooks/useQueryState';
import { useInfiniteScroll } from '../../../hooks/useInfiniteScroll';
import { Drawer } from '../../../components/ui/Drawer';
import { DropdownSelect } from '../../../components/ui/DropdownSelect';
import type { Tenant, CreateTenantPayload, UpdateTenantPayload } from '../../../types/tenant';
import { PageHeader } from '../../../components/ui/PageHeader';

const EMPTY_FORM: CreateTenantPayload = {
  name: '',
  adminEmail: '',
  adminAuthProvider: 'microsoft',
};

const EMPTY_EDIT: UpdateTenantPayload = {};

export function CompaniesPage() {
  const tenantsQuery = useTenantsAdminQuery();
  const createMutation = useCreateTenant();
  const updateMutation = useUpdateTenant();
  const qs = useQueryState(tenantsQuery, { isEmpty: (d) => !d || d.length === 0 });

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<CreateTenantPayload>({ ...EMPTY_FORM });
  const [result, setResult] = useState<{ adminUserId: string; rolesCreated: number } | null>(null);

  const [editing, setEditing] = useState<Tenant | null>(null);
  const [editForm, setEditForm] = useState<UpdateTenantPayload>({ ...EMPTY_EDIT });

  const tenants = tenantsQuery.data ?? [];
  const { visible: visibleTenants, hasMore, sentinelRef, total } = useInfiniteScroll(tenants);

  // Address collision detection for create drawer
  const createAddressCollision = useMemo(() => {
    const addr = form.address?.trim().toLowerCase();
    if (!addr) return false;
    return tenants.some((t) => t.address?.trim().toLowerCase() === addr);
  }, [form.address, tenants]);

  // Address collision detection for edit drawer
  const editAddressCollision = useMemo(() => {
    const addr = editForm.address?.trim().toLowerCase();
    if (!addr || !editing) return false;
    return tenants.some((t) => t.id !== editing.id && t.address?.trim().toLowerCase() === addr);
  }, [editForm.address, editing, tenants]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.adminEmail.trim()) return;
    if (createAddressCollision && !form.addressDetail?.trim()) return;
    const res = await createMutation.mutateAsync(form);
    setResult({ adminUserId: res.adminUserId, rolesCreated: res.rolesCreated });
  };

  const handleCreateClose = () => {
    setCreateOpen(false);
    setForm({ ...EMPTY_FORM });
    setResult(null);
  };

  const updateCreate = (key: keyof CreateTenantPayload, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleEditOpen = (tenant: Tenant) => {
    setEditing(tenant);
    setEditForm({
      name: tenant.name,
      primaryColor: tenant.primaryColor,
      secondaryColor: tenant.secondaryColor,
      sidebarColor: tenant.sidebarColor,
      accentColor: tenant.accentColor,
      appTitle: tenant.appTitle,
      logoUrl: tenant.logoUrl,
      faviconUrl: tenant.faviconUrl,
      timezone: tenant.timezone,
      address: tenant.address,
      addressDetail: tenant.addressDetail,
      phone: tenant.phone,
      taxId: tenant.taxId,
      isActive: tenant.isActive,
    });
  };

  const handleEditClose = () => {
    setEditing(null);
    setEditForm({ ...EMPTY_EDIT });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    if (editAddressCollision && !editForm.addressDetail?.trim()) return;
    await updateMutation.mutateAsync({ id: editing.id, payload: editForm });
    handleEditClose();
  };

  const updateEdit = (key: keyof UpdateTenantPayload, value: string | boolean | null) => {
    setEditForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <PageHeader
        title="Empresas"
        eyebrow="Administración"
        actions={
          <button
            type="button"
            onClick={() => { setResult(null); setForm({ ...EMPTY_FORM }); setCreateOpen(true); }}
            className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-fg transition-colors hover:bg-brand-hover"
          >
            Nueva empresa
          </button>
        }
      />

      <div className="max-h-[70vh] overflow-auto panel">
        <table className="min-w-full divide-y divide-border">
          <thead className="sticky top-0 z-10 bg-surface">
            <tr>
              <Th>Nombre</Th>
              <Th>Slug</Th>
              <Th>Dirección</Th>
              <Th>Teléfono</Th>
              <Th>RUT</Th>
              <Th>Estado</Th>
              <Th>Creada</Th>
              <Th>Acciones</Th>
            </tr>
          </thead>
          <TableStateBody
            phase={qs.phase}
            colSpan={8}
            error={qs.error}
            onRetry={() => { tenantsQuery.refetch(); }}
            emptyMessage="No hay empresas registradas. Crea la primera."
            skeletonWidths={['w-24', 'w-20', 'w-28', 'w-20', 'w-20', 'w-16', 'w-20', 'w-16']}
          >
            {visibleTenants.map((t) => (
              <tr
                key={t.id}
                className="cursor-pointer hover:bg-surface"
                onClick={() => handleEditOpen(t)}
              >
                <Td className="font-medium">{t.name}</Td>
                <Td className="font-mono text-[12px]">{t.slug}</Td>
                <Td>{t.address || '—'}</Td>
                <Td>{t.phone || '—'}</Td>
                <Td className="font-mono text-[12px]">{t.taxId || '—'}</Td>
                <Td>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    t.isActive ? 'bg-green-100 text-green-700' : 'bg-raised text-muted'
                  }`}>
                    {t.isActive ? 'Activa' : 'Inactiva'}
                  </span>
                </Td>
                <Td>{new Date(t.createdAt).toLocaleDateString('es-CL')}</Td>
                <Td>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleEditOpen(t); }}
                    className="text-[13px] font-medium text-brand hover:underline"
                  >
                    Editar
                  </button>
                </Td>
              </tr>
            ))}
          </TableStateBody>
        </table>
        {hasMore && <div ref={sentinelRef} className="h-4" />}
      </div>
      {total > 0 && <p className="px-4 py-2 text-xs text-muted">Mostrando {visibleTenants.length} de {total}</p>}

      {/* Create drawer */}
      <Drawer open={createOpen} onClose={handleCreateClose} title="Nueva empresa" side="right" size="lg">
        {result ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <h3 className="text-sm font-semibold text-green-800">Empresa creada exitosamente</h3>
              <ul className="mt-2 space-y-1 text-[13px] text-green-700">
                <li>{result.rolesCreated} roles creados</li>
                <li>Admin ID: <span className="font-mono text-[12px]">{result.adminUserId}</span></li>
              </ul>
            </div>
            <button
              type="button"
              onClick={handleCreateClose}
              className="w-full rounded-lg bg-brand px-4 py-2 text-[13px] font-medium text-brand-fg hover:bg-brand-hover"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <form onSubmit={handleCreateSubmit} className="flex flex-col gap-4">
            <SectionHeader>Datos empresa</SectionHeader>

            <Field label="Nombre de la empresa *">
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateCreate('name', e.target.value)}
                placeholder="Globe Power S.A."
                required
                className="input-field"
              />
            </Field>

            <Field label="Slug (opcional)">
              <input
                type="text"
                value={form.slug ?? ''}
                onChange={(e) => updateCreate('slug', e.target.value)}
                placeholder="globe-power (auto-generado si vacío)"
                className="input-field"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="RUT">
                <input
                  type="text"
                  value={form.taxId ?? ''}
                  onChange={(e) => updateCreate('taxId', e.target.value)}
                  placeholder="76.123.456-7"
                  className="input-field"
                />
              </Field>
              <Field label="Teléfono">
                <input
                  type="text"
                  value={form.phone ?? ''}
                  onChange={(e) => updateCreate('phone', e.target.value)}
                  placeholder="+56 9 1234 5678"
                  className="input-field"
                />
              </Field>
            </div>

            <Field label="Dirección">
              <input
                type="text"
                value={form.address ?? ''}
                onChange={(e) => updateCreate('address', e.target.value)}
                placeholder="Av. Providencia 1234, Santiago"
                className="input-field"
              />
            </Field>
            {createAddressCollision && (
              <p className="text-[12px] text-amber-600">
                Otra empresa usa esta dirección. Especifique piso u oficina.
              </p>
            )}

            <Field label={`Detalle dirección (piso/oficina)${createAddressCollision ? ' *' : ''}`}>
              <input
                type="text"
                value={form.addressDetail ?? ''}
                onChange={(e) => updateCreate('addressDetail', e.target.value)}
                placeholder="Piso 5, Oficina 501"
                required={createAddressCollision}
                className="input-field"
              />
            </Field>

            <Field label="Título de la app (opcional)">
              <input
                type="text"
                value={form.appTitle ?? ''}
                onChange={(e) => updateCreate('appTitle', e.target.value)}
                placeholder="Globe Power"
                className="input-field"
              />
            </Field>

            <SectionHeader>Primer administrador</SectionHeader>

            <Field label="Email del admin *">
              <input
                type="email"
                value={form.adminEmail}
                onChange={(e) => updateCreate('adminEmail', e.target.value)}
                placeholder="admin@empresa.cl"
                required
                className="input-field"
              />
            </Field>

            <Field label="Nombre del admin (opcional)">
              <input
                type="text"
                value={form.adminDisplayName ?? ''}
                onChange={(e) => updateCreate('adminDisplayName', e.target.value)}
                placeholder="Juan Pérez"
                className="input-field"
              />
            </Field>

            <Field label="Proveedor de autenticación *">
              <DropdownSelect
                options={[
                  { value: 'microsoft', label: 'Microsoft' },
                  { value: 'google', label: 'Google' },
                ]}
                value={form.adminAuthProvider}
                onChange={(val) => updateCreate('adminAuthProvider', val)}
                className="w-full"
              />
            </Field>

            <SectionHeader>Tema (opcional)</SectionHeader>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Color primario">
                <input
                  type="color"
                  value={form.primaryColor ?? '#3a5b1e'}
                  onChange={(e) => updateCreate('primaryColor', e.target.value)}
                  className="h-9 w-full cursor-pointer rounded-lg border border-border"
                />
              </Field>
              <Field label="Color secundario">
                <input
                  type="color"
                  value={form.secondaryColor ?? '#f5f5f5'}
                  onChange={(e) => updateCreate('secondaryColor', e.target.value)}
                  className="h-9 w-full cursor-pointer rounded-lg border border-border"
                />
              </Field>
              <Field label="Color sidebar">
                <input
                  type="color"
                  value={form.sidebarColor ?? '#1e293b'}
                  onChange={(e) => updateCreate('sidebarColor', e.target.value)}
                  className="h-9 w-full cursor-pointer rounded-lg border border-border"
                />
              </Field>
              <Field label="Color acento">
                <input
                  type="color"
                  value={form.accentColor ?? '#ab2f2a'}
                  onChange={(e) => updateCreate('accentColor', e.target.value)}
                  className="h-9 w-full cursor-pointer rounded-lg border border-border"
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Logo URL">
                <input
                  type="text"
                  value={form.logoUrl ?? ''}
                  onChange={(e) => updateCreate('logoUrl', e.target.value)}
                  placeholder="https://..."
                  className="input-field"
                />
              </Field>
              <Field label="Favicon URL">
                <input
                  type="text"
                  value={form.faviconUrl ?? ''}
                  onChange={(e) => updateCreate('faviconUrl', e.target.value)}
                  placeholder="https://..."
                  className="input-field"
                />
              </Field>
            </div>

            <SectionHeader>Config</SectionHeader>

            <Field label="Timezone">
              <DropdownSelect
                options={[
                  { value: 'America/Santiago', label: 'America/Santiago' },
                  { value: 'America/Bogota', label: 'America/Bogota' },
                  { value: 'America/Lima', label: 'America/Lima' },
                  { value: 'UTC', label: 'UTC' },
                ]}
                value={form.timezone ?? 'America/Santiago'}
                onChange={(val) => updateCreate('timezone', val)}
                className="w-full"
              />
            </Field>

            <button
              type="submit"
              disabled={createMutation.isPending || !form.name.trim() || !form.adminEmail.trim() || (createAddressCollision && !form.addressDetail?.trim())}
              className="mt-2 w-full rounded-lg bg-brand px-4 py-2.5 text-[13px] font-medium text-brand-fg transition-colors hover:bg-brand-hover disabled:opacity-50"
            >
              {createMutation.isPending ? 'Creando...' : 'Crear empresa'}
            </button>

            {createMutation.isError && (
              <p className="text-[13px] text-red-600">
                {(createMutation.error as Error).message ?? 'Error al crear la empresa'}
              </p>
            )}
          </form>
        )}
      </Drawer>

      {/* Edit drawer */}
      <Drawer open={editing !== null} onClose={handleEditClose} title="Editar empresa" side="right" size="lg">
        {editing && (
          <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
            <div className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3">
              <span className="text-[13px] font-medium text-foreground">Estado</span>
              <button
                type="button"
                onClick={() => updateEdit('isActive', !editForm.isActive)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ${
                  editForm.isActive ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <span className={`inline-block size-4 transform rounded-full bg-background shadow transition-transform duration-200 ${
                  editForm.isActive ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
              <span className={`text-[12px] font-medium ${editForm.isActive ? 'text-green-700' : 'text-muted'}`}>
                {editForm.isActive ? 'Activa' : 'Inactiva'}
              </span>
            </div>

            <SectionHeader>Datos empresa</SectionHeader>

            <Field label="Nombre de la empresa *">
              <input
                type="text"
                value={editForm.name ?? ''}
                onChange={(e) => updateEdit('name', e.target.value)}
                placeholder="Globe Power S.A."
                required
                className="input-field"
              />
            </Field>

            <Field label="Slug">
              <input
                type="text"
                value={editing.slug}
                disabled
                className="input-field cursor-not-allowed opacity-60"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="RUT">
                <input
                  type="text"
                  value={editForm.taxId ?? ''}
                  onChange={(e) => updateEdit('taxId', e.target.value)}
                  placeholder="76.123.456-7"
                  className="input-field"
                />
              </Field>
              <Field label="Teléfono">
                <input
                  type="text"
                  value={editForm.phone ?? ''}
                  onChange={(e) => updateEdit('phone', e.target.value)}
                  placeholder="+56 9 1234 5678"
                  className="input-field"
                />
              </Field>
            </div>

            <Field label="Dirección">
              <input
                type="text"
                value={editForm.address ?? ''}
                onChange={(e) => updateEdit('address', e.target.value)}
                placeholder="Av. Providencia 1234, Santiago"
                className="input-field"
              />
            </Field>
            {editAddressCollision && (
              <p className="text-[12px] text-amber-600">
                Otra empresa usa esta dirección. Especifique piso u oficina.
              </p>
            )}

            <Field label={`Detalle dirección (piso/oficina)${editAddressCollision ? ' *' : ''}`}>
              <input
                type="text"
                value={editForm.addressDetail ?? ''}
                onChange={(e) => updateEdit('addressDetail', e.target.value)}
                placeholder="Piso 5, Oficina 501"
                required={editAddressCollision}
                className="input-field"
              />
            </Field>

            <Field label="Título de la app">
              <input
                type="text"
                value={editForm.appTitle ?? ''}
                onChange={(e) => updateEdit('appTitle', e.target.value)}
                placeholder="Globe Power"
                className="input-field"
              />
            </Field>

            <SectionHeader>Tema</SectionHeader>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Color primario">
                <input
                  type="color"
                  value={editForm.primaryColor ?? '#3a5b1e'}
                  onChange={(e) => updateEdit('primaryColor', e.target.value)}
                  className="h-9 w-full cursor-pointer rounded-lg border border-border"
                />
              </Field>
              <Field label="Color secundario">
                <input
                  type="color"
                  value={editForm.secondaryColor ?? '#f5f5f5'}
                  onChange={(e) => updateEdit('secondaryColor', e.target.value)}
                  className="h-9 w-full cursor-pointer rounded-lg border border-border"
                />
              </Field>
              <Field label="Color sidebar">
                <input
                  type="color"
                  value={editForm.sidebarColor ?? '#1e293b'}
                  onChange={(e) => updateEdit('sidebarColor', e.target.value)}
                  className="h-9 w-full cursor-pointer rounded-lg border border-border"
                />
              </Field>
              <Field label="Color acento">
                <input
                  type="color"
                  value={editForm.accentColor ?? '#ab2f2a'}
                  onChange={(e) => updateEdit('accentColor', e.target.value)}
                  className="h-9 w-full cursor-pointer rounded-lg border border-border"
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Logo URL">
                <input
                  type="text"
                  value={editForm.logoUrl ?? ''}
                  onChange={(e) => updateEdit('logoUrl', e.target.value || null)}
                  placeholder="https://..."
                  className="input-field"
                />
              </Field>
              <Field label="Favicon URL">
                <input
                  type="text"
                  value={editForm.faviconUrl ?? ''}
                  onChange={(e) => updateEdit('faviconUrl', e.target.value || null)}
                  placeholder="https://..."
                  className="input-field"
                />
              </Field>
            </div>

            <SectionHeader>Config</SectionHeader>

            <Field label="Timezone">
              <DropdownSelect
                options={[
                  { value: 'America/Santiago', label: 'America/Santiago' },
                  { value: 'America/Bogota', label: 'America/Bogota' },
                  { value: 'America/Lima', label: 'America/Lima' },
                  { value: 'UTC', label: 'UTC' },
                ]}
                value={editForm.timezone ?? 'America/Santiago'}
                onChange={(val) => updateEdit('timezone', val)}
                className="w-full"
              />
            </Field>

            <button
              type="submit"
              disabled={updateMutation.isPending || !editForm.name?.trim() || (editAddressCollision && !editForm.addressDetail?.trim())}
              className="mt-2 w-full rounded-lg bg-brand px-4 py-2.5 text-[13px] font-medium text-brand-fg transition-colors hover:bg-brand-hover disabled:opacity-50"
            >
              {updateMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
            </button>

            {updateMutation.isError && (
              <p className="text-[13px] text-red-600">
                {(updateMutation.error as Error).message ?? 'Error al actualizar la empresa'}
              </p>
            )}
          </form>
        )}
      </Drawer>
    </div>
  );
}

function SectionHeader({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="border-t border-border pt-4">
      <p className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-muted">
        {children}
      </p>
    </div>
  );
}

function Field({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <div>
      <div className="mb-1 block text-[12px] font-medium text-muted">{label}</div>
      {children}
    </div>
  );
}

function Th({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted">
      {children}
    </th>
  );
}

function Td({ children, className = '' }: Readonly<{ children: React.ReactNode; className?: string }>) {
  return <td className={`whitespace-nowrap px-4 py-3 text-sm text-foreground ${className}`}>{children}</td>;
}

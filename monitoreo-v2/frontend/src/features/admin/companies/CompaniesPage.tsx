import { useState, useMemo } from 'react';
import { useTenantsAdminQuery, useCreateTenant, useUpdateTenant } from '../../../hooks/queries/useTenantsQuery';
import { TableStateBody } from '../../../components/ui/TableStateBody';
import { useQueryState } from '../../../hooks/useQueryState';
import { useInfiniteScroll } from '../../../hooks/useInfiniteScroll';
import { Drawer } from '../../../components/ui/Drawer';
import type { Tenant, CreateTenantPayload, UpdateTenantPayload } from '../../../types/tenant';
import { PageHeader } from '../../../components/ui/PageHeader';
import { CompanyForm } from './CompanyForm';
import { Th, Td } from './company-helpers';

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

      <div className="overflow-auto panel">
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
          <CompanyForm
            mode="create"
            values={form}
            onFieldChange={(key, value) => updateCreate(key as keyof CreateTenantPayload, value as string)}
            onSubmit={handleCreateSubmit}
            addressCollision={createAddressCollision}
            isPending={createMutation.isPending}
            isError={createMutation.isError}
            errorMessage={(createMutation.error as Error)?.message}
          />
        )}
      </Drawer>

      {/* Edit drawer */}
      <Drawer open={editing !== null} onClose={handleEditClose} title="Editar empresa" side="right" size="lg">
        {editing && (
          <CompanyForm
            mode="edit"
            values={editForm}
            onFieldChange={(key, value) => updateEdit(key as keyof UpdateTenantPayload, value)}
            onSubmit={handleEditSubmit}
            addressCollision={editAddressCollision}
            isPending={updateMutation.isPending}
            isError={updateMutation.isError}
            errorMessage={(updateMutation.error as Error)?.message}
            editingSlug={editing.slug}
          />
        )}
      </Drawer>
    </div>
  );
}

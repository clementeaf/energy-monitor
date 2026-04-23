import { useState } from 'react';
import { useTenantsAdminQuery, useCreateTenant } from '../../../hooks/queries/useTenantsQuery';
import { TableStateBody } from '../../../components/ui/TableStateBody';
import { useQueryState } from '../../../hooks/useQueryState';
import { Drawer } from '../../../components/ui/Drawer';
import type { CreateTenantPayload } from '../../../types/tenant';

const EMPTY_FORM: CreateTenantPayload = {
  name: '',
  adminEmail: '',
  adminAuthProvider: 'microsoft',
};

export function CompaniesPage() {
  const tenantsQuery = useTenantsAdminQuery();
  const createMutation = useCreateTenant();
  const qs = useQueryState(tenantsQuery, { isEmpty: (d) => !d || d.length === 0 });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<CreateTenantPayload>({ ...EMPTY_FORM });
  const [result, setResult] = useState<{ adminUserId: string; rolesCreated: number } | null>(null);

  const tenants = tenantsQuery.data ?? [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.adminEmail.trim()) return;
    const res = await createMutation.mutateAsync(form);
    setResult({ adminUserId: res.adminUserId, rolesCreated: res.rolesCreated });
  };

  const handleClose = () => {
    setDrawerOpen(false);
    setForm({ ...EMPTY_FORM });
    setResult(null);
  };

  const update = (key: keyof CreateTenantPayload, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-pa-text">Empresas</h1>
        <button
          type="button"
          onClick={() => { setResult(null); setForm({ ...EMPTY_FORM }); setDrawerOpen(true); }}
          className="rounded-lg bg-pa-blue px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-pa-blue-light"
        >
          Nueva empresa
        </button>
      </div>

      <div className="max-h-[70vh] overflow-y-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="sticky top-0 z-10 bg-gray-50">
            <tr>
              <Th>Nombre</Th>
              <Th>Slug</Th>
              <Th>Título App</Th>
              <Th>Estado</Th>
              <Th>Creada</Th>
            </tr>
          </thead>
          <TableStateBody
            phase={qs.phase}
            colSpan={5}
            error={qs.error}
            onRetry={() => { tenantsQuery.refetch(); }}
            emptyMessage="No hay empresas registradas. Crea la primera."
            skeletonWidths={['w-24', 'w-20', 'w-24', 'w-16', 'w-20']}
          >
            {tenants.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50">
                <Td className="font-medium">{t.name}</Td>
                <Td className="font-mono text-[12px]">{t.slug}</Td>
                <Td>{t.appTitle || '—'}</Td>
                <Td>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    t.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {t.isActive ? 'Activa' : 'Inactiva'}
                  </span>
                </Td>
                <Td>{new Date(t.createdAt).toLocaleDateString('es-CL')}</Td>
              </tr>
            ))}
          </TableStateBody>
        </table>
      </div>

      {/* Create drawer */}
      <Drawer open={drawerOpen} onClose={handleClose} title="Nueva empresa" side="right" size="md">
        {result ? (
          <div className="space-y-4 p-6">
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <h3 className="text-sm font-semibold text-green-800">Empresa creada exitosamente</h3>
              <ul className="mt-2 space-y-1 text-[13px] text-green-700">
                <li>{result.rolesCreated} roles creados</li>
                <li>Admin ID: <span className="font-mono text-[12px]">{result.adminUserId}</span></li>
              </ul>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="w-full rounded-lg bg-pa-blue px-4 py-2 text-[13px] font-medium text-white hover:bg-pa-blue-light"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
            <Field label="Nombre de la empresa *">
              <input
                type="text"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                placeholder="Globe Power S.A."
                required
                className="input-field"
              />
            </Field>

            <Field label="Slug (opcional)">
              <input
                type="text"
                value={form.slug ?? ''}
                onChange={(e) => update('slug', e.target.value)}
                placeholder="globe-power (auto-generado si vacío)"
                className="input-field"
              />
            </Field>

            <Field label="Título de la app (opcional)">
              <input
                type="text"
                value={form.appTitle ?? ''}
                onChange={(e) => update('appTitle', e.target.value)}
                placeholder="Globe Power"
                className="input-field"
              />
            </Field>

            <div className="border-t border-gray-200 pt-4">
              <p className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-pa-text-muted">
                Primer administrador
              </p>

              <div className="space-y-4">
                <Field label="Email del admin *">
                  <input
                    type="email"
                    value={form.adminEmail}
                    onChange={(e) => update('adminEmail', e.target.value)}
                    placeholder="admin@empresa.cl"
                    required
                    className="input-field"
                  />
                </Field>

                <Field label="Nombre del admin (opcional)">
                  <input
                    type="text"
                    value={form.adminDisplayName ?? ''}
                    onChange={(e) => update('adminDisplayName', e.target.value)}
                    placeholder="Juan Pérez"
                    className="input-field"
                  />
                </Field>

                <Field label="Proveedor de autenticación *">
                  <select
                    value={form.adminAuthProvider}
                    onChange={(e) => update('adminAuthProvider', e.target.value)}
                    className="input-field"
                  >
                    <option value="microsoft">Microsoft</option>
                    <option value="google">Google</option>
                  </select>
                </Field>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <p className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-pa-text-muted">
                Tema (opcional)
              </p>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Color primario">
                  <input
                    type="color"
                    value={form.primaryColor ?? '#3a5b1e'}
                    onChange={(e) => update('primaryColor', e.target.value)}
                    className="h-9 w-full cursor-pointer rounded-lg border border-gray-200"
                  />
                </Field>
                <Field label="Color acento">
                  <input
                    type="color"
                    value={form.accentColor ?? '#ab2f2a'}
                    onChange={(e) => update('accentColor', e.target.value)}
                    className="h-9 w-full cursor-pointer rounded-lg border border-gray-200"
                  />
                </Field>
              </div>
            </div>

            <button
              type="submit"
              disabled={createMutation.isPending || !form.name.trim() || !form.adminEmail.trim()}
              className="mt-2 w-full rounded-lg bg-pa-blue px-4 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-pa-blue-light disabled:opacity-50"
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
    </div>
  );
}

function Field({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <div>
      <label className="mb-1 block text-[12px] font-medium text-pa-text-muted">{label}</label>
      {children}
    </div>
  );
}

function Th({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
      {children}
    </th>
  );
}

function Td({ children, className = '' }: Readonly<{ children: React.ReactNode; className?: string }>) {
  return <td className={`whitespace-nowrap px-4 py-3 text-sm text-gray-700 ${className}`}>{children}</td>;
}

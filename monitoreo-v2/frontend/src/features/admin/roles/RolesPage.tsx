import { useEffect, useMemo, useState } from 'react';
import { DataWidget } from '../../../components/ui/DataWidget';
import { Drawer } from '../../../components/ui/Drawer';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { Button } from '../../../components/ui/Button';
import { Toggle } from '../../../components/ui/Toggle';
import { Th, Td, ActionBtn } from '../../../components/ui/TablePrimitives';
import { useQueryState } from '../../../hooks/useQueryState';
import { usePermissions } from '../../../hooks/usePermissions';
import {
  useRolesQuery,
  useCreateRole,
  useUpdateRole,
  useDeleteRole,
  usePermissionsCatalog,
  useAssignPermissions,
} from '../../../hooks/queries/useRolesQuery';
import type { Role, Permission, CreateRolePayload, UpdateRolePayload } from '../../../types/role';

export function RolesPage() {
  const query = useRolesQuery();
  const qs = useQueryState(query, {
    isEmpty: (data) => data === undefined || data.length === 0,
  });
  const { has } = usePermissions();
  const canWrite = has('admin_roles', 'create');

  const createMutation = useCreateRole();
  const updateMutation = useUpdateRole();
  const deleteMutation = useDeleteRole();
  const assignPermsMutation = useAssignPermissions();
  const catalogQuery = usePermissionsCatalog();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [deleting, setDeleting] = useState<Role | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formSessionMinutes, setFormSessionMinutes] = useState('480');
  const [selectedPermIds, setSelectedPermIds] = useState<Set<string>>(new Set());

  const catalog = catalogQuery.data ?? [];

  // Group permissions by module
  const permissionsByModule = useMemo(() => {
    const groups = new Map<string, Permission[]>();
    for (const perm of catalog) {
      const list = groups.get(perm.module) ?? [];
      list.push(perm);
      groups.set(perm.module, list);
    }
    return groups;
  }, [catalog]);

  const openCreate = () => {
    setEditing(null);
    setFormName('');
    setFormSlug('');
    setFormDescription('');
    setFormSessionMinutes('480');
    setSelectedPermIds(new Set());
    setDrawerOpen(true);
  };

  const openEdit = (role: Role) => {
    setEditing(role);
    setFormName(role.name);
    setFormSlug(role.slug);
    setFormDescription(role.description ?? '');
    setFormSessionMinutes(String(role.maxSessionMinutes));
    setSelectedPermIds(new Set(role.permissions.map((p) => p.id)));
    setDrawerOpen(true);
  };

  const closeDrawer = () => { setDrawerOpen(false); setEditing(null); };

  const autoSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_)|(_$)/g, '');

  useEffect(() => {
    if (!editing && formName) {
      setFormSlug(autoSlug(formName));
    }
  }, [formName, editing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formSlug.trim()) return;

    if (editing) {
      const payload: UpdateRolePayload = {
        name: formName.trim(),
        description: formDescription.trim() || undefined,
        maxSessionMinutes: parseInt(formSessionMinutes, 10) || 480,
      };
      updateMutation.mutate({ id: editing.id, payload }, {
        onSuccess: () => {
          // Save permissions
          assignPermsMutation.mutate(
            { id: editing.id, permissionIds: Array.from(selectedPermIds) },
            { onSuccess: closeDrawer },
          );
        },
      });
    } else {
      const payload: CreateRolePayload = {
        name: formName.trim(),
        slug: formSlug.trim(),
        description: formDescription.trim() || undefined,
        maxSessionMinutes: parseInt(formSessionMinutes, 10) || 480,
      };
      createMutation.mutate(payload, {
        onSuccess: (created) => {
          if (selectedPermIds.size > 0) {
            assignPermsMutation.mutate(
              { id: created.id, permissionIds: Array.from(selectedPermIds) },
              { onSuccess: closeDrawer },
            );
          } else {
            closeDrawer();
          }
        },
      });
    }
  };

  const togglePerm = (id: string) => {
    setSelectedPermIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleModuleAll = (module: string) => {
    const perms = permissionsByModule.get(module) ?? [];
    const allSelected = perms.every((p) => selectedPermIds.has(p.id));
    setSelectedPermIds((prev) => {
      const next = new Set(prev);
      for (const p of perms) {
        if (allSelected) next.delete(p.id);
        else next.add(p.id);
      }
      return next;
    });
  };

  const handleDelete = () => {
    if (!deleting) return;
    deleteMutation.mutate(deleting.id, { onSuccess: () => { setDeleting(null); } });
  };

  const handleToggleActive = (role: Role) => {
    updateMutation.mutate({
      id: role.id,
      payload: { isActive: !role.isActive },
    });
  };

  const isPending = createMutation.isPending || updateMutation.isPending || assignPermsMutation.isPending;
  const formId = 'role-form';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Roles y Permisos</h1>
        {canWrite && (
          <Button onClick={openCreate}>Nuevo Rol</Button>
        )}
      </div>

      <DataWidget
        phase={qs.phase}
        error={qs.error}
        onRetry={() => { query.refetch(); }}
        isFetching={query.isFetching && qs.phase === 'ready'}
        emptyTitle="Sin roles"
        emptyDescription="No hay roles configurados para este tenant."
      >
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <Th>Nombre</Th>
                <Th>Slug</Th>
                <Th>Descripcion</Th>
                <Th>Sesion (min)</Th>
                <Th>Permisos</Th>
                <Th>Activo</Th>
                {canWrite && <Th></Th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {(query.data ?? []).map((role) => (
                <tr key={role.id} className="hover:bg-gray-50">
                  <Td className="font-medium text-gray-900">{role.name}</Td>
                  <Td>
                    <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono">{role.slug}</code>
                  </Td>
                  <Td className="max-w-[200px] truncate" title={role.description ?? undefined}>
                    {role.description ?? '—'}
                  </Td>
                  <Td>{role.maxSessionMinutes}</Td>
                  <Td>
                    <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                      {role.permissions.length} permisos
                    </span>
                  </Td>
                  <Td>
                    <Toggle
                      checked={role.isActive}
                      onChange={() => { handleToggleActive(role); }}
                      size="sm"
                      disabled={!canWrite || role.isDefault}
                    />
                  </Td>
                  {canWrite && (
                    <Td>
                      <div className="flex gap-1">
                        <ActionBtn label="Editar" onClick={() => { openEdit(role); }} />
                        {!role.isDefault && (
                          <ActionBtn label="Eliminar" onClick={() => { setDeleting(role); }} variant="danger" />
                        )}
                      </div>
                    </Td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataWidget>

      {/* Create/Edit Drawer */}
      <Drawer
        open={drawerOpen}
        onClose={closeDrawer}
        title={editing ? 'Editar Rol' : 'Nuevo Rol'}
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={closeDrawer}>Cancelar</Button>
            <Button type="submit" form={formId} loading={isPending} disabled={!formName.trim() || !formSlug.trim()}>
              {editing ? 'Guardar' : 'Crear'}
            </Button>
          </div>
        }
      >
        <form id={formId} onSubmit={handleSubmit} className="space-y-5">
          {/* Basic fields */}
          <div className="space-y-4">
            <Field label="Nombre" required>
              <input
                value={formName}
                onChange={(e) => { setFormName(e.target.value); }}
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </Field>

            <Field label="Slug" required>
              <input
                value={formSlug}
                onChange={(e) => { setFormSlug(e.target.value); }}
                required
                disabled={!!editing}
                placeholder="nombre_del_rol"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono disabled:bg-gray-50"
              />
            </Field>

            <Field label="Descripcion">
              <textarea
                value={formDescription}
                onChange={(e) => { setFormDescription(e.target.value); }}
                rows={2}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </Field>

            <Field label="Duracion Sesion (minutos)">
              <input
                type="number"
                value={formSessionMinutes}
                onChange={(e) => { setFormSessionMinutes(e.target.value); }}
                min={5}
                max={43200}
                className="w-32 rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </Field>
          </div>

          {/* Permission Grid */}
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">Permisos</h3>
            {catalogQuery.isPending && (
              <p className="text-sm text-gray-400">Cargando permisos...</p>
            )}
            <div className="space-y-4">
              {Array.from(permissionsByModule.entries()).map(([module, perms]) => {
                const allChecked = perms.every((p) => selectedPermIds.has(p.id));
                const someChecked = perms.some((p) => selectedPermIds.has(p.id));
                return (
                  <div key={module} className="rounded-md border border-gray-200">
                    {/* Module header */}
                    <label className="flex cursor-pointer items-center gap-2 border-b border-gray-100 bg-gray-50 px-3 py-2">
                      <input
                        type="checkbox"
                        checked={allChecked}
                        ref={(el) => { if (el) el.indeterminate = someChecked && !allChecked; }}
                        onChange={() => { toggleModuleAll(module); }}
                        className="size-4 rounded border-gray-300"
                      />
                      <span className="text-sm font-medium text-gray-700 capitalize">{module.replace(/_/g, ' ')}</span>
                      <span className="ml-auto text-xs text-gray-400">
                        {perms.filter((p) => selectedPermIds.has(p.id)).length}/{perms.length}
                      </span>
                    </label>
                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-1 p-2 sm:grid-cols-3">
                      {perms.map((perm) => (
                        <label key={perm.id} className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-gray-50">
                          <input
                            type="checkbox"
                            checked={selectedPermIds.has(perm.id)}
                            onChange={() => { togglePerm(perm.id); }}
                            className="size-3.5 rounded border-gray-300"
                          />
                          <span className="text-gray-700">{perm.action}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </form>
      </Drawer>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleting}
        onClose={() => { setDeleting(null); }}
        onConfirm={handleDelete}
        title="Eliminar Rol"
        message={`Eliminar "${deleting?.name}"? Los usuarios asignados a este rol perderan acceso.`}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}

function Field({ label, required, children }: Readonly<{ label: string; required?: boolean; children: React.ReactNode }>) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-gray-700">
        {label}{required && <span className="text-red-500"> *</span>}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

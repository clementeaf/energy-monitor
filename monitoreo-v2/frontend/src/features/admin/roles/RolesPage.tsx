import { useEffect, useState } from 'react';
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
import { ROLE_MODULE_GROUPS } from './role-modules';
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
  const [selectedPermIds, setSelectedPermIds] = useState<Set<string>>(new Set());

  const catalog = catalogQuery.data ?? [];

  // Build lookup: module+action → permission id
  const permLookup = buildPermLookup(catalog);

  const openCreate = () => {
    setEditing(null);
    setFormName('');
    setFormSlug('');
    setFormDescription('');
    setSelectedPermIds(new Set());
    setDrawerOpen(true);
  };

  const openEdit = (role: Role) => {
    setEditing(role);
    setFormName(role.name);
    setFormSlug(role.slug);
    setFormDescription(role.description ?? '');
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

    const permissionIds = Array.from(selectedPermIds);

    if (editing) {
      const payload: UpdateRolePayload = {
        name: formName.trim(),
        description: formDescription.trim() || undefined,
      };
      updateMutation.mutate({ id: editing.id, payload }, {
        onSuccess: () => {
          assignPermsMutation.mutate({ id: editing.id, permissionIds }, { onSuccess: closeDrawer });
        },
      });
    } else {
      const payload: CreateRolePayload = {
        name: formName.trim(),
        slug: formSlug.trim(),
        description: formDescription.trim() || undefined,
      };
      createMutation.mutate(payload, {
        onSuccess: (created) => {
          if (permissionIds.length > 0) {
            assignPermsMutation.mutate({ id: created.id, permissionIds }, { onSuccess: closeDrawer });
          } else {
            closeDrawer();
          }
        },
      });
    }
  };

  const isPermSelected = (module: string, action: string) => {
    const id = permLookup.get(`${module}:${action}`);
    return id ? selectedPermIds.has(id) : false;
  };

  const togglePerm = (module: string, action: string) => {
    const id = permLookup.get(`${module}:${action}`);
    if (!id) return;
    setSelectedPermIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleGroupAll = (groupIdx: number) => {
    const group = ROLE_MODULE_GROUPS[groupIdx];
    const ids: string[] = [];
    for (const mod of group.modules) {
      for (const cap of mod.capabilities) {
        const id = permLookup.get(`${mod.permissionModule}:${cap.action}`);
        if (id) ids.push(id);
      }
    }
    const allSelected = ids.every((id) => selectedPermIds.has(id));
    setSelectedPermIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (allSelected) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  };

  const isGroupAllSelected = (groupIdx: number) => {
    const group = ROLE_MODULE_GROUPS[groupIdx];
    const ids: string[] = [];
    for (const mod of group.modules) {
      for (const cap of mod.capabilities) {
        const id = permLookup.get(`${mod.permissionModule}:${cap.action}`);
        if (id) ids.push(id);
      }
    }
    return ids.length > 0 && ids.every((id) => selectedPermIds.has(id));
  };

  const isGroupPartial = (groupIdx: number) => {
    const group = ROLE_MODULE_GROUPS[groupIdx];
    const ids: string[] = [];
    for (const mod of group.modules) {
      for (const cap of mod.capabilities) {
        const id = permLookup.get(`${mod.permissionModule}:${cap.action}`);
        if (id) ids.push(id);
      }
    }
    const some = ids.some((id) => selectedPermIds.has(id));
    const all = ids.every((id) => selectedPermIds.has(id));
    return some && !all;
  };

  const handleDelete = () => {
    if (!deleting) return;
    deleteMutation.mutate(deleting.id, { onSuccess: () => { setDeleting(null); } });
  };

  const handleToggleActive = (role: Role) => {
    updateMutation.mutate({ id: role.id, payload: { isActive: !role.isActive } });
  };

  const isPending = createMutation.isPending || updateMutation.isPending || assignPermsMutation.isPending;
  const formId = 'role-form';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Roles</h1>
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
                <Th>Descripción</Th>
                <Th>Permisos</Th>
                <Th>Activo</Th>
                {canWrite && <Th></Th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {(query.data ?? []).map((role) => (
                <tr key={role.id} className="hover:bg-gray-50">
                  <Td className="font-medium text-gray-900">{role.name}</Td>
                  <Td className="max-w-[250px] truncate" title={role.description ?? undefined}>
                    {role.description ?? '—'}
                  </Td>
                  <Td>
                    <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                      {role.permissions.length}
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
            <Button type="submit" form={formId} loading={isPending} disabled={!formName.trim()}>
              {editing ? 'Guardar' : 'Crear'}
            </Button>
          </div>
        }
      >
        <form id={formId} onSubmit={handleSubmit} className="space-y-6">
          {/* Basic info */}
          <div className="space-y-4">
            <Field label="Nombre del rol" required>
              <input
                value={formName}
                onChange={(e) => { setFormName(e.target.value); }}
                required
                placeholder="Ej: Operador, Administrador, Locatario"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </Field>

            <Field label="Descripción">
              <textarea
                value={formDescription}
                onChange={(e) => { setFormDescription(e.target.value); }}
                rows={2}
                placeholder="Breve descripción de este rol"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </Field>
          </div>

          {/* Module-based permissions */}
          <div>
            <h3 className="mb-4 text-sm font-semibold text-gray-900">Accesos y capacidades</h3>
            {catalogQuery.isPending && (
              <p className="text-sm text-gray-400">Cargando módulos...</p>
            )}

            <div className="space-y-3">
              {ROLE_MODULE_GROUPS.map((group, gi) => (
                <div key={group.group} className="rounded-lg border border-gray-200 overflow-hidden">
                  {/* Group header */}
                  <label className="flex cursor-pointer items-center gap-3 bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <input
                      type="checkbox"
                      checked={isGroupAllSelected(gi)}
                      ref={(el) => { if (el) el.indeterminate = isGroupPartial(gi); }}
                      onChange={() => { toggleGroupAll(gi); }}
                      className="size-4 rounded border-gray-300"
                    />
                    <span className="text-sm font-semibold text-gray-800">{group.group}</span>
                  </label>

                  {/* Modules inside group */}
                  <div className="divide-y divide-gray-100">
                    {group.modules.map((mod) => (
                      <div key={`${mod.permissionModule}-${mod.label}`} className="px-4 py-3">
                        <div className="mb-1">
                          <span className="text-sm font-medium text-gray-700">{mod.label}</span>
                          <p className="text-xs text-gray-400">{mod.description}</p>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-3">
                          {mod.capabilities.map((cap) => {
                            const checked = isPermSelected(mod.permissionModule, cap.action);
                            return (
                              <label
                                key={cap.action}
                                className="flex items-center gap-1.5 text-sm cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => { togglePerm(mod.permissionModule, cap.action); }}
                                  className="size-3.5 rounded border-gray-300"
                                />
                                <span className={checked ? 'text-gray-800' : 'text-gray-500'}>
                                  {cap.label}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
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
        message={`Eliminar "${deleting?.name}"? Los usuarios asignados a este rol perderán acceso.`}
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

/** Build a map of "module:action" → permission.id for fast lookup */
function buildPermLookup(catalog: Permission[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const p of catalog) {
    map.set(`${p.module}:${p.action}`, p.id);
  }
  return map;
}

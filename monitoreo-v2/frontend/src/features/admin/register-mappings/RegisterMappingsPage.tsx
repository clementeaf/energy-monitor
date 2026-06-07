import { useState } from 'react';
import { Drawer } from '../../../components/ui/Drawer';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { Button } from '../../../components/ui/Button';
import { DropdownSelect } from '../../../components/ui/DropdownSelect';
import { TableStateBody } from '../../../components/ui/TableStateBody';
import { Th, Td, ActionBtn } from '../../../components/ui/TablePrimitives';
import { PageHeader } from '../../../components/ui/PageHeader';
import { useQueryState } from '../../../hooks/useQueryState';
import { useInfiniteScroll } from '../../../hooks/useInfiniteScroll';
import { usePermissions } from '../../../hooks/usePermissions';
import {
  useRegisterMappingsQuery,
  useProtocolTypesQuery,
  useCreateRegisterMapping,
  useUpdateRegisterMapping,
  useDeleteRegisterMapping,
  downloadRegisterMappingsCsv,
} from '../../../hooks/queries/useRegisterMappingsQuery';
import {
  READING_TARGET_FIELDS,
  type RegisterMapping,
  type CreateRegisterMappingPayload,
  type UpdateRegisterMappingPayload,
} from '../../../types/register-mapping';

const TARGET_FIELD_OPTIONS = READING_TARGET_FIELDS.map((f) => ({ value: f, label: f }));

/**
 * Admin CRUD for protocol register mappings and CSV export.
 */
export function RegisterMappingsPage() {
  const { has } = usePermissions();
  const canRead = has('register_mappings', 'read');
  const canCreate = has('register_mappings', 'create');
  const canUpdate = has('register_mappings', 'update');
  const canDelete = has('register_mappings', 'delete');

  const [protocolFilter, setProtocolFilter] = useState('');
  const protocolTypesQuery = useProtocolTypesQuery({ enabled: canRead });
  const query = useRegisterMappingsQuery(
    protocolFilter ? { protocol: protocolFilter } : undefined,
    { enabled: canRead },
  );
  const qs = useQueryState(query, { isEmpty: (d) => d === undefined || d.length === 0 });

  const createMutation = useCreateRegisterMapping();
  const updateMutation = useUpdateRegisterMapping();
  const deleteMutation = useDeleteRegisterMapping();

  const allRows = query.data ?? [];
  const { visible: visibleRows, hasMore, sentinelRef, total } = useInfiniteScroll(allRows, [protocolFilter]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<RegisterMapping | null>(null);
  const [deleting, setDeleting] = useState<RegisterMapping | null>(null);
  const [exporting, setExporting] = useState(false);

  const [formProtocol, setFormProtocol] = useState('');
  const [formDeviceProfile, setFormDeviceProfile] = useState('');
  const [formRegisterKey, setFormRegisterKey] = useState('');
  const [formTargetField, setFormTargetField] = useState('');
  const [formScaleFactor, setFormScaleFactor] = useState('1');
  const [formUnit, setFormUnit] = useState('');

  const protocolOptions = (protocolTypesQuery.data ?? []).map((p) => ({
    value: p.code,
    label: p.label,
  }));

  if (!canRead) {
    return (
      <div className="flex flex-1 items-center justify-center py-12 text-muted">
        No tiene permisos para ver mapeos de registros.
      </div>
    );
  }

  const resetForm = (): void => {
    setFormProtocol(protocolOptions[0]?.value ?? 'modbus');
    setFormDeviceProfile('');
    setFormRegisterKey('');
    setFormTargetField(TARGET_FIELD_OPTIONS[0]?.value ?? 'power_kw');
    setFormScaleFactor('1');
    setFormUnit('');
  };

  const openCreate = (): void => {
    setEditing(null);
    resetForm();
    setDrawerOpen(true);
  };

  const openEdit = (row: RegisterMapping): void => {
    setEditing(row);
    setFormProtocol(row.protocol);
    setFormDeviceProfile(row.deviceProfile);
    setFormRegisterKey(row.registerKey);
    setFormTargetField(row.targetField);
    setFormScaleFactor(row.scaleFactor);
    setFormUnit(row.unit ?? '');
    setDrawerOpen(true);
  };

  const closeDrawer = (): void => {
    setDrawerOpen(false);
    setEditing(null);
  };

  const handleSubmit = (): void => {
    const scaleFactor = parseFloat(formScaleFactor);
    if (Number.isNaN(scaleFactor)) return;

    if (editing) {
      const payload: UpdateRegisterMappingPayload = {
        protocol: formProtocol,
        deviceProfile: formDeviceProfile.trim(),
        registerKey: formRegisterKey.trim(),
        targetField: formTargetField,
        scaleFactor,
        unit: formUnit.trim() || null,
      };
      updateMutation.mutate({ id: editing.id, payload }, { onSuccess: closeDrawer });
    } else {
      const payload: CreateRegisterMappingPayload = {
        protocol: formProtocol,
        deviceProfile: formDeviceProfile.trim(),
        registerKey: formRegisterKey.trim(),
        targetField: formTargetField,
        scaleFactor,
        unit: formUnit.trim() || undefined,
      };
      createMutation.mutate(payload, { onSuccess: closeDrawer });
    }
  };

  const handleDelete = (): void => {
    if (!deleting) return;
    deleteMutation.mutate(deleting.id, { onSuccess: () => { setDeleting(null); } });
  };

  const handleExport = async (): Promise<void> => {
    setExporting(true);
    try {
      await downloadRegisterMappingsCsv(protocolFilter ? { protocol: protocolFilter } : undefined);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mapeos de Registros"
        eyebrow="Administración"
        actions={(
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => { void handleExport(); }} loading={exporting}>
              Exportar CSV
            </Button>
            {canCreate && (
              <button
                type="button"
                onClick={openCreate}
                className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-fg hover:opacity-90"
              >
                Nuevo mapeo
              </button>
            )}
          </div>
        )}
      />

      <div className="flex flex-wrap items-center gap-3">
        <DropdownSelect
          options={[{ value: '', label: 'Todos los protocolos' }, ...protocolOptions]}
          value={protocolFilter}
          onChange={setProtocolFilter}
          className="w-56"
        />
      </div>

      <div className="max-h-[70vh] overflow-y-auto panel">
        <table className="min-w-full divide-y divide-border">
          <thead className="sticky top-0 z-10 bg-surface">
            <tr>
              <Th>Protocolo</Th>
              <Th>Perfil</Th>
              <Th>Registro</Th>
              <Th>Campo destino</Th>
              <Th>Factor</Th>
              <Th>Unidad</Th>
              <Th>Alcance</Th>
              {(canUpdate || canDelete) && <Th></Th>}
            </tr>
          </thead>
          <TableStateBody
            phase={qs.phase}
            colSpan={(canUpdate || canDelete) ? 8 : 7}
            error={qs.error}
            onRetry={() => { query.refetch(); }}
            emptyMessage="No hay mapeos de registros."
            skeletonWidths={['w-20', 'w-24', 'w-20', 'w-28', 'w-16', 'w-12', 'w-16', 'w-20']}
          >
            {visibleRows.map((row) => (
              <tr key={row.id} className="hover:bg-surface">
                <Td>{row.protocol}</Td>
                <Td className="font-medium">{row.deviceProfile}</Td>
                <Td><code className="text-xs">{row.registerKey}</code></Td>
                <Td>{row.targetField}</Td>
                <Td>{row.scaleFactor}</Td>
                <Td>{row.unit ?? '—'}</Td>
                <Td>
                  {row.tenantId == null ? (
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">Global</span>
                  ) : (
                    <span className="text-xs text-muted">Tenant</span>
                  )}
                </Td>
                {(canUpdate || canDelete) && (
                  <Td>
                    <div className="flex gap-1">
                      {canUpdate && <ActionBtn label="Editar" onClick={() => { openEdit(row); }} />}
                      {canDelete && (
                        <ActionBtn label="Eliminar" onClick={() => { setDeleting(row); }} variant="danger" />
                      )}
                    </div>
                  </Td>
                )}
              </tr>
            ))}
          </TableStateBody>
        </table>
        {hasMore && <div ref={sentinelRef} className="h-4" />}
      </div>
      {total > 0 && <p className="text-xs text-muted">Mostrando {visibleRows.length} de {total}</p>}

      <Drawer
        open={drawerOpen}
        onClose={closeDrawer}
        title={editing ? 'Editar mapeo' : 'Nuevo mapeo'}
        size="md"
        footer={(
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={closeDrawer}>Cancelar</Button>
            <Button
              onClick={handleSubmit}
              loading={createMutation.isPending || updateMutation.isPending}
              disabled={!formProtocol || !formDeviceProfile.trim() || !formRegisterKey.trim()}
            >
              {editing ? 'Guardar' : 'Crear'}
            </Button>
          </div>
        )}
      >
        <div className="space-y-4">
          <Field label="Protocolo" required>
            <DropdownSelect
              options={protocolOptions}
              value={formProtocol}
              onChange={setFormProtocol}
              className="w-full"
            />
          </Field>
          <Field label="Perfil dispositivo" required>
            <input
              value={formDeviceProfile}
              onChange={(e) => { setFormDeviceProfile(e.target.value); }}
              placeholder="pac1670"
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Clave registro" required>
            <input
              value={formRegisterKey}
              onChange={(e) => { setFormRegisterKey(e.target.value); }}
              placeholder="40001"
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Campo destino" required>
            <DropdownSelect
              options={TARGET_FIELD_OPTIONS}
              value={formTargetField}
              onChange={setFormTargetField}
              className="w-full"
            />
          </Field>
          <Field label="Factor escala" required>
            <input
              type="number"
              step="any"
              value={formScaleFactor}
              onChange={(e) => { setFormScaleFactor(e.target.value); }}
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Unidad">
            <input
              value={formUnit}
              onChange={(e) => { setFormUnit(e.target.value); }}
              placeholder="kW"
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
            />
          </Field>
        </div>
      </Drawer>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => { setDeleting(null); }}
        onConfirm={handleDelete}
        title="Eliminar mapeo"
        message={`Eliminar mapeo ${deleting?.registerKey} (${deleting?.deviceProfile})?`}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}

function Field({ label, required, children }: Readonly<{ label: string; required?: boolean; children: React.ReactNode }>) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground">
        {label}{required && <span className="text-red-500"> *</span>}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

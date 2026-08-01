import { useEffect, useState } from 'react';
import { Drawer } from '../../../components/ui/Drawer';
import { DropdownSelect } from '../../../components/ui/DropdownSelect';
import type { TenantUnit, CreateTenantUnitPayload, UpdateTenantUnitPayload } from '../../../types/tenant-unit';
import type { Building } from '../../../types/building';

interface TenantUnitFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateTenantUnitPayload | UpdateTenantUnitPayload) => void;
  isPending: boolean;
  tenantUnit?: TenantUnit | null;
  buildings: Building[];
}

/**
 * Create/edit tenant unit form with optional external PASA/ERP identifier.
 */
export function TenantUnitForm({ open, onClose, onSubmit, isPending, tenantUnit, buildings }: Readonly<TenantUnitFormProps>) {
  const isEdit = !!tenantUnit;
  const [name, setName] = useState('');
  const [unitCode, setUnitCode] = useState('');
  const [externalUnitId, setExternalUnitId] = useState('');
  const [buildingId, setBuildingId] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(tenantUnit?.name ?? '');
    setUnitCode(tenantUnit?.unitCode ?? '');
    setExternalUnitId(tenantUnit?.externalUnitId ?? '');
    setBuildingId(tenantUnit?.buildingId ?? (buildings[0]?.id ?? ''));
    setContactName(tenantUnit?.contactName ?? '');
    setContactEmail(tenantUnit?.contactEmail ?? '');
  }, [open, tenantUnit, buildings]);

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    const trimmedExternalId = externalUnitId.trim();
    if (isEdit && tenantUnit) {
      const payload: UpdateTenantUnitPayload = {};
      if (name !== tenantUnit.name) payload.name = name;
      if (unitCode !== tenantUnit.unitCode) payload.unitCode = unitCode;
      if (trimmedExternalId !== (tenantUnit.externalUnitId ?? '')) {
        payload.externalUnitId = trimmedExternalId || null;
      }
      if (contactName !== (tenantUnit.contactName ?? '')) payload.contactName = contactName || undefined;
      if (contactEmail !== (tenantUnit.contactEmail ?? '')) payload.contactEmail = contactEmail || undefined;
      onSubmit(payload);
    } else {
      onSubmit({
        buildingId,
        name,
        unitCode,
        ...(trimmedExternalId ? { externalUnitId: trimmedExternalId } : {}),
        ...(contactName ? { contactName } : {}),
        ...(contactEmail ? { contactEmail } : {}),
      });
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title={isEdit ? 'Editar Locatario' : 'Nuevo Locatario'} side="right" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {!isEdit && (
          <Field label="Edificio" required>
            <DropdownSelect
              options={buildings.map((b) => ({ value: b.id, label: b.name }))}
              value={buildingId}
              onChange={setBuildingId}
              className="w-full"
            />
          </Field>
        )}

        <Field label="Nombre" required>
          <input
            value={name}
            onChange={(e) => { setName(e.target.value); }}
            required
            maxLength={255}
            className="w-full rounded-md border border-border px-3 py-2 text-sm"
          />
        </Field>

        <Field label="Codigo" required>
          <input
            value={unitCode}
            onChange={(e) => { setUnitCode(e.target.value); }}
            required
            maxLength={50}
            className="w-full rounded-md border border-border px-3 py-2 text-sm"
          />
        </Field>

        <Field label="ID externo">
          <input
            value={externalUnitId}
            onChange={(e) => { setExternalUnitId(e.target.value); }}
            maxLength={100}
            placeholder="ID locatario en ERP/PASA"
            className="w-full rounded-md border border-border px-3 py-2 text-sm"
          />
        </Field>

        <Field label="Nombre Contacto">
          <input
            value={contactName}
            onChange={(e) => { setContactName(e.target.value); }}
            maxLength={255}
            className="w-full rounded-md border border-border px-3 py-2 text-sm"
          />
        </Field>

        <Field label="Email Contacto">
          <input
            type="email"
            value={contactEmail}
            onChange={(e) => { setContactEmail(e.target.value); }}
            className="w-full rounded-md border border-border px-3 py-2 text-sm"
          />
        </Field>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending || !name || !unitCode}
            className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-fg hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? 'Guardando...' : isEdit ? 'Guardar' : 'Crear'}
          </button>
        </div>
      </form>
    </Drawer>
  );
}

function Field({ label, required, children }: Readonly<{ label: string; required?: boolean; children: React.ReactNode }>) {
  return (
    <div className="block">
      <span className="text-sm font-medium text-foreground">
        {label}{required && <span className="text-danger"> *</span>}
      </span>
      <div className="mt-1">{children}</div>
    </div>
  );
}

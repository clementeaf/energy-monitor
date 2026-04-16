import { useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
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

export function TenantUnitForm({ open, onClose, onSubmit, isPending, tenantUnit, buildings }: Readonly<TenantUnitFormProps>) {
  const isEdit = !!tenantUnit;
  const [name, setName] = useState(tenantUnit?.name ?? '');
  const [unitCode, setUnitCode] = useState(tenantUnit?.unitCode ?? '');
  const [buildingId, setBuildingId] = useState(tenantUnit?.buildingId ?? (buildings[0]?.id ?? ''));
  const [contactName, setContactName] = useState(tenantUnit?.contactName ?? '');
  const [contactEmail, setContactEmail] = useState(tenantUnit?.contactEmail ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEdit) {
      const payload: UpdateTenantUnitPayload = {};
      if (name !== tenantUnit.name) payload.name = name;
      if (unitCode !== tenantUnit.unitCode) payload.unitCode = unitCode;
      if (contactName !== (tenantUnit.contactName ?? '')) payload.contactName = contactName || undefined;
      if (contactEmail !== (tenantUnit.contactEmail ?? '')) payload.contactEmail = contactEmail || undefined;
      onSubmit(payload);
    } else {
      onSubmit({
        buildingId,
        name,
        unitCode,
        ...(contactName ? { contactName } : {}),
        ...(contactEmail ? { contactEmail } : {}),
      });
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar Locatario' : 'Nuevo Locatario'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {!isEdit && (
          <Field label="Edificio" required>
            <select
              value={buildingId}
              onChange={(e) => { setBuildingId(e.target.value); }}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </Field>
        )}

        <Field label="Nombre" required>
          <input
            value={name}
            onChange={(e) => { setName(e.target.value); }}
            required
            maxLength={255}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </Field>

        <Field label="Codigo" required>
          <input
            value={unitCode}
            onChange={(e) => { setUnitCode(e.target.value); }}
            required
            maxLength={50}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </Field>

        <Field label="Nombre Contacto">
          <input
            value={contactName}
            onChange={(e) => { setContactName(e.target.value); }}
            maxLength={255}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </Field>

        <Field label="Email Contacto">
          <input
            type="email"
            value={contactEmail}
            onChange={(e) => { setContactEmail(e.target.value); }}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </Field>

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
            disabled={isPending || !name || !unitCode}
            className="rounded-md bg-[var(--color-primary,#3D3BF3)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? 'Guardando...' : isEdit ? 'Guardar' : 'Crear'}
          </button>
        </div>
      </form>
    </Modal>
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

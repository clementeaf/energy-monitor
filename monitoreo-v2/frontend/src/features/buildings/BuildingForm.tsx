import { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import type { Building, CreateBuildingPayload, UpdateBuildingPayload } from '../../types/building';

interface BuildingFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateBuildingPayload | UpdateBuildingPayload) => void;
  isPending: boolean;
  building?: Building | null;
}

export function BuildingForm({ open, onClose, onSubmit, isPending, building }: BuildingFormProps) {
  const isEdit = !!building;
  const [name, setName] = useState(building?.name ?? '');
  const [code, setCode] = useState(building?.code ?? '');
  const [address, setAddress] = useState(building?.address ?? '');
  const [areaSqm, setAreaSqm] = useState(building?.areaSqm ? String(Number(building.areaSqm)) : '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEdit) {
      const payload: UpdateBuildingPayload = {};
      if (name !== building.name) payload.name = name;
      if (address !== (building.address ?? '')) payload.address = address || undefined;
      if (areaSqm !== (building.areaSqm ? String(Number(building.areaSqm)) : '')) {
        payload.areaSqm = areaSqm ? Number(areaSqm) : undefined;
      }
      onSubmit(payload);
    } else {
      onSubmit({
        name,
        code,
        ...(address ? { address } : {}),
        ...(areaSqm ? { areaSqm: Number(areaSqm) } : {}),
      });
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar Edificio' : 'Nuevo Edificio'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nombre" required>
          <input
            value={name}
            onChange={(e) => { setName(e.target.value); }}
            required
            maxLength={255}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </Field>

        {!isEdit && (
          <Field label="Codigo" required>
            <input
              value={code}
              onChange={(e) => { setCode(e.target.value); }}
              required
              maxLength={50}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </Field>
        )}

        <Field label="Direccion">
          <input
            value={address}
            onChange={(e) => { setAddress(e.target.value); }}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </Field>

        <Field label="Area (m2)">
          <input
            type="number"
            value={areaSqm}
            onChange={(e) => { setAreaSqm(e.target.value); }}
            min={0}
            step="0.01"
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
            disabled={isPending || !name || (!isEdit && !code)}
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

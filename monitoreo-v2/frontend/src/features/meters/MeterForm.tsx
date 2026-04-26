import { useState } from 'react';
import { Drawer } from '../../components/ui/Drawer';
import { DropdownSelect } from '../../components/ui/DropdownSelect';
import { useBuildingsQuery } from '../../hooks/queries/useBuildingsQuery';
import type { Meter, CreateMeterPayload, UpdateMeterPayload, MeterPhaseType } from '../../types/meter';

interface MeterFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateMeterPayload | UpdateMeterPayload) => void;
  isPending: boolean;
  meter?: Meter | null;
  defaultBuildingId?: string;
}

export function MeterForm({ open, onClose, onSubmit, isPending, meter, defaultBuildingId }: Readonly<MeterFormProps>) {
  const isEdit = !!meter;
  const buildingsQuery = useBuildingsQuery();

  const [buildingId, setBuildingId] = useState(meter?.buildingId ?? defaultBuildingId ?? '');
  const [name, setName] = useState(meter?.name ?? '');
  const [code, setCode] = useState(meter?.code ?? '');
  const [meterType, setMeterType] = useState(meter?.meterType ?? 'electrical');
  const [phaseType, setPhaseType] = useState<MeterPhaseType>(meter?.phaseType ?? 'three_phase');
  const [model, setModel] = useState(meter?.model ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEdit) {
      const payload: UpdateMeterPayload = {};
      if (name !== meter.name) payload.name = name;
      if (meterType !== meter.meterType) payload.meterType = meterType;
      if (phaseType !== meter.phaseType) payload.phaseType = phaseType;
      if (model !== (meter.model ?? '')) payload.model = model || undefined;
      onSubmit(payload);
    } else {
      onSubmit({
        buildingId,
        name,
        code,
        meterType,
        phaseType,
        ...(model ? { model } : {}),
      });
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title={isEdit ? 'Editar Medidor' : 'Nuevo Medidor'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {!isEdit && (
          <Field label="Edificio" required>
            <DropdownSelect
              options={[
                { value: '', label: 'Seleccionar...' },
                ...(buildingsQuery.data ?? []).map((b) => ({ value: b.id, label: b.name })),
              ]}
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
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </Field>

        {!isEdit && (
          <Field label="Codigo" required>
            <input
              value={code}
              onChange={(e) => { setCode(e.target.value); }}
              required
              maxLength={100}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </Field>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Field label="Tipo">
            <input
              value={meterType}
              onChange={(e) => { setMeterType(e.target.value); }}
              maxLength={50}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </Field>

          <Field label="Fase">
            <select
              value={phaseType}
              onChange={(e) => { setPhaseType(e.target.value as MeterPhaseType); }}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="three_phase">Trifasico</option>
              <option value="single_phase">Monofasico</option>
            </select>
          </Field>
        </div>

        <Field label="Modelo">
          <input
            value={model}
            onChange={(e) => { setModel(e.target.value); }}
            maxLength={100}
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
            disabled={isPending || !name || (!isEdit && (!code || !buildingId))}
            className="rounded-md bg-[var(--color-primary,#3D3BF3)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
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
      <span className="text-sm font-medium text-gray-700">
        {label}{required && <span className="text-red-500"> *</span>}
      </span>
      <div className="mt-1">{children}</div>
    </div>
  );
}

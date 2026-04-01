import { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
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

export function MeterForm({ open, onClose, onSubmit, isPending, meter, defaultBuildingId }: MeterFormProps) {
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
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar Medidor' : 'Nuevo Medidor'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {!isEdit && (
          <Field label="Edificio" required>
            <select
              value={buildingId}
              onChange={(e) => { setBuildingId(e.target.value); }}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Seleccionar...</option>
              {(buildingsQuery.data ?? []).map((b) => (
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

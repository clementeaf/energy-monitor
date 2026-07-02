import { useState, useEffect, useMemo } from 'react';
import { Drawer } from '../../components/ui/Drawer';
import { DropdownSelect } from '../../components/ui/DropdownSelect';
import { useBuildingsQuery } from '../../hooks/queries/useBuildingsQuery';
import { useMetersQuery } from '../../hooks/queries/useMetersQuery';
import { useTenantsAdminQuery } from '../../hooks/queries/useTenantsQuery';
import { usePermissions } from '../../hooks/usePermissions';
import { useAppStore } from '../../store/useAppStore';
import { LOAD_CATEGORY_OPTIONS } from '../../lib/site-metadata-labels';
import type { LoadCategory } from '../../types/site-metadata';
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
  const { isSuperAdmin } = usePermissions();
  const selectedTenantId = useAppStore((s) => s.selectedTenantId);
  const needsTenantSelect = !isEdit && isSuperAdmin && !selectedTenantId;
  const tenantsQuery = useTenantsAdminQuery();
  const buildingsQuery = useBuildingsQuery();
  const [buildingId, setBuildingId] = useState(meter?.buildingId ?? defaultBuildingId ?? '');
  const effectiveBuildingId = isEdit ? meter?.buildingId ?? '' : buildingId;
  const metersQuery = useMetersQuery(effectiveBuildingId || undefined);

  const [tenantId, setTenantId] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [meterType, setMeterType] = useState('electrical');
  const [phaseType, setPhaseType] = useState<MeterPhaseType>('three_phase');
  const [model, setModel] = useState('');
  const [loadCategory, setLoadCategory] = useState<LoadCategory | ''>('');
  const [parentMeterId, setParentMeterId] = useState('');
  const [iotDeviceId, setIotDeviceId] = useState('');

  useEffect(() => {
    if (!meter) {
      setBuildingId(defaultBuildingId ?? '');
      setName('');
      setCode('');
      setMeterType('electrical');
      setPhaseType('three_phase');
      setModel('');
      setLoadCategory('');
      setParentMeterId('');
      setIotDeviceId('');
      return;
    }
    setBuildingId(meter.buildingId);
    setName(meter.name);
    setCode(meter.code);
    setMeterType(meter.meterType);
    setPhaseType(meter.phaseType);
    setModel(meter.model ?? '');
    setLoadCategory(meter.loadCategory ?? '');
    setParentMeterId(meter.parentMeterId ?? '');
    setIotDeviceId(meter.iotDeviceId ?? '');
  }, [meter, defaultBuildingId, open]);

  const parentMeterOptions = useMemo(() => {
    const candidates = (metersQuery.data ?? []).filter(
      (m) => m.buildingId === effectiveBuildingId && m.id !== meter?.id,
    );
    return [
      { value: '', label: 'Sin medidor padre' },
      ...candidates.map((m) => ({ value: m.id, label: `${m.name} (${m.code})` })),
    ];
  }, [metersQuery.data, effectiveBuildingId, meter?.id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEdit && meter) {
      const payload: UpdateMeterPayload = {};
      if (name !== meter.name) payload.name = name;
      if (meterType !== meter.meterType) payload.meterType = meterType;
      if (phaseType !== meter.phaseType) payload.phaseType = phaseType;
      if (model !== (meter.model ?? '')) payload.model = model || undefined;
      if (loadCategory !== (meter.loadCategory ?? '')) payload.loadCategory = loadCategory || null;
      if (parentMeterId !== (meter.parentMeterId ?? '')) payload.parentMeterId = parentMeterId || null;
      if (iotDeviceId !== (meter.iotDeviceId ?? '')) payload.iotDeviceId = iotDeviceId || null;
      onSubmit(payload);
    } else {
      onSubmit({
        buildingId,
        name,
        code,
        meterType,
        phaseType,
        ...(model ? { model } : {}),
        ...(loadCategory ? { loadCategory } : {}),
        ...(parentMeterId ? { parentMeterId } : {}),
        ...(iotDeviceId ? { iotDeviceId } : {}),
        ...(needsTenantSelect && tenantId ? { tenantId } : {}),
      });
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title={isEdit ? 'Editar Medidor' : 'Nuevo Medidor'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {needsTenantSelect && (
          <Field label="Empresa" required>
            <DropdownSelect
              options={[
                { value: '', label: 'Seleccionar empresa...' },
                ...(tenantsQuery.data?.filter((t) => t.slug !== 'globe-power').map((t) => ({ value: t.id, label: t.name })) ?? []),
              ]}
              value={tenantId}
              onChange={setTenantId}
              className="w-full"
            />
          </Field>
        )}

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
            className="w-full rounded-md border border-border px-3 py-2 text-sm"
          />
        </Field>

        {!isEdit && (
          <Field label="Codigo" required>
            <input
              value={code}
              onChange={(e) => { setCode(e.target.value); }}
              required
              maxLength={100}
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
            />
          </Field>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Field label="Tipo">
            <input
              value={meterType}
              onChange={(e) => { setMeterType(e.target.value); }}
              maxLength={50}
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
            />
          </Field>

          <Field label="Fase">
            <DropdownSelect
              options={[
                { value: 'three_phase', label: 'Trifasico' },
                { value: 'single_phase', label: 'Monofasico' },
              ]}
              value={phaseType}
              onChange={(val) => { setPhaseType(val as MeterPhaseType); }}
              className="w-full"
            />
          </Field>
        </div>

        <Field label="Modelo">
          <input
            value={model}
            onChange={(e) => { setModel(e.target.value); }}
            maxLength={100}
            className="w-full rounded-md border border-border px-3 py-2 text-sm"
          />
        </Field>

        <Field label="Categoria de carga">
          <DropdownSelect
            options={[{ value: '', label: 'Sin categoria' }, ...LOAD_CATEGORY_OPTIONS]}
            value={loadCategory}
            onChange={(val) => { setLoadCategory(val as LoadCategory | ''); }}
            className="w-full"
          />
        </Field>

        <Field label="ID dispositivo IoT">
          <input
            value={iotDeviceId}
            onChange={(e) => { setIotDeviceId(e.target.value); }}
            maxLength={255}
            placeholder="Ej: siemens-poc3000"
            className="w-full rounded-md border border-border px-3 py-2 text-sm font-mono"
          />
        </Field>

        <Field label="Medidor padre (balance)">
          <DropdownSelect
            options={parentMeterOptions}
            value={parentMeterId}
            onChange={setParentMeterId}
            className="w-full"
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
            disabled={isPending || !name || (!isEdit && (!code || !buildingId)) || (needsTenantSelect && !tenantId)}
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
        {label}{required && <span className="text-red-500"> *</span>}
      </span>
      <div className="mt-1">{children}</div>
    </div>
  );
}

import { useState, useMemo } from 'react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { PillToggle } from '../../../components/ui/PillToggle';
import { Button } from '../../../components/ui/Button';
import { Drawer } from '../../../components/ui/Drawer';
import { DropdownSelect } from '../../../components/ui/DropdownSelect';
import { useIotDevicesQuery, useAssignIotDevice, useUnassignIotDevice } from '../../../hooks/queries/useIotDevicesQuery';
import { useBuildingsQuery } from '../../../hooks/queries/useBuildingsQuery';
import { useMetersQuery } from '../../../hooks/queries/useMetersQuery';
import type { IotDevice } from '../../../types/iot-device';

const FILTER_OPTIONS = [
  { key: 'all', label: 'Todos' },
  { key: 'unassigned', label: 'Sin asignar' },
  { key: 'assigned', label: 'Asignados' },
];

function timeSince(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 60) return `${min}m`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export function IotDevicesPage() {
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<IotDevice | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [buildingId, setBuildingId] = useState('');
  const [meterId, setMeterId] = useState('');

  const devicesQuery = useIotDevicesQuery();
  const buildingsQuery = useBuildingsQuery();
  const metersQuery = useMetersQuery(buildingId || undefined);
  const assignMutation = useAssignIotDevice();
  const unassignMutation = useUnassignIotDevice();

  const devices = devicesQuery.data ?? [];
  const buildings = buildingsQuery.data ?? [];

  const filtered = useMemo(() => {
    if (filter === 'unassigned') return devices.filter((d) => !d.assignedMeterId);
    if (filter === 'assigned') return devices.filter((d) => d.assignedMeterId);
    return devices;
  }, [devices, filter]);

  const meterOptions = useMemo(() => {
    const meters = metersQuery.data ?? [];
    // Only show meters without an IoT device already assigned
    return [
      { value: '', label: 'Seleccionar medidor...' },
      ...meters
        .filter((m) => !m.iotDeviceId)
        .map((m) => ({ value: m.id, label: `${m.name} (${m.code})` })),
    ];
  }, [metersQuery.data]);

  const handleAssign = () => {
    if (!selected || !meterId) return;
    assignMutation.mutate({ id: selected.id, meterId }, {
      onSuccess: () => {
        setAssignOpen(false);
        setSelected(null);
        setBuildingId('');
        setMeterId('');
      },
    });
  };

  const handleUnassign = (device: IotDevice) => {
    unassignMutation.mutate(device.id, {
      onSuccess: () => { setSelected(null); },
    });
  };

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      <PageHeader
        title="Dispositivos IoT"
        eyebrow="Administracion"
        actions={
          <PillToggle
            options={FILTER_OPTIONS.map((o) => ({ key: o.key, label: o.label }))}
            value={filter}
            onChange={setFilter}
            size="sm"
          />
        }
      />

      <div className="flex min-h-0 flex-1 gap-4 overflow-hidden">
        <div className="panel flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-background">
                <tr className="border-b border-border text-left text-xs font-medium text-muted">
                  <th className="px-3 py-2">Device ID</th>
                  <th className="px-3 py-2">Primera vez</th>
                  <th className="px-3 py-2">Ultima lectura</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2">Medidor asignado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((device) => (
                  <tr
                    key={device.id}
                    className={`cursor-pointer transition-colors hover:bg-surface ${selected?.id === device.id ? 'bg-surface' : ''}`}
                    onClick={() => setSelected(selected?.id === device.id ? null : device)}
                  >
                    <td className="px-3 py-2 font-mono text-xs font-medium text-foreground">{device.deviceClientId}</td>
                    <td className="px-3 py-2 text-muted">{new Date(device.firstSeen).toLocaleDateString()}</td>
                    <td className="px-3 py-2 text-muted">{timeSince(device.lastSeen)}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${device.assignedMeterId ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                        {device.assignedMeterId ? 'asignado' : 'sin asignar'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-muted">
                      {device.assignedMeter ? `${device.assignedMeter.name} (${device.assignedMeter.code})` : '—'}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={5} className="px-3 py-8 text-center text-muted">Sin dispositivos IoT descubiertos.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail panel */}
        <div className="hidden w-72 shrink-0 flex-col gap-3 overflow-y-auto lg:flex">
          {!selected ? (
            <div className="panel flex flex-1 items-center justify-center p-4">
              <p className="text-sm text-muted">Selecciona un dispositivo.</p>
            </div>
          ) : (
            <>
              <div className="panel px-3 py-3">
                <p className="text-[15px] font-semibold text-foreground">Dispositivo IoT</p>
                <p className="mt-0.5 font-mono text-xs text-muted">{selected.deviceClientId}</p>
              </div>
              <div className="panel px-3 py-3">
                <h4 className="mb-2 text-xs font-medium text-muted">Datos</h4>
                <dl className="space-y-1 text-xs">
                  <div className="flex justify-between"><dt className="text-muted">Primera vez</dt><dd className="text-foreground">{new Date(selected.firstSeen).toLocaleString()}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted">Ultima lectura</dt><dd className="text-foreground">{new Date(selected.lastSeen).toLocaleString()}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted">Estado</dt><dd className="text-foreground">{selected.assignedMeterId ? 'Asignado' : 'Sin asignar'}</dd></div>
                  {selected.assignedMeter && (
                    <div className="flex justify-between"><dt className="text-muted">Medidor</dt><dd className="text-foreground">{selected.assignedMeter.name}</dd></div>
                  )}
                </dl>
              </div>
              {selected.payloadSample && Object.keys(selected.payloadSample).length > 0 && (
                <div className="panel px-3 py-3">
                  <h4 className="mb-2 text-xs font-medium text-muted">Muestra payload</h4>
                  <pre className="max-h-40 overflow-auto rounded bg-surface p-2 text-xs text-muted">
                    {JSON.stringify(selected.payloadSample, null, 2)}
                  </pre>
                </div>
              )}
              <div className="panel space-y-2 px-3 py-3">
                <h4 className="text-xs font-medium text-muted">Acciones</h4>
                {selected.assignedMeterId ? (
                  <Button size="sm" variant="danger" loading={unassignMutation.isPending} onClick={() => handleUnassign(selected)}>
                    Desasignar
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => { setAssignOpen(true); setBuildingId(''); setMeterId(''); }}>
                    Asignar a medidor
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Assign drawer */}
      <Drawer open={assignOpen} onClose={() => setAssignOpen(false)} title="Asignar dispositivo IoT">
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Dispositivo: <span className="font-mono font-medium text-foreground">{selected?.deviceClientId}</span>
          </p>

          <div>
            <span className="text-sm font-medium text-foreground">Edificio</span>
            <DropdownSelect
              options={[
                { value: '', label: 'Seleccionar edificio...' },
                ...buildings.map((b) => ({ value: b.id, label: b.name })),
              ]}
              value={buildingId}
              onChange={(v) => { setBuildingId(v); setMeterId(''); }}
              className="mt-1 w-full"
            />
          </div>

          {buildingId && (
            <div>
              <span className="text-sm font-medium text-foreground">Medidor</span>
              <DropdownSelect
                options={meterOptions}
                value={meterId}
                onChange={setMeterId}
                className="mt-1 w-full"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setAssignOpen(false)}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={!meterId || assignMutation.isPending}
              onClick={handleAssign}
              className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-fg hover:opacity-90 disabled:opacity-50"
            >
              {assignMutation.isPending ? 'Asignando...' : 'Asignar'}
            </button>
          </div>
        </div>
      </Drawer>
    </div>
  );
}

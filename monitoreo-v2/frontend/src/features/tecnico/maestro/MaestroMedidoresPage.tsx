import { useState, useMemo } from 'react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { DropdownSelect } from '../../../components/ui/DropdownSelect';
// ponytail: PillToggle replaced per wireframe
import { Button } from '../../../components/ui/Button';
import { useBuildingsQuery } from '../../../hooks/queries/useBuildingsQuery';
import { useMetersQuery } from '../../../hooks/queries/useMetersQuery';
import type { Meter } from '../../../types/meter';

const PROTOCOLO_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'modbus_rtu', label: 'Modbus RTU' },
  { value: 'modbus_tcp', label: 'Modbus TCP' },
  { value: 'mqtt', label: 'MQTT' },
  { value: 'dlms', label: 'DLMS' },
];

const ESTADO_ACTIVO_OPTIONS = [
  { value: 'active', label: 'Activo' },
  { value: 'inactive', label: 'Inactivo' },
  { value: 'baja', label: 'Baja' },
  { value: 'all', label: 'Todos' },
];

const ESTADO_COMMS_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'online', label: 'Online' },
  { value: 'offline', label: 'Offline' },
  { value: 'intermitente', label: 'Intermitente' },
];

/* ── Asset status ── */

type AssetStatus = 'activo' | 'en mantención' | 'baja';

const ASSET_BADGE: Record<AssetStatus, string> = {
  activo: 'bg-success/10 text-success',
  'en mantención': 'bg-warning/10 text-warning',
  baja: 'bg-danger/10 text-danger',
};

function deriveAssetStatus(meter: Meter): AssetStatus {
  if (!meter.isActive) return 'baja';
  if ((meter.metadata as Record<string, unknown>)?.maintenance === true) return 'en mantención';
  return 'activo';
}

/* ── Page ── */

export function MaestroMedidoresPage() {
  const [search, setSearch] = useState('');
  const [statusFilter] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [paisFilter, setPaisFilter] = useState('all');
  const [mallFilter, setMallFilter] = useState('all');
  const [protocoloFilter, setProtocoloFilter] = useState('all');
  const [estadoActivoFilter, setEstadoActivoFilter] = useState('active');
  const [estadoCommsFilter, setEstadoCommsFilter] = useState('all');

  const buildingsQuery = useBuildingsQuery();
  const metersQuery = useMetersQuery();

  const buildings = buildingsQuery.data ?? [];
  const meters = metersQuery.data ?? [];
  const buildingMap = useMemo(() => new Map(buildings.map((b) => [b.id, b.name])), [buildings]);

  const enriched = useMemo(
    () => meters.map((m) => ({ meter: m, assetStatus: deriveAssetStatus(m) })),
    [meters],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return enriched
      .filter((e) => statusFilter === 'all' || e.assetStatus === statusFilter)
      .filter((e) => !q || e.meter.name.toLowerCase().includes(q) || e.meter.code.toLowerCase().includes(q) || (e.meter.serialNumber ?? '').toLowerCase().includes(q));
  }, [enriched, search, statusFilter]);

  const sel = meters.find((m) => m.id === selectedId) ?? null;

  return (
    <div className="flex h-full flex-col gap-2 overflow-hidden">
      <PageHeader title="Maestro de Medidores" />

      {/* Filter banner */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 py-1 text-xs text-muted">
        <span className="flex items-center gap-1">
          País
          <DropdownSelect options={[{ value: 'all', label: 'Todos' }, { value: 'cl', label: 'Chile' }, { value: 'pe', label: 'Perú' }, { value: 'co', label: 'Colombia' }]} value={paisFilter} onChange={setPaisFilter} />
        </span>
        <span className="flex items-center gap-1">
          Mall
          <DropdownSelect options={[{ value: 'all', label: 'Todos' }, ...buildings.map((b) => ({ value: b.id, label: b.name }))]} value={mallFilter} onChange={setMallFilter} />
        </span>
        <span className="flex items-center gap-1">
          Protocolo
          <DropdownSelect options={PROTOCOLO_OPTIONS} value={protocoloFilter} onChange={setProtocoloFilter} />
        </span>
        <span className="flex items-center gap-1">
          Estado del activo
          <DropdownSelect options={ESTADO_ACTIVO_OPTIONS} value={estadoActivoFilter} onChange={setEstadoActivoFilter} />
        </span>
        <span className="flex items-center gap-1">
          Estado comms
          <DropdownSelect options={ESTADO_COMMS_OPTIONS} value={estadoCommsFilter} onChange={setEstadoCommsFilter} />
        </span>
      </div>

      {/* Row 1: Master table (left) + Edit form (right) */}
      <div className="flex min-h-0 flex-1 basis-1/2 gap-3">
        {/* Maestro de medidores */}
        <div className="panel flex min-w-0 flex-1 flex-col overflow-hidden px-3 py-2.5">
          <p className="shrink-0 text-xs font-medium text-muted">Maestro de medidores</p>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." className="mt-2 w-full shrink-0 rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-foreground" />
          <div className="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden text-xs">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium text-muted">
                  <th className="px-2 py-1.5">Serial</th>
                  <th className="px-2 py-1.5">Tag</th>
                  <th className="px-2 py-1.5">Mall</th>
                  <th className="px-2 py-1.5">Prot.</th>
                  <th className="px-2 py-1.5">Gateway</th>
                  <th className="px-2 py-1.5">Comms</th>
                  <th className="px-2 py-1.5 text-center">Estado activo</th>
                </tr>
              </thead>
            </table>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <table className="w-full">
                <tbody className="divide-y divide-border">
                  {filtered.map(({ meter, assetStatus }, i) => (
                    <tr key={meter.id} className={`animate-fade-in cursor-pointer transition-colors hover:bg-surface ${selectedId === meter.id ? 'bg-surface' : ''}`} style={{ animationDelay: `${i * 20}ms` }} onClick={() => setSelectedId(selectedId === meter.id ? null : meter.id)}>
                      <td className="px-2 py-1.5 font-mono text-xs text-muted">{meter.serialNumber ?? '—'}</td>
                      <td className="px-2 py-1.5 font-medium text-foreground">{meter.name}</td>
                      <td className="px-2 py-1.5 text-muted">{buildingMap.get(meter.buildingId) ?? '—'}</td>
                      <td className="px-2 py-1.5 text-muted">{meter.ipAddress ? 'TCP' : 'Modbus'}</td>
                      <td className="px-2 py-1.5 text-muted">{meter.busId ?? '—'}</td>
                      <td className="px-2 py-1.5 text-muted">{meter.isActive ? '●' : '○'}</td>
                      <td className="px-2 py-1.5 text-center"><span className={`inline-block rounded-full px-1.5 py-0.5 text-xs font-medium ${ASSET_BADGE[assetStatus]}`}>{assetStatus}</span></td>
                    </tr>
                  ))}
                  {filtered.length === 0 && <tr><td colSpan={7} className="px-2 py-6 text-center text-muted">Sin medidores.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Alta / edición de medidor */}
        <div className="panel flex min-w-0 flex-1 flex-col overflow-y-auto px-3 py-2.5">
          <p className="shrink-0 text-xs font-medium text-muted">Alta / edición de medidor</p>
          {sel ? (
            <div className="mt-2 space-y-3 text-xs">
              <div><p className="text-xs text-muted">Identificación: serial · fabricante · modelo · firmware</p><input readOnly value={`${sel.serialNumber ?? '—'} · ${sel.model ?? '—'}`} className="w-full rounded-md border border-border bg-surface/50 px-2 py-1.5 text-foreground" /></div>
              <div><p className="text-xs text-muted">Protocolo</p><input readOnly value={sel.ipAddress ? 'TCP/IP' : sel.modbusAddress ? 'Modbus' : '—'} className="w-full rounded-md border border-border bg-surface/50 px-2 py-1.5 text-foreground" /></div>
              <div><p className="text-xs text-muted">Comunicación: dirección Modbus/IP · gateway</p><input readOnly value={sel.busId ?? sel.ipAddress ?? '—'} className="w-full rounded-md border border-border bg-surface/50 px-2 py-1.5 text-foreground" /></div>
              <div><p className="text-xs text-muted">Tiempo de muestreo</p><input readOnly value="15 min" className="w-full rounded-md border border-border bg-surface/50 px-2 py-1.5 text-foreground" /></div>
              <div><p className="text-xs text-muted">Ubicación: mall · zona · tipo de sala</p><input readOnly value={`${buildingMap.get(sel.buildingId) ?? '—'} · ${(sel.metadata as Record<string, string>)?.zone ?? '—'}`} className="w-full rounded-md border border-border bg-surface/50 px-2 py-1.5 text-foreground" /></div>
              <div><p className="text-xs text-muted">Rack / tablero</p><input readOnly value="—" className="w-full rounded-md border border-border bg-surface/50 px-2 py-1.5 text-foreground" /></div>
              <div><p className="text-xs text-muted">Factor de multiplicación / constante de medición</p><input readOnly value="1.0" className="w-full rounded-md border border-border bg-surface/50 px-2 py-1.5 text-foreground" /></div>
            </div>
          ) : <p className="mt-4 text-center text-xs text-muted">Selecciona un medidor de la tabla</p>}

          {/* Action buttons */}
          <div className="mt-3 flex shrink-0 gap-2">
            <Button size="sm" disabled={!sel} className="flex-1">Guardar cambios</Button>
            <button type="button" disabled={!sel} className="flex-1 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-surface disabled:opacity-40">Dar de baja</button>
            <button type="button" className="flex-1 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-surface">Cancelar</button>
          </div>
        </div>
      </div>

      {/* Row 2: Pista de cambios del maestro */}
      <div className="panel flex min-h-0 flex-1 basis-1/2 flex-col overflow-hidden px-3 py-2.5">
        <p className="shrink-0 text-xs font-medium text-muted">Pista de cambios del maestro (inmutable)</p>
        <div className="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden text-xs">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium text-muted">
                <th className="px-2 py-1.5">Timestamp</th>
                <th className="px-2 py-1.5">Usuario</th>
                <th className="px-2 py-1.5">Campo</th>
                <th className="px-2 py-1.5">Valor anterior</th>
                <th className="px-2 py-1.5">Valor nuevo</th>
              </tr>
            </thead>
          </table>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <table className="w-full">
              <tbody className="divide-y divide-border" />
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

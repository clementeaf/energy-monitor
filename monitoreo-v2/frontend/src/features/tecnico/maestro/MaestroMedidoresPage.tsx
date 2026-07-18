import { useState, useMemo } from 'react';
import { PageHeader } from '../../../components/ui/PageHeader';
// ponytail: PillToggle replaced per wireframe
import { Button } from '../../../components/ui/Button';
import { useBuildingsQuery } from '../../../hooks/queries/useBuildingsQuery';
import { useMetersQuery } from '../../../hooks/queries/useMetersQuery';
import type { Meter } from '../../../types/meter';

/* ── Asset status ── */

type AssetStatus = 'activo' | 'en mantención' | 'baja';

const ASSET_BADGE: Record<AssetStatus, string> = {
  activo: 'bg-emerald-100 text-emerald-700',
  'en mantención': 'bg-amber-100 text-amber-700',
  baja: 'bg-red-100 text-red-700',
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
      <PageHeader title="5.6 Maestro de Medidores" description="Alta, edición y baja de medidores — pista de cambios inmutable (desktop)" />

      {/* Row 1: Master table (left) + Edit form (right) */}
      <div className="flex min-h-0 flex-1 basis-1/2 gap-3">
        {/* Maestro de medidores */}
        <div className="panel flex min-w-0 flex-1 flex-col overflow-hidden px-3 py-2.5">
          <p className="shrink-0 text-[12px] font-medium uppercase tracking-wider text-muted">Maestro de medidores</p>
          <p className="shrink-0 text-[11px] text-muted">búsqueda y filtros completos · selecciona para editar</p>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." className="mt-2 w-full shrink-0 rounded-md border border-border bg-background px-2 py-1.5 text-[11px] text-foreground outline-none focus:border-brand" />
          <div className="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden text-[11px]">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-[12px] font-medium uppercase tracking-wider text-muted">
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
                      <td className="px-2 py-1.5 font-mono text-[10px] text-muted">{meter.serialNumber ?? '—'}</td>
                      <td className="px-2 py-1.5 font-medium text-foreground">{meter.name}</td>
                      <td className="px-2 py-1.5 text-muted">{buildingMap.get(meter.buildingId) ?? '—'}</td>
                      <td className="px-2 py-1.5 text-muted">{meter.ipAddress ? 'TCP' : 'Modbus'}</td>
                      <td className="px-2 py-1.5 text-muted">{meter.busId ?? '—'}</td>
                      <td className="px-2 py-1.5 text-muted">{meter.isActive ? '●' : '○'}</td>
                      <td className="px-2 py-1.5 text-center"><span className={`inline-block rounded-full px-1.5 py-0.5 text-[9px] font-medium ${ASSET_BADGE[assetStatus]}`}>{assetStatus}</span></td>
                    </tr>
                  ))}
                  {filtered.length === 0 && <tr><td colSpan={7} className="px-2 py-6 text-center text-muted">Sin medidores.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
          <p className="mt-1 shrink-0 text-right text-[11px] text-muted">[INT-14, FIN-02, FIN-03]</p>
        </div>

        {/* Alta / edición de medidor */}
        <div className="panel flex min-w-0 flex-1 flex-col overflow-y-auto px-3 py-2.5">
          <p className="shrink-0 text-[12px] font-medium uppercase tracking-wider text-muted">Alta / edición de medidor</p>
          <p className="shrink-0 text-[11px] text-muted">agrupado por secciones</p>
          {sel ? (
            <div className="mt-2 space-y-3 text-[11px]">
              <div><p className="text-[11px] text-muted">Identificación: serial · fabricante · modelo · firmware</p><input readOnly value={`${sel.serialNumber ?? '—'} · ${sel.model ?? '—'}`} className="w-full rounded-md border border-border bg-surface/50 px-2 py-1.5 text-foreground" /></div>
              <div><p className="text-[11px] text-muted">Protocolo</p><input readOnly value={sel.ipAddress ? 'TCP/IP' : sel.modbusAddress ? 'Modbus' : '—'} className="w-full rounded-md border border-border bg-surface/50 px-2 py-1.5 text-foreground" /></div>
              <div><p className="text-[11px] text-muted">Comunicación: dirección Modbus/IP · gateway</p><input readOnly value={sel.busId ?? sel.ipAddress ?? '—'} className="w-full rounded-md border border-border bg-surface/50 px-2 py-1.5 text-foreground" /></div>
              <div><p className="text-[11px] text-muted">Tiempo de muestreo</p><input readOnly value="15 min" className="w-full rounded-md border border-border bg-surface/50 px-2 py-1.5 text-foreground" /></div>
              <div><p className="text-[11px] text-muted">Ubicación: mall · zona · tipo de sala</p><input readOnly value={`${buildingMap.get(sel.buildingId) ?? '—'} · ${(sel.metadata as Record<string, string>)?.zone ?? '—'}`} className="w-full rounded-md border border-border bg-surface/50 px-2 py-1.5 text-foreground" /></div>
              <div><p className="text-[11px] text-muted">Rack / tablero</p><input readOnly value="—" className="w-full rounded-md border border-border bg-surface/50 px-2 py-1.5 text-foreground" /></div>
              <div><p className="text-[11px] text-muted">Factor de multiplicación / constante de medición</p><input readOnly value="1.0" className="w-full rounded-md border border-border bg-surface/50 px-2 py-1.5 text-foreground" /></div>
            </div>
          ) : <p className="mt-4 text-center text-[11px] text-muted">Selecciona un medidor de la tabla</p>}
          <p className="mt-1 shrink-0 text-right text-[11px] text-muted">[INT-14, ARQ-15, FIN-03]</p>

          {/* Action buttons */}
          <div className="mt-3 flex shrink-0 gap-2">
            <Button size="sm" disabled={!sel} className="flex-1">Guardar cambios</Button>
            <button type="button" disabled={!sel} className="flex-1 rounded-lg border border-border px-3 py-2 text-[11px] font-medium text-foreground transition-colors hover:bg-surface disabled:opacity-40">Dar de baja</button>
            <button type="button" className="flex-1 rounded-lg border border-border px-3 py-2 text-[11px] font-medium text-foreground transition-colors hover:bg-surface">Cancelar</button>
          </div>
        </div>
      </div>

      {/* Row 2: Pista de cambios del maestro */}
      <div className="panel flex min-h-0 flex-1 basis-1/2 flex-col overflow-hidden px-3 py-2.5">
        <p className="shrink-0 text-[12px] font-medium uppercase tracking-wider text-muted">Pista de cambios del maestro (inmutable)</p>
        <p className="shrink-0 text-[11px] text-muted">campo · valor anterior → valor nuevo · usuario · timestamp</p>
        <div className="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden text-[11px]">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left text-[12px] font-medium uppercase tracking-wider text-muted">
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
              <tbody className="divide-y divide-border">
                <tr><td colSpan={5} className="px-2 py-6 text-center text-muted">Sin cambios registrados para este medidor.</td></tr>
              </tbody>
            </table>
          </div>
        </div>
        <p className="mt-1 shrink-0 text-right text-[11px] text-muted">[DAT-23, DAT-14, CYB-10]</p>
      </div>
    </div>
  );
}

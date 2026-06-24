import { useState, useMemo } from 'react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { PillToggle } from '../../../components/ui/PillToggle';
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

// ponytail: derive from meter.isActive + metadata until asset_status column exists
function deriveAssetStatus(meter: Meter): AssetStatus {
  const checks: [boolean, AssetStatus][] = [
    [!meter.isActive, 'baja'],
  ];
  return checks.find(([c]) => c)?.[1] ?? 'activo';
}

const FILTER_OPTIONS = [
  { key: 'all', label: 'Todos' },
  { key: 'activo', label: 'Activos' },
  { key: 'baja', label: 'Baja' },
];

/* ── Page ── */

export function MaestroMedidoresPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

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

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      <PageHeader
        title="Maestro Medidores"
        eyebrow="Maestro"
        actions={
          <PillToggle
            options={FILTER_OPTIONS.map((o) => ({ key: o.key, label: o.label }))}
            value={statusFilter}
            onChange={setStatusFilter}
            size="sm"
          />
        }
      />

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por serial, tag o nombre..."
        className="w-full shrink-0 rounded-lg border border-border bg-background px-3 py-2 text-[12px] text-foreground outline-none focus:border-brand"
      />

      <div className="panel flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full text-[13px]">
            <thead className="sticky top-0 z-10 bg-background">
              <tr className="border-b border-border text-left text-[11px] font-medium uppercase tracking-wider text-muted">
                <th className="px-3 py-2">Nombre</th>
                <th className="px-3 py-2">Serial</th>
                <th className="px-3 py-2">Centro</th>
                <th className="px-3 py-2">Protocolo</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">Fase</th>
                <th className="px-3 py-2 text-center">Estado activo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(({ meter, assetStatus }) => (
                <tr key={meter.id} className="transition-colors hover:bg-surface">
                  <td className="px-3 py-2 font-medium text-foreground">{meter.name}</td>
                  <td className="px-3 py-2 font-mono text-[11px] text-muted">{meter.serialNumber ?? '—'}</td>
                  <td className="px-3 py-2 text-muted">{buildingMap.get(meter.buildingId) ?? '—'}</td>
                  <td className="px-3 py-2 text-muted">{meter.ipAddress ? 'TCP/IP' : meter.modbusAddress ? 'Modbus' : '—'}</td>
                  <td className="px-3 py-2 text-muted">{meter.meterType}</td>
                  <td className="px-3 py-2 text-muted">{meter.phaseType}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${ASSET_BADGE[assetStatus]}`}>
                      {assetStatus}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-muted">Sin medidores.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import { BuildingsPageSkeleton } from '../../components/ui/Skeleton';
import { useBuildings } from '../../hooks/queries/useBuildings';
import type { BuildingSummary } from '../../types';

export function BuildingsPage() {
  const { data: buildings, isLoading } = useBuildings();

  if (isLoading) return <BuildingsPageSkeleton />;

  // Group by buildingName, take latest month per building
  const latest = new Map<string, BuildingSummary>();
  for (const row of buildings ?? []) {
    if (!latest.has(row.buildingName)) {
      latest.set(row.buildingName, row);
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto pb-4">
        <div className="grid grid-cols-1 content-start gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...latest.values()].map((b) => (
            <div key={b.buildingName} className="rounded-lg border border-border bg-surface p-4">
              <h3 className="font-semibold text-text">{b.buildingName}</h3>
              <div className="mt-2 space-y-1 text-sm text-muted">
                <div>Medidores: {b.totalMeters} ({b.assignedMeters} asignados)</div>
                <div>Tiendas: {b.totalStores}</div>
                {b.areaSqm && <div>Área: {b.areaSqm.toLocaleString()} m²</div>}
                <div>Consumo: {b.totalKwh.toLocaleString()} kWh</div>
                <div>Potencia promedio: {b.avgPowerKw.toFixed(1)} kW</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

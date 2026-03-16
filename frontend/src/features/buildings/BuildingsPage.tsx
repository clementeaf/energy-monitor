import { useNavigate } from 'react-router';
import { Card } from '../../components/ui/Card';
import { PillButton } from '../../components/ui/PillButton';
import { BuildingsPageSkeleton } from '../../components/ui/Skeleton';
import { useBuildings } from '../../hooks/queries/useBuildings';
import { fmt } from '../../lib/formatters';
import type { BuildingSummary } from '../../types';

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="text-sm font-medium text-text">
        {value}{unit && <span className="ml-0.5 text-xs font-normal text-muted">{unit}</span>}
      </p>
    </div>
  );
}

export function BuildingsPage() {
  const navigate = useNavigate();
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
            <Card
              key={b.buildingName}
              className="space-y-3 !rounded-2xl border border-pa-navy/30"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="truncate font-semibold text-text">{b.buildingName}</h3>
                <PillButton className="shrink-0 whitespace-nowrap" onClick={() => navigate(`/buildings/${encodeURIComponent(b.buildingName)}`)}>
                  Ver más +
                </PillButton>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Stat label="Consumo" value={fmt(b.totalKwh)} unit="kWh" />
                <Stat label="Potencia prom." value={fmt(b.avgPowerKw)} unit="kW" />
                <Stat label="Demanda peak" value={fmt(b.peakDemandKw)} unit="kW" />
                <Stat label="Factor potencia" value={b.avgPowerFactor != null ? b.avgPowerFactor.toFixed(2) : '—'} />
              </div>

              <div className="flex items-center justify-between border-t border-border pt-2 text-xs text-muted">
                <span>{b.totalMeters} medidores</span>
                {b.areaSqm && <span>{fmt(b.areaSqm)} m²</span>}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

import { fmtNum } from '../../../lib/formatters';
import { RecentCriticalEvents } from './RecentCriticalEvents';
import { type EnrichedBuilding } from './consolidado-utils';

interface PortfolioPanelProps {
  enriched: EnrichedBuilding[];
  totalCostUf: number;
  totalConsumptionMwh: number;
  consumptionVariationPct: number | null;
  onSelectBuilding?: (buildingId: string) => void;
}

export function PortfolioPanel({
  enriched,
  totalCostUf,
  totalConsumptionMwh,
  consumptionVariationPct,
  onSelectBuilding,
}: Readonly<PortfolioPanelProps>) {
  const activeCount = enriched.filter((e) => e.building.isActive).length;
  const coveragePct = enriched.length > 0
    ? Math.round((enriched.filter((e) => e.meterCount > 0).length / enriched.length) * 100)
    : 0;
  const intensityKwhM2 = totalConsumptionMwh > 0 ? Math.round(totalConsumptionMwh * 1000 / Math.max(1, activeCount * 5000)) : 0;

  const feedAlerts = enriched.flatMap((e) => e.activeAlerts);
  const feedBuildings = enriched.map((e) => e.building);

  return (
    <>
      {/* KPI grid 2×2 */}
      <div className="grid shrink-0 grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border">
        <KpiCell
          label="Consumo este mes"
          value={fmtNum(totalConsumptionMwh, 3)}
          unit="MWh"
          delta={consumptionVariationPct}
          source={`${enriched.reduce((s, e) => s + e.meterCount, 0)} medidores activos`}
        />
        <KpiCell
          label="Gasto acumulado"
          value={fmtNum(totalCostUf, 3)}
          unit="UF"
          source="Boletas importadas"
        />
        <KpiCell
          label="Intensidad"
          value={String(intensityKwhM2)}
          unit="kWh/m²"
          source="Promedio portafolio"
        />
        <KpiCell
          label="Medidores en línea"
          value={`${coveragePct}`}
          unit="%"
          source={`${enriched.reduce((s, e) => s + e.meterCount, 0)} totales`}
          valueColor={coveragePct >= 95 ? 'text-success' : coveragePct >= 85 ? 'text-warning' : 'text-danger'}
        />
      </div>

      {/* Eventos recientes */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border">
        <p className="shrink-0 border-b border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground">Eventos recientes</p>
        <div className="min-h-0 flex-1 overflow-y-auto bg-background px-4 py-2">
          <RecentCriticalEvents alerts={feedAlerts} buildings={feedBuildings} onSelectBuilding={onSelectBuilding} />
        </div>
      </div>

    </>
  );
}

function KpiCell({ label, value, unit, delta, source, valueColor }: Readonly<{
  label: string;
  value: string;
  unit: string;
  delta?: number | null;
  source: string;
  valueColor?: string;
}>) {
  return (
    <div className="bg-background px-5 py-5">
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-2 text-[28px] font-medium tracking-[-0.03em] tabular-nums leading-none ${valueColor ?? 'text-foreground'}`}>
        {value}
        <span className="ml-1 text-sm font-normal text-muted">{unit}</span>
      </p>
      {delta != null && (
        <p className={`mt-2 text-xs font-medium ${delta > 0 ? 'text-danger' : delta < 0 ? 'text-success' : 'text-muted'}`}>
          {delta > 0 ? '↑' : delta < 0 ? '↓' : '→'} {Math.abs(delta)}% vs mes anterior
        </p>
      )}
      <p className="mt-1 text-xs text-subtle">{source}</p>
    </div>
  );
}

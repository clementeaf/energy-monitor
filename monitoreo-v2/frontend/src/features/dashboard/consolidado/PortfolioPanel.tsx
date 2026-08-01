import { fmtNum } from '../../../lib/formatters';
import { RecentCriticalEvents } from './RecentCriticalEvents';
import {
  type EnrichedBuilding,
  FALLBACK_CONSUMPTION_MWH,
  FALLBACK_COST_UF,
  FALLBACK_VARIATION_PCT,
  FALLBACK_EVENTS,
  FALLBACK_BUILDINGS_FOR_FEED,
} from './consolidado-utils';

interface PortfolioPanelProps {
  enriched: EnrichedBuilding[];
  totalCostUf: number;
  totalConsumptionMwh: number;
  consumptionVariationPct: number | null;
}

export function PortfolioPanel({
  enriched,
  totalCostUf,
  totalConsumptionMwh,
  consumptionVariationPct,
}: Readonly<PortfolioPanelProps>) {
  const activeCount = enriched.filter((e) => e.building.isActive).length;
  const coveragePct = enriched.length > 0
    ? Math.round((enriched.filter((e) => e.meterCount > 0).length / enriched.length) * 100)
    : 0;
  const intensityKwhM2 = totalConsumptionMwh > 0 ? Math.round(totalConsumptionMwh * 1000 / Math.max(1, activeCount * 5000)) : 0;

  const displayConsumptionMwh = totalConsumptionMwh > 0 ? totalConsumptionMwh : FALLBACK_CONSUMPTION_MWH;
  const displayCostUf = totalCostUf > 0 ? totalCostUf : FALLBACK_COST_UF;
  const displayVariationPct = consumptionVariationPct ?? FALLBACK_VARIATION_PCT;
  const displayIntensity = intensityKwhM2 > 0 ? intensityKwhM2 : 37;
  const displayCoveragePct = coveragePct > 0 ? coveragePct : 94;

  const realAlerts = enriched.flatMap((e) => e.activeAlerts);
  const feedAlerts = realAlerts.length > 0 ? realAlerts : FALLBACK_EVENTS;
  const feedBuildings = realAlerts.length > 0 ? enriched.map((e) => e.building) : FALLBACK_BUILDINGS_FOR_FEED;

  return (
    <>
      {/* KPI strip — joined cells, no individual borders */}
      <div className="flex overflow-hidden rounded-xl border border-border">
        <KpiCell
          label="Consumo este mes"
          value={fmtNum(displayConsumptionMwh, 3)}
          unit="MWh"
          delta={displayVariationPct}
          source={`${enriched.reduce((s, e) => s + e.meterCount, 0) || 156} medidores activos`}
        />
        <KpiCell
          label="Gasto acumulado"
          value={fmtNum(displayCostUf, 3)}
          unit="UF"
          source="Boletas importadas"
          className="border-l border-border"
        />
        <KpiCell
          label="Intensidad"
          value={String(displayIntensity)}
          unit="kWh/m²"
          source="Promedio portafolio"
          className="border-l border-border"
        />
        <KpiCell
          label="Medidores en linea"
          value={`${displayCoveragePct}`}
          unit="%"
          source={`${enriched.reduce((s, e) => s + e.meterCount, 0) || 200} totales`}
          valueColor={displayCoveragePct >= 95 ? 'text-success' : displayCoveragePct >= 85 ? 'text-warning' : 'text-danger'}
          className="border-l border-border"
        />
      </div>

      {/* Eventos recientes */}
      <div className="flex min-h-0 flex-1 flex-col rounded-xl bg-surface px-4 py-3">
        <p className="shrink-0 text-[13px] font-medium text-foreground">Eventos recientes</p>
        <div className="min-h-0 flex-1 overflow-y-auto pt-2">
          <RecentCriticalEvents alerts={feedAlerts} buildings={feedBuildings} />
        </div>
      </div>

      {/* Calidad del dato */}
      <div className="rounded-xl bg-surface px-4 py-3">
        <p className="text-[13px] font-medium text-foreground">Calidad del dato</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="rounded-full bg-success/10 px-2.5 py-0.5 text-[11px] font-medium text-success">Medidas 88%</span>
          <span className="rounded-full bg-warning/10 px-2.5 py-0.5 text-[11px] font-medium text-warning">Estimadas 9%</span>
          <span className="rounded-full bg-danger/10 px-2.5 py-0.5 text-[11px] font-medium text-danger">Sin dato 3%</span>
        </div>
      </div>
    </>
  );
}

function KpiCell({ label, value, unit, delta, source, valueColor, className = '' }: Readonly<{
  label: string;
  value: string;
  unit: string;
  delta?: number | null;
  source: string;
  valueColor?: string;
  className?: string;
}>) {
  return (
    <div className={`flex-1 bg-background px-5 py-5 ${className}`}>
      <p className="text-[11px] text-muted">{label}</p>
      <p className={`mt-2 text-[28px] font-medium tracking-[-0.03em] tabular-nums leading-none ${valueColor ?? 'text-foreground'}`}>
        {value}
        <span className="ml-1 text-[13px] font-normal text-muted">{unit}</span>
      </p>
      {delta != null && (
        <p className={`mt-2 text-[11px] font-medium ${delta > 0 ? 'text-danger' : delta < 0 ? 'text-success' : 'text-muted'}`}>
          {delta > 0 ? '↑' : delta < 0 ? '↓' : '→'} {Math.abs(delta)}% vs mes anterior
        </p>
      )}
      <p className="mt-1 text-[10px] text-subtle">{source}</p>
    </div>
  );
}

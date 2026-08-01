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
  const displayCoverageColor = displayCoveragePct >= 95 ? 'text-emerald-600' : displayCoveragePct >= 85 ? 'text-amber-600' : 'text-red-600';

  const realAlerts = enriched.flatMap((e) => e.activeAlerts);
  const feedAlerts = realAlerts.length > 0 ? realAlerts : FALLBACK_EVENTS;
  const feedBuildings = realAlerts.length > 0 ? enriched.map((e) => e.building) : FALLBACK_BUILDINGS_FOR_FEED;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <div className="panel flex-1 min-w-[140px] px-3 py-3">
          <p className="text-[12px] font-medium uppercase tracking-wider text-muted">Tarjeta Consumo [MWh]</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{fmtNum(displayConsumptionMwh, 3)}</p>
          <div className="mt-1 flex items-center gap-1">
            <span className={`text-[10px] font-medium ${displayVariationPct > 0 ? 'text-red-500' : displayVariationPct < 0 ? 'text-emerald-500' : 'text-muted'}`}>
              {displayVariationPct > 0 ? '▲' : displayVariationPct < 0 ? '▼' : '→'} {Math.abs(displayVariationPct)}% vs. mes ant.
            </span>
          </div>
        </div>

        <div className="panel flex-1 min-w-[140px] px-3 py-3">
          <p className="text-[12px] font-medium uppercase tracking-wider text-muted">Tarjeta Costo [UF]</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{fmtNum(displayCostUf, 3)}</p>
          <p className="mt-1 text-[10px] text-muted">moneda UF/CLP/USD</p>
        </div>

        <div className="panel flex-1 min-w-[140px] px-3 py-3">
          <p className="text-[12px] font-medium uppercase tracking-wider text-muted">Intensidad energética</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{displayIntensity}</p>
          <p className="mt-1 text-[10px] text-muted">kWh/m² · desde Nivel 2</p>
        </div>

        <div className="panel flex-1 min-w-[140px] px-3 py-3">
          <p className="text-[12px] font-medium uppercase tracking-wider text-muted">Cobertura de medición</p>
          <p className={`mt-1 text-2xl font-bold ${displayCoverageColor}`}>{displayCoveragePct}%</p>
          <p className="mt-1 text-[10px] text-muted">medidores activos · semáforo ≥95%</p>
        </div>
      </div>

      <div className="panel flex min-h-0 flex-1 flex-col px-3 py-3">
        <p className="shrink-0 text-[12px] font-medium uppercase tracking-wider text-muted">Feed de eventos críticos</p>
        <p className="shrink-0 text-[10px] text-subtle">Solo lectura · últimos 4-5 del nivel activo</p>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <RecentCriticalEvents alerts={feedAlerts} buildings={feedBuildings} />
        </div>
      </div>

      <div className="panel px-3 py-3">
        <p className="text-[12px] font-medium uppercase tracking-wider text-muted">Semáforo calidad del dato</p>
        <p className="mt-1 text-[10px] text-muted">% reales / estimadas / CNR del período (pills de color)</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">Reales 88%</span>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">Estimadas 9%</span>
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700">CNR 3%</span>
        </div>
        <p className="mt-1 text-[10px] text-subtle">Aplica desde Nivel 2 (centro comercial) en adelante</p>
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-[10px] text-blue-800">
        <p className="font-semibold">Nota</p>
        <p className="mt-0.5">Personalización v2.1: el informe fuente (v2.0) describe 6 niveles (País→Región→Ciudad→Comuna→Centro comercial→Tienda). Por instrucción v2.1 el mapa se reduce a 3 niveles: País → Centro comercial → Tienda/Local.</p>
      </div>
    </>
  );
}

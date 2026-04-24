import { useMemo, useState, type ReactElement } from 'react';
import { useBuildingsQuery } from '../../hooks/queries/useBuildingsQuery';
import { DropdownSelect } from '../../components/ui/DropdownSelect';
import { useAggregatedReadingsQuery } from '../../hooks/queries/useReadingsQuery';
import { StockChart } from '../../components/charts/StockChart';
import { Chart } from '../../components/charts/Chart';
import { TableStateBody } from '../../components/ui/TableStateBody';
import { DataWidget } from '../../components/ui/DataWidget';
import { useQueryState } from '../../hooks/useQueryState';

type Variable = 'energy' | 'demand' | 'cost';
type Horizon = 3 | 6 | 12;

const VARIABLE_LABELS: Record<Variable, string> = {
  energy: 'Energía (kWh)',
  demand: 'Demanda (kW)',
  cost: 'Costo estimado (CLP)',
};

const COST_RATE_CLP_KWH = 120; // reference rate for cost projection

interface MonthlyPoint {
  month: string;
  ts: number;
  energy: number;
  demand: number;
}

/**
 * Simple linear regression: y = slope * x + intercept
 */
function linearRegression(points: { x: number; y: number }[]): { slope: number; intercept: number } {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: points[0]?.y ?? 0 };

  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumXX += p.x * p.x;
  }
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

/**
 * Tendencias y Proyección — línea histórica + forecast con regresión lineal.
 * Ruta: `/analytics/trends`
 */
export function TrendsPage(): ReactElement {
  const [buildingFilter, setBuildingFilter] = useState('');
  const [variable, setVariable] = useState<Variable>('energy');
  const [horizon, setHorizon] = useState<Horizon>(3);

  // Fetch 365 days of monthly data
  const from = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return d.toISOString();
  }, []);
  const to = useMemo(() => new Date().toISOString(), []);

  const buildingsQuery = useBuildingsQuery();
  const aggQuery = useAggregatedReadingsQuery(
    { from, to, interval: 'monthly', buildingId: buildingFilter || undefined },
    true,
  );

  const qs = useQueryState(aggQuery, { isEmpty: (d) => !d || d.length === 0 });


  // Aggregate by month
  const monthly = useMemo((): MonthlyPoint[] => {
    const rows = aggQuery.data ?? [];
    const byMonth = new Map<string, { energy: number; demand: number }>();

    for (const r of rows) {
      const month = r.bucket.slice(0, 7);
      const cur = byMonth.get(month) ?? { energy: 0, demand: 0 };
      cur.energy += Number(r.energy_delta_kwh ?? 0);
      cur.demand = Math.max(cur.demand, Number(r.max_power_kw ?? 0));
      byMonth.set(month, cur);
    }

    return Array.from(byMonth.entries())
      .map(([month, v]) => ({
        month,
        ts: new Date(month + '-01').getTime(),
        energy: v.energy,
        demand: v.demand,
      }))
      .sort((a, b) => a.ts - b.ts);
  }, [aggQuery.data]);

  // Regression + forecast
  const { historical, forecast, variationPct } = useMemo(() => {
    const getValue = (p: MonthlyPoint) =>
      variable === 'energy' ? p.energy
        : variable === 'demand' ? p.demand
          : p.energy * COST_RATE_CLP_KWH;

    const histData = monthly.map((p) => ({
      x: p.ts,
      y: getValue(p),
      month: p.month,
    }));

    const reg = linearRegression(histData.map((d) => ({ x: d.x, y: d.y })));

    // Project forward
    const lastTs = monthly.length > 0 ? monthly[monthly.length - 1].ts : Date.now();
    const forecastData: { x: number; y: number; yLow: number; yHigh: number; month: string }[] = [];

    // Calculate residual std dev for confidence band
    const residuals = histData.map((d) => d.y - (reg.slope * d.x + reg.intercept));
    const stdDev = residuals.length > 0
      ? Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / residuals.length)
      : 0;

    for (let i = 1; i <= horizon; i++) {
      const d = new Date(lastTs);
      d.setMonth(d.getMonth() + i);
      const ts = d.getTime();
      const y = Math.max(0, reg.slope * ts + reg.intercept);
      forecastData.push({
        x: ts,
        y,
        yLow: Math.max(0, y - 1.96 * stdDev),
        yHigh: y + 1.96 * stdDev,
        month: d.toISOString().slice(0, 7),
      });
    }

    // Month-over-month variation %
    const variation = histData.map((d, i) => {
      if (i === 0) return { month: d.month, pct: 0 };
      const prev = histData[i - 1].y;
      return { month: d.month, pct: prev > 0 ? ((d.y - prev) / prev) * 100 : 0 };
    }).slice(1);

    return {
      historical: histData,
      forecast: forecastData,
      variationPct: variation,
    };
  }, [monthly, variable, horizon]);

  // Stock chart with historical + forecast
  const trendChartOptions = useMemo(() => {
    if (historical.length === 0) return null;

    return {
      title: { text: `${VARIABLE_LABELS[variable]} — Tendencia y proyección` },
      yAxis: [{ title: { text: VARIABLE_LABELS[variable] } }],
      series: [
        {
          type: 'line' as const,
          name: 'Histórico',
          data: historical.map((d) => [d.x, Math.round(d.y)]),
        },
        {
          type: 'line' as const,
          name: 'Proyección',
          data: forecast.map((d) => [d.x, Math.round(d.y)]),
          dashStyle: 'ShortDash' as const,
          color: '#f59e0b',
        },
        {
          type: 'arearange' as const,
          name: 'Intervalo confianza (95%)',
          data: forecast.map((d) => [d.x, Math.round(d.yLow), Math.round(d.yHigh)]),
          color: '#f59e0b',
          fillOpacity: 0.15,
          lineWidth: 0,
          linkedTo: ':previous',
        },
      ],
    };
  }, [historical, forecast, variable]);

  // Variation bar chart
  const variationChartOptions = useMemo(() => {
    if (variationPct.length === 0) return null;
    return {
      chart: { type: 'column' as const, height: 220 },
      title: { text: undefined },
      xAxis: { categories: variationPct.map((v) => v.month) },
      yAxis: { title: { text: '% variación' }, plotLines: [{ value: 0, width: 1, color: '#999' }] },
      tooltip: { valueSuffix: '%', valueDecimals: 1 },
      legend: { enabled: false },
      series: [{
        type: 'column' as const,
        name: 'Variación mes a mes',
        data: variationPct.map((v) => ({
          y: Math.round(v.pct * 10) / 10,
          color: v.pct >= 0 ? '#ef4444' : '#10b981',
        })),
      }],
    };
  }, [variationPct]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Tendencias y Proyección</h1>
        <div className="flex gap-2">
          <DropdownSelect
            options={[
              { value: '', label: 'Todos los edificios' },
              ...(buildingsQuery.data ?? []).map((b) => ({ value: b.id, label: b.name })),
            ]}
            value={buildingFilter}
            onChange={(val) => setBuildingFilter(val)}
            className="w-48"
          />
          <DropdownSelect
            options={[
              { value: 'energy', label: 'Energía (kWh)' },
              { value: 'demand', label: 'Demanda (kW)' },
              { value: 'cost', label: 'Costo (CLP)' },
            ]}
            value={variable}
            onChange={(val) => setVariable(val as Variable)}
            className="w-44"
          />
          <DropdownSelect
            options={[
              { value: '3', label: '3 meses' },
              { value: '6', label: '6 meses' },
              { value: '12', label: '12 meses' },
            ]}
            value={String(horizon)}
            onChange={(val) => setHorizon(Number(val) as Horizon)}
            className="w-36"
          />
        </div>
      </div>

      <DataWidget
        phase={qs.phase}
        error={qs.error}
        onRetry={() => { aggQuery.refetch(); }}
        emptyTitle="Sin datos"
        emptyDescription="No hay lecturas agregadas para generar tendencias."
      >
        {trendChartOptions && (
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <StockChart options={trendChartOptions} loading={aggQuery.isFetching} />
            <p className="mt-2 text-xs text-gray-400">
              Proyección basada en regresión lineal sobre datos históricos. Banda: intervalo de confianza 95%.
            </p>
          </div>
        )}

        {variationChartOptions && (
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="mb-2 text-sm font-medium text-gray-700">Variación mes a mes</h2>
            <Chart options={variationChartOptions} />
          </div>
        )}

        {/* Forecast table */}
        {forecast.length > 0 && (
          <div className="max-h-[70vh] overflow-y-auto rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 z-10 bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-2">Mes proyectado</th>
                  <th className="px-4 py-2 text-right">Estimado</th>
                  <th className="px-4 py-2 text-right">Rango inferior</th>
                  <th className="px-4 py-2 text-right">Rango superior</th>
                </tr>
              </thead>
              <TableStateBody
                phase={forecast.length > 0 ? 'ready' : 'empty'}
                colSpan={4}
                error={null}
                onRetry={() => { aggQuery.refetch(); }}
                emptyMessage="Sin proyecciones disponibles"
                skeletonWidths={['w-20', 'w-20', 'w-20', 'w-20']}
              >
                {forecast.map((f) => (
                  <tr key={f.month} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium text-gray-900">{f.month}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{fmt(f.y)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-gray-500">{fmt(f.yLow)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-gray-500">{fmt(f.yHigh)}</td>
                  </tr>
                ))}
              </TableStateBody>
            </table>
          </div>
        )}
      </DataWidget>
    </div>
  );
}

function fmt(val: number): string {
  return val.toLocaleString('es-CL', { maximumFractionDigits: 0 });
}

import { useMemo, useState, type ReactElement } from 'react';
import { useBuildingsQuery } from '../../hooks/queries/useBuildingsQuery';
import { useAggregatedReadingsQuery } from '../../hooks/queries/useReadingsQuery';
import { Chart } from '../../components/charts/Chart';
import { DataWidget } from '../../components/ui/DataWidget';
import { useQueryState } from '../../hooks/useQueryState';

type Sensitivity = 'high' | 'medium' | 'low';

const SENSITIVITY_THRESHOLD: Record<Sensitivity, number> = {
  high: 1.5,
  medium: 2.0,
  low: 3.0,
};

const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

interface HourlyBucket {
  dayOfWeek: number; // 0=Mon..6=Sun
  hour: number;
  avgEnergy: number;
  count: number;
}

interface Anomaly {
  bucket: string;
  value: number;
  expected: number;
  deviationPct: number;
  zScore: number;
}

/**
 * Patrones y Anomalías — heatmap consumo, detección de anomalías por z-score.
 * Ruta: `/analytics/patterns`
 */
export function PatternsPage(): ReactElement {
  const [buildingFilter, setBuildingFilter] = useState('');
  const [sensitivity, setSensitivity] = useState<Sensitivity>('medium');

  const from = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return d.toISOString();
  }, []);
  const to = useMemo(() => new Date().toISOString(), []);

  const buildingsQuery = useBuildingsQuery();
  const aggQuery = useAggregatedReadingsQuery(
    { from, to, interval: 'hourly', buildingId: buildingFilter || undefined },
    true,
  );

  const qs = useQueryState(aggQuery, { isEmpty: (d) => !d || d.length === 0 });
  const rows = aggQuery.data ?? [];

  // Aggregate energy by day-of-week × hour for heatmap
  const heatmapData = useMemo((): HourlyBucket[] => {
    const map = new Map<string, { sum: number; count: number }>();

    for (const r of rows) {
      const d = new Date(r.bucket);
      const dow = (d.getDay() + 6) % 7; // Mon=0..Sun=6
      const hour = d.getHours();
      const key = `${dow}-${hour}`;
      const cur = map.get(key) ?? { sum: 0, count: 0 };
      cur.sum += Number(r.energy_delta_kwh ?? 0);
      cur.count += 1;
      map.set(key, cur);
    }

    const result: HourlyBucket[] = [];
    for (const [key, v] of map.entries()) {
      const [dow, hour] = key.split('-').map(Number);
      result.push({
        dayOfWeek: dow,
        hour,
        avgEnergy: v.count > 0 ? v.sum / v.count : 0,
        count: v.count,
      });
    }
    return result;
  }, [rows]);

  // Heatmap chart options
  const heatmapOptions = useMemo(() => {
    if (heatmapData.length === 0) return null;

    const data = heatmapData.map((b) => [b.hour, b.dayOfWeek, Math.round(b.avgEnergy * 10) / 10]);

    return {
      chart: { type: 'heatmap' as const, height: 300 },
      title: { text: undefined },
      xAxis: {
        categories: Array.from({ length: 24 }, (_, i) => `${i}:00`),
        title: { text: 'Hora' },
      },
      yAxis: {
        categories: DAY_LABELS,
        title: { text: undefined },
        reversed: true,
      },
      colorAxis: {
        min: 0,
        minColor: '#f0fdf4',
        maxColor: '#15803d',
      },
      legend: { align: 'right' as const, layout: 'vertical' as const, verticalAlign: 'middle' as const },
      tooltip: {
        formatter: function (this: { point: { x: number; y: number; value: number } }): string {
          return `<b>${DAY_LABELS[this.point.y]} ${this.point.x}:00</b><br/>Promedio: ${this.point.value} kWh`;
        },
      },
      series: [{
        type: 'heatmap' as const,
        name: 'Consumo promedio (kWh)',
        data,
        borderWidth: 1,
        borderColor: '#fff',
      }],
    };
  }, [heatmapData]);

  // Anomaly detection via z-score on daily energy totals
  const anomalies = useMemo((): Anomaly[] => {
    // Aggregate to daily totals
    const daily = new Map<string, number>();
    for (const r of rows) {
      const day = r.bucket.slice(0, 10);
      daily.set(day, (daily.get(day) ?? 0) + Number(r.energy_delta_kwh ?? 0));
    }

    const values = Array.from(daily.values());
    if (values.length < 7) return [];

    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const stdDev = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length);
    if (stdDev === 0) return [];

    const threshold = SENSITIVITY_THRESHOLD[sensitivity];
    const result: Anomaly[] = [];

    for (const [day, val] of daily.entries()) {
      const z = Math.abs((val - mean) / stdDev);
      if (z >= threshold) {
        result.push({
          bucket: day,
          value: val,
          expected: mean,
          deviationPct: ((val - mean) / mean) * 100,
          zScore: z,
        });
      }
    }

    return result.sort((a, b) => b.zScore - a.zScore);
  }, [rows, sensitivity]);

  // Daily energy line chart with anomalies highlighted
  const dailyChartOptions = useMemo(() => {
    const daily = new Map<string, number>();
    for (const r of rows) {
      const day = r.bucket.slice(0, 10);
      daily.set(day, (daily.get(day) ?? 0) + Number(r.energy_delta_kwh ?? 0));
    }

    if (daily.size === 0) return null;
    const anomalySet = new Set(anomalies.map((a) => a.bucket));

    const sorted = Array.from(daily.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    const normalData: ([number, number] | null)[] = [];
    const anomalyData: ([number, number] | null)[] = [];

    for (const [day, val] of sorted) {
      const ts = new Date(day).getTime();
      if (anomalySet.has(day)) {
        anomalyData.push([ts, Math.round(val)]);
        normalData.push(null);
      } else {
        normalData.push([ts, Math.round(val)]);
        anomalyData.push(null);
      }
    }

    return {
      chart: { height: 280 },
      title: { text: undefined },
      xAxis: { type: 'datetime' as const },
      yAxis: { title: { text: 'kWh/día' } },
      tooltip: { shared: true },
      series: [
        { type: 'line' as const, name: 'Consumo diario', data: normalData.filter(Boolean), color: 'var(--color-primary, #3D3BF3)' },
        { type: 'scatter' as const, name: 'Anomalías', data: anomalyData.filter(Boolean), color: '#ef4444', marker: { radius: 6, symbol: 'diamond' } },
      ],
    };
  }, [rows, anomalies]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Patrones y Anomalías</h1>
        <div className="flex gap-2">
          <select
            value={buildingFilter}
            onChange={(e) => setBuildingFilter(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          >
            <option value="">Todos los edificios</option>
            {buildingsQuery.data?.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <select
            value={sensitivity}
            onChange={(e) => setSensitivity(e.target.value as Sensitivity)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          >
            <option value="high">Alta sensibilidad</option>
            <option value="medium">Media</option>
            <option value="low">Baja</option>
          </select>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard title="Días analizados" value={String(new Set(rows.map((r) => r.bucket.slice(0, 10))).size)} />
        <KpiCard
          title="Anomalías detectadas"
          value={String(anomalies.length)}
          color={anomalies.length > 0 ? 'text-red-600' : 'text-green-600'}
        />
        <KpiCard title="Sensibilidad" value={`z ≥ ${SENSITIVITY_THRESHOLD[sensitivity]}`} />
      </div>

      <DataWidget
        phase={qs.phase}
        error={qs.error}
        onRetry={() => { aggQuery.refetch(); }}
        emptyTitle="Sin datos"
        emptyDescription="No hay lecturas horarias para analizar patrones."
      >
        {/* Heatmap */}
        {heatmapOptions && (
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="mb-2 text-sm font-medium text-gray-700">Mapa de calor — consumo por hora y día de semana</h2>
            <Chart options={heatmapOptions} />
          </div>
        )}

        {/* Daily line + anomalies */}
        {dailyChartOptions && (
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="mb-2 text-sm font-medium text-gray-700">Consumo diario con anomalías</h2>
            <Chart options={dailyChartOptions} />
          </div>
        )}

        {/* Anomalies table */}
        {anomalies.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-2">Fecha</th>
                  <th className="px-4 py-2 text-right">Valor (kWh)</th>
                  <th className="px-4 py-2 text-right">Esperado (kWh)</th>
                  <th className="px-4 py-2 text-right">Desviación %</th>
                  <th className="px-4 py-2 text-right">z-Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {anomalies.map((a) => (
                  <tr key={a.bucket} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium text-gray-900">{a.bucket}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{Math.round(a.value).toLocaleString('es-CL')}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-gray-500">{Math.round(a.expected).toLocaleString('es-CL')}</td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      <span className={a.deviationPct > 0 ? 'text-red-600' : 'text-green-600'}>
                        {a.deviationPct > 0 ? '+' : ''}{a.deviationPct.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums font-mono">{a.zScore.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {anomalies.length === 0 && rows.length > 0 && (
          <p className="text-sm text-gray-500">No se detectaron anomalías con la sensibilidad seleccionada.</p>
        )}
      </DataWidget>
    </div>
  );
}

function KpiCard({ title, value, color = 'text-gray-900' }: Readonly<{ title: string; value: string; color?: string }>): ReactElement {
  return (
    <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200">
      <p className="text-xs font-medium text-gray-500">{title}</p>
      <p className={`mt-1 text-lg font-semibold ${color}`}>{value}</p>
    </div>
  );
}

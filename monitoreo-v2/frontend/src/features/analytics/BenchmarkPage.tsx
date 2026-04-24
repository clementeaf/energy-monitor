import { useMemo, useState, type ReactElement } from 'react';
import type { SeriesOptionsType } from 'highcharts';
import { DropdownSelect } from '../../components/ui/DropdownSelect';
import { useBuildingsQuery } from '../../hooks/queries/useBuildingsQuery';
import { useMetersQuery } from '../../hooks/queries/useMetersQuery';
import { useAggregatedReadingsQuery } from '../../hooks/queries/useReadingsQuery';
import { Chart } from '../../components/charts/Chart';
import { TableStateBody } from '../../components/ui/TableStateBody';
import { useQueryState } from '../../hooks/useQueryState';
import {
  dateRangeFromPreset,
  meterToBuildingMap,
  countMetersByBuilding,
  compareMetricsByBuilding,
} from '../dashboard/dashboardAggregations';
import type { Building } from '../../types/building';

type RangePreset = '30d' | '90d' | '365d';
type Metric = 'kwhPerSqm' | 'peakDemand' | 'avgPf';

interface BenchmarkRow {
  buildingId: string;
  buildingName: string;
  areaSqm: number;
  meterCount: number;
  energyKwh: number;
  kwhPerSqm: number;
  peakDemandKw: number;
  avgPf: number;
  rank: number;
}

const METRIC_LABELS: Record<Metric, string> = {
  kwhPerSqm: 'kWh/m²',
  peakDemand: 'Demanda peak (kW)',
  avgPf: 'Factor de potencia',
};

/**
 * Benchmarking entre edificios — ranking por eficiencia energética.
 * Ruta: `/analytics/benchmark`
 */
export function BenchmarkPage(): ReactElement {
  const [preset, setPreset] = useState<RangePreset>('90d');
  const [metric, setMetric] = useState<Metric>('kwhPerSqm');
  const { from, to } = useMemo(() => dateRangeFromPreset(preset as '7d' | '30d' | '90d'), [preset]);

  const buildingsQuery = useBuildingsQuery();
  const metersQuery = useMetersQuery();
  const aggQuery = useAggregatedReadingsQuery(
    { from, to, interval: 'daily' },
    true,
  );

  const qs = useQueryState(buildingsQuery, { isEmpty: (d) => !d || d.length === 0 });

  const buildings = buildingsQuery.data ?? [];
  const meters = metersQuery.data ?? [];
  const aggRows = aggQuery.data ?? [];

  const meterById = useMemo(() => meterToBuildingMap(meters), [meters]);
  const metersByBuilding = useMemo(() => countMetersByBuilding(meters), [meters]);

  const allBuildingIds = useMemo(() => buildings.map((b) => b.id), [buildings]);
  const metricsMap = useMemo(
    () => compareMetricsByBuilding(aggRows, meterById, allBuildingIds),
    [aggRows, meterById, allBuildingIds],
  );

  const rows = useMemo((): BenchmarkRow[] => {
    const buildingMap = new Map<string, Building>();
    buildings.forEach((b) => buildingMap.set(b.id, b));

    const result: BenchmarkRow[] = [];
    for (const [bid, m] of metricsMap.entries()) {
      const b = buildingMap.get(bid);
      if (!b) continue;
      const area = b.areaSqm != null ? Number(b.areaSqm) : 0;
      result.push({
        buildingId: bid,
        buildingName: b.name,
        areaSqm: area,
        meterCount: metersByBuilding.get(bid) ?? 0,
        energyKwh: m.energyKwh,
        kwhPerSqm: area > 0 ? m.energyKwh / area : 0,
        peakDemandKw: m.peakDemandKw,
        avgPf: m.avgPf,
        rank: 0,
      });
    }

    // Sort by selected metric (lower kWh/m² = better, higher PF = better)
    if (metric === 'avgPf') {
      result.sort((a, b) => b.avgPf - a.avgPf);
    } else if (metric === 'peakDemand') {
      result.sort((a, b) => a.peakDemandKw - b.peakDemandKw);
    } else {
      result.sort((a, b) => a.kwhPerSqm - b.kwhPerSqm);
    }
    result.forEach((r, i) => { r.rank = i + 1; });
    return result;
  }, [buildings, metricsMap, metersByBuilding, metric]);

  // Bar chart
  const barChartOptions = useMemo(() => {
    if (rows.length === 0) return null;
    const categories = rows.map((r) => r.buildingName);
    const metricValue = (r: BenchmarkRow) =>
      metric === 'kwhPerSqm' ? r.kwhPerSqm
        : metric === 'peakDemand' ? r.peakDemandKw
          : r.avgPf;

    const data = rows.map((r) => Math.round(metricValue(r) * 100) / 100);

    return {
      chart: { type: 'bar' as const, height: Math.max(250, rows.length * 50) },
      title: { text: undefined },
      xAxis: { categories },
      yAxis: { title: { text: METRIC_LABELS[metric] } },
      tooltip: { valueSuffix: metric === 'avgPf' ? '' : metric === 'kwhPerSqm' ? ' kWh/m²' : ' kW' },
      legend: { enabled: false },
      series: [{
        type: 'bar' as const,
        name: METRIC_LABELS[metric],
        data,
        color: 'var(--color-primary, #3D3BF3)',
      }] satisfies SeriesOptionsType[],
    };
  }, [rows, metric]);

  // Radar chart (multi-KPI)
  const radarChartOptions = useMemo(() => {
    if (rows.length === 0) return null;

    // Normalize each metric to 0-100 scale for radar
    const maxKwh = Math.max(...rows.map((r) => r.kwhPerSqm), 1);
    const maxDemand = Math.max(...rows.map((r) => r.peakDemandKw), 1);

    const categories = ['kWh/m²', 'Demanda peak', 'Factor potencia', 'Medidores'];

    const series: SeriesOptionsType[] = rows.slice(0, 5).map((r) => ({
      type: 'line' as const,
      name: r.buildingName,
      data: [
        Math.round((1 - r.kwhPerSqm / maxKwh) * 100), // inverted: less is better
        Math.round((1 - r.peakDemandKw / maxDemand) * 100),
        Math.round(r.avgPf * 100),
        r.meterCount,
      ],
    }));

    return {
      chart: { polar: true, type: 'line' as const, height: 350 },
      title: { text: undefined },
      xAxis: { categories, tickmarkPlacement: 'on' as const, lineWidth: 0 },
      yAxis: { gridLineInterpolation: 'polygon' as const, min: 0 },
      legend: { align: 'center' as const },
      series,
    };
  }, [rows]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Benchmarking entre Edificios</h1>
        <div className="flex gap-2">
          <DropdownSelect
            options={[
              { value: '30d', label: '30 días' },
              { value: '90d', label: '90 días' },
              { value: '365d', label: '1 año' },
            ]}
            value={preset}
            onChange={(val) => setPreset(val as RangePreset)}
            className="w-36"
          />
          <DropdownSelect
            options={[
              { value: 'kwhPerSqm', label: 'kWh/m²' },
              { value: 'peakDemand', label: 'Demanda peak' },
              { value: 'avgPf', label: 'Factor de potencia' },
            ]}
            value={metric}
            onChange={(val) => setMetric(val as Metric)}
            className="w-48"
          />
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {barChartOptions && (
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="mb-2 text-sm font-medium text-gray-700">Ranking por {METRIC_LABELS[metric]}</h2>
            <Chart options={barChartOptions} />
          </div>
        )}
        {radarChartOptions && (
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="mb-2 text-sm font-medium text-gray-700">Comparativo multi-KPI (top 5)</h2>
            <Chart options={radarChartOptions} />
          </div>
        )}
      </div>

      {/* Ranking table */}
      <div className="max-h-[70vh] overflow-y-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 z-10 bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2">#</th>
              <th className="px-4 py-2">Edificio</th>
              <th className="px-4 py-2 text-right">Área (m²)</th>
              <th className="px-4 py-2 text-right">Medidores</th>
              <th className="px-4 py-2 text-right">Energía (kWh)</th>
              <th className="px-4 py-2 text-right">kWh/m²</th>
              <th className="px-4 py-2 text-right">Demanda peak (kW)</th>
              <th className="px-4 py-2 text-right">FP promedio</th>
            </tr>
          </thead>
          <TableStateBody
            phase={qs.phase === 'loading' || aggQuery.isPending ? 'loading' : rows.length === 0 ? 'empty' : 'ready'}
            colSpan={8}
            error={qs.error ?? aggQuery.error}
            onRetry={() => { buildingsQuery.refetch(); aggQuery.refetch(); }}
            emptyMessage="No hay datos de edificios o lecturas para el periodo seleccionado."
            skeletonWidths={['w-8', 'w-28', 'w-16', 'w-12', 'w-20', 'w-16', 'w-20', 'w-16']}
          >
            {rows.map((r) => (
              <tr key={r.buildingId} className="hover:bg-gray-50">
                <td className="px-4 py-2 text-gray-500">{r.rank}</td>
                <td className="px-4 py-2 font-medium text-gray-900">{r.buildingName}</td>
                <td className="px-4 py-2 text-right tabular-nums">{r.areaSqm > 0 ? r.areaSqm.toLocaleString('es-CL') : '—'}</td>
                <td className="px-4 py-2 text-right tabular-nums">{r.meterCount}</td>
                <td className="px-4 py-2 text-right tabular-nums">{r.energyKwh.toLocaleString('es-CL', { maximumFractionDigits: 0 })}</td>
                <td className="px-4 py-2 text-right tabular-nums font-semibold">{r.kwhPerSqm > 0 ? r.kwhPerSqm.toFixed(2) : '—'}</td>
                <td className="px-4 py-2 text-right tabular-nums">{r.peakDemandKw.toFixed(1)}</td>
                <td className="px-4 py-2 text-right tabular-nums">{r.avgPf > 0 ? r.avgPf.toFixed(3) : '—'}</td>
              </tr>
            ))}
          </TableStateBody>
        </table>
      </div>
    </div>
  );
}

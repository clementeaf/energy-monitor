import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router';
import { useBuildingsQuery } from '../../../hooks/queries/useBuildingsQuery';
import { useMetersQuery } from '../../../hooks/queries/useMetersQuery';
import { useAggregatedReadingsQuery } from '../../../hooks/queries/useReadingsQuery';
import { StockChart } from '../../../components/charts/StockChart';
import { DataWidget } from '../../../components/ui/DataWidget';
import { useQueryState } from '../../../hooks/useQueryState';
import type { ReadingResolution } from '../../../types/reading';

const pickResolution = (rangeMs: number): ReadingResolution => {
  if (rangeMs <= 86_400_000) return 'raw';
  if (rangeMs <= 604_800_000) return '15min';
  if (rangeMs <= 2_592_000_000) return '1h';
  return '1d';
};

export function DemandPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const buildingsQuery = useBuildingsQuery();
  const building = buildingsQuery.data?.find((b) => b.id === siteId);
  const metersQuery = useMetersQuery(siteId);
  const meters = metersQuery.data ?? [];

  // Date range for aggregated data
  const now = useMemo(() => new Date(), []);
  const defaultFrom = useMemo(() => {
    const d = new Date(now);
    d.setDate(d.getDate() - 30);
    return d.toISOString();
  }, [now]);

  const [range, setRange] = useState({
    from: defaultFrom,
    to: now.toISOString(),
    resolution: '1h' as ReadingResolution,
  });

  const aggQuery = useAggregatedReadingsQuery(
    { from: range.from, to: range.to, interval: 'hourly', buildingId: siteId },
    !!siteId,
  );

  const aggQs = useQueryState(aggQuery, {
    isEmpty: (d) => !d || d.length === 0,
  });

  const aggData = aggQuery.data ?? [];

  // Compute max contracted demand from meters
  const maxContracted = useMemo(() => {
    return meters.reduce((max, m) => {
      const kw = Number(m.contractedDemandKw || 0);
      return kw > max ? kw : max;
    }, 0);
  }, [meters]);

  // Aggregate by bucket: sum power across all meters per time bucket
  const demandByBucket = useMemo(() => {
    const map = new Map<string, { bucket: string; totalPower: number; maxPower: number }>();
    aggData.forEach((r) => {
      const existing = map.get(r.bucket);
      const avg = Number(r.avg_power_kw || 0);
      const max = Number(r.max_power_kw || 0);
      if (existing) {
        existing.totalPower += avg;
        existing.maxPower = Math.max(existing.maxPower, max);
      } else {
        map.set(r.bucket, { bucket: r.bucket, totalPower: avg, maxPower: max });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.bucket.localeCompare(b.bucket));
  }, [aggData]);

  // Peak demand
  const peakDemand = useMemo(() => {
    if (demandByBucket.length === 0) return { value: 0, time: '' };
    const peak = demandByBucket.reduce((best, cur) =>
      cur.maxPower > best.maxPower ? cur : best,
    );
    return { value: peak.maxPower, time: peak.bucket };
  }, [demandByBucket]);

  // Top 10 peaks for history table
  const topPeaks = useMemo(() => {
    return [...demandByBucket]
      .sort((a, b) => b.maxPower - a.maxPower)
      .slice(0, 10);
  }, [demandByBucket]);

  const chartOptions = useMemo(() => {
    const powerSeries = demandByBucket.map((d) => [new Date(d.bucket).getTime(), d.totalPower]);
    const peakSeries = demandByBucket.map((d) => [new Date(d.bucket).getTime(), d.maxPower]);

    return {
      title: { text: `Demanda — ${building?.name ?? 'Sitio'}` },
      yAxis: [
        { title: { text: 'Potencia (kW)' }, opposite: false,
          plotLines: maxContracted > 0 ? [{
            value: maxContracted,
            color: '#ef4444',
            width: 2,
            dashStyle: 'Dash' as const,
            label: { text: `Contratada: ${maxContracted} kW`, style: { color: '#ef4444', fontSize: '10px' } },
          }] : [],
        },
      ],
      series: [
        { type: 'area' as const, name: 'Potencia promedio (kW)', data: powerSeries, yAxis: 0 },
        { type: 'line' as const, name: 'Potencia max (kW)', data: peakSeries, yAxis: 0, dashStyle: 'ShortDot' as const },
      ],
    };
  }, [demandByBucket, building, maxContracted]);

  const handleRangeChange = (min: number, max: number) => {
    const rangeMs = max - min;
    setRange({
      from: new Date(min).toISOString(),
      to: new Date(max).toISOString(),
      resolution: pickResolution(rangeMs),
    });
  };

  const peakPct = maxContracted > 0 ? ((peakDemand.value / maxContracted) * 100).toFixed(1) : null;

  return (
    <div className="space-y-4">
      <nav className="flex items-center gap-1 text-sm text-gray-500">
        <Link to="/monitoring/realtime" className="hover:text-gray-700">Monitoreo</Link>
        <span>/</span>
        <Link to={`/monitoring/drilldown/${siteId}`} className="hover:text-gray-700">{building?.name ?? 'Sitio'}</Link>
        <span>/</span>
        <span className="text-gray-900">Demanda</span>
      </nav>

      <h1 className="text-2xl font-semibold text-gray-900">Demanda — {building?.name ?? 'Sitio'}</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card title="Peak demand" value={`${peakDemand.value.toFixed(1)} kW`} sub={peakDemand.time ? new Date(peakDemand.time).toLocaleString('es-CL') : '—'} />
        <Card
          title="Contratada"
          value={maxContracted > 0 ? `${maxContracted} kW` : 'No definida'}
          sub={peakPct ? `${peakPct}% utilizado` : '—'}
        />
        <Card title="Medidores" value={String(meters.length)} sub={`${building?.code ?? ''}`} />
      </div>

      <DataWidget
        phase={aggQs.phase}
        error={aggQs.error}
        onRetry={() => { void aggQuery.refetch(); }}
        emptyTitle="Sin datos de demanda"
        emptyDescription="No hay datos agregados para el periodo seleccionado."
      >
        <StockChart
          options={chartOptions}
          loading={aggQuery.isFetching}
          onRangeChange={handleRangeChange}
        />
      </DataWidget>

      {topPeaks.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <h2 className="border-b border-gray-200 px-4 py-3 text-sm font-medium text-gray-700">
            Top 10 Peaks
          </h2>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <Th>#</Th>
                <Th>Potencia Max (kW)</Th>
                <Th>Fecha/Hora</Th>
                {maxContracted > 0 && <Th>% Contratada</Th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {topPeaks.map((p, i) => (
                <tr key={p.bucket} className="hover:bg-gray-50">
                  <Td>{i + 1}</Td>
                  <Td className="font-medium">{p.maxPower.toFixed(1)}</Td>
                  <Td>{new Date(p.bucket).toLocaleString('es-CL')}</Td>
                  {maxContracted > 0 && (
                    <Td>
                      <span className={p.maxPower > maxContracted ? 'font-semibold text-red-600' : ''}>
                        {((p.maxPower / maxContracted) * 100).toFixed(1)}%
                      </span>
                    </Td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Card({ title, value, sub }: { title: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200">
      <p className="text-xs font-medium text-gray-500">{title}</p>
      <p className="mt-1 text-lg font-semibold text-gray-900">{value}</p>
      <p className="text-xs text-gray-400">{sub}</p>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
      {children}
    </th>
  );
}

function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`whitespace-nowrap px-4 py-3 text-sm text-gray-700 ${className}`}>{children}</td>;
}

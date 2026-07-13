import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router';
import { useBuildingsQuery } from '../../../hooks/queries/useBuildingsQuery';
import { useMetersQuery } from '../../../hooks/queries/useMetersQuery';
import { useAggregatedReadingsQuery } from '../../../hooks/queries/useReadingsQuery';
import { StockChart } from '../../../components/charts/StockChart';
import { DataWidget } from '../../../components/ui/DataWidget';
import { TableStateBody } from '../../../components/ui/TableStateBody';
import { useQueryState } from '../../../hooks/useQueryState';
import type { ReadingResolution } from '../../../types/reading';
import { PageHeader } from '../../../components/ui/PageHeader';

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
    {
      from: range.from,
      to: range.to,
      interval: 'hourly',
      groupBy: 'building',
      buildingId: siteId,
    },
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
    demandByBucket[0]);
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
    <div className="space-y-6">
      <nav className="flex items-center gap-1 text-sm text-muted">
        <Link to="/monitoring/realtime" className="hover:text-foreground">Monitoreo</Link>
        <span>/</span>
        <Link to={`/monitoring/drilldown/${siteId}`} className="hover:text-foreground">{building?.name ?? 'Sitio'}</Link>
        <span>/</span>
        <span className="text-foreground">Demanda</span>
      </nav>

      <PageHeader title={`Demanda — ${building?.name ?? 'Sitio'}`} eyebrow="Monitoreo" />

      {metersQuery.isPending ? (
        <div className="animate-pulse grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-lg bg-background p-4 shadow-sm ring-1 ring-border">
              <div className="h-3 w-20 rounded bg-raised" />
              <div className="mt-2 h-6 w-24 rounded bg-raised" />
              <div className="mt-1 h-3 w-16 rounded bg-raised" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card title="Peak demand" value={`${peakDemand.value.toFixed(1)} kW`} sub={peakDemand.time ? new Date(peakDemand.time).toLocaleString('es-CL') : '—'} />
          <Card
            title="Contratada"
            value={maxContracted > 0 ? `${maxContracted} kW` : 'No definida'}
            sub={peakPct ? `${peakPct}% utilizado` : '—'}
          />
          <Card title="Medidores" value={String(meters.length)} sub={`${building?.code ?? ''}`} />
        </div>
      )}

      {aggQs.phase === 'loading' ? (
        <div className="animate-pulse panel p-4">
          <div className="h-64 w-full rounded bg-raised" />
        </div>
      ) : (
      <DataWidget
        phase={aggQs.phase}
        error={aggQs.error}
        onRetry={() => { aggQuery.refetch(); }}
        emptyTitle="Sin datos de demanda"
        emptyDescription="No hay datos agregados para el periodo seleccionado."
      >
        <StockChart
          options={chartOptions}
          loading={aggQuery.isFetching}
          onRangeChange={handleRangeChange}
        />
      </DataWidget>
      )}

      {topPeaks.length > 0 && (
        <div className="overflow-auto panel">
          <h2 className="border-b border-border px-4 py-3 text-sm font-medium text-foreground">
            Top 10 Peaks
          </h2>
          <table className="min-w-full divide-y divide-border">
            <thead className="sticky top-0 z-10 bg-surface">
              <tr>
                <Th>#</Th>
                <Th>Potencia Max (kW)</Th>
                <Th>Fecha/Hora</Th>
                {maxContracted > 0 && <Th>% Contratada</Th>}
              </tr>
            </thead>
            <TableStateBody
              phase="ready"
              colSpan={maxContracted > 0 ? 4 : 3}
              emptyMessage="Sin peaks registrados."
            >
              {topPeaks.map((p, i) => (
                <tr key={p.bucket} className="hover:bg-surface">
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
            </TableStateBody>
          </table>
        </div>
      )}
    </div>
  );
}

function Card({ title, value, sub }: Readonly<{ title: string; value: string; sub: string }>) {
  return (
    <div className="rounded-lg bg-background p-4 shadow-sm ring-1 ring-border">
      <p className="text-xs font-medium text-muted">{title}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
      <p className="text-xs text-subtle">{sub}</p>
    </div>
  );
}

function Th({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted">
      {children}
    </th>
  );
}

function Td({ children, className = '' }: Readonly<{ children: React.ReactNode; className?: string }>) {
  return <td className={`whitespace-nowrap px-4 py-3 text-sm text-foreground ${className}`}>{children}</td>;
}

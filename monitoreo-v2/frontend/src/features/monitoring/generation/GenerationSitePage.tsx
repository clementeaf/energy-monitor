import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useBuildingsQuery } from '../../../hooks/queries/useBuildingsQuery';
import { useMetersQuery } from '../../../hooks/queries/useMetersQuery';
import { useAggregatedReadingsQuery } from '../../../hooks/queries/useReadingsQuery';
import { StockChart } from '../../../components/charts/StockChart';
import { DataWidget } from '../../../components/ui/DataWidget';
import type { QueryUiPhase } from '../../../hooks/useQueryState';
import type { AggregatedReading } from '../../../types/reading';
import { isGenerationMeterType } from '../lib/meterClassification';
import { PageHeader } from '../../../components/ui/PageHeader';

/**
 * Conviere filas agregadas (una por bucket) en mapa bucket -> valor.
 * @param rows - Filas del API con groupBy building
 * @param field - Campo numerico a leer
 * @returns Map bucket ISO -> total
 */
function rowsToBucketMap(
  rows: AggregatedReading[],
  field: 'avg_power_kw' | 'energy_delta_kwh',
): Map<string, number> {
  const map = new Map<string, number>();
  for (const r of rows) {
    const v = Number(r[field] ?? 0);
    if (Number.isNaN(v)) continue;
    map.set(r.bucket, (map.get(r.bucket) ?? 0) + v);
  }
  return map;
}

/**
 * Suma todos los valores de un mapa bucket.
 * @param bucketMap - Mapa bucket -> valor
 * @returns Total numerico
 */
function sumBucketValues(bucketMap: Map<string, number>): number {
  let total = 0;
  for (const v of bucketMap.values()) total += v;
  return total;
}

/**
 * Promedio de ratio de autoconsumo instantaneo: min(gen, carga) / gen cuando la generacion es positiva.
 * @param genByBucket - Potencia generacion por bucket
 * @param loadByBucket - Potencia carga por bucket
 * @returns Porcentaje 0-100 o null si no aplica
 */
function averageSelfConsumptionRatio(
  genByBucket: Map<string, number>,
  loadByBucket: Map<string, number>,
): number | null {
  const ratios: number[] = [];
  for (const [bucket, gKw] of genByBucket) {
    if (gKw <= 0) continue;
    const lKw = loadByBucket.get(bucket) ?? 0;
    ratios.push((Math.min(gKw, lKw) / gKw) * 100);
  }
  if (ratios.length === 0) return null;
  return ratios.reduce((a, b) => a + b, 0) / ratios.length;
}

export function GenerationSitePage() {
  const { siteId } = useParams<{ siteId: string }>();
  const navigate = useNavigate();
  const buildingsQuery = useBuildingsQuery();
  const building = buildingsQuery.data?.find((b) => b.id === siteId);

  const metersQuery = useMetersQuery(siteId);
  const meters = metersQuery.data ?? [];

  const genCount = useMemo(
    () => meters.filter((m) => isGenerationMeterType(m.meterType)).length,
    [meters],
  );
  const loadCount = useMemo(
    () => meters.filter((m) => !isGenerationMeterType(m.meterType)).length,
    [meters],
  );

  const now = useMemo(() => new Date(), []);
  const defaultFrom = useMemo(() => {
    const d = new Date(now);
    d.setDate(d.getDate() - 30);
    return d.toISOString();
  }, [now]);

  const [range, setRange] = useState({
    from: defaultFrom,
    to: now.toISOString(),
  });

  const aggBase = useMemo(
    () => ({
      from: range.from,
      to: range.to,
      interval: 'hourly' as const,
      groupBy: 'building' as const,
      buildingId: siteId,
    }),
    [range.from, range.to, siteId],
  );

  const genQuery = useAggregatedReadingsQuery(
    { ...aggBase, meterRole: 'generation' },
    !!siteId,
  );
  const loadQuery = useAggregatedReadingsQuery(
    { ...aggBase, meterRole: 'load' },
    !!siteId,
  );

  const aggPhase = useMemo((): QueryUiPhase => {
    if (genQuery.isPending || loadQuery.isPending) return 'loading';
    if (genQuery.isError || loadQuery.isError) return 'error';
    const empty = (genQuery.data?.length ?? 0) === 0 && (loadQuery.data?.length ?? 0) === 0;
    if (empty) return 'empty';
    return 'ready';
  }, [
    genQuery.isPending,
    loadQuery.isPending,
    genQuery.isError,
    loadQuery.isError,
    genQuery.data,
    loadQuery.data,
  ]);

  const genByBucket = useMemo(
    () => rowsToBucketMap(genQuery.data ?? [], 'avg_power_kw'),
    [genQuery.data],
  );
  const loadByBucket = useMemo(
    () => rowsToBucketMap(loadQuery.data ?? [], 'avg_power_kw'),
    [loadQuery.data],
  );

  const energyGenKwh = useMemo(
    () => sumBucketValues(rowsToBucketMap(genQuery.data ?? [], 'energy_delta_kwh')),
    [genQuery.data],
  );

  const energyLoadKwh = useMemo(
    () => sumBucketValues(rowsToBucketMap(loadQuery.data ?? [], 'energy_delta_kwh')),
    [loadQuery.data],
  );

  const selfPct = useMemo(
    () => averageSelfConsumptionRatio(genByBucket, loadByBucket),
    [genByBucket, loadByBucket],
  );

  const chartOptions = useMemo(() => {
    const buckets = [...new Set([...genByBucket.keys(), ...loadByBucket.keys()])].sort((a, b) =>
      a.localeCompare(b),
    );
    const genSeries = buckets.map((b) => [new Date(b).getTime(), genByBucket.get(b) ?? 0] as [number, number]);
    const loadSeries = buckets.map((b) => [new Date(b).getTime(), loadByBucket.get(b) ?? 0] as [number, number]);

    return {
      title: { text: `Generacion vs consumo — ${building?.name ?? 'Sitio'}` },
      yAxis: [{ title: { text: 'Potencia (kW)' }, opposite: false }],
      series: [
        { type: 'area' as const, name: 'Generacion (kW)', data: genSeries, yAxis: 0 },
        { type: 'line' as const, name: 'Carga medida (kW)', data: loadSeries, yAxis: 0 },
      ],
    };
  }, [genByBucket, loadByBucket, building]);

  const handleRangeChange = (min: number, max: number): void => {
    setRange({
      from: new Date(min).toISOString(),
      to: new Date(max).toISOString(),
    });
  };

  const isLoading = metersQuery.isLoading || genQuery.isLoading || loadQuery.isLoading;
  const isFetching = genQuery.isFetching || loadQuery.isFetching;

  const refetchAll = (): void => {
    void genQuery.refetch();
    void loadQuery.refetch();
  };

  if (!siteId) {
    return (
      <div className="space-y-6">
        <PageHeader title="Generacion por sitio" eyebrow="Monitoreo" />
        <p className="text-sm text-muted">Seleccione un edificio para ver curvas y balance.</p>
        <div className="flex flex-wrap gap-3">
          {(buildingsQuery.data ?? []).map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => { navigate(`/monitoring/generation/${b.id}`); }}
              className="rounded-lg bg-background p-4 text-left shadow-sm ring-1 ring-border transition-colors hover:ring-brand"
            >
              <p className="font-medium text-foreground">{b.name}</p>
              <p className="text-xs text-muted">{b.code}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <nav className="flex items-center gap-1 text-sm text-muted">
        <Link to="/monitoring/realtime" className="hover:text-foreground">Monitoreo</Link>
        <span>/</span>
        <Link to="/monitoring/generation" className="hover:text-foreground">Generacion</Link>
        <span>/</span>
        <span className="text-foreground">{building?.name ?? 'Sitio'}</span>
      </nav>

      <PageHeader
        title={`Generación — ${building?.name ?? 'Sitio'}`}
        eyebrow="Monitoreo"
        description="Medidores con tipo generación / solar / PV se suman como generación; el resto del sitio como carga. Configure el tipo de medidor en la ficha de cada medidor."
      />

      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          <div className="flex flex-wrap gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="panel p-4 shadow-sm">
                <div className="h-3 w-24 rounded bg-raised" />
                <div className="mt-2 h-6 w-20 rounded bg-gray-300" />
                <div className="mt-1 h-3 w-32 rounded bg-raised" />
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="panel p-4 shadow-sm">
                <div className="h-3 w-24 rounded bg-raised" />
                <div className="mt-2 h-6 w-28 rounded bg-gray-300" />
                <div className="mt-1 h-3 w-36 rounded bg-raised" />
              </div>
            ))}
          </div>
          <div className="panel p-4 shadow-sm">
            <div className="h-64 rounded bg-raised" />
          </div>
        </div>
      ) : (
        <>
      <div className="flex flex-wrap gap-3">
        <Kpi title="Medidores generacion" value={String(genCount)} sub="Tipos solar / PV / generation" />
        <Kpi title="Medidores carga" value={String(loadCount)} sub="Resto electricos en el sitio" />
        <Kpi
          title="Energia generada (periodo)"
          value={`${energyGenKwh.toFixed(0)} kWh`}
          sub="Suma delta energia medidores gen."
        />
        <Kpi
          title="Autoconsumo estimado"
          value={selfPct != null ? `${selfPct.toFixed(1)} %` : '—'}
          sub="Prom. min(gen,carga)/gen por hora"
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <Kpi title="Energia carga (periodo)" value={`${energyLoadKwh.toFixed(0)} kWh`} sub="Suma delta medidores carga" />
        <Kpi
          title="Balance"
          value={
            energyGenKwh > 0
              ? `${(energyLoadKwh - energyGenKwh).toFixed(0)} kWh neto importado`
              : 'Sin datos generacion'
          }
          sub="Carga minus generacion (aprox.)"
        />
      </div>

      {genCount === 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          No hay medidores marcados como generacion en este edificio. Asigne tipo (p. ej. solar o generation) en
          Medidores o use la vista solo para curva de carga.
        </div>
      )}

      <DataWidget
        phase={aggPhase}
        error={genQuery.error ?? loadQuery.error}
        onRetry={refetchAll}
        emptyTitle="Sin series agregadas"
        emptyDescription="No hay lecturas en el rango para este sitio."
      >
        <StockChart
          options={chartOptions}
          loading={isFetching}
          onRangeChange={handleRangeChange}
        />
      </DataWidget>
        </>
      )}
    </div>
  );
}

function Kpi({ title, value, sub }: Readonly<{ title: string; value: string; sub: string }>) {
  return (
    <div className="panel flex-1 min-w-[160px] p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{title}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
      <p className="text-xs text-subtle">{sub}</p>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useBuildingsQuery } from '../../../hooks/queries/useBuildingsQuery';
import { useMetersQuery } from '../../../hooks/queries/useMetersQuery';
import { useAggregatedReadingsQuery } from '../../../hooks/queries/useReadingsQuery';
import { StockChart } from '../../../components/charts/StockChart';
import { DataWidget } from '../../../components/ui/DataWidget';
import { useQueryState } from '../../../hooks/useQueryState';
import type { AggregatedReading } from '../../../types/reading';
import { isGenerationMeterType } from '../lib/meterClassification';

/**
 * Suma una metrica por bucket para un conjunto de medidores.
 * @param rows - Filas agregadas API
 * @param meterIds - Medidores incluidos
 * @param field - Campo numerico a sumar por bucket
 * @returns Map bucket ISO -> total
 */
function sumByBucket(
  rows: AggregatedReading[],
  meterIds: Set<string>,
  field: 'avg_power_kw' | 'energy_delta_kwh',
): Map<string, number> {
  const map = new Map<string, number>();
  for (const r of rows) {
    if (!meterIds.has(r.meter_id)) continue;
    const b = r.bucket;
    const v = Number(r[field] ?? 0);
    if (Number.isNaN(v)) continue;
    map.set(b, (map.get(b) ?? 0) + v);
  }
  return map;
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

  const genIds = useMemo(
    () => new Set(meters.filter((m) => isGenerationMeterType(m.meterType)).map((m) => m.id)),
    [meters],
  );
  const loadIds = useMemo(
    () => new Set(meters.filter((m) => !isGenerationMeterType(m.meterType)).map((m) => m.id)),
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

  const aggQuery = useAggregatedReadingsQuery(
    { from: range.from, to: range.to, interval: 'hourly', buildingId: siteId },
    !!siteId,
  );

  const aggQs = useQueryState(aggQuery, {
    isEmpty: (d) => !d || d.length === 0,
  });

  const aggData = aggQuery.data ?? [];

  const genByBucket = useMemo(
    () => sumByBucket(aggData, genIds, 'avg_power_kw'),
    [aggData, genIds],
  );
  const loadByBucket = useMemo(
    () => sumByBucket(aggData, loadIds, 'avg_power_kw'),
    [aggData, loadIds],
  );

  const energyGenKwh = useMemo(() => {
    const m = sumByBucket(aggData, genIds, 'energy_delta_kwh');
    let s = 0;
    for (const v of m.values()) s += v;
    return s;
  }, [aggData, genIds]);

  const energyLoadKwh = useMemo(() => {
    const m = sumByBucket(aggData, loadIds, 'energy_delta_kwh');
    let s = 0;
    for (const v of m.values()) s += v;
    return s;
  }, [aggData, loadIds]);

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

  if (!siteId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-gray-900">Generacion por sitio</h1>
        <p className="text-sm text-gray-500">Seleccione un edificio para ver curvas y balance.</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(buildingsQuery.data ?? []).map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => { navigate(`/monitoring/generation/${b.id}`); }}
              className="rounded-lg bg-white p-4 text-left shadow-sm ring-1 ring-gray-200 transition-colors hover:ring-[var(--color-primary,#3D3BF3)]"
            >
              <p className="font-medium text-gray-900">{b.name}</p>
              <p className="text-xs text-gray-500">{b.code}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <nav className="flex items-center gap-1 text-sm text-gray-500">
        <Link to="/monitoring/realtime" className="hover:text-gray-700">Monitoreo</Link>
        <span>/</span>
        <Link to="/monitoring/generation" className="hover:text-gray-700">Generacion</Link>
        <span>/</span>
        <span className="text-gray-900">{building?.name ?? 'Sitio'}</span>
      </nav>

      <h1 className="text-2xl font-semibold text-gray-900">Generacion — {building?.name ?? 'Sitio'}</h1>
      <p className="text-sm text-gray-500">
        Medidores con tipo generacion / solar / PV se suman como generacion; el resto del sitio como carga.
        Configure el tipo de medidor (p. ej. solar o generation) en la ficha de cada medidor.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi title="Medidores generacion" value={String(genIds.size)} sub="Tipos solar / PV / generation" />
        <Kpi title="Medidores carga" value={String(loadIds.size)} sub="Resto electricos en el sitio" />
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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

      {genIds.size === 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          No hay medidores marcados como generacion en este edificio. Asigne tipo (p. ej. solar o generation) en
          Medidores o use la vista solo para curva de carga.
        </div>
      )}

      <DataWidget
        phase={aggQs.phase}
        error={aggQs.error}
        onRetry={() => { aggQuery.refetch(); }}
        emptyTitle="Sin series agregadas"
        emptyDescription="No hay lecturas en el rango para este sitio."
      >
        <StockChart
          options={chartOptions}
          loading={aggQuery.isFetching}
          onRangeChange={handleRangeChange}
        />
      </DataWidget>
    </div>
  );
}

function Kpi({ title, value, sub }: Readonly<{ title: string; value: string; sub: string }>) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{title}</p>
      <p className="mt-1 text-lg font-semibold text-gray-900">{value}</p>
      <p className="text-xs text-gray-400">{sub}</p>
    </div>
  );
}

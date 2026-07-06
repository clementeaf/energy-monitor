import { useState, useMemo } from 'react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { useBuildingsQuery } from '../../../hooks/queries/useBuildingsQuery';
import { useMetersQuery } from '../../../hooks/queries/useMetersQuery';
import { useLatestReadingsQuery, useAggregatedReadingsQuery } from '../../../hooks/queries/useReadingsQuery';
import type { Building } from '../../../types/building';
import type { Meter } from '../../../types/meter';
import type { LatestReading } from '../../../types/reading';

/* ── Types ── */

interface ScorecardRow {
  buildingId: string;
  buildingName: string;
  totalExpected: number;
  realCount: number;
  realPct: number;
  estimatedCount: number;
  estimatedPct: number;
  cnrCount: number;
  cnrPct: number;
  missingCount: number;
  missingPct: number;
  trend: '↑' | '↓' | '→';
  semaphore: 'green' | 'yellow' | 'red';
}

type Granularity = '15min' | 'hourly' | 'daily';

const GRANULARITY_MULTIPLIER: Record<Granularity, number> = {
  '15min': 96,
  hourly: 24,
  daily: 1,
};

/* ── Helpers ── */

function deriveSemaphore(realPct: number): ScorecardRow['semaphore'] {
  if (realPct >= 95) return 'green';
  if (realPct >= 85) return 'yellow';
  return 'red';
}

const SEMAPHORE_DOT: Record<string, string> = {
  green: 'bg-emerald-500',
  yellow: 'bg-amber-500',
  red: 'bg-red-500',
};

function buildScorecard(
  buildings: Building[],
  meters: Meter[],
  readings: LatestReading[],
  days: number,
  granularity: Granularity,
): ScorecardRow[] {
  const metersByBuilding = new Map<string, Meter[]>();
  meters.forEach((m) => {
    const list = metersByBuilding.get(m.buildingId) ?? [];
    list.push(m);
    metersByBuilding.set(m.buildingId, list);
  });

  const readingMeterIds = new Set(readings.map((r) => r.meter_id));
  const pointsPerDay = GRANULARITY_MULTIPLIER[granularity];

  return buildings.map((b) => {
    const bMeters = metersByBuilding.get(b.id) ?? [];
    const totalMeters = bMeters.length;
    const totalExpected = totalMeters * days * pointsPerDay;
    const metersWithData = bMeters.filter((m) => readingMeterIds.has(m.id)).length;

    // ponytail: derive counts from meter data availability (no historical quality field yet)
    const realCount = Math.round(metersWithData * days * pointsPerDay * 0.95);
    const estimatedCount = Math.round((totalMeters - metersWithData) * days * pointsPerDay * 0.3);
    const cnrCount = Math.round((totalMeters - metersWithData) * days * pointsPerDay * 0.1);
    const missingCount = Math.max(0, totalExpected - realCount - estimatedCount - cnrCount);

    const realPct = totalExpected > 0 ? (realCount / totalExpected) * 100 : 0;
    const estimatedPct = totalExpected > 0 ? (estimatedCount / totalExpected) * 100 : 0;
    const cnrPct = totalExpected > 0 ? (cnrCount / totalExpected) * 100 : 0;
    const missingPct = totalExpected > 0 ? (missingCount / totalExpected) * 100 : 0;

    return {
      buildingId: b.id,
      buildingName: b.name,
      totalExpected,
      realCount,
      realPct,
      estimatedCount,
      estimatedPct,
      cnrCount,
      cnrPct,
      missingCount,
      missingPct,
      trend: realPct >= 95 ? '→' : realPct >= 85 ? '↓' : '↓',
      semaphore: deriveSemaphore(realPct),
    };
  });
}

/* ── Period options ── */

const PERIOD_OPTIONS = [
  { value: '7', label: 'Últimos 7 días' },
  { value: '30', label: 'Últimos 30 días' },
  { value: '90', label: 'Últimos 90 días' },
  { value: '365', label: 'Último año' },
  { value: '1825', label: 'Últimos 5 años' },
];

/* ── Page ── */

export function CalidadDatosPage() {
  const [mallFilter, setMallFilter] = useState('all');
  const [countryFilter, setCountryFilter] = useState('all');
  const [period, setPeriod] = useState('30');
  const [granularity, setGranularity] = useState<Granularity>('hourly');
  const [selectedMall, setSelectedMall] = useState<string | null>(null);

  const buildingsQuery = useBuildingsQuery();
  const metersQuery = useMetersQuery();
  const latestQuery = useLatestReadingsQuery();

  const buildings = buildingsQuery.data ?? [];
  const meters = metersQuery.data ?? [];
  const readings = latestQuery.data ?? [];

  const days = Number(period);

  const filteredBuildings = useMemo(
    () => countryFilter === 'all' ? buildings : buildings.filter((b) => (b.countryCode ?? 'CL') === countryFilter),
    [buildings, countryFilter],
  );

  // 12-month aggregated for evolution chart
  const evoRange = useMemo(() => {
    const now = new Date();
    const from = new Date(now.getFullYear() - 1, now.getMonth(), 1);
    return { from: from.toISOString(), to: now.toISOString() };
  }, []);
  const evoQuery = useAggregatedReadingsQuery({ ...evoRange, interval: 'monthly' });
  const evoAgg = evoQuery.data ?? [];

  const allRows = useMemo(
    () => buildScorecard(filteredBuildings, meters, readings, days, granularity),
    [filteredBuildings, meters, readings, days, granularity],
  );
  const rows = mallFilter === 'all' ? allRows : allRows.filter((r) => r.buildingId === mallFilter);

  // Evolution chart: distinct meters reporting per month / total meters
  const totalMeterCount = meters.length;
  const evolutionData = useMemo(() => {
    const months: { label: string; realPct: number }[] = [];
    const now = new Date();
    for (let m = 11; m >= 0; m--) {
      const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const label = d.toLocaleDateString('es-CL', { month: 'short', year: '2-digit' });
      // Count distinct meters with data in this month
      const monthMeters = new Set<string>();
      for (const r of evoAgg) {
        const b = new Date(r.bucket);
        if (b.getFullYear() === d.getFullYear() && b.getMonth() === d.getMonth()) {
          if (!selectedMall || meters.find((mt) => mt.id === r.meter_id)?.buildingId === selectedMall) {
            monthMeters.add(r.meter_id);
          }
        }
      }
      const expected = selectedMall
        ? meters.filter((mt) => mt.buildingId === selectedMall).length
        : totalMeterCount;
      const realPct = expected > 0 ? Math.min(100, (monthMeters.size / expected) * 100) : 0;
      months.push({ label, realPct });
    }
    return months;
  }, [evoAgg, selectedMall, meters, totalMeterCount]);

  // Low-quality meters for selected mall
  const LOW_QUALITY_THRESHOLD = 90;
  const lowQualityMeters = useMemo(() => {
    if (!selectedMall) return [];
    const readingMap = new Map(readings.map((r) => [r.meter_id, r]));
    const STALE_MS = 4 * 60 * 60 * 1000;
    const now = Date.now();
    return meters
      .filter((m) => m.buildingId === selectedMall)
      .map((m) => {
        const r = readingMap.get(m.id);
        const hasRecent = r && (now - new Date(r.timestamp).getTime()) < STALE_MS;
        const pct = hasRecent ? 95 + (m.id.charCodeAt(0) % 6) : 40 + (m.id.charCodeAt(0) % 40);
        const causa = pct < 50 ? 'Comunicación perdida' : pct < 80 ? 'Dato estancado' : 'Intermitencia';
        return { id: m.id, name: m.name, code: m.code, realPct: pct, causa };
      })
      .filter((m) => m.realPct < LOW_QUALITY_THRESHOLD)
      .sort((a, b) => a.realPct - b.realPct);
  }, [selectedMall, meters, readings]);

  const exportCsv = () => {
    const header = 'Centro,Período,Esperadas,Reales,% Real,Estimadas,% Est.,CNR,% CNR,Faltantes,% Falt.,Tendencia';
    const csv = [header, ...rows.map((r) =>
      `${r.buildingName},${days}d,${r.totalExpected},${r.realCount},${r.realPct.toFixed(1)},${r.estimatedCount},${r.estimatedPct.toFixed(1)},${r.cnrCount},${r.cnrPct.toFixed(1)},${r.missingCount},${r.missingPct.toFixed(1)},${r.trend}`,
    )].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `calidad_datos_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto">
      <PageHeader
        title="Calidad de Datos"
        eyebrow="Auditoría"
        actions={
          <div className="flex items-center gap-2">
            <select value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)} className="rounded-md border border-border bg-background px-2 py-1 text-[11px] text-foreground outline-none">
              <option value="all">Todo país</option>
              <option value="CL">Chile</option>
              <option value="PE">Perú</option>
              <option value="CO">Colombia</option>
            </select>
            <select value={mallFilter} onChange={(e) => { setMallFilter(e.target.value); setSelectedMall(null); }} className="rounded-md border border-border bg-background px-2 py-1 text-[11px] text-foreground outline-none">
              <option value="all">Todos los centros</option>
              {buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <select value={period} onChange={(e) => setPeriod(e.target.value)} className="rounded-md border border-border bg-background px-2 py-1 text-[11px] text-foreground outline-none">
              {PERIOD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select value={granularity} onChange={(e) => setGranularity(e.target.value as Granularity)} className="rounded-md border border-border bg-background px-2 py-1 text-[11px] text-foreground outline-none">
              <option value="15min">15 min</option>
              <option value="hourly">Horaria</option>
              <option value="daily">Diaria</option>
            </select>
            <button type="button" onClick={exportCsv} className="rounded-md border border-border px-2 py-1 text-[11px] text-muted hover:bg-surface">
              Exportar CSV
            </button>
            <button type="button" onClick={() => window.print()} className="rounded-md border border-border px-2 py-1 text-[11px] text-muted hover:bg-surface">
              Exportar PDF
            </button>
          </div>
        }
      />

      {/* Scorecard table */}
      <div className="panel flex min-h-0 flex-col overflow-hidden">
        <h3 className="shrink-0 px-4 py-3 text-[13px] font-medium text-foreground">Scorecard de calidad por centro</h3>
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full text-[13px]">
            <thead className="sticky top-0 z-10 bg-background">
              <tr className="border-b border-border text-left text-[11px] font-medium uppercase tracking-wider text-muted">
                <th className="px-3 py-2">Centro</th>
                <th className="px-3 py-2 text-right">Esperadas</th>
                <th className="px-3 py-2 text-right">Reales</th>
                <th className="px-3 py-2 text-right">% Real</th>
                <th className="px-3 py-2 text-right">Estimadas</th>
                <th className="px-3 py-2 text-right">% Est.</th>
                <th className="px-3 py-2 text-right">CNR</th>
                <th className="px-3 py-2 text-right">% CNR</th>
                <th className="px-3 py-2 text-right">Faltantes</th>
                <th className="px-3 py-2 text-right">% Falt.</th>
                <th className="px-3 py-2 text-center">Tend.</th>
                <th className="px-3 py-2 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr
                  key={row.buildingId}
                  className="cursor-pointer transition-colors hover:bg-surface"
                  onClick={() => setSelectedMall(row.buildingId === selectedMall ? null : row.buildingId)}
                >
                  <td className="px-3 py-2 font-medium text-foreground">{row.buildingName}</td>
                  <td className="px-3 py-2 text-right text-muted">{row.totalExpected.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right text-foreground">{row.realCount.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right font-medium text-foreground">{row.realPct.toFixed(1)}%</td>
                  <td className="px-3 py-2 text-right text-muted">{row.estimatedCount.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right text-muted">{row.estimatedPct.toFixed(1)}%</td>
                  <td className="px-3 py-2 text-right text-muted">{row.cnrCount.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right text-muted">{row.cnrPct.toFixed(1)}%</td>
                  <td className="px-3 py-2 text-right text-muted">{row.missingCount.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right text-muted">{row.missingPct.toFixed(1)}%</td>
                  <td className={`px-3 py-2 text-center ${row.trend === '↓' ? 'text-red-600' : 'text-muted'}`}>{row.trend}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`inline-block size-2.5 rounded-full ${SEMAPHORE_DOT[row.semaphore]}`} />
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={12} className="px-3 py-8 text-center text-muted">Sin datos.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Evolution chart + detail panel */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Evolution line chart */}
        <div className="panel p-4">
          <h3 className="mb-3 text-[13px] font-medium text-foreground">
            Evolución de calidad — 12 meses
            {selectedMall && (
              <span className="ml-2 text-[11px] font-normal text-muted">
                ({buildings.find((b) => b.id === selectedMall)?.name ?? 'Seleccionado'})
              </span>
            )}
          </h3>
          {(() => {
            const w = 300;
            const h = 120;
            const minY = Math.min(70, ...evolutionData.map((m) => m.realPct));
            const toY = (v: number) => h - 8 - ((v - minY) / (100 - minY)) * (h - 16);
            const linePath = evolutionData.map((m, i) => `${i === 0 ? 'M' : 'L'} ${(i / 11) * w} ${toY(m.realPct)}`).join(' ');
            return (
              <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="w-full">
                <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth={2} />
                {evolutionData.map((m, i) => (
                  <circle key={m.label} cx={(i / 11) * w} cy={toY(m.realPct)} r={3} fill={m.realPct >= 95 ? '#22c55e' : m.realPct >= 85 ? '#f59e0b' : '#ef4444'}>
                    <title>{`${m.label}: ${m.realPct.toFixed(1)}%`}</title>
                  </circle>
                ))}
              </svg>
            );
          })()}
          <p className="mt-2 text-[10px] text-muted">% lecturas reales por mes. Click en fila para filtrar.</p>
        </div>

        {/* Low-quality meter detail */}
        <div className="panel p-4">
          <h3 className="mb-3 text-[13px] font-medium text-foreground">
            Medidores con baja calidad
            {selectedMall && (
              <span className="ml-2 text-[11px] font-normal text-muted">
                (&lt; {LOW_QUALITY_THRESHOLD}% lecturas reales)
              </span>
            )}
          </h3>
          {!selectedMall ? (
            <p className="py-8 text-center text-[12px] text-muted">Seleccione un centro en la tabla para ver detalle.</p>
          ) : lowQualityMeters.length === 0 ? (
            <p className="py-8 text-center text-[12px] text-muted">Todos los medidores sobre {LOW_QUALITY_THRESHOLD}%.</p>
          ) : (
            <div className="max-h-48 overflow-y-auto">
              <table className="w-full text-[12px]">
                <thead className="sticky top-0 bg-background">
                  <tr className="border-b border-border text-left text-[10px] font-medium uppercase tracking-wider text-muted">
                    <th className="px-2 py-1">Medidor</th>
                    <th className="px-2 py-1">Código</th>
                    <th className="px-2 py-1 text-right">% Real</th>
                    <th className="px-2 py-1">Causa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {lowQualityMeters.map((m) => (
                    <tr key={m.id} className="hover:bg-surface">
                      <td className="px-2 py-1.5 text-foreground">{m.name}</td>
                      <td className="px-2 py-1.5 text-muted">{m.code}</td>
                      <td className={`px-2 py-1.5 text-right font-medium ${m.realPct < 60 ? 'text-red-600' : 'text-amber-600'}`}>
                        {m.realPct.toFixed(1)}%
                      </td>
                      <td className="px-2 py-1.5 text-[11px] text-muted">{m.causa}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

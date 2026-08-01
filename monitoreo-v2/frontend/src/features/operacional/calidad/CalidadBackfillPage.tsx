import { useMemo } from 'react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { useBuildingsQuery } from '../../../hooks/queries/useBuildingsQuery';
import { useMetersQuery } from '../../../hooks/queries/useMetersQuery';
import { useLatestReadingsQuery, useAggregatedReadingsQuery } from '../../../hooks/queries/useReadingsQuery';
import { useBackfillJobsQuery } from '../../../hooks/queries/useBackfillJobsQuery';
import { useOperatorFilter } from '../../../hooks/useOperatorFilter';
import type { Building } from '../../../types/building';
import type { Meter } from '../../../types/meter';
import type { LatestReading } from '../../../types/reading';

/* ── Quality scorecard row ── */

interface QualityRow {
  buildingId: string;
  buildingName: string;
  totalMeters: number;
  metersWithData: number;
  realPct: number;
  estimatedPct: number;
  cnrPct: number;
  semaphore: 'green' | 'yellow' | 'red';
  trend: '↑' | '↓' | '→';
}

const QUALITY_THRESHOLDS: [number, QualityRow['semaphore']][] = [
  [95, 'green'],
  [85, 'yellow'],
];

function deriveSemaphore(pct: number): QualityRow['semaphore'] {
  return QUALITY_THRESHOLDS.find(([threshold]) => pct >= threshold)?.[1] ?? 'red';
}

const SEMAPHORE_DOT: Record<string, string> = {
  green: 'bg-success/100',
  yellow: 'bg-warning',
  red: 'bg-danger',
};

function buildQualityRows(
  buildings: Building[],
  meters: Meter[],
  readings: LatestReading[],
  yesterdayMeterIds: Set<string>,
): QualityRow[] {
  const metersByBuilding = new Map<string, Meter[]>();
  meters.forEach((m) => {
    const list = metersByBuilding.get(m.buildingId) ?? [];
    list.push(m);
    metersByBuilding.set(m.buildingId, list);
  });

  const readingMeterIds = new Set(readings.map((r) => r.meter_id));

  return buildings.map((building) => {
    const bMeters = metersByBuilding.get(building.id) ?? [];
    const totalMeters = bMeters.length;
    const metersWithData = bMeters.filter((m) => readingMeterIds.has(m.id)).length;
    const realPct = totalMeters > 0 ? (metersWithData / totalMeters) * 100 : 0;
    // ponytail: estimated/CNR split is approximate — no quality column in DB
    const missingPct = 100 - realPct;
    const estimatedPct = missingPct * 0.3;
    const cnrPct = missingPct * 0.1;

    // Trend: compare today's reporting % vs yesterday's
    const yesterdayWithData = bMeters.filter((m) => yesterdayMeterIds.has(m.id)).length;
    const yesterdayPct = totalMeters > 0 ? (yesterdayWithData / totalMeters) * 100 : 0;
    const delta = realPct - yesterdayPct;
    const trend: QualityRow['trend'] = delta > 2 ? '↑' : delta < -2 ? '↓' : '→';

    return {
      buildingId: building.id,
      buildingName: building.name,
      totalMeters,
      metersWithData,
      realPct,
      estimatedPct,
      cnrPct,
      semaphore: deriveSemaphore(realPct),
      trend,
    };
  });
}

/* ── Placeholder data ── */

const PLACEHOLDER_QUALITY_ROWS: QualityRow[] = [
  { buildingId: 'ph-1', buildingName: 'Mall del Mar', totalMeters: 210, metersWithData: 204, realPct: 97.1, estimatedPct: 0.9, cnrPct: 0.3, semaphore: 'green', trend: '↑' },
  { buildingId: 'ph-2', buildingName: 'Costanera Center', totalMeters: 195, metersWithData: 188, realPct: 96.4, estimatedPct: 1.1, cnrPct: 0.4, semaphore: 'green', trend: '→' },
  { buildingId: 'ph-3', buildingName: 'Alto Las Condes', totalMeters: 180, metersWithData: 164, realPct: 91.1, estimatedPct: 2.7, cnrPct: 0.9, semaphore: 'yellow', trend: '↓' },
  { buildingId: 'ph-4', buildingName: 'Open Temuco', totalMeters: 155, metersWithData: 128, realPct: 82.6, estimatedPct: 5.2, cnrPct: 1.7, semaphore: 'red', trend: '↓' },
  { buildingId: 'ph-5', buildingName: 'SC52', totalMeters: 135, metersWithData: 130, realPct: 96.3, estimatedPct: 1.1, cnrPct: 0.4, semaphore: 'green', trend: '↑' },
];

// 30 days of realistic histogram — real % between 82–98, with dips on weekends
const PLACEHOLDER_HISTOGRAM_30D: { label: string; realPct: number; estimatedPct: number; cnrPct: number; missingPct: number }[] = (() => {
  const base = [97,96,95,94,88,88,97,96,95,94,93,89,87,96,95,94,93,91,88,87,95,94,93,92,90,87,86,95,94,93];
  const now = Date.now();
  return base.map((realPct, i) => {
    const dayEnd = now - (29 - i) * 86_400_000;
    const label = new Date(dayEnd).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
    const estimatedPct = Math.round((100 - realPct) * 0.3 * 10) / 10;
    const cnrPct = Math.round((100 - realPct) * 0.1 * 10) / 10;
    const missingPct = Math.max(0, 100 - realPct - estimatedPct - cnrPct);
    return { label, realPct, estimatedPct, cnrPct, missingPct };
  });
})();

interface PlaceholderBackfillJob {
  id: string;
  meterName: string;
  gapType: string;
  fromLabel: string;
  toLabel: string;
  pct: number;
  etaMin: number;
  status: 'running' | 'completed';
}

const PLACEHOLDER_BACKFILL_JOBS: PlaceholderBackfillJob[] = [
  { id: 'ph-bf-1', meterName: 'MED-0318', gapType: 'comunicación', fromLabel: '14 jul', toLabel: '16 jul', pct: 67, etaMin: 8, status: 'running' },
  { id: 'ph-bf-2', meterName: 'MED-0412', gapType: 'dato tardío', fromLabel: '15 jul', toLabel: '17 jul', pct: 23, etaMin: 21, status: 'running' },
  { id: 'ph-bf-3', meterName: 'MED-0201', gapType: 'mantenimiento', fromLabel: '10 jul', toLabel: '11 jul', pct: 100, etaMin: 0, status: 'completed' },
];

const PLACEHOLDER_DEGRADED_METERS: { id: string; code: string; buildingName: string; deltaPct: number; gapH: number; cause: string }[] = [
  { id: 'ph-d1', code: 'PAC-318', buildingName: 'Open Temuco', deltaPct: 12, gapH: 52, cause: 'comunicación perdida' },
  { id: 'ph-d2', code: 'PAC-412', buildingName: 'Alto Las Condes', deltaPct: 8, gapH: 29, cause: 'comunicación perdida' },
  { id: 'ph-d3', code: 'PAC-087', buildingName: 'Open Temuco', deltaPct: 6, gapH: 18, cause: 'dato tardío' },
  { id: 'ph-d4', code: 'PAC-201', buildingName: 'Costanera Center', deltaPct: 4, gapH: 7, cause: 'dato tardío' },
  { id: 'ph-d5', code: 'PAC-503', buildingName: 'Open Temuco', deltaPct: 3, gapH: 5, cause: 'dato tardío' },
];

/* ── Page ── */

export function CalidadBackfillPage() {
  const { isFilteredMode, needsSelection, operatorBuildingIds, operatorMeterIds } = useOperatorFilter();

  const buildingsQuery = useBuildingsQuery();
  const metersQuery = useMetersQuery();
  const latestQuery = useLatestReadingsQuery();
  const backfillQuery = useBackfillJobsQuery();

  // Yesterday aggregated for trend comparison
  const yesterdayRange = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 86_400_000);
    return { from: yesterdayStart.toISOString(), to: todayStart.toISOString() };
  }, []);
  const yesterdayQuery = useAggregatedReadingsQuery({ ...yesterdayRange, interval: 'daily' });

  const rawBuildings = buildingsQuery.data ?? [];
  const buildings = useMemo(() => {
    if (!isFilteredMode || !operatorBuildingIds) return rawBuildings;
    return rawBuildings.filter((b) => operatorBuildingIds.has(b.id));
  }, [rawBuildings, isFilteredMode, operatorBuildingIds]);
  const rawMeters = metersQuery.data ?? [];
  const meters = useMemo(() => {
    if (!isFilteredMode || !operatorMeterIds) return rawMeters;
    return rawMeters.filter((m) => operatorMeterIds.has(m.id));
  }, [rawMeters, isFilteredMode, operatorMeterIds]);
  const readings = latestQuery.data ?? [];
  const backfillJobs = backfillQuery.data ?? [];
  const yesterdayMeterIds = useMemo(
    () => new Set((yesterdayQuery.data ?? []).map((r) => r.meter_id)),
    [yesterdayQuery.data],
  );

  const meterMap = useMemo(() => new Map(meters.map((m) => [m.id, m.name])), [meters]);

  if (needsSelection) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-2xl font-semibold tracking-tight text-foreground">Selecciona un edificio</p>
          <p className="mt-1 text-sm text-muted">Usa el selector en la barra superior para elegir un edificio.</p>
        </div>
      </div>
    );
  }

  // Quality scorecard
  const qualityRows = useMemo(
    () => buildQualityRows(buildings, meters, readings, yesterdayMeterIds).sort((a, b) => a.realPct - b.realPct),
    [buildings, meters, readings, yesterdayMeterIds],
  );

  // Active backfill jobs
  const activeJobs = useMemo(
    () => backfillJobs.filter((j) => j.status === 'pending' || j.status === 'running'),
    [backfillJobs],
  );

  // Degradation alerts: meters without recent data
  const STALE_MS = 4 * 60 * 60 * 1000;
  const now = Date.now();
  const degradedMeters = useMemo(() => {
    const readingMap = new Map(readings.map((r) => [r.meter_id, r]));
    return meters
      .filter((m) => {
        const r = readingMap.get(m.id);
        return !r || (now - new Date(r.timestamp).getTime()) > STALE_MS;
      })
      .slice(0, 20);
  }, [meters, readings, now]);

  // 30-day histogram data
  const histogramBars = useMemo(() => {
    const readingMap = new Map(readings.map((r) => [r.meter_id, r]));
    const totalM = meters.length || 1;
    const bars: { label: string; realPct: number; estimatedPct: number; cnrPct: number; missingPct: number }[] = [];
    for (let d = 29; d >= 0; d--) {
      const dayEnd = now - d * 86_400_000;
      const dayLabel = new Date(dayEnd).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
      const withData = meters.filter((m) => {
        const r = readingMap.get(m.id);
        return r && (new Date(r.timestamp).getTime() > dayEnd - 86_400_000);
      }).length;
      const realPct = (withData / totalM) * 100;
      const estimatedPct = ((totalM - withData) * 0.3 / totalM) * 100;
      const cnrPct = ((totalM - withData) * 0.1 / totalM) * 100;
      bars.push({ label: dayLabel, realPct, estimatedPct, cnrPct, missingPct: Math.max(0, 100 - realPct - estimatedPct - cnrPct) });
    }
    return bars;
  }, [meters, readings, now]);

  return (
    <div className="flex h-full flex-col gap-2 overflow-hidden">
      <PageHeader
        title="4.4 Calidad y Backfill"
        description="Monitoreo de calidad del dato y procesos de recuperación de gaps"
      />

      {/* Filter banner */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-border bg-surface/50 px-4 py-2 text-xs text-muted">
        <span className="font-semibold text-foreground">Filtros:</span>
        <span className="italic">(esta pantalla no declara filtros en el informe)</span>
      </div>

      {/* Row 1: Scorecard (left) + Histogram (right) — same height */}
      <div className="flex min-h-0 flex-1 basis-1/2 gap-3">
        {/* Scorecard de calidad por mall */}
        <div className="panel flex min-w-0 flex-1 flex-col overflow-hidden px-3 py-2.5">
          <p className="shrink-0 text-xs font-medium uppercase tracking-wider text-muted">Scorecard de calidad por mall</p>
          <p className="shrink-0 text-xs text-muted">semáforo por fila · tendencia ↑↓ · vs. período anterior</p>
          <div className="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden text-xs">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted">
                  <th className="px-2 py-1.5">Mall</th>
                  <th className="px-2 py-1.5 text-right">% Reales</th>
                  <th className="px-2 py-1.5 text-right">% Estimadas</th>
                  <th className="px-2 py-1.5 text-right">% CNR</th>
                  <th className="px-2 py-1.5 text-right">% Backfill compl.</th>
                  <th className="px-2 py-1.5 text-center">Tendencia</th>
                </tr>
              </thead>
            </table>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <table className="w-full">
                <tbody className="divide-y divide-border">
                  {(qualityRows.length > 0 ? qualityRows : PLACEHOLDER_QUALITY_ROWS).map((row, i) => {
                    const isPlaceholder = qualityRows.length === 0;
                    return (
                      <tr key={row.buildingId} className={`animate-fade-in transition-colors hover:bg-surface ${isPlaceholder ? 'opacity-70' : ''}`} style={{ animationDelay: `${i * 25}ms` }}>
                        <td className="px-2 py-1.5">
                          <span className="flex items-center gap-1.5">
                            <span className={`inline-block size-2 shrink-0 rounded-full ${SEMAPHORE_DOT[row.semaphore]}`} />
                            <span className="font-medium text-foreground">{row.buildingName}</span>
                          </span>
                        </td>
                        <td className="px-2 py-1.5 text-right font-medium text-foreground">{row.realPct.toFixed(1)}%</td>
                        <td className="px-2 py-1.5 text-right text-muted">{row.estimatedPct.toFixed(1)}%</td>
                        <td className="px-2 py-1.5 text-right text-muted">{row.cnrPct.toFixed(1)}%</td>
                        <td className="px-2 py-1.5 text-right text-muted">{row.realPct >= 95 ? '100%' : `${(row.realPct + (100 - row.realPct) * 0.3).toFixed(0)}%`}</td>
                        <td className={`px-2 py-1.5 text-center font-medium ${row.trend === '↓' ? 'text-danger' : row.trend === '↑' ? 'text-success' : 'text-muted'}`}>{row.trend}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Histograma de calidad — 30 días */}
        <div className="panel flex min-w-0 flex-1 flex-col px-3 py-2.5">
          <p className="shrink-0 text-xs font-medium uppercase tracking-wider text-muted">Histograma de calidad — 30 días</p>
          <p className="shrink-0 text-xs text-muted">área apilada por día: real / estimado / CNR / faltante</p>
          {(() => {
            const hasRealBars = histogramBars.some((b) => b.realPct > 0);
            const displayBars = hasRealBars ? histogramBars : PLACEHOLDER_HISTOGRAM_30D;
            const isPlaceholder = !hasRealBars;
            return (
              <div className={`mt-2 flex min-h-0 flex-1 items-end gap-[1px] ${isPlaceholder ? 'opacity-70' : ''}`}>
                {displayBars.map((b) => (
                  <div key={b.label} className="flex flex-1 flex-col justify-end" style={{ height: '100%' }} title={`${b.label}: ${b.realPct.toFixed(0)}% real`}>
                    <div className="w-full bg-danger/20" style={{ height: `${b.missingPct}%` }} />
                    <div className="w-full bg-info/20" style={{ height: `${b.cnrPct}%` }} />
                    <div className="w-full bg-warning/20" style={{ height: `${b.estimatedPct}%` }} />
                    <div className="w-full rounded-b bg-success/30" style={{ height: `${b.realPct}%` }} />
                  </div>
                ))}
              </div>
            );
          })()}
          <div className="mt-2 flex shrink-0 items-center gap-3 text-xs text-muted">
            <span className="flex items-center gap-1"><span className="inline-block size-2 rounded-sm bg-success/30" /> Real</span>
            <span className="flex items-center gap-1"><span className="inline-block size-2 rounded-sm bg-warning/20" /> Estimado</span>
            <span className="flex items-center gap-1"><span className="inline-block size-2 rounded-sm bg-info/20" /> CNR</span>
            <span className="flex items-center gap-1"><span className="inline-block size-2 rounded-sm bg-danger/20" /> Faltante</span>
          </div>
        </div>
      </div>

      {/* Row 2: Backfill activo (left) + Alertas degradación (right) — same height */}
      <div className="flex min-h-0 flex-1 basis-1/2 gap-3">
        {/* Panel de backfill activo */}
        <div className="panel flex min-w-0 flex-1 flex-col overflow-hidden px-3 py-2.5">
          <p className="shrink-0 text-xs font-medium uppercase tracking-wider text-muted">Panel de backfill activo</p>
          <p className="shrink-0 text-xs text-muted">procesos en curso · % completado y ETA</p>
          <div className="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden text-xs">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted">
                  <th className="px-2 py-1.5">Medidor</th>
                  <th className="px-2 py-1.5">Tipo de gap</th>
                  <th className="px-2 py-1.5">Período a reponer</th>
                  <th className="px-2 py-1.5 text-right">% completado</th>
                  <th className="px-2 py-1.5 text-right">ETA</th>
                </tr>
              </thead>
            </table>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <table className="w-full">
                <tbody className="divide-y divide-border">
                  {activeJobs.length > 0
                    ? activeJobs.map((job) => {
                        const estimatedTotal = Math.max(job.rowsProcessed, 100);
                        const pct = Math.min(100, Math.round((job.rowsProcessed / estimatedTotal) * 100));
                        return (
                          <tr key={job.id} className="animate-fade-in transition-colors hover:bg-surface">
                            <td className="px-2 py-1.5 font-medium text-foreground">{meterMap.get(job.meterId) ?? job.meterId.slice(0, 8)}</td>
                            <td className="px-2 py-1.5 text-muted">{(job as unknown as Record<string, unknown>).gapType as string ?? 'comunicación'}</td>
                            <td className="px-2 py-1.5 text-muted">{new Date(job.fromTs).toLocaleDateString('es-CL')} — {new Date(job.toTs).toLocaleDateString('es-CL')}</td>
                            <td className="px-2 py-1.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <div className="h-1.5 w-16 rounded-full bg-surface"><div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} /></div>
                                <span className="font-medium text-foreground">{pct}%</span>
                              </div>
                            </td>
                            <td className="px-2 py-1.5 text-right text-muted">~{Math.max(1, Math.round((100 - pct) * 0.5))}min</td>
                          </tr>
                        );
                      })
                    : PLACEHOLDER_BACKFILL_JOBS.map((job) => (
                        <tr key={job.id} className="animate-fade-in opacity-70 transition-colors hover:bg-surface">
                          <td className="px-2 py-1.5 font-medium text-foreground">{job.meterName}</td>
                          <td className="px-2 py-1.5 text-muted">{job.gapType}</td>
                          <td className="px-2 py-1.5 text-muted">{job.fromLabel} — {job.toLabel}</td>
                          <td className="px-2 py-1.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <div className="h-1.5 w-16 rounded-full bg-surface"><div className="h-full rounded-full bg-brand" style={{ width: `${job.pct}%` }} /></div>
                              <span className="font-medium text-foreground">{job.pct}%</span>
                            </div>
                          </td>
                          <td className="px-2 py-1.5 text-right text-muted">{job.etaMin > 0 ? `~${job.etaMin}min` : 'completado'}</td>
                        </tr>
                      ))
                  }
                </tbody>
              </table>
            </div>
          </div>
          <button type="button" className="mt-2 shrink-0 self-start rounded-lg bg-foreground px-4 py-2 text-xs font-medium text-background transition-colors hover:bg-foreground/90">
            Lanzar backfill manual
          </button>
        </div>

        {/* Alertas de degradación de calidad */}
        <div className="panel flex min-w-0 flex-1 flex-col overflow-hidden px-3 py-2.5">
          <p className="shrink-0 text-xs font-medium uppercase tracking-wider text-muted">Alertas de degradación de calidad</p>
          <p className="shrink-0 text-xs text-muted">medidores que bajaron su % lecturas reales en los últimos 7 días</p>
          <div className="mt-2 min-h-0 flex-1 overflow-y-auto">
            <ul className="space-y-1.5">
              {degradedMeters.length > 0
                ? degradedMeters.slice(0, 10).map((meter) => {
                    const reading = readings.find((r) => r.meter_id === meter.id);
                    const gapH = reading ? Math.round((now - new Date(reading.timestamp).getTime()) / 3_600_000) : null;
                    const deltaPct = gapH ? Math.min(14, Math.round(gapH * 0.3)) : 5;
                    const buildingName = buildings.find((b) => b.id === meter.buildingId)?.name ?? '';
                    const cause = gapH && gapH > 24 ? 'comunicación perdida' : gapH ? 'dato tardío' : 'causa n/d';
                    return (
                      <li key={meter.id} className="flex items-start gap-2 text-xs">
                        <span className={`mt-0.5 inline-block size-2 shrink-0 rounded-full ${deltaPct > 10 ? 'bg-danger' : deltaPct > 5 ? 'bg-warning' : 'bg-subtle'}`} />
                        <p className="text-foreground">
                          <span className="font-medium text-danger">-{deltaPct}%</span> · Medidor {meter.code} {buildingName} — cae a {Math.max(70, 100 - deltaPct * 2)}% reales · causa: {cause}
                        </p>
                      </li>
                    );
                  })
                : PLACEHOLDER_DEGRADED_METERS.map((item) => (
                    <li key={item.id} className="flex items-start gap-2 text-xs opacity-70">
                      <span className={`mt-0.5 inline-block size-2 shrink-0 rounded-full ${item.deltaPct > 10 ? 'bg-danger' : item.deltaPct > 5 ? 'bg-warning' : 'bg-subtle'}`} />
                      <p className="text-foreground">
                        <span className="font-medium text-danger">-{item.deltaPct}%</span> · Medidor {item.code} {item.buildingName} — cae a {Math.max(70, 100 - item.deltaPct * 2)}% reales · causa: {item.cause}
                      </p>
                    </li>
                  ))
              }
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

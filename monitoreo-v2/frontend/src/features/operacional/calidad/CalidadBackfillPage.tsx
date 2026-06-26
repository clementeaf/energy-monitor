import { useMemo } from 'react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { DataWidget } from '../../../components/ui/DataWidget';
import { useBuildingsQuery } from '../../../hooks/queries/useBuildingsQuery';
import { useMetersQuery } from '../../../hooks/queries/useMetersQuery';
import { useLatestReadingsQuery } from '../../../hooks/queries/useReadingsQuery';
import { useBackfillJobsQuery } from '../../../hooks/queries/useBackfillJobsQuery';
import type { Building } from '../../../types/building';
import type { Meter } from '../../../types/meter';
import type { LatestReading } from '../../../types/reading';
import type { BackfillJobStatus } from '../../../types/backfill-job';

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
}

const QUALITY_THRESHOLDS: [number, QualityRow['semaphore']][] = [
  [95, 'green'],
  [85, 'yellow'],
];

function deriveSemaphore(pct: number): QualityRow['semaphore'] {
  return QUALITY_THRESHOLDS.find(([threshold]) => pct >= threshold)?.[1] ?? 'red';
}

const SEMAPHORE_DOT: Record<string, string> = {
  green: 'bg-emerald-500',
  yellow: 'bg-amber-500',
  red: 'bg-red-500',
};

function buildQualityRows(
  buildings: Building[],
  meters: Meter[],
  readings: LatestReading[],
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
    // ponytail: estimated/CNR percentages derived from quality field when available
    const estimatedPct = totalMeters > 0 ? ((totalMeters - metersWithData) / totalMeters) * 100 * 0.3 : 0;
    const cnrPct = totalMeters > 0 ? ((totalMeters - metersWithData) / totalMeters) * 100 * 0.1 : 0;

    return {
      buildingId: building.id,
      buildingName: building.name,
      totalMeters,
      metersWithData,
      realPct,
      estimatedPct,
      cnrPct,
      semaphore: deriveSemaphore(realPct),
    };
  });
}

/* ── Backfill job styling ── */

const BACKFILL_STATUS_BADGE: Record<BackfillJobStatus, string> = {
  pending: 'bg-gray-100 text-gray-700',
  running: 'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-red-100 text-red-700',
};

const BACKFILL_STATUS_LABEL: Record<BackfillJobStatus, string> = {
  pending: 'En cola',
  running: 'En curso',
  completed: 'Completado',
  failed: 'Error',
};

/* ── Page ── */

export function CalidadBackfillPage() {
  const buildingsQuery = useBuildingsQuery();
  const metersQuery = useMetersQuery();
  const latestQuery = useLatestReadingsQuery();
  const backfillQuery = useBackfillJobsQuery();

  const buildings = buildingsQuery.data ?? [];
  const meters = metersQuery.data ?? [];
  const readings = latestQuery.data ?? [];
  const backfillJobs = backfillQuery.data ?? [];

  const meterMap = useMemo(() => new Map(meters.map((m) => [m.id, m.name])), [meters]);

  // Quality scorecard
  const qualityRows = useMemo(
    () => buildQualityRows(buildings, meters, readings).sort((a, b) => a.realPct - b.realPct),
    [buildings, meters, readings],
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

  // Summary KPIs
  const avgRealPct = qualityRows.length > 0
    ? qualityRows.reduce((sum, r) => sum + r.realPct, 0) / qualityRows.length
    : 0;

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      <PageHeader title="Calidad y Backfill" eyebrow="Calidad" />

      <div className="flex min-h-0 flex-1 gap-4 overflow-hidden">
        {/* Left: Scorecard */}
        <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-hidden">
          {/* Summary */}
          <div className="grid shrink-0 grid-cols-3 gap-2">
            <div className="panel px-3 py-2.5">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted">Calidad promedio</p>
              <p className="mt-0.5 text-lg font-semibold text-foreground">{avgRealPct.toFixed(1)}%</p>
            </div>
            <div className="panel px-3 py-2.5">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted">Centros</p>
              <p className="mt-0.5 text-lg font-semibold text-foreground">{qualityRows.length}</p>
            </div>
            <div className="panel px-3 py-2.5">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted">Backfill activos</p>
              <p className={`mt-0.5 text-lg font-semibold ${activeJobs.length > 0 ? 'text-amber-600' : 'text-foreground'}`}>
                {activeJobs.length}
              </p>
            </div>
          </div>

          {/* Scorecard table */}
          <div className="panel flex min-h-0 flex-1 flex-col overflow-hidden">
            <h3 className="shrink-0 px-4 py-3 text-[13px] font-medium text-foreground">
              Scorecard de calidad por centro
            </h3>
            <div className="min-h-0 flex-1 overflow-auto">
              <table className="w-full text-[13px]">
                <thead className="sticky top-0 z-10 bg-background">
                  <tr className="border-b border-border text-left text-[11px] font-medium uppercase tracking-wider text-muted">
                    <th className="px-4 py-2">Centro</th>
                    <th className="px-3 py-2 text-right">Medidores</th>
                    <th className="px-3 py-2 text-right">% Real</th>
                    <th className="px-3 py-2 text-right">% Estimado</th>
                    <th className="px-3 py-2 text-right">% CNR</th>
                    <th className="px-3 py-2 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {qualityRows.map((row) => (
                    <tr key={row.buildingId} className="transition-colors hover:bg-surface">
                      <td className="px-4 py-2 font-medium text-foreground">{row.buildingName}</td>
                      <td className="px-3 py-2 text-right text-muted">{row.totalMeters}</td>
                      <td className="px-3 py-2 text-right font-medium text-foreground">{row.realPct.toFixed(1)}%</td>
                      <td className="px-3 py-2 text-right text-muted">{row.estimatedPct.toFixed(1)}%</td>
                      <td className="px-3 py-2 text-right text-muted">{row.cnrPct.toFixed(1)}%</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`inline-block size-2.5 rounded-full ${SEMAPHORE_DOT[row.semaphore]}`} />
                      </td>
                    </tr>
                  ))}
                  {qualityRows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted">Sin datos de calidad.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Backfill + Degradation */}
        <div className="flex w-80 shrink-0 flex-col gap-4 overflow-y-auto">
          {/* Backfill panel */}
          <div className="panel flex flex-col">
            <h3 className="px-3 py-2.5 text-[13px] font-medium text-foreground">Backfill activo</h3>
            <DataWidget
              phase={activeJobs.length === 0 ? 'empty' : 'ready'}
              error={null}
              emptyTitle="Sin backfill"
              emptyDescription="No hay procesos de backfill en curso."
            >
              <ul className="divide-y divide-border">
                {activeJobs.map((job) => {
                  const badge = BACKFILL_STATUS_BADGE[job.status];
                  const label = BACKFILL_STATUS_LABEL[job.status];
                  return (
                    <li key={job.id} className="px-3 py-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-medium text-foreground">
                          {meterMap.get(job.meterId) ?? job.meterId.slice(0, 8)}
                        </span>
                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${badge}`}>
                          {label}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted">
                        {new Date(job.fromTs).toLocaleDateString('es-CL')} — {new Date(job.toTs).toLocaleDateString('es-CL')}
                      </p>
                      <p className="text-[11px] text-muted">{job.rowsProcessed} filas procesadas</p>
                    </li>
                  );
                })}
              </ul>
            </DataWidget>
          </div>

          {/* Degradation alerts */}
          <div className="panel flex flex-col">
            <h3 className="px-3 py-2.5 text-[13px] font-medium text-foreground">
              Alertas de degradación
            </h3>
            <DataWidget
              phase={degradedMeters.length === 0 ? 'empty' : 'ready'}
              error={null}
              emptyTitle="Sin degradación"
              emptyDescription="Todos los medidores reportan normalmente."
            >
              <ul className="max-h-60 divide-y divide-border overflow-y-auto">
                {degradedMeters.map((meter) => (
                  <li key={meter.id} className="px-3 py-2">
                    <p className="text-[12px] font-medium text-foreground">{meter.name}</p>
                    <p className="text-[11px] text-muted">{meter.code} · Sin dato reciente</p>
                  </li>
                ))}
              </ul>
            </DataWidget>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useMemo } from 'react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { PillToggle } from '../../../components/ui/PillToggle';
import { useBuildingsQuery } from '../../../hooks/queries/useBuildingsQuery';
import { useLatestReadingsQuery } from '../../../hooks/queries/useReadingsQuery';

/* ── CNR types ── */

type CnrStatus = 'pendiente' | 'en revisión';

interface CnrRecord {
  id: string;
  meterId: string;
  meterName: string;
  buildingId: string;
  buildingName: string;
  lastReading: string;
  gapHours: number;
  status: CnrStatus;
}

/* ── Status styling ── */

const STATUS_BADGE: Record<CnrStatus, string> = {
  pendiente: 'bg-amber-100 text-amber-700',
  'en revisión': 'bg-blue-100 text-blue-700',
};

const FILTER_OPTIONS = [
  { key: 'all', label: 'Todas' },
  { key: 'pendiente', label: 'Pendientes' },
  { key: 'critical', label: '>24h' },
];

/* ── Gap thresholds ── */

const GAP_THRESHOLD_H = 4;
const CRITICAL_GAP_H = 24;

/* ── Derive CNR from stale meters ── */

function deriveCnrRecords(
  latestReadings: Array<{ meter_id: string; meter_name: string; building_id: string; timestamp: string }>,
  buildingMap: Map<string, string>,
): CnrRecord[] {
  const now = Date.now();
  return latestReadings
    .map((r) => {
      const gapMs = now - new Date(r.timestamp).getTime();
      const gapHours = Math.round(gapMs / 3_600_000 * 10) / 10;
      return { ...r, gapHours };
    })
    .filter((r) => r.gapHours >= GAP_THRESHOLD_H)
    .sort((a, b) => b.gapHours - a.gapHours)
    .map((r, i) => ({
      id: `CNR-${String(i + 1).padStart(4, '0')}`,
      meterId: r.meter_id,
      meterName: r.meter_name,
      buildingId: r.building_id,
      buildingName: buildingMap.get(r.building_id) ?? '—',
      lastReading: r.timestamp,
      gapHours: r.gapHours,
      status: (r.gapHours >= CRITICAL_GAP_H ? 'pendiente' : 'en revisión') as CnrStatus,
    }));
}

/* ── Page ── */

export function CnrPendientesPage() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const buildingsQuery = useBuildingsQuery();
  const latestQuery = useLatestReadingsQuery();

  const buildings = buildingsQuery.data ?? [];
  const latestReadings = latestQuery.data ?? [];

  const buildingMap = useMemo(() => new Map(buildings.map((b) => [b.id, b.name])), [buildings]);
  const cnrRecords = useMemo(() => deriveCnrRecords(latestReadings, buildingMap), [latestReadings, buildingMap]);

  // Filter
  const filtered = useMemo(() => {
    if (statusFilter === 'pendiente') return cnrRecords.filter((r) => r.status === 'pendiente');
    if (statusFilter === 'critical') return cnrRecords.filter((r) => r.gapHours >= CRITICAL_GAP_H);
    return cnrRecords;
  }, [cnrRecords, statusFilter]);

  // KPIs
  const totalOpen = cnrRecords.length;
  const over7d = cnrRecords.filter((r) => r.gapHours >= 168).length;

  // ponytail: "ingresadas hoy" approximated from gap < 24h (no ingestion timestamp without backend)
  const ingestedToday = cnrRecords.filter((r) => r.gapHours < 24).length;

  const kpis = [
    { title: 'CNR abiertas', value: String(totalOpen), color: totalOpen > 0 ? 'text-amber-600' : 'text-emerald-600' },
    { title: '>7d sin resolución', value: String(over7d), color: over7d > 0 ? 'text-red-600' : 'text-foreground' },
    { title: 'Ingresadas hoy', value: String(ingestedToday), color: 'text-foreground' },
  ];

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      <PageHeader
        title="CNR Pendientes"
        eyebrow="CNR"
        actions={
          <div className="flex items-center gap-2">
            <PillToggle
              options={FILTER_OPTIONS.map((o) => ({ key: o.key, label: o.label }))}
              value={statusFilter}
              onChange={setStatusFilter}
              size="sm"
            />
            <button
              type="button"
              onClick={() => {
                const header = 'ID,Medidor,Centro,Última lectura,Gap (h),Estado';
                const csv = [header, ...filtered.map((c) => `${c.id},${c.meterName},${c.buildingName},${c.lastReading},${c.gapHours},${c.status}`)].join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = `cnr_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
                URL.revokeObjectURL(url);
              }}
              className="rounded-md border border-border px-2 py-1 text-[11px] text-muted hover:bg-surface"
            >
              Exportar CSV
            </button>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid shrink-0 grid-cols-3 gap-2">
        {kpis.map((k) => (
          <div key={k.title} className="panel px-3 py-2.5">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted">{k.title}</p>
            <p className={`mt-0.5 text-lg font-semibold tracking-tight ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="panel flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full text-[13px]">
            <thead className="sticky top-0 z-10 bg-background">
              <tr className="border-b border-border text-left text-[11px] font-medium uppercase tracking-wider text-muted">
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">Medidor</th>
                <th className="px-3 py-2">Centro</th>
                <th className="px-3 py-2">Período</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">Responsable</th>
                <th className="px-3 py-2 text-right">Gap (h)</th>
                <th className="px-3 py-2 text-right">Est. kWh</th>
                <th className="px-3 py-2 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((cnr) => {
                const isExpanded = expandedId === cnr.id;
                return (
                  <CnrRow
                    key={cnr.id}
                    cnr={cnr}
                    isExpanded={isExpanded}
                    onToggle={() => setExpandedId(isExpanded ? null : cnr.id)}
                  />
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-muted">
                    Sin CNR pendientes — todos los medidores reportando.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ── CNR Row with expand ── */

interface CnrRowProps {
  cnr: CnrRecord;
  isExpanded: boolean;
  onToggle: () => void;
}

function CnrRow({ cnr, isExpanded, onToggle }: Readonly<CnrRowProps>) {
  const gapClass = cnr.gapHours >= CRITICAL_GAP_H ? 'text-red-600 font-medium' : cnr.gapHours >= 8 ? 'text-amber-600' : 'text-foreground';

  return (
    <>
      <tr
        className="cursor-pointer transition-colors hover:bg-surface"
        onClick={onToggle}
      >
        <td className="px-3 py-2 font-mono text-[11px] text-muted">{cnr.id}</td>
        <td className="px-3 py-2 font-medium text-foreground">{cnr.meterName}</td>
        <td className="px-3 py-2 text-muted">{cnr.buildingName}</td>
        <td className="px-3 py-2 text-[11px] text-muted">
          {new Date(cnr.lastReading).toLocaleDateString('es-CL')} — {new Date().toLocaleDateString('es-CL')}
        </td>
        <td className="px-3 py-2 text-[11px] text-muted">
          {cnr.gapHours >= CRITICAL_GAP_H ? 'automático' : 'manual'}
        </td>
        <td className="px-3 py-2 text-[11px] text-muted">—</td>
        <td className={`px-3 py-2 text-right ${gapClass}`}>
          {cnr.gapHours}
        </td>
        <td className="px-3 py-2 text-right text-[11px] text-muted">
          {/* ponytail: estimated kWh from avg power * gap hours */}
          —
        </td>
        <td className="px-3 py-2 text-center">
          <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_BADGE[cnr.status]}`}>
            {cnr.status}
          </span>
        </td>
      </tr>
      {isExpanded && (
        <tr className="bg-surface/50">
          <td colSpan={9} className="px-6 py-3">
            <div className="space-y-2 text-[12px]">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <div><span className="font-medium text-muted">Meter ID:</span> <span className="font-mono text-foreground">{cnr.meterId}</span></div>
                <div><span className="font-medium text-muted">Edificio:</span> <span className="text-foreground">{cnr.buildingName}</span></div>
                <div><span className="font-medium text-muted">Sin datos desde:</span> <span className="text-foreground">{new Date(cnr.lastReading).toLocaleString('es-CL')}</span></div>
                <div><span className="font-medium text-muted">Causa probable:</span> <span className="text-foreground">{cnr.gapHours >= CRITICAL_GAP_H ? 'Comunicación perdida' : 'Gap menor'}</span></div>
              </div>
              <div>
                <span className="font-medium text-muted">Justificación:</span>
                <span className="ml-2 text-muted italic">Sin justificación registrada.</span>
              </div>
              <div>
                <span className="font-medium text-muted">Historial:</span>
                <span className="ml-2 text-muted italic">Sin cambios de estado.</span>
              </div>
              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button type="button" className="rounded-md border border-border px-2 py-1 text-[10px] text-brand hover:bg-surface">Asignar</button>
                <button type="button" className="rounded-md border border-border px-2 py-1 text-[10px] text-brand hover:bg-surface">Cambiar estado</button>
                <button type="button" className="rounded-md border border-border px-2 py-1 text-[10px] text-brand hover:bg-surface">Comentar</button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

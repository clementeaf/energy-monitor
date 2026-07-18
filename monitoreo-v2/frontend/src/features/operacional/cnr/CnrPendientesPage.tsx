import { useState, useMemo } from 'react';
import { PageHeader } from '../../../components/ui/PageHeader';
// ponytail: PillToggle replaced per wireframe
import { useBuildingsQuery } from '../../../hooks/queries/useBuildingsQuery';
import { useLatestReadingsQuery } from '../../../hooks/queries/useReadingsQuery';
import { useCnrQuery, useUpdateCnrStatus } from '../../../hooks/queries/useCnrQuery';

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
  realCnrId: string | null;
  valueKwh: number | null;
  motivo: string;
  justification: string | null;
  apiStatus: string | null;
}

/* ── Status styling ── */

const STATUS_BADGE: Record<CnrStatus, string> = {
  pendiente: 'bg-amber-100 text-amber-700',
  'en revisión': 'bg-blue-100 text-blue-700',
};

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
      realCnrId: null,
      valueKwh: null,
      motivo: 'auto-detectado',
      justification: null,
      apiStatus: null,
    }));
}

/* ── Page ── */

const MOTIVO_LABELS: Record<string, string> = {
  comm_failure: 'Falla comunicación',
  maintenance: 'Mantenimiento',
  replacement: 'Reemplazo',
  other: 'Otro',
};

const API_STATUS_MAP: Record<string, CnrStatus> = {
  pending: 'pendiente',
  in_review: 'en revisión',
  approved: 'pendiente', // ponytail: show approved as resolved filter later
  rejected: 'pendiente',
};

export function CnrPendientesPage() {
  const [statusFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const buildingsQuery = useBuildingsQuery();
  const latestQuery = useLatestReadingsQuery();
  const cnrQuery = useCnrQuery();
  const updateStatus = useUpdateCnrStatus();

  const buildings = buildingsQuery.data ?? [];
  const latestReadings = latestQuery.data ?? [];
  const apiCnrRecords = cnrQuery.data ?? [];

  const buildingMap = useMemo(() => new Map(buildings.map((b) => [b.id, b.name])), [buildings]);

  // Merge: real CNR records from API + auto-detected from stale readings
  const apiMeterIds = useMemo(() => new Set(apiCnrRecords.map((r) => r.meter_id)), [apiCnrRecords]);
  const derivedRecords = useMemo(() => deriveCnrRecords(latestReadings, buildingMap), [latestReadings, buildingMap]);

  const cnrRecords = useMemo(() => {
    // Real CNR records first
    const real: CnrRecord[] = apiCnrRecords.map((r) => ({
      id: r.id.slice(0, 8),
      meterId: r.meter_id,
      meterName: r.meter_id.slice(0, 8),
      buildingId: r.building_id,
      buildingName: buildingMap.get(r.building_id) ?? '—',
      lastReading: r.period_start,
      gapHours: Math.round((new Date(r.period_end).getTime() - new Date(r.period_start).getTime()) / 3_600_000),
      status: API_STATUS_MAP[r.status] ?? 'pendiente',
      realCnrId: r.id,
      valueKwh: r.value_kwh,
      motivo: MOTIVO_LABELS[r.motivo] ?? r.motivo,
      justification: r.justification,
      apiStatus: r.status,
    }));
    // Derived stale meters (exclude those already in API)
    const derived = derivedRecords
      .filter((d) => !apiMeterIds.has(d.meterId))
      .map((d) => ({ ...d, realCnrId: null as string | null, valueKwh: null as number | null, motivo: 'auto-detectado', justification: null as string | null, apiStatus: null as string | null }));
    return [...real, ...derived];
  }, [apiCnrRecords, derivedRecords, buildingMap, apiMeterIds]);

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

  const handleExportCsv = () => {
    const header = 'ID,Medidor,Mall,Período afectado,Tipo,Responsable,Fecha ingreso,Estado,Valor estim. kWh';
    const csv = [header, ...filtered.map((c) => `${c.id},${c.meterName},${c.buildingName},${c.lastReading},${c.motivo},${c.realCnrId ? '—' : 'auto'},${new Date(c.lastReading).toLocaleDateString('es-CL')},${c.status},${c.valueKwh ?? '—'}`)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `cnr_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full flex-col gap-2 overflow-hidden">
      <PageHeader
        title="4.5 CNR Pendientes"
        description="Consumo No Registrado — gestión de gaps pendientes de resolución (DAT-19)"
      />

      {/* Row 1: 3 KPI cards */}
      <div className="flex shrink-0 gap-3">
        <div className="panel flex-1 px-3 py-2.5">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted">Total CNR abiertas</p>
          <p className={`mt-1 text-2xl font-bold ${totalOpen > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{totalOpen}</p>
          <p className="text-[9px] text-subtle">a la espera de resolución</p>
          <p className="mt-0.5 text-right text-[9px] text-subtle">[DAT-20]</p>
        </div>
        <div className="panel flex-1 px-3 py-2.5">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted">Con &gt; 7 días sin resolución</p>
          <p className={`mt-1 text-2xl font-bold ${over7d > 0 ? 'text-red-600' : 'text-foreground'}`}>{over7d}</p>
          <p className="text-[9px] text-subtle">badge de alerta de antigüedad</p>
          <p className="mt-0.5 text-right text-[9px] text-subtle">[DAT-20]</p>
        </div>
        <div className="panel flex-1 px-3 py-2.5">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted">Ingresadas hoy</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{ingestedToday}</p>
          <p className="text-[9px] text-subtle">nuevas en el turno</p>
          <p className="mt-0.5 text-right text-[9px] text-subtle">[DAT-20]</p>
        </div>
      </div>

      {/* Action bar */}
      <div className="flex shrink-0 gap-2">
        <button type="button" className="rounded-lg bg-foreground px-4 py-2 text-[11px] font-medium text-background transition-colors hover:bg-foreground/90">Asignar responsable</button>
        <button type="button" className="rounded-lg border border-border px-4 py-2 text-[11px] font-medium text-foreground transition-colors hover:bg-surface">Cambiar estado</button>
        <button type="button" className="rounded-lg border border-border px-4 py-2 text-[11px] font-medium text-foreground transition-colors hover:bg-surface">Agregar comentario</button>
        <button type="button" onClick={handleExportCsv} className="rounded-lg border border-border px-4 py-2 text-[11px] font-medium text-foreground transition-colors hover:bg-surface">Exportar CNR a CSV</button>
      </div>

      {/* Tabla de CNR */}
      <div className="panel flex min-h-0 flex-1 flex-col overflow-hidden px-3 py-2.5">
        <p className="shrink-0 text-[10px] font-medium uppercase tracking-wider text-muted">Tabla de CNR</p>
        <p className="shrink-0 text-[9px] text-subtle">fila expandible: detalle, justificación e historial</p>
        <div className="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden text-[11px]">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left text-[10px] font-medium uppercase tracking-wider text-muted">
                <th className="px-2 py-1.5">ID</th>
                <th className="px-2 py-1.5">Medidor</th>
                <th className="px-2 py-1.5">Mall</th>
                <th className="px-2 py-1.5">Período afectado</th>
                <th className="px-2 py-1.5">Tipo</th>
                <th className="px-2 py-1.5">Responsable</th>
                <th className="px-2 py-1.5">Fecha ingreso</th>
                <th className="px-2 py-1.5 text-center">Estado</th>
                <th className="px-2 py-1.5 text-right">Valor estim. [kWh]</th>
              </tr>
            </thead>
          </table>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <table className="w-full">
              <tbody className="divide-y divide-border">
                {filtered.map((cnr, i) => (
                  <CnrRow
                    key={cnr.id}
                    cnr={cnr}
                    isExpanded={expandedId === cnr.id}
                    onToggle={() => setExpandedId(expandedId === cnr.id ? null : cnr.id)}
                    onUpdateStatus={(id, status) => updateStatus.mutate({ id, payload: { status } })}
                    index={i}
                  />
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={9} className="px-2 py-6 text-center text-muted">Sin CNR pendientes — todos los medidores reportando.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <p className="mt-1 shrink-0 text-right text-[9px] text-subtle">[DAT-20, DAT-19, DAT-14]</p>
      </div>
    </div>
  );
}

/* ── CNR Row with expand ── */

interface CnrRowProps {
  cnr: CnrRecord;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdateStatus?: (id: string, status: 'in_review' | 'approved' | 'rejected') => void;
  index?: number;
}

function CnrRow({ cnr, isExpanded, onToggle, onUpdateStatus, index = 0 }: Readonly<CnrRowProps>) {
  return (
    <>
      <tr
        className="animate-fade-in cursor-pointer transition-colors hover:bg-surface"
        style={{ animationDelay: `${index * 25}ms` }}
        onClick={onToggle}
      >
        <td className="px-2 py-1.5 font-mono text-[10px] text-muted">{cnr.id}</td>
        <td className="px-2 py-1.5 font-medium text-foreground">{cnr.meterName}</td>
        <td className="px-2 py-1.5 text-muted">{cnr.buildingName}</td>
        <td className="px-2 py-1.5 text-muted">
          {new Date(cnr.lastReading).toLocaleDateString('es-CL')} — {new Date().toLocaleDateString('es-CL')}
        </td>
        <td className="px-2 py-1.5 text-muted">{cnr.motivo}</td>
        <td className="px-2 py-1.5 text-muted">{cnr.realCnrId ? '—' : 'auto'}</td>
        <td className="px-2 py-1.5 text-muted">{new Date(cnr.lastReading).toLocaleDateString('es-CL')}</td>
        <td className="px-2 py-1.5 text-center">
          <span className={`inline-block rounded-full px-1.5 py-0.5 text-[9px] font-medium ${STATUS_BADGE[cnr.status]}`}>
            {cnr.status}
          </span>
        </td>
        <td className="px-2 py-1.5 text-right text-muted">
          {cnr.valueKwh != null ? `${cnr.valueKwh.toFixed(1)}` : '—'}
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
                <div><span className="font-medium text-muted">Motivo:</span> <span className="text-foreground">{cnr.motivo}</span></div>
              </div>
              <div>
                <span className="font-medium text-muted">Justificación:</span>
                <span className="ml-2 text-foreground">{cnr.justification ?? <span className="italic text-muted">Sin justificación registrada.</span>}</span>
              </div>
              <div>
                <span className="font-medium text-muted">Estado API:</span>
                <span className="ml-2 text-foreground">{cnr.apiStatus ?? 'auto-detectado (sin registro CNR)'}</span>
              </div>
              {/* Actions — only for real CNR records */}
              <div className="flex gap-2 pt-1">
                {cnr.realCnrId && onUpdateStatus ? (
                  <>
                    <button type="button" onClick={(e) => { e.stopPropagation(); onUpdateStatus(cnr.realCnrId!, 'in_review'); }} className="rounded-md border border-border px-2 py-1 text-[10px] text-brand hover:bg-surface">En revisión</button>
                    <button type="button" onClick={(e) => { e.stopPropagation(); onUpdateStatus(cnr.realCnrId!, 'approved'); }} className="rounded-md border border-border px-2 py-1 text-[10px] text-emerald-600 hover:bg-emerald-50">Aprobar</button>
                    <button type="button" onClick={(e) => { e.stopPropagation(); onUpdateStatus(cnr.realCnrId!, 'rejected'); }} className="rounded-md border border-border px-2 py-1 text-[10px] text-red-600 hover:bg-red-50">Rechazar</button>
                  </>
                ) : (
                  <span className="text-[10px] italic text-muted">Auto-detectado — registrar vía Ingreso CNR para gestionar.</span>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

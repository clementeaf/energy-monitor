import { useState, useMemo } from 'react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { PillToggle } from '../../../components/ui/PillToggle';
import { useBuildingsQuery } from '../../../hooks/queries/useBuildingsQuery';
import { useMetersQuery } from '../../../hooks/queries/useMetersQuery';

/* ── CNR types ── */

type CnrType = 'manual' | 'automático';
type CnrStatus = 'pendiente' | 'en revisión' | 'aprobada' | 'rechazada';

interface CnrRecord {
  id: string;
  meterId: string;
  meterName: string;
  buildingId: string;
  buildingName: string;
  periodStart: string;
  periodEnd: string;
  type: CnrType;
  responsible: string | null;
  entryDate: string;
  status: CnrStatus;
  estimatedKwh: number;
  justification: string;
}

/* ── Status styling ── */

const STATUS_BADGE: Record<CnrStatus, string> = {
  pendiente: 'bg-amber-100 text-amber-700',
  'en revisión': 'bg-blue-100 text-blue-700',
  aprobada: 'bg-emerald-100 text-emerald-700',
  rechazada: 'bg-red-100 text-red-700',
};

const FILTER_OPTIONS = [
  { key: 'all', label: 'Todas' },
  { key: 'pendiente', label: 'Pendientes' },
  { key: 'en revisión', label: 'En revisión' },
];

const FILTER_PREDICATES: Record<string, (r: CnrRecord) => boolean> = {
  all: () => true,
  pendiente: (r) => r.status === 'pendiente',
  'en revisión': (r) => r.status === 'en revisión',
};

/* ── Demo data generator (from meters — placeholder until CNR backend module exists) ── */
// ponytail: replace with useCnrQuery when backend CNR module ships

function generateCnrRecords(
  meters: Array<{ id: string; name: string; buildingId: string }>,
  buildingMap: Map<string, string>,
): CnrRecord[] {
  const TYPES: CnrType[] = ['manual', 'automático'];
  const STATUSES: CnrStatus[] = ['pendiente', 'en revisión', 'aprobada', 'rechazada'];

  return meters.slice(0, 8).map((meter, i) => ({
    id: `CNR-${String(i + 1).padStart(4, '0')}`,
    meterId: meter.id,
    meterName: meter.name,
    buildingId: meter.buildingId,
    buildingName: buildingMap.get(meter.buildingId) ?? '—',
    periodStart: '2026-06-20',
    periodEnd: '2026-06-22',
    type: TYPES[i % TYPES.length],
    responsible: i % 3 === 0 ? 'Técnico A' : null,
    entryDate: new Date(Date.now() - i * 86_400_000).toISOString(),
    status: STATUSES[i % STATUSES.length],
    estimatedKwh: 50 + i * 25,
    justification: `Falla comunicación medidor ${meter.name} durante período indicado.`,
  }));
}

/* ── Page ── */

export function CnrPendientesPage() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const buildingsQuery = useBuildingsQuery();
  const metersQuery = useMetersQuery();

  const buildings = buildingsQuery.data ?? [];
  const meters = metersQuery.data ?? [];

  const buildingMap = useMemo(() => new Map(buildings.map((b) => [b.id, b.name])), [buildings]);
  const cnrRecords = useMemo(() => generateCnrRecords(meters, buildingMap), [meters, buildingMap]);

  // Filter
  const predicate = FILTER_PREDICATES[statusFilter] ?? FILTER_PREDICATES.all;
  const filtered = useMemo(() => cnrRecords.filter(predicate), [cnrRecords, predicate]);

  // KPIs
  const totalOpen = cnrRecords.filter((r) => r.status === 'pendiente' || r.status === 'en revisión').length;
  const olderThan7d = cnrRecords.filter((r) => {
    const age = Date.now() - new Date(r.entryDate).getTime();
    return (r.status === 'pendiente' || r.status === 'en revisión') && age > 7 * 86_400_000;
  }).length;
  const todayCount = cnrRecords.filter((r) => {
    const today = new Date().toISOString().slice(0, 10);
    return r.entryDate.slice(0, 10) === today;
  }).length;

  const kpis = [
    { title: 'CNR abiertas', value: String(totalOpen), color: totalOpen > 0 ? 'text-amber-600' : 'text-emerald-600' },
    { title: '>7 días sin resolución', value: String(olderThan7d), color: olderThan7d > 0 ? 'text-red-600' : 'text-foreground' },
    { title: 'Ingresadas hoy', value: String(todayCount), color: 'text-foreground' },
  ];

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      <PageHeader
        title="CNR Pendientes"
        eyebrow="CNR"
        actions={
          <PillToggle
            options={FILTER_OPTIONS.map((o) => ({ key: o.key, label: o.label }))}
            value={statusFilter}
            onChange={setStatusFilter}
            size="sm"
          />
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
                <th className="px-3 py-2 text-right">kWh est.</th>
                <th className="px-3 py-2 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((cnr) => {
                const isExpanded = expandedId === cnr.id;
                const badge = STATUS_BADGE[cnr.status];
                return (
                  <CnrRow
                    key={cnr.id}
                    cnr={cnr}
                    badge={badge}
                    isExpanded={isExpanded}
                    onToggle={() => setExpandedId(isExpanded ? null : cnr.id)}
                  />
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-muted">
                    Sin CNR para el filtro seleccionado.
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
  badge: string;
  isExpanded: boolean;
  onToggle: () => void;
}

function CnrRow({ cnr, badge, isExpanded, onToggle }: Readonly<CnrRowProps>) {
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
          {cnr.periodStart} — {cnr.periodEnd}
        </td>
        <td className="px-3 py-2 capitalize text-muted">{cnr.type}</td>
        <td className="px-3 py-2 text-right text-foreground">{cnr.estimatedKwh}</td>
        <td className="px-3 py-2 text-center">
          <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${badge}`}>
            {cnr.status}
          </span>
        </td>
      </tr>
      {isExpanded && (
        <tr className="bg-surface/50">
          <td colSpan={7} className="px-6 py-3">
            <div className="space-y-2 text-[12px]">
              <div>
                <span className="font-medium text-muted">Justificación:</span>
                <span className="ml-2 text-foreground">{cnr.justification}</span>
              </div>
              <div>
                <span className="font-medium text-muted">Responsable:</span>
                <span className="ml-2 text-foreground">{cnr.responsible ?? 'Sin asignar'}</span>
              </div>
              <div>
                <span className="font-medium text-muted">Fecha ingreso:</span>
                <span className="ml-2 text-foreground">
                  {new Date(cnr.entryDate).toLocaleDateString('es-CL')}
                </span>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

import { useState, useMemo } from 'react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { useMetersQuery } from '../../../hooks/queries/useMetersQuery';
import { useLatestReadingsQuery } from '../../../hooks/queries/useReadingsQuery';
import type { LatestReading } from '../../../types/reading';

/* ── Reading quality types ── */

type ReadingType = 'real' | 'estimado' | 'cnr' | 'backfill';

const TYPE_BADGE: Record<ReadingType, string> = {
  real: 'bg-emerald-100 text-emerald-700',
  estimado: 'bg-blue-100 text-blue-700',
  cnr: 'bg-amber-100 text-amber-700',
  backfill: 'bg-purple-100 text-purple-700',
};

/* ── Page ── */

export function TrazabilidadPage() {
  const [selectedMeterId, setSelectedMeterId] = useState('');

  const metersQuery = useMetersQuery();
  const latestQuery = useLatestReadingsQuery();

  const meters = metersQuery.data ?? [];
  const readings = latestQuery.data ?? [];
  const readingMap = useMemo(() => new Map(readings.map((r) => [r.meter_id, r])), [readings]);

  const selectedReading = readingMap.get(selectedMeterId);

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto">
      <PageHeader title="Trazabilidad / Lineage" eyebrow="Auditoría" />

      <div className="flex gap-4">
        {/* Selector */}
        <div className="panel w-64 shrink-0 p-3">
          <label className="mb-2 block text-[11px] font-medium uppercase tracking-wider text-muted">Medidor</label>
          <select
            value={selectedMeterId}
            onChange={(e) => setSelectedMeterId(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-[13px] text-foreground outline-none focus:border-brand"
          >
            <option value="">Seleccionar medidor</option>
            {meters.map((m) => (
              <option key={m.id} value={m.id}>{m.name} ({m.code})</option>
            ))}
          </select>
        </div>

        {/* Lineage panel */}
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {selectedReading ? (
            <LineagePanel reading={selectedReading} />
          ) : (
            <div className="panel flex flex-1 items-center justify-center p-4">
              <p className="text-[13px] text-muted">Selecciona un medidor para ver el linaje.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Lineage Panel ── */

function LineagePanel({ reading }: Readonly<{ reading: LatestReading }>) {
  // ponytail: derive type from data freshness — stale > 4h = estimated, no data = CNR
  const ageMs = Date.now() - new Date(reading.timestamp).getTime();
  const readingType: ReadingType = ageMs > 24 * 3_600_000 ? 'cnr' : ageMs > 4 * 3_600_000 ? 'estimado' : 'real';

  const lineageSteps = [
    { label: 'Valor en plataforma', value: `${Number(reading.power_kw).toFixed(1)} kW`, detail: `Tipo: ${readingType}` },
    { label: 'Timestamp lectura', value: new Date(reading.timestamp).toLocaleString('es-CL'), detail: `Medidor: ${reading.meter_name}` },
    { label: 'Energía acumulada', value: `${Number(reading.energy_kwh_total).toFixed(1)} kWh`, detail: 'Total acumulado' },
  ];

  const rawVsShown = [
    { field: 'Potencia', raw: `${Number(reading.power_kw).toFixed(3)} kW`, shown: `${Number(reading.power_kw).toFixed(1)} kW` },
    { field: 'Voltaje L1', raw: reading.voltage_l1 ?? '—', shown: reading.voltage_l1 ? `${Number(reading.voltage_l1).toFixed(1)} V` : '—' },
    { field: 'Corriente L1', raw: reading.current_l1 ?? '—', shown: reading.current_l1 ? `${Number(reading.current_l1).toFixed(1)} A` : '—' },
    { field: 'Factor potencia', raw: reading.power_factor ?? '—', shown: reading.power_factor ? Number(reading.power_factor).toFixed(3) : '—' },
  ];

  return (
    <>
      <div className="panel p-4">
        <div className="mb-3 flex items-center gap-2">
          <h3 className="text-[13px] font-medium text-foreground">Linaje de lectura</h3>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${TYPE_BADGE[readingType]}`}>
            {readingType}
          </span>
        </div>
        <dl className="space-y-3">
          {lineageSteps.map((step) => (
            <div key={step.label} className="rounded-lg border border-border px-3 py-2">
              <dt className="text-[10px] font-medium uppercase tracking-wider text-muted">{step.label}</dt>
              <dd className="mt-0.5 text-[13px] font-medium text-foreground">{step.value}</dd>
              <dd className="text-[11px] text-muted">{step.detail}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="panel p-4">
        <h3 className="mb-3 text-[13px] font-medium text-foreground">Comparación raw vs. mostrado</h3>
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-border text-left text-[10px] font-medium uppercase tracking-wider text-muted">
              <th className="pb-2">Campo</th>
              <th className="pb-2">Valor raw</th>
              <th className="pb-2">Valor mostrado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rawVsShown.map((row) => (
              <tr key={row.field}>
                <td className="py-1.5 text-muted">{row.field}</td>
                <td className="py-1.5 font-mono text-foreground">{row.raw}</td>
                <td className="py-1.5 text-foreground">{row.shown}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
